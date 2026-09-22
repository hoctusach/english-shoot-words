import type { App } from '@/App';
import { parseVocabularyXlsx, type ImportedSheet } from '@/data/xlsxImport';
import { createWordSet, setLastSelectedSetId } from '@/data/wordSetStore';

export function renderImportScreen(root: HTMLElement, app: App): void {
  const wrap = document.createElement('div');
  wrap.className = 'screen screen-import';
  wrap.innerHTML = `
    <h2>Import word list</h2>
    <p class="subtitle">Choose the same .xlsx file you use in lazy-vocabulary. Sheets named
    "phrasal verbs", "idioms", "topic vocab", "grammar", "phrases, collocations" or
    "word formation" are detected automatically.</p>
    <input type="file" accept=".xlsx" class="file-input" />
    <div class="import-results"></div>
    <div class="import-actions"></div>
  `;
  root.appendChild(wrap);

  const fileInput = wrap.querySelector<HTMLInputElement>('.file-input')!;
  const resultsEl = wrap.querySelector<HTMLDivElement>('.import-results')!;
  const actionsEl = wrap.querySelector<HTMLDivElement>('.import-actions')!;

  let sheets: ImportedSheet[] = [];
  let fileName = '';

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    fileName = file.name;
    resultsEl.textContent = 'Reading file...';
    actionsEl.innerHTML = '';
    try {
      sheets = await parseVocabularyXlsx(file);
    } catch {
      resultsEl.textContent = 'Could not read this file. Make sure it is a valid .xlsx export.';
      return;
    }
    renderResults();
  });

  function renderResults(): void {
    resultsEl.innerHTML = '';
    actionsEl.innerHTML = '';
    if (sheets.length === 0) {
      resultsEl.textContent = 'No recognized sheets found in this file.';
      return;
    }

    const list = document.createElement('div');
    list.className = 'sheet-checklist';
    for (const sheet of sheets) {
      const label = document.createElement('label');
      label.className = 'sheet-checkbox';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = true;
      checkbox.dataset.category = sheet.category;
      label.appendChild(checkbox);
      label.append(` ${sheet.category} (${sheet.words.length} words)`);
      list.appendChild(label);
    }
    resultsEl.appendChild(list);

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-primary';
    saveBtn.textContent = 'Save selected sets';
    saveBtn.addEventListener('click', () => {
      const checkboxes = list.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:checked');
      let lastCreatedId: string | null = null;
      checkboxes.forEach((cb) => {
        const category = cb.dataset.category!;
        const sheet = sheets.find((s) => s.category === category);
        if (!sheet) return;
        const set = createWordSet(`${fileName} — ${category}`, sheet.words, fileName);
        lastCreatedId = set.id;
      });
      if (lastCreatedId) setLastSelectedSetId(lastCreatedId);
      app.showSavedSets();
    });
    actionsEl.appendChild(saveBtn);
  }

  const backBtn = document.createElement('button');
  backBtn.className = 'btn btn-link';
  backBtn.textContent = '← Back';
  backBtn.addEventListener('click', () => app.showMenu());
  wrap.appendChild(backBtn);
}
