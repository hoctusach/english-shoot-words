import type { App } from '@/App';
import { getLastSelectedSetId, getWordSet } from '@/data/wordSetStore';

export function renderMenuScreen(root: HTMLElement, app: App): void {
  const wrap = document.createElement('div');
  wrap.className = 'screen screen-menu';
  wrap.innerHTML = `
    <h1>English Shoot Words</h1>
    <p class="subtitle">Type the falling word before it lands. Practice your own vocabulary sets.</p>
  `;
  root.appendChild(wrap);

  const lastId = getLastSelectedSetId();
  const lastSet = lastId ? getWordSet(lastId) : undefined;
  if (lastSet) {
    const continueBtn = document.createElement('button');
    continueBtn.className = 'btn btn-primary';
    continueBtn.textContent = `Continue: ${lastSet.name}`;
    continueBtn.addEventListener('click', () => app.showGame(lastSet));
    wrap.appendChild(continueBtn);
  }

  const savedBtn = document.createElement('button');
  savedBtn.className = 'btn';
  savedBtn.textContent = 'Saved word sets';
  savedBtn.addEventListener('click', () => app.showSavedSets());
  wrap.appendChild(savedBtn);

  const importBtn = document.createElement('button');
  importBtn.className = 'btn';
  importBtn.textContent = 'Import word list (.xlsx)';
  importBtn.addEventListener('click', () => app.showImport());
  wrap.appendChild(importBtn);
}
