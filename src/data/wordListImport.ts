import type { WordSetWord } from '@/types/wordset';

const HEADER_WORD_LABELS = new Set(['word', 'term', 'vocabulary']);
const HEADER_MEANING_LABELS = new Set(['meaning', 'definition', 'translation']);

function isHeaderRow(word: string, meaning: string): boolean {
  return HEADER_WORD_LABELS.has(word.toLowerCase()) && HEADER_MEANING_LABELS.has(meaning.toLowerCase());
}

function stripQuotes(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function toWords(rows: [string, string][]): WordSetWord[] {
  const words: WordSetWord[] = [];
  rows.forEach(([rawWord, rawMeaning], index) => {
    const term = stripQuotes(rawWord ?? '');
    const meaning = stripQuotes(rawMeaning ?? '');
    if (!term) return;
    if (index === 0 && isHeaderRow(term, meaning)) return;
    words.push({ term, meaning });
  });
  return words;
}

function parseCsvText(text: string): WordSetWord[] {
  const lines = text.split(/\r\n|\r|\n/).filter((line) => line.trim() !== '');
  const rows: [string, string][] = lines.map((line) => {
    const commaIndex = line.indexOf(',');
    if (commaIndex !== -1) {
      return [line.slice(0, commaIndex), line.slice(commaIndex + 1)];
    }
    const tabIndex = line.indexOf('\t');
    if (tabIndex !== -1) {
      return [line.slice(0, tabIndex), line.slice(tabIndex + 1)];
    }
    return [line, ''];
  });
  return toWords(rows);
}

async function parseXlsxFile(file: File): Promise<WordSetWord[]> {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const allRows: [string, string][] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const sheetRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
    for (const row of sheetRows) {
      const word = row[0] !== undefined && row[0] !== null ? String(row[0]) : '';
      const meaning = row[1] !== undefined && row[1] !== null ? String(row[1]) : '';
      allRows.push([word, meaning]);
    }
  }

  return toWords(allRows);
}

export async function parseWordListFile(file: File): Promise<WordSetWord[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv')) {
    const text = await file.text();
    return parseCsvText(text);
  }
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    return parseXlsxFile(file);
  }
  throw new Error('Unsupported file type. Choose a .csv or .xlsx file.');
}
