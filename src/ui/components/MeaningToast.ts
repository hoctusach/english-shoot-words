import { escapeHtml } from '@/utils/dom';

export interface MeaningToastHandle {
  show(term: string, meaning: string): void;
  destroy(): void;
}

const VISIBLE_MS = 1400;

export function createMeaningToast(container: HTMLElement): MeaningToastHandle {
  const el = document.createElement('div');
  el.className = 'meaning-toast';
  container.appendChild(el);

  let hideTimeout: number | null = null;

  return {
    show(term: string, meaning: string) {
      const termHtml = escapeHtml(term);
      const meaningHtml = escapeHtml(meaning);
      el.innerHTML = `<span class="meaning-toast-term">${termHtml}</span>${meaning ? `<span class="meaning-toast-sep"> — </span><span class="meaning-toast-meaning">${meaningHtml}</span>` : ''}`;
      el.classList.remove('visible');
      // force reflow so the animation restarts on rapid consecutive kills
      void el.offsetWidth;
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
