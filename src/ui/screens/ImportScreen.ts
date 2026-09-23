import type { App } from '@/App';
import { parseWordListFile } from '@/data/wordListImport';
import { createWordSet, setLastSelectedSetId } from '@/data/wordSetStore';
import type { WordSetWord } from '@/types/wordset';
import { t } from '@/i18n';
import { track } from '@/analytics';

function baseName(fileName: string): string {
  return fileName.replace(/\.[^/.]+$/, '');
}

export function renderImportScreen(root: HTMLElement, app: App): void {
  const wrap = document.createElement('div');
  wrap.className = 'screen screen-import';
  wrap.innerHTML = `
    <h2>${t('importTitle')}</h2>
    <p class="subtitle">${t('importHint')}</p>
    <input type="file" accept=".xlsx,.xls,.csv" class="file-input" />
    <div class="import-results"></div>
    <div class="import-actions"></div>
  `;
  root.appendChild(wrap);

  const fileInput = wrap.querySelector<HTMLInputElement>('.file-input')!;
  const resultsEl = wrap.querySelector<HTMLDivElement>('.import-results')!;
  const actionsEl = wrap.querySelector<HTMLDivElement>('.import-actions')!;

  let words: WordSetWord[] = [];
  let fileName = '';

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    fileName = file.name;
    resultsEl.textContent = t('reading');
    actionsEl.innerHTML = '';
    try {
      words = await parseWordListFile(file);
    } catch {
      resultsEl.textContent = t('readError');
      return;
    }
    renderResults();
  });

  function renderResults(): void {
    resultsEl.innerHTML = '';
    actionsEl.innerHTML = '';

    if (words.length === 0) {
      resultsEl.textContent = t('noRows');
      return;
    }

    resultsEl.textContent = t('wordsFound', words.length, fileName);

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'file-input';
    nameInput.value = baseName(fileName);
    actionsEl.appendChild(nameInput);

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-primary save-set-btn';
    saveBtn.textContent = t('saveSet');
    saveBtn.addEventListener('click', () => {
      const name = nameInput.value.trim() || baseName(fileName);
      const set = createWordSet(name, words, fileName);
      setLastSelectedSetId(set.id);
      track('set_import', { words: words.length, type: fileName.toLowerCase().endsWith('.csv') ? 'csv' : 'xlsx' });
      app.showMenu();
    });
    actionsEl.appendChild(saveBtn);
  }

  const backBtn = document.createElement('button');
  backBtn.className = 'btn btn-link';
  backBtn.textContent = t('back');
  backBtn.addEventListener('click', () => app.showMenu());
  wrap.appendChild(backBtn);
}
