import { PROGRESS_KEY_PREFIX } from '@/utils/storageKeys';
import type { WordSetWord } from '@/types/wordset';

// Per word set, per word: [times shown, times typed correctly]. A word counts as
// "shown" once it resolves — shot down or fallen off the bottom — so a word still
// on screen when the player quits stays unseen.
export type ProgressMap = Record<string, [number, number]>;

export function termKey(term: string): string {
  return term.trim().toLowerCase();
}

function storageKey(setId: string): string {
  return `${PROGRESS_KEY_PREFIX}${setId}`;
}

export function loadProgress(setId: string): ProgressMap {
  if (typeof localStorage === 'undefined') return {};
  const raw = localStorage.getItem(storageKey(setId));
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function saveProgress(setId: string, map: ProgressMap): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(storageKey(setId), JSON.stringify(map));
}

export function deleteProgress(setId: string): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(storageKey(setId));
}

export interface WordStat {
  shown: number;
  correct: number;
  misses: number;
  // misses not yet paid back by correct answers; > 0 means the word still needs review
  need: number;
}

export function statFor(map: ProgressMap, term: string): WordStat {
  const [shown, correct] = map[termKey(term)] ?? [0, 0];
  const misses = shown - correct;
  return { shown, correct, misses, need: misses - correct };
}

export interface ProgressSummary {
  total: number;
  seen: number;
  learned: number;
  toReview: number;
  unseen: number;
  hardest: (WordSetWord & WordStat)[];
}

export function summarizeProgress(words: WordSetWord[], map: ProgressMap, hardestCount = 5): ProgressSummary {
  const unique = new Map<string, WordSetWord>();
  for (const word of words) {
    const key = termKey(word.term);
    if (key && !unique.has(key)) unique.set(key, word);
  }

  let seen = 0;
  let toReview = 0;
  const review: (WordSetWord & WordStat)[] = [];
  for (const word of unique.values()) {
    const stat = statFor(map, word.term);
    if (stat.shown === 0) continue;
    seen++;
    if (stat.need > 0) {
      toReview++;
      review.push({ ...word, ...stat });
    }
  }

  review.sort((a, b) => b.need - a.need || b.misses - a.misses);
  return {
    total: unique.size,
    seen,
    learned: seen - toReview,
    toReview,
    unseen: unique.size - seen,
    hardest: review.slice(0, hardestCount),
  };
}
