// Word sets that ship with the game, so a first visit (web or installed app) has
// something to play right away. Each is added once per device: a player who deletes
// one doesn't get it back, and nobody gets a second copy of words they imported.
// The word lists load on demand, only on the visit that adds them, so they don't
// weigh down every page load.
import { SEEDED_SETS_KEY, SEED_UPDATES_KEY } from '@/utils/storageKeys';
import { wordsFromCsvText } from '@/data/wordListImport';
import { addWordSetWithId, fillWordExamples, loadWordSets, renameWordSet } from '@/data/wordSetStore';
import { termKey } from '@/data/progressStore';

interface SeedSet {
  id: string;
  name: string;
  // names this set shipped with before; a device still showing one gets the new name
  previousNames?: string[];
  fileName: string;
  loadCsv: () => Promise<string>;
  // raised when a release adds example sentences to this set; devices that already
  // have it get them filled in once
  examplesVersion?: number;
}

// Listed in the order a fresh device shows them.
export const FIRST_PLAY_SET_ID = 'seed-ways-of-walking-c1';
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
    name: 'advanced_words',
    previousNames: ['Nâng cao B2–C1 (idioms, phrasal verbs)'],
    fileName: 'defaultVocabulary4_typing.csv',
    loadCsv: () => import('./seed/advanced-b2-c1.csv?raw').then((m) => m.default),
    examplesVersion: 1,
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

// Same list of words, ignoring repeats (sets imported before repeated rows were merged
// still hold them).
function sameWords(a: string[], b: string[]): boolean {
  const setA = new Set(a);
  const setB = new Set(b);
  if (setA.size !== setB.size) return false;
  return [...setB].every((term) => setA.has(term));
}

// A built-in set renamed in a later release: update devices that still show the old
// name, but never a name the player chose.
function applyRenames(): void {
  const sets = loadWordSets();
  for (const seed of SEED_SETS) {
    if (!seed.previousNames) continue;
    const set = sets.find((s) => s.id === seed.id);
    if (set && seed.previousNames.includes(set.name)) renameWordSet(seed.id, seed.name);
  }
}

function loadUpdates(): Record<string, number> {
  try {
    const parsed = JSON.parse(localStorage.getItem(SEED_UPDATES_KEY) ?? '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

// A built-in set that gained example sentences in a later release: fill them in on
// devices that added the set before, keyed by term. The player's progress, scores and
// any example they wrote themselves stay as they are. A set the player deleted, or
// their own import of the same list, is left alone.
async function applyExampleUpdates(): Promise<void> {
  const done = loadUpdates();
  const sets = loadWordSets();
  let changed = false;
  for (const seed of SEED_SETS) {
    if (!seed.examplesVersion || (done[seed.id] ?? 0) >= seed.examplesVersion) continue;
    const set = sets.find((s) => s.id === seed.id);
    if (set && set.words.some((w) => !w.example)) {
      let csv: string;
      try {
        csv = await seed.loadCsv();
      } catch {
        continue; // offline: try again next visit
      }
      const examples = new Map<string, string>();
      for (const word of wordsFromCsvText(csv)) {
        if (word.example) examples.set(termKey(word.term), word.example);
      }
      fillWordExamples(seed.id, examples, termKey);
    }
    done[seed.id] = seed.examplesVersion;
    changed = true;
  }
  if (!changed) return;
  try {
    localStorage.setItem(SEED_UPDATES_KEY, JSON.stringify(done));
  } catch {
    // storage full or blocked: try again next visit
  }
}

// Resolves to true when at least one set was added.
export async function seedWordSets(): Promise<boolean> {
  if (typeof localStorage === 'undefined') return false;
  applyRenames();
  await applyExampleUpdates();
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
    if (added) addedAny = true;
  }

  try {
    localStorage.setItem(SEEDED_SETS_KEY, JSON.stringify(seeded));
  } catch {
    // storage full or blocked: try again next visit
  }
  return addedAny;
}
