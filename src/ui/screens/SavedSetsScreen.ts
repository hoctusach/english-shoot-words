import type { App } from '@/App';
import { loadWordSets, deleteWordSet, renameWordSet, setLastSelectedSetId } from '@/data/wordSetStore';
import { escapeHtml } from '@/utils/dom';

export function renderSavedSetsScreen(root: HTMLElement, app: App): void {
  const wrap = document.createElement('div');
  wrap.className = 'screen screen-sets';
  wrap.innerHTML = `<h2>Saved word sets</h2>`;
  root.appendChild(wrap);

  function renderList(): void {
    wrap.querySelector('.set-list')?.remove();
    const sets = loadWordSets();
    const list = document.createElement('div');
    list.className = 'set-list';

    if (sets.length === 0) {
      list.innerHTML = `<p class="empty">No saved sets yet. Import a word list to get started.</p>`;
    }

    for (const set of sets) {
      const item = document.createElement('div');
      item.className = 'set-item';
      item.innerHTML = `
        <div class="set-info">
          <div class="set-name">${escapeHtml(set.name)}</div>
          <div class="set-meta">${set.words.length} words${set.bestScore ? ` · Best: ${set.bestScore}` : ''}</div>
        </div>
      `;

      const actions = document.createElement('div');
      actions.className = 'set-actions';

      const playBtn = document.createElement('button');
      playBtn.className = 'btn btn-primary btn-sm';
      playBtn.textContent = 'Play';
      playBtn.addEventListener('click', () => {
        setLastSelectedSetId(set.id);
        app.showGame(set);
      });

      const renameBtn = document.createElement('button');
      renameBtn.className = 'btn btn-sm';
      renameBtn.textContent = 'Rename';
      renameBtn.addEventListener('click', () => {
        const name = prompt('New name', set.name);
        if (name && name.trim()) {
          renameWordSet(set.id, name.trim());
          renderList();
        }
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn btn-sm btn-danger';
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', () => {
        if (confirm(`Delete "${set.name}"?`)) {
          deleteWordSet(set.id);
          renderList();
        }
      });

      actions.append(playBtn, renameBtn, deleteBtn);
      item.appendChild(actions);
      list.appendChild(item);
    }

    wrap.appendChild(list);
  }

  renderList();

  const importBtn = document.createElement('button');
  importBtn.className = 'btn';
  importBtn.textContent = 'Import more';
  importBtn.addEventListener('click', () => app.showImport());
  wrap.appendChild(importBtn);

  const backBtn = document.createElement('button');
  backBtn.className = 'btn btn-link';
  backBtn.textContent = '← Back';
  backBtn.addEventListener('click', () => app.showMenu());
  wrap.appendChild(backBtn);
}
