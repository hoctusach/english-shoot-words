import type { WordSetWord } from '@/types/wordset';

// Mirrors lazy-vocabulary's SheetManager/SheetNormalizer/SheetProcessor
// (src/services/sheet/*.ts) so files exported for that app also import here.
export const RECOGNIZED_CATEGORIES = [
  'phrasal verbs',
  'idioms',
  'topic vocab',
  'grammar',
  'phrases, collocations',
  'word formation',
] as const;

export type RecognizedCategory = (typeof RECOGNIZED_CATEGORIES)[number];

export interface ImportedSheet {
  category: RecognizedCategory;
  words: WordSetWord[];
}

const WORD_KEYS = ['Word', 'word', 'WORD', 'Vocabulary', 'vocabulary', 'Term', 'term'];
const MEANING_KEYS = ['Meaning', 'meaning', 'MEANING', 'Definition', 'definition', 'Translation', 'translation'];

function normalizeSheetName(name: string): RecognizedCategory | null {
  const normalized = name.toLowerCase().trim();
  if (normalized.includes('phrasal') || normalized.includes('verb')) return 'phrasal verbs';
  if (normalized.includes('idiom')) return 'idioms';
  if (normalized.includes('advanced')) return 'topic vocab';
  if (normalized.includes('grammar')) return 'grammar';
  if (normalized.includes('formation')) return 'word formation';
  if (normalized.includes('phrase') || normalized.includes('collocation')) return 'phrases, collocations';
  return null;
}

function findValue(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim();
    }
  }
  return '';
}

export async function parseVocabularyXlsx(file: File): Promise<ImportedSheet[]> {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheets = new Map<RecognizedCategory, WordSetWord[]>();

  for (const sheetName of workbook.SheetNames) {
    const category = normalizeSheetName(sheetName);
    if (!category) continue;

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
    const words: WordSetWord[] = [];
    for (const row of rows) {
      const term = findValue(row, WORD_KEYS);
      const meaning = findValue(row, MEANING_KEYS);
      if (!term) continue;
      words.push({ term, meaning });
    }
    if (words.length === 0) continue;

    const existing = sheets.get(category);
    if (existing) existing.push(...words);
    else sheets.set(category, words);
  }

  return Array.from(sheets.entries()).map(([category, words]) => ({ category, words }));
}
