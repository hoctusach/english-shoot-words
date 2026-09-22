import type { ScoreState } from '@/game/Scoring';

export interface Hud {
  update(state: ScoreState): void;
  destroy(): void;
}

export function createHUD(container: HTMLElement): Hud {
  const el = document.createElement('div');
  el.className = 'hud';
  el.innerHTML = `
    <span class="hud-score">0</span>
    <span class="hud-level">L1</span>
    <span class="hud-lives">❤️❤️❤️</span>
  `;
  container.appendChild(el);

  const scoreEl = el.querySelector('.hud-score')!;
  const levelEl = el.querySelector('.hud-level')!;
  const livesEl = el.querySelector('.hud-lives')!;

  return {
    update(state: ScoreState) {
      scoreEl.textContent = state.score.toLocaleString();
      levelEl.textContent = `L${state.level}`;
      livesEl.textContent = '❤️'.repeat(Math.max(0, state.lives));
    },
    destroy() {
      el.remove();
    },
  };
}
