import { escapeHtml } from '@/utils/dom';
import { highlightTerm } from '@/utils/highlight';

export interface MeaningToastHandle {
  show(term: string, meaning: string, example: string | undefined, x: number, y: number): void;
  destroy(): void;
}

const VISIBLE_MS = 1600;
// an example sentence needs time to read
const EXAMPLE_MS_PER_CHAR = 40;
const MAX_VISIBLE_MS = 4500;

const EDGE_PADDING = 8;
// meanings longer than this get the wide bubble (they are clamped to a few lines)
const LONG_MEANING_CHARS = 60;

export function createMeaningToast(container: HTMLElement): MeaningToastHandle {
  const el = document.createElement('div');
  el.className = 'meaning-bubble';
  container.appendChild(el);

  let hideTimeout: number | null = null;

  return {
    show(term: string, meaning: string, example: string | undefined, x: number, y: number) {
      const hasExample = !!example && example.trim() !== '';
      el.classList.toggle('wide', hasExample || meaning.length > LONG_MEANING_CHARS);
      el.innerHTML = `
        <span class="meaning-bubble-term">${escapeHtml(term)}</span>
        ${meaning ? `<span class="meaning-bubble-meaning" title="${escapeHtml(meaning)}">${escapeHtml(meaning)}</span>` : ''}
        ${hasExample ? `<span class="meaning-bubble-example">${highlightTerm(example!.trim(), term)}</span>` : ''}
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
      const visibleMs = hasExample
        ? Math.min(MAX_VISIBLE_MS, VISIBLE_MS + example!.length * EXAMPLE_MS_PER_CHAR)
        : VISIBLE_MS;
      hideTimeout = window.setTimeout(() => {
        el.classList.remove('visible');
      }, visibleMs);
    },
    destroy() {
      if (hideTimeout !== null) window.clearTimeout(hideTimeout);
      el.remove();
    },
  };
}
