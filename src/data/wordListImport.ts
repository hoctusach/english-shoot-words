import type { WordSetWord } from '@/types/wordset';

const HEADER_WORD_LABELS = new Set(['word', 'term', 'vocabulary']);
const HEADER_MEANING_LABELS = new Set(['meaning', 'definition', 'translation']);

function isHeaderRow(word: string, meaning: string): boolean {
  return HEADER_WORD_LABELS.has(word.toLowerCase()) && HEADER_MEANING_LABELS.has(meaning.toLowerCase());
}

// The first word of a term with a trailing "e" dropped, so "hobble" also finds
// "hobbled" and "stumble over" finds "stumbled".
export function termStem(term: string): string {
  const first = term.trim().split(/\s+/)[0] ?? '';
  return first.length > 3 ? first.replace(/e$/i, '') : first;
}

// A 3rd column is an example only if it reads like a sentence; otherwise it is the
// tail of a meaning that had an unquoted comma in it ("run,chạy, bước nhanh").
function looksLikeSentence(text: string, term: string): boolean {
  if (text.trim().split(/\s+/).length < 3) return false;
  if (/[.!?]["')\]]?$/.test(text.trim())) return true;
  const stem = termStem(term).toLowerCase();
  return stem.length > 0 && text.toLowerCase().includes(stem);
}

export function rowToWord(fields: string[]): WordSetWord | null {
  const cells = fields.map((field) => (field ?? '').trim());
  const term = cells[0] ?? '';
  if (!term) return null;
  const rest = cells.slice(1);
  while (rest.length > 0 && rest[rest.length - 1] === '') rest.pop();

  if (rest.length >= 2 && looksLikeSentence(rest[rest.length - 1], term)) {
    const example = rest[rest.length - 1];
    const meaning = rest.slice(0, -1).filter(Boolean).join(', ');
    return { term, meaning, example };
  }
  return { term, meaning: rest.filter(Boolean).join(', ') };
}

function toWords(rows: string[][]): WordSetWord[] {
  const words: WordSetWord[] = [];
  rows.forEach((row, index) => {
    const word = rowToWord(row);
    if (!word) return;
    if (index === 0 && isHeaderRow(word.term, word.meaning.split(',')[0].trim())) return;
    words.push(word);
  });
  return words;
}

// RFC 4180: quoted fields may hold commas, line breaks and "" for a quote. A line with
// no comma but with tabs is read as tab-separated.
export function parseCsv(text: string): string[][] {
  const source = text.replace(/^﻿/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let separator = ',';

  const pickSeparator = (from: number) => {
    const end = source.slice(from).search(/\r|\n/);
    const line = end === -1 ? source.slice(from) : source.slice(from, from + end);
    separator = !line.includes(',') && line.includes('\t') ? '\t' : ',';
  };
  const endRow = () => {
    row.push(field);
    if (row.some((cell) => cell.trim() !== '')) rows.push(row);
    row = [];
    field = '';
  };

  pickSeparator(0);
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (inQuotes) {
      if (ch === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"' && field.trim() === '') {
      field = '';
      inQuotes = true;
    } else if (ch === separator) {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && source[i + 1] === '\n') i++;
      endRow();
      pickSeparator(i + 1);
    } else {
      field += ch;
    }
  }
  if (field !== '' || row.length > 0) endRow();
  return rows;
}

export function wordsFromCsvText(text: string): WordSetWord[] {
  return toWords(parseCsv(text));
}

async function parseXlsxFile(file: File): Promise<WordSetWord[]> {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const allRows: string[][] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const sheetRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
    for (const row of sheetRows) {
      allRows.push(row.map((cell) => (cell !== undefined && cell !== null ? String(cell) : '')));
    }
  }

  return toWords(allRows);
}

export async function parseWordListFile(file: File): Promise<WordSetWord[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv')) {
    return wordsFromCsvText(await file.text());
  }
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    return parseXlsxFile(file);
  }
  throw new Error('Unsupported file type. Choose a .csv or .xlsx file.');
}
