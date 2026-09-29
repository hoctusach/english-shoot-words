import type { ScoreState } from '@/game/Scoring';

export interface Hud {
  update(state: ScoreState): void;
  destroy(): void;
}

// Score, level, and either the lives left (challenge) or how many words slipped past
// (practice, which has no game over). The counter bumps red on every miss.
export function createHUD(container: HTMLElement): Hud {
  const el = document.createElement('div');
  el.className = 'hud';
  el.innerHTML = `
    <span class="hud-score">0</span>
    <span class="hud-level">L1</span>
    <span class="hud-lives"></span>
  `;
  container.appendChild(el);

  const scoreEl = el.querySelector('.hud-score')!;
  const levelEl = el.querySelector('.hud-level')!;
  const livesEl = el.querySelector<HTMLElement>('.hud-lives')!;

  let lastMissed = 0;
  let hitTimer: number | undefined;

  return {
    update(state: ScoreState) {
      scoreEl.textContent = state.score.toLocaleString();
      levelEl.textContent = `L${state.level}`;
      livesEl.textContent = Number.isFinite(state.lives) ? `❤️ ${Math.max(0, state.lives)}` : `✖ ${state.missed}`;
      if (state.missed > lastMissed) {
        // restart the bump even if the previous one is still running
        livesEl.classList.remove('hud-hit');
        void livesEl.offsetWidth;
        livesEl.classList.add('hud-hit');
        window.clearTimeout(hitTimer);
        hitTimer = window.setTimeout(() => livesEl.classList.remove('hud-hit'), 450);
      }
      lastMissed = state.missed;
    },
    destroy() {
      window.clearTimeout(hitTimer);
      el.remove();
    },
  };
}
