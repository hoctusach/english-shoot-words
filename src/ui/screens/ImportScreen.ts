import type { App } from '@/App';
import { parseWordListFile } from '@/data/wordListImport';
import { createWordSet, setLastSelectedSetId } from '@/data/wordSetStore';
import type { WordSetWord } from '@/types/wordset';

function baseName(fileName: string): string {
  return fileName.replace(/\.[^/.]+$/, '');
}

export function renderImportScreen(root: HTMLElement, app: App): void {
  const wrap = document.createElement('div');
  wrap.className = 'screen screen-import';
  wrap.innerHTML = `
    <h2>Import word list</h2>
    <p class="subtitle">Choose a .csv or .xlsx file with two columns: word, then meaning.
    No header row needed — every row is read as one word.</p>
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
    resultsEl.textContent = 'Reading file...';
    actionsEl.innerHTML = '';
    try {
      words = await parseWordListFile(file);
    } catch {
      resultsEl.textContent = 'Could not read this file. Make sure it is a valid .csv or .xlsx file.';
      return;
    }
    renderResults();
  });

  function renderResults(): void {
    resultsEl.innerHTML = '';
    actionsEl.innerHTML = '';

    if (words.length === 0) {
      resultsEl.textContent = 'No word/meaning rows found in this file.';
      return;
    }

    resultsEl.textContent = `${words.length} words found in ${fileName}`;

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'file-input';
    nameInput.value = baseName(fileName);
    actionsEl.appendChild(nameInput);

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-primary';
    saveBtn.textContent = 'Save set';
    saveBtn.addEventListener('click', () => {
      const name = nameInput.value.trim() || baseName(fileName);
      const set = createWordSet(name, words, fileName);
      setLastSelectedSetId(set.id);
      app.showMenu();
    });
    actionsEl.appendChild(saveBtn);
  }

  const backBtn = document.createElement('button');
  backBtn.className = 'btn btn-link';
  backBtn.textContent = '← Back';
  backBtn.addEventListener('click', () => app.showMenu());
  wrap.appendChild(backBtn);
}
