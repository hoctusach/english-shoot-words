import { STARTING_LIVES, type ScoreState } from '@/game/Scoring';

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
    <span class="hud-lives">❤️ ${STARTING_LIVES}</span>
  `;
  container.appendChild(el);

  const scoreEl = el.querySelector('.hud-score')!;
  const levelEl = el.querySelector('.hud-level')!;
  const livesEl = el.querySelector('.hud-lives')!;

  let lastLives = STARTING_LIVES;
  let hitTimer: number | undefined;

  return {
    update(state: ScoreState) {
      scoreEl.textContent = state.score.toLocaleString();
      levelEl.textContent = `L${state.level}`;
      livesEl.textContent = `❤️ ${Math.max(0, state.lives)}`;
      if (state.lives < lastLives) {
        // restart the bump even if the previous one is still running
        livesEl.classList.remove('hud-hit');
        void (livesEl as HTMLElement).offsetWidth;
        livesEl.classList.add('hud-hit');
        window.clearTimeout(hitTimer);
        hitTimer = window.setTimeout(() => livesEl.classList.remove('hud-hit'), 450);
      }
      lastLives = state.lives;
    },
    destroy() {
      window.clearTimeout(hitTimer);
      el.remove();
    },
  };
}
