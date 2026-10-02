import { t } from '@/i18n';

export interface OnScreenKeyboard {
  el: HTMLElement;
  setEnabled(enabled: boolean): void;
  destroy(): void;
}

interface Handlers {
  onKey(ch: string): void;
  onBackspace(): void;
}

// One character per key; terms are matched lowercased with ’ folded to ', so there is
// no shift. Special keys: ⌫ (data-action="back"), 123/abc (data-action="page").
type Row = (string | { action: 'back' | 'page'; flex: number } | { key: string; flex: number })[];

const LETTERS: Row[] = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  [{ key: "'", flex: 1.5 }, 'z', 'x', 'c', 'v', 'b', 'n', 'm', { action: 'back', flex: 1.5 }],
  [{ action: 'page', flex: 1.5 }, '-', { key: ' ', flex: 7.5 }],
];

const SYMBOLS: Row[] = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['.', ',', '?', '!', '&', '(', ')', '/', ':'],
  [{ key: ';', flex: 1.5 }, '"', '@', '#', '%', '+', '=', '*', { action: 'back', flex: 1.5 }],
  [{ action: 'page', flex: 1.5 }, '-', { key: ' ', flex: 7.5 }],
];

const REPEAT_DELAY_MS = 450;
const REPEAT_EVERY_MS = 70;
// a quick tap still shows the key lit for a moment
const MIN_PRESSED_MS = 90;

function renderPage(rows: Row[], page: 'letters' | 'symbols'): string {
  const keyHtml = (item: Row[number]): string => {
    if (typeof item === 'string') {
      return `<div class="osk-key" data-key="${item === '"' ? '&quot;' : item}">${item}</div>`;
    }
    if ('action' in item) {
      const label =
        item.action === 'back'
          ? `<span aria-hidden="true">⌫</span>`
          : page === 'letters'
            ? '123'
            : 'abc';
      const aria = item.action === 'back' ? t('keyDelete') : page === 'letters' ? t('keySymbols') : t('keyLetters');
      return `<div class="osk-key osk-special" role="button" aria-label="${aria}" data-action="${item.action}" style="flex: ${item.flex}">${label}</div>`;
    }
    const isSpace = item.key === ' ';
    return `<div class="osk-key${isSpace ? ' osk-space' : ''}" ${isSpace ? `role="button" aria-label="${t('keySpace')}"` : ''} data-key="${item.key}" style="flex: ${item.flex}">${isSpace ? t('keySpace') : item.key}</div>`;
  };
  return `<div class="osk-page osk-${page}">${rows
    .map((row, i) => `<div class="osk-row${i === 1 ? ' osk-row-inset' : ''}">${row.map(keyHtml).join('')}</div>`)
    .join('')}</div>`;
}

// The game's own English keyboard for phones and tablets: keys fire on touch-down,
// several fingers at once, and holding ⌫ repeats. Nothing in it can take focus, so
// the system keyboard never opens.
export function createOnScreenKeyboard(parent: HTMLElement, handlers: Handlers): OnScreenKeyboard {
  const el = document.createElement('div');
  el.className = 'osk';
  el.setAttribute('role', 'group');
  el.innerHTML = renderPage(LETTERS, 'letters') + renderPage(SYMBOLS, 'symbols');
  parent.appendChild(el);

  let enabled = true;
  const pressed = new Map<number, { key: HTMLElement; since: number }>();
  let repeatDelay: number | undefined;
  let repeatTimer: number | undefined;
  let repeatPointer: number | null = null;

  const stopRepeat = () => {
    window.clearTimeout(repeatDelay);
    window.clearInterval(repeatTimer);
    repeatPointer = null;
  };

  const release = (pointerId: number) => {
    const entry = pressed.get(pointerId);
    if (!entry) return;
    pressed.delete(pointerId);
    const wait = Math.max(0, MIN_PRESSED_MS - (performance.now() - entry.since));
    window.setTimeout(() => {
      if (![...pressed.values()].some((p) => p.key === entry.key)) entry.key.classList.remove('pressed');
    }, wait);
    if (pointerId === repeatPointer) stopRepeat();
  };

  const onPointerDown = (e: PointerEvent) => {
    e.preventDefault();
    const key = (e.target as HTMLElement).closest<HTMLElement>('.osk-key');
    if (!key || !enabled) return;
    key.classList.add('pressed');
    pressed.set(e.pointerId, { key, since: performance.now() });

    const action = key.dataset.action;
    if (action === 'page') {
      el.classList.toggle('show-symbols');
    } else if (action === 'back') {
      handlers.onBackspace();
      stopRepeat();
      repeatPointer = e.pointerId;
      repeatDelay = window.setTimeout(() => {
        repeatTimer = window.setInterval(() => handlers.onBackspace(), REPEAT_EVERY_MS);
      }, REPEAT_DELAY_MS);
    } else if (key.dataset.key !== undefined) {
      handlers.onKey(key.dataset.key);
    }
  };

  const onPointerEnd = (e: PointerEvent) => release(e.pointerId);
  const block = (e: Event) => e.preventDefault();

  el.addEventListener('pointerdown', onPointerDown);
  el.addEventListener('pointerup', onPointerEnd);
  el.addEventListener('pointercancel', onPointerEnd);
  el.addEventListener('pointerleave', onPointerEnd);
  el.addEventListener('contextmenu', block);
  // no mouse-compat focus changes or double-tap zoom from the keys
  el.addEventListener('mousedown', block);
  el.addEventListener('touchstart', block, { passive: false });

  return {
    el,
    setEnabled(next: boolean) {
      enabled = next;
      el.classList.toggle('disabled', !next);
      if (!next) {
        stopRepeat();
        for (const id of [...pressed.keys()]) release(id);
      }
    },
    destroy() {
      stopRepeat();
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointerup', onPointerEnd);
      el.removeEventListener('pointercancel', onPointerEnd);
      el.removeEventListener('pointerleave', onPointerEnd);
      el.removeEventListener('contextmenu', block);
      el.removeEventListener('mousedown', block);
      el.removeEventListener('touchstart', block);
      el.remove();
    },
  };
}
