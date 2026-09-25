import type { App } from '@/App';
import type { WordSet } from '@/types/wordset';
import type { ScreenHandle } from '@/ui/ScreenManager';
import { GameEngine, SHAKE_MS } from '@/game/GameEngine';
import { createHUD } from '@/ui/components/HUD';
import { createMeaningToast } from '@/ui/components/MeaningToast';
import { startViewportTracking, watchKeyboard } from '@/ui/viewport';
import { formatSpeed } from '@/game/DifficultyCurve';
import { t } from '@/i18n';
import { track } from '@/analytics';

export function renderGameScreen(root: HTMLElement, app: App, wordSet: WordSet): ScreenHandle | void {
  const wrap = document.createElement('div');
  wrap.className = 'screen screen-game';

  if (wordSet.words.length === 0) {
    wrap.innerHTML = `
      <div class="game-topbar"><button class="btn btn-sm btn-link quit-btn">${t('back')}</button></div>
      <p style="padding: 24px;">${t('emptySet')}</p>
    `;
    root.appendChild(wrap);
    wrap.querySelector('.quit-btn')!.addEventListener('click', () => app.showMenu());
    return;
  }

  wrap.innerHTML = `
    <div class="game-topbar">
      <button class="icon-btn quit-btn" aria-label="${t('quit')}">←</button>
      <div class="hud-slot"></div>
      <div class="speed-control">
        <button class="icon-btn speed-down" aria-label="${t('slower')}">−</button>
        <span class="speed-value">1×</span>
        <button class="icon-btn speed-up" aria-label="${t('faster')}">+</button>
      </div>
      <button class="icon-btn pause-btn" aria-label="${t('pause')}">⏸</button>
    </div>
    <div class="canvas-container">
      <div class="game-hint" role="status">${t('typeEachLetter')}</div>
      <div class="pause-overlay">
        <div class="pause-card">
          <p class="pause-title">${t('paused')}</p>
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

  // anonymous round stats (no words or names): see src/analytics.ts
  const roundStart = Date.now();
  let roundSpeed = 0;
  let roundScore = 0;
  let roundWords = 0;
  let roundEnded = false;
  const roundStats = () => ({
    set_size: wordSet.words.length,
    speed: roundSpeed,
    score: roundScore,
    words_shot: roundWords,
    minutes: Math.round((Date.now() - roundStart) / 6000) / 10,
    touch: isTouch,
  });

  let pausedForKeyboard = false;
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

  const engine = new GameEngine(canvas, canvasContainer, wordSet, {
    onScoreChange: (state) => {
      hud.update(state);
      roundScore = state.score;
      roundWords = state.wordsKilled;
    },
    onWordKilled: (word) => meaningToast.show(word.term, word.meaning, word.x, word.y),
    onPauseChange: (paused) => {
      pauseOverlay.classList.toggle('visible', paused);
      pauseBtn.textContent = paused ? '▶' : '⏸';
      pauseBtn.setAttribute('aria-label', paused ? t('resume') : t('pause'));
      pauseTitle.textContent = pausedForKeyboard ? t('keyboardHidden') : t('paused');
      resumeBtn.textContent = pausedForKeyboard ? t('resumeKeyboard') : t('resumeBtn');
      if (!paused) pausedForKeyboard = false;
    },
    onSpeedChange: (factor) => {
      roundSpeed = factor;
      speedValue.textContent = formatSpeed(factor);
      speedValue.title = t('speedHint', factor);
    },
    onInputFocusChange: (focused) => {
      if (!focused) onKeyboardLost();
    },
    onSuggestionBlocked: () => showHint(t('typeEachLetter')),
    onVietnameseInput: () => showHint(t('vietnameseOn')),
    onImpact: shakeTopbar,
    onGameOver: (score, wordsKilled) => {
      roundEnded = true;
      track('game_over', { ...roundStats(), score, words_shot: wordsKilled });
      app.showGameOver(wordSet, score, wordsKilled);
    },
  });

  const stopKeyboardWatch = watchKeyboard((open) => {
    if (!open) onKeyboardLost();
  });

  // Tapping a control must not pull focus off the typing input, or the keyboard closes.
  wrap.querySelectorAll<HTMLButtonElement>('.game-topbar button').forEach((btn) =>
    btn.addEventListener('mousedown', (e) => e.preventDefault()),
  );

  wrap.querySelector('.speed-down')!.addEventListener('click', () => engine.adjustSpeed(-1));
  wrap.querySelector('.speed-up')!.addEventListener('click', () => engine.adjustSpeed(1));
  pauseBtn.addEventListener('click', () => engine.togglePause());
  resumeBtn.addEventListener('click', () => {
    if (engine.isPaused) engine.togglePause();
    else engine.focusInput();
  });
  wrap.querySelector('.quit-btn')!.addEventListener('click', () => app.showMenu());

  engine.start();
  track('game_start', { set_size: wordSet.words.length, speed: roundSpeed, touch: isTouch });

  return {
    destroy() {
      if (!roundEnded) track('game_quit', roundStats());
      window.clearTimeout(hintTimer);
      window.clearTimeout(shakeTimer);
      stopKeyboardWatch();
      engine.destroy();
      hud.destroy();
      meaningToast.destroy();
      stopViewportTracking();
      document.body.classList.remove('game-active');
    },
  };
}
