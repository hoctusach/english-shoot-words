import { escapeHtml } from '@/utils/dom';

export interface MeaningToastHandle {
  show(term: string, meaning: string, x: number, y: number): void;
  destroy(): void;
}

const VISIBLE_MS = 1600;
const EDGE_PADDING = 8;

export function createMeaningToast(container: HTMLElement): MeaningToastHandle {
  const el = document.createElement('div');
  el.className = 'meaning-bubble';
  container.appendChild(el);

  let hideTimeout: number | null = null;

  return {
    show(term: string, meaning: string, x: number, y: number) {
      el.innerHTML = `
        <span class="meaning-bubble-term">${escapeHtml(term)}</span>
        ${meaning ? `<span class="meaning-bubble-meaning">${escapeHtml(meaning)}</span>` : ''}
      `;
      el.classList.remove('visible');
      // force reflow so the fade restarts on rapid consecutive kills
      void el.offsetWidth;

      const bounds = container.getBoundingClientRect();
      const left = Math.min(
        Math.max(EDGE_PADDING, x - 8),
        Math.max(EDGE_PADDING, bounds.width - el.offsetWidth - EDGE_PADDING),
      );
      const belowTop = y + 10;
      const fitsBelow = belowTop + el.offsetHeight + EDGE_PADDING <= bounds.height;
      const top = Math.max(EDGE_PADDING, fitsBelow ? belowTop : y - el.offsetHeight - 24);

      el.style.left = `${left}px`;
      el.style.top = `${top}px`;
      el.classList.add('visible');

      if (hideTimeout !== null) window.clearTimeout(hideTimeout);
      hideTimeout = window.setTimeout(() => {
        el.classList.remove('visible');
      }, VISIBLE_MS);
    },
    destroy() {
      if (hideTimeout !== null) window.clearTimeout(hideTimeout);
      el.remove();
    },
  };
}
