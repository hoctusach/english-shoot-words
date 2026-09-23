import type { WordSetWord } from '@/types/wordset';
import { termKey } from '@/data/progressStore';
import type { ProgressTracker } from './ProgressTracker';

// Every 4 spawns: 1 never-seen word, then 3 words whose last attempt was a miss
// (most-missed first). Whichever pool is empty lends its slot to the other, so a
// short review list is topped up with new words. A word typed right this round is
// not served again this round.
const SPAWNS_PER_NEW_WORD = 4;
// A word just spawned is held back for a few spawns so the review pool rotates.
const RECENT_WINDOW = 6;

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export class Spawner {
  private words: WordSetWord[];
  private newCursor = 0;
  private slot = 0;
  private recent: string[] = [];

  constructor(words: WordSetWord[], private progress: ProgressTracker) {
    const unique = new Map<string, WordSetWord>();
    for (const word of words) {
      const key = termKey(word.term);
      if (key && !unique.has(key)) unique.set(key, word);
    }
    this.words = shuffle([...unique.values()]);
  }

  next(activeTerms: Set<string>): WordSetWord | null {
    if (this.words.length === 0) return null;

    const preferNew = this.slot % SPAWNS_PER_NEW_WORD === 0;
    this.slot++;

    const chosen =
      (preferNew
        ? this.pickNew(activeTerms) ?? this.pickReview(activeTerms)
        : this.pickReview(activeTerms) ?? this.pickNew(activeTerms)) ??
      // nothing new and nothing missed: bring back words typed right in earlier rounds
      this.pickFewestCorrect(activeTerms, { skipRightThisRound: true, respectRecent: true }) ??
      this.pickFewestCorrect(activeTerms, { skipRightThisRound: true, respectRecent: false }) ??
      // the whole set was typed right this round: start it over
      this.pickFewestCorrect(activeTerms, { skipRightThisRound: false, respectRecent: false });

    if (chosen) {
      this.recent.push(termKey(chosen.term));
      if (this.recent.length > RECENT_WINDOW) this.recent.shift();
    }
    return chosen;
  }

  private pickNew(active: Set<string>): WordSetWord | null {
    const count = this.words.length;
    for (let i = 0; i < count; i++) {
      const index = (this.newCursor + i) % count;
      const word = this.words[index];
      if (active.has(termKey(word.term))) continue;
      if (this.progress.stat(word.term).shown > 0) continue;
      this.newCursor = (index + 1) % count;
      return word;
    }
    return null;
  }

  // A small review pool may sit entirely inside the recent window; repeating one of
  // those words beats handing its 1:3 slot to a new word.
  private pickReview(active: Set<string>): WordSetWord | null {
    return this.pickMostMissed(active, true) ?? this.pickMostMissed(active, false);
  }

  private pickMostMissed(active: Set<string>, respectRecent: boolean): WordSetWord | null {
    let best: WordSetWord | null = null;
    let bestMisses = -1;
    let bestCorrect = Infinity;
    for (const word of this.words) {
      const key = termKey(word.term);
      if (active.has(key) || (respectRecent && this.recent.includes(key))) continue;
      const { lastMissed, misses, correct } = this.progress.stat(word.term);
      if (!lastMissed) continue;
      if (misses > bestMisses || (misses === bestMisses && correct < bestCorrect)) {
        best = word;
        bestMisses = misses;
        bestCorrect = correct;
      }
    }
    return best;
  }

  private pickFewestCorrect(
    active: Set<string>,
    { skipRightThisRound, respectRecent }: { skipRightThisRound: boolean; respectRecent: boolean },
  ): WordSetWord | null {
    let best: WordSetWord | null = null;
    let bestCorrect = Infinity;
    for (const word of this.words) {
      const key = termKey(word.term);
      if (active.has(key) || (respectRecent && this.recent.includes(key))) continue;
      if (skipRightThisRound && this.progress.typedRightThisRound(word.term)) continue;
      const { correct } = this.progress.stat(word.term);
      if (correct < bestCorrect) {
        best = word;
        bestCorrect = correct;
      }
    }
    return best;
  }
}
