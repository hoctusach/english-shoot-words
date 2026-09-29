import type { App, ShowGameOptions } from '@/App';
import type { WordSet } from '@/types/wordset';
import type { ScreenHandle } from '@/ui/ScreenManager';
import { GameEngine, SHAKE_MS } from '@/game/GameEngine';
import { PRACTICE } from '@/game/GameMode';
import type { ScoreState } from '@/game/Scoring';
import { createHUD } from '@/ui/components/HUD';
import { createMeaningToast } from '@/ui/components/MeaningToast';
import { startViewportTracking, watchKeyboard } from '@/ui/viewport';
import { formatSpeed } from '@/game/DifficultyCurve';
import { addKill, getStats } from '@/data/statsStore';
import { recordBestScore } from '@/data/wordSetStore';
import { discardIfEmpty, startSession, updateSession, type Session } from '@/data/sessionStore';
import { t } from '@/i18n';
import { track } from '@/analytics';

export function renderGameScreen(
  root: HTMLElement,
  app: App,
  wordSet: WordSet,
  options: ShowGameOptions = {},
): ScreenHandle | void {
  const mode = options.mode ?? PRACTICE;
  const isChallenge = mode.kind === 'challenge';
  const player = options.player?.trim() || getStats().playerName;

  const wrap = document.createElement('div');
  wrap.className = `screen screen-game${isChallenge ? ' mode-challenge' : ''}`;

  if (wordSet.words.length === 0) {
    wrap.innerHTML = `
      <div class="game-topbar"><button class="btn btn-sm btn-link quit-btn">${t('back')}</button></div>
      <p style="padding: 24px;">${t('emptySet')}</p>
    `;
    root.appendChild(wrap);
    wrap.querySelector('.quit-btn')!.addEventListener('click', () => app.showMenu());
    return;
  }

  // A challenge runs at a fixed speed, so its −/+ buttons give way to a locked badge.
  wrap.innerHTML = `
    <div class="game-topbar">
      <button class="icon-btn quit-btn" aria-label="${t('quit')}">←</button>
      <div class="hud-slot"></div>
      <div class="speed-control${isChallenge ? ' locked' : ''}" title="${isChallenge ? t('speedLocked') : ''}">
        ${isChallenge ? '<span class="speed-lock" aria-hidden="true">🏆</span>' : `<button class="icon-btn speed-down" aria-label="${t('slower')}">−</button>`}
        <span class="speed-value">1×</span>
        ${isChallenge ? '' : `<button class="icon-btn speed-up" aria-label="${t('faster')}">+</button>`}
      </div>
      <button class="icon-btn pause-btn" aria-label="${t('pause')}">⏸</button>
      <button class="icon-btn stop-btn" aria-label="${t('finish')}" title="${t('finish')}">⏹</button>
    </div>
    <div class="canvas-container">
      <div class="game-hint" role="status">${t('typeEachLetter')}</div>
      <div class="pause-overlay">
        <div class="pause-card">
          <p class="pause-title">${t('paused')}</p>
          <p class="pause-sub"></p>
          <button class="btn btn-primary resume-btn">${t('resumeBtn')}</button>
        </div>
      </div>
    </div>
  `;
  root.appendChild(wrap);
  document.body.classList.add('game-active');
  const stopViewportTracking = startViewportTracking();

  // No on-screen keyboard to lose on a mouse/trackpad device.
  const isTouch = window.matchMedia('(pointer: coarse)').matches;

  const canvasContainer = wrap.querySelector<HTMLDivElement>('.canvas-container')!;
  const pauseOverlay = wrap.querySelector<HTMLDivElement>('.pause-overlay')!;
  const pauseTitle = wrap.querySelector<HTMLParagraphElement>('.pause-title')!;
  const pauseSub = wrap.querySelector<HTMLParagraphElement>('.pause-sub')!;
  const resumeBtn = wrap.querySelector<HTMLButtonElement>('.resume-btn')!;
  const pauseBtn = wrap.querySelector<HTMLButtonElement>('.pause-btn')!;
  const speedValue = wrap.querySelector<HTMLSpanElement>('.speed-value')!;
  const gameHint = wrap.querySelector<HTMLDivElement>('.game-hint')!;
  const topbar = wrap.querySelector<HTMLDivElement>('.game-topbar')!;
  const hud = createHUD(wrap.querySelector<HTMLDivElement>('.hud-slot')!);
  const meaningToast = createMeaningToast(canvasContainer);
  const canvas = document.createElement('canvas');
  canvas.className = 'game-canvas';
  canvasContainer.appendChild(canvas);

  // ---- the round's record: created when play actually begins, saved after every
  // shot and miss, so closing the app mid-round keeps what was earned ----
  let session: Session | null = null;
  let roundSpeed = 0;
  let last: ScoreState | null = null;
  let finished = false;
  const roundStart = Date.now();

  const beginSession = () => {
    if (session || finished) return;
    session = startSession({
      setId: wordSet.id,
      mode: mode.kind,
      player,
      speed: roundSpeed,
      missLimit: mode.kind === 'challenge' ? mode.missLimit : undefined,
    });
    track('game_start', { mode: mode.kind, set_size: wordSet.words.length, speed: roundSpeed, touch: isTouch });
  };

  const onScore = (state: ScoreState) => {
    hud.update(state);
    if (last && state.wordsKilled > last.wordsKilled) addKill(state.score - last.score);
    if (session && last && (state.score !== last.score || state.missed !== last.missed)) {
      updateSession(session.id, { score: state.score, wordsShot: state.wordsKilled, missed: state.missed, speed: roundSpeed });
    }
    last = state;
  };

  const saveBest = () => {
    if (!isChallenge && last && last.score > 0) recordBestScore(wordSet.id, last.score);
  };

  // End the round (miss limit reached, ⏹, or ←). Returns the saved round, or null when
  // nothing was played.
  const finish = (end: 'gameover' | 'stopped'): Session | null => {
    if (finished) return null;
    finished = true;
    saveBest();
    if (!session) return null;
    const state = engine.state;
    updateSession(session.id, { score: state.score, wordsShot: state.wordsKilled, missed: state.missed, end });
    track(end === 'gameover' ? 'game_over' : 'game_quit', {
      mode: mode.kind,
      set_size: wordSet.words.length,
      speed: roundSpeed,
      score: state.score,
      words_shot: state.wordsKilled,
      missed: state.missed,
      minutes: Math.round((Date.now() - roundStart) / 6000) / 10,
      touch: isTouch,
    });
    return discardIfEmpty(session.id) ? null : session;
  };

  let pausedForKeyboard = false;
  let waitingToStart = !!options.waitForStart;
  let hintTimer: number | undefined;
  let shakeTimer: number | undefined;

  // The canvas shakes itself; the top bar joins in so the whole screen jolts. The
  // hidden typing input lives in the canvas container, which is never moved.
  const shakeTopbar = () => {
    topbar.classList.remove('shake');
    void topbar.offsetWidth;
    topbar.classList.add('shake');
    window.clearTimeout(shakeTimer);
    shakeTimer = window.setTimeout(() => topbar.classList.remove('shake'), SHAKE_MS);
  };

  const showHint = (text: string) => {
    gameHint.textContent = text;
    gameHint.classList.add('visible');
    window.clearTimeout(hintTimer);
    hintTimer = window.setTimeout(() => gameHint.classList.remove('visible'), 2200);
  };

  // The keyboard disappearing mid-round (hide key, back key, a stray tap) would
  // otherwise let words keep falling while a child looks for a way to get it back.
  // Pausing puts one big "open keyboard & play" button in front of them instead.
  const onKeyboardLost = () => {
    if (isTouch && !engine.isPaused) {
      pausedForKeyboard = true;
      engine.pause();
    }
  };

  const engine = new GameEngine(
    canvas,
    canvasContainer,
    wordSet,
    {
      onScoreChange: onScore,
      onWordKilled: (word) => meaningToast.show(word.term, word.meaning, word.example, word.x, word.y),
      onPauseChange: (paused) => {
        pauseOverlay.classList.toggle('visible', paused);
        pauseBtn.textContent = paused ? '▶' : '⏸';
        pauseBtn.setAttribute('aria-label', paused ? t('resume') : t('pause'));
        if (waitingToStart) {
          pauseTitle.textContent = t('readyTitle');
          pauseSub.textContent = wordSet.name;
          resumeBtn.textContent = t('startBtn');
        } else {
          pauseTitle.textContent = pausedForKeyboard ? t('keyboardHidden') : t('paused');
          pauseSub.textContent = '';
          resumeBtn.textContent = pausedForKeyboard ? t('resumeKeyboard') : t('resumeBtn');
        }
        document.body.classList.toggle('game-waiting', waitingToStart && paused);
        if (!paused) {
          pausedForKeyboard = false;
          waitingToStart = false;
          beginSession();
        }
      },
      onSpeedChange: (factor) => {
        roundSpeed = factor;
        speedValue.textContent = formatSpeed(factor);
        speedValue.title = isChallenge ? t('speedLocked') : t('speedHint', factor);
        if (session) updateSession(session.id, { speed: factor });
      },
      onInputFocusChange: (focused) => {
        if (!focused) onKeyboardLost();
      },
      onSuggestionBlocked: () => showHint(t('typeEachLetter')),
      onVietnameseInput: () => showHint(t('vietnameseOn')),
      onImpact: shakeTopbar,
      onGameOver: () => {
        const saved = finish('gameover');
        if (saved) app.showResults(wordSet, saved.id);
        else app.showMenu();
      },
    },
    mode,
  );

  const stopKeyboardWatch = watchKeyboard((open) => {
    if (!open) onKeyboardLost();
  });

  // Tapping a control must not pull focus off the typing input, or the keyboard closes.
  wrap.querySelectorAll<HTMLButtonElement>('.game-topbar button').forEach((btn) =>
    btn.addEventListener('mousedown', (e) => e.preventDefault()),
  );

  wrap.querySelector('.speed-down')?.addEventListener('click', () => engine.adjustSpeed(-1));
  wrap.querySelector('.speed-up')?.addEventListener('click', () => engine.adjustSpeed(1));
  pauseBtn.addEventListener('click', () => engine.togglePause());
  resumeBtn.addEventListener('click', () => {
    if (engine.isPaused) engine.togglePause();
    else engine.focusInput();
  });
  wrap.querySelector('.stop-btn')!.addEventListener('click', () => {
    const saved = finish('stopped');
    if (saved) app.showResults(wordSet, saved.id);
    else app.showMenu();
  });
  wrap.querySelector('.quit-btn')!.addEventListener('click', () => {
    finish('stopped');
    app.showMenu();
  });

  // The best score is written when the round ends, and also when the page is hidden
  // (app switched or closed) since a phone may never come back to end it.
  const onHidden = () => {
    if (document.visibilityState === 'hidden') saveBest();
  };
  document.addEventListener('visibilitychange', onHidden);

  // Opened by the app itself: wait for a tap, which is also what lets a phone open its
  // keyboard. On a computer, Enter or Space starts too.
  const startOnKey = (e: KeyboardEvent) => {
    if (waitingToStart && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      engine.togglePause();
    }
  };
  window.addEventListener('keydown', startOnKey);
  engine.start({ paused: waitingToStart });
  if (!waitingToStart) beginSession();

  return {
    destroy() {
      saveBest();
      window.clearTimeout(hintTimer);
      window.clearTimeout(shakeTimer);
      window.removeEventListener('keydown', startOnKey);
      document.removeEventListener('visibilitychange', onHidden);
      stopKeyboardWatch();
      engine.destroy();
      hud.destroy();
      meaningToast.destroy();
      stopViewportTracking();
      document.body.classList.remove('game-active', 'game-waiting');
    },
  };
}
