import type { App } from '@/App';
import type { WordSet } from '@/types/wordset';
import type { ScreenHandle } from '@/ui/ScreenManager';
import { GameEngine } from '@/game/GameEngine';
import { createHUD } from '@/ui/components/HUD';
import { createMeaningToast } from '@/ui/components/MeaningToast';
import { startViewportTracking } from '@/ui/viewport';
import { formatSpeed } from '@/game/DifficultyCurve';
import { t } from '@/i18n';

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
      <div class="pause-overlay">
        <div class="pause-card">
          <p>${t('paused')}</p>
          <button class="btn btn-primary resume-btn">${t('resumeBtn')}</button>
        </div>
      </div>
    </div>
  `;
  root.appendChild(wrap);
  document.body.classList.add('game-active');
  const stopViewportTracking = startViewportTracking();

  const canvasContainer = wrap.querySelector<HTMLDivElement>('.canvas-container')!;
  const pauseOverlay = wrap.querySelector<HTMLDivElement>('.pause-overlay')!;
  const pauseBtn = wrap.querySelector<HTMLButtonElement>('.pause-btn')!;
  const speedValue = wrap.querySelector<HTMLSpanElement>('.speed-value')!;
  const hud = createHUD(wrap.querySelector<HTMLDivElement>('.hud-slot')!);
  const meaningToast = createMeaningToast(canvasContainer);
  const canvas = document.createElement('canvas');
  canvas.className = 'game-canvas';
  canvasContainer.appendChild(canvas);

  const engine = new GameEngine(canvas, canvasContainer, wordSet, {
    onScoreChange: (state) => hud.update(state),
    onWordKilled: (word) => meaningToast.show(word.term, word.meaning, word.x, word.y),
    onPauseChange: (paused) => {
      pauseOverlay.classList.toggle('visible', paused);
      pauseBtn.textContent = paused ? '▶' : '⏸';
      pauseBtn.setAttribute('aria-label', paused ? t('resume') : t('pause'));
    },
    onSpeedChange: (factor) => {
      speedValue.textContent = formatSpeed(factor);
      speedValue.title = t('speedHint', factor);
    },
    onGameOver: (score, wordsKilled) => app.showGameOver(wordSet, score, wordsKilled),
  });

  wrap.querySelector('.speed-down')!.addEventListener('click', () => engine.adjustSpeed(-1));
  wrap.querySelector('.speed-up')!.addEventListener('click', () => engine.adjustSpeed(1));
  pauseBtn.addEventListener('click', () => engine.togglePause());
  wrap.querySelector('.resume-btn')!.addEventListener('click', () => engine.togglePause());
  wrap.querySelector('.quit-btn')!.addEventListener('click', () => app.showMenu());

  engine.start();

  return {
    destroy() {
      engine.destroy();
      hud.destroy();
      meaningToast.destroy();
      stopViewportTracking();
      document.body.classList.remove('game-active');
    },
  };
}
