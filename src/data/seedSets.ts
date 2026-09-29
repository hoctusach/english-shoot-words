// Word sets that ship with the game, so a first visit (web or installed app) has
// something to play right away. Each is added once per device: a player who deletes
// one doesn't get it back, and nobody gets a second copy of words they imported.
import waysOfWalkingCsv from './seed/ways-of-walking-c1.csv?raw';
import { SEEDED_SETS_KEY } from '@/utils/storageKeys';
import { wordsFromCsvText } from '@/data/wordListImport';
import { addWordSetWithId, getLastSelectedSetId, loadWordSets, setLastSelectedSetId } from '@/data/wordSetStore';
import { termKey } from '@/data/progressStore';

interface SeedSet {
  id: string;
  name: string;
  fileName: string;
  csv: string;
}

const SEED_SETS: SeedSet[] = [
  {
    id: 'seed-ways-of-walking-c1',
    name: 'Ways of Walking (C1)',
    fileName: 'vocabulary-C1-WaysOfWalking.csv',
    csv: waysOfWalkingCsv,
  },
];

function loadSeeded(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(SEEDED_SETS_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function sameWords(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((term) => set.has(term));
}

export function seedWordSets(): void {
  if (typeof localStorage === 'undefined') return;
  const seeded = loadSeeded();
  let changed = false;

  for (const seed of SEED_SETS) {
    if (seeded.includes(seed.id)) continue;
    seeded.push(seed.id);
    changed = true;

    const words = wordsFromCsvText(seed.csv);
    const terms = words.map((w) => termKey(w.term));
    const alreadyImported = loadWordSets().some((set) =>
      sameWords(set.words.map((w) => termKey(w.term)), terms),
    );
    if (alreadyImported || words.length === 0) continue;

    const added = addWordSetWithId({
      id: seed.id,
      name: seed.name,
      words,
      createdAt: new Date().toISOString(),
      sourceFileName: seed.fileName,
    });
    if (added && !getLastSelectedSetId()) setLastSelectedSetId(seed.id);
  }

  if (changed) {
    try {
      localStorage.setItem(SEEDED_SETS_KEY, JSON.stringify(seeded));
    } catch {
      // storage full or blocked: try again next visit
    }
  }
}
