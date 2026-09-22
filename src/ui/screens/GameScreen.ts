import type { App } from '@/App';
import type { WordSet } from '@/types/wordset';
import type { ScreenHandle } from '@/ui/ScreenManager';
import { GameEngine } from '@/game/GameEngine';
import { createHUD } from '@/ui/components/HUD';
import { createMeaningToast } from '@/ui/components/MeaningToast';

export function renderGameScreen(root: HTMLElement, app: App, wordSet: WordSet): ScreenHandle | void {
  const wrap = document.createElement('div');
  wrap.className = 'screen screen-game';

  if (wordSet.words.length === 0) {
    wrap.innerHTML = `
      <div class="game-topbar"><button class="btn btn-sm btn-link quit-btn">← Back</button></div>
      <p style="padding: 24px;">This set has no words. Import a word list first.</p>
    `;
    root.appendChild(wrap);
    wrap.querySelector('.quit-btn')!.addEventListener('click', () => app.showSavedSets());
    return;
  }

  wrap.innerHTML = `
    <div class="game-topbar">
      <button class="btn btn-sm btn-link quit-btn">← Quit</button>
    </div>
    <div class="canvas-container"></div>
  `;
  root.appendChild(wrap);

  const canvasContainer = wrap.querySelector<HTMLDivElement>('.canvas-container')!;
  const hud = createHUD(canvasContainer);
  const meaningToast = createMeaningToast(canvasContainer);
  const canvas = document.createElement('canvas');
  canvas.className = 'game-canvas';
  canvasContainer.appendChild(canvas);

  const engine = new GameEngine(canvas, canvasContainer, wordSet, {
    onScoreChange: (state) => hud.update(state),
    onWordKilled: (word) => meaningToast.show(word.term, word.meaning),
    onGameOver: (score) => app.showGameOver(wordSet, score),
  });

  wrap.querySelector('.quit-btn')!.addEventListener('click', () => {
    app.showSavedSets();
  });

  engine.start();

  return {
    destroy() {
      engine.destroy();
      hud.destroy();
      meaningToast.destroy();
    },
  };
}
