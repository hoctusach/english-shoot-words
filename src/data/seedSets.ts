// Word sets that ship with the game, so a first visit (web or installed app) has
// something to play right away. Each is added once per device: a player who deletes
// one doesn't get it back, and nobody gets a second copy of words they imported.
// The word lists load on demand, only on the visit that adds them, so they don't
// weigh down every page load.
import { SEEDED_SETS_KEY } from '@/utils/storageKeys';
import { wordsFromCsvText } from '@/data/wordListImport';
import { addWordSetWithId, getLastSelectedSetId, loadWordSets, setLastSelectedSetId } from '@/data/wordSetStore';
import { termKey } from '@/data/progressStore';

interface SeedSet {
  id: string;
  name: string;
  fileName: string;
  loadCsv: () => Promise<string>;
}

// Listed in the order a fresh device shows them; the first becomes the Continue set.
const SEED_SETS: SeedSet[] = [
  {
    id: 'seed-movers-a1',
    name: 'Movers A1',
    fileName: 'movers_wordlist_a1only.csv',
    loadCsv: () => import('./seed/movers-a1.csv?raw').then((m) => m.default),
  },
  {
    id: 'seed-ways-of-walking-c1',
    name: 'Ways of Walking (C1)',
    fileName: 'vocabulary-C1-WaysOfWalking.csv',
    loadCsv: () => import('./seed/ways-of-walking-c1.csv?raw').then((m) => m.default),
  },
  {
    id: 'seed-advanced-b2-c1',
    name: 'Nâng cao B2–C1 (idioms, phrasal verbs)',
    fileName: 'defaultVocabulary4_typing.csv',
    loadCsv: () => import('./seed/advanced-b2-c1.csv?raw').then((m) => m.default),
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

// Resolves to true when at least one set was added.
export async function seedWordSets(): Promise<boolean> {
  if (typeof localStorage === 'undefined') return false;
  const seeded = loadSeeded();
  const pending = SEED_SETS.filter((seed) => !seeded.includes(seed.id));
  if (pending.length === 0) return false;

  let addedAny = false;
  for (const seed of pending) {
    let csv: string;
    try {
      csv = await seed.loadCsv();
    } catch {
      continue; // offline on a first visit: try again next time
    }
    seeded.push(seed.id);

    const words = wordsFromCsvText(csv);
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
    if (added) {
      addedAny = true;
      if (!getLastSelectedSetId()) setLastSelectedSetId(seed.id);
    }
  }

  try {
    localStorage.setItem(SEEDED_SETS_KEY, JSON.stringify(seeded));
  } catch {
    // storage full or blocked: try again next visit
  }
  return addedAny;
}
