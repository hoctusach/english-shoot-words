import type { WordSetWord } from '@/types/wordset';
import { termKey } from '@/data/progressStore';
import { seededRandom } from './GameMode';

// Challenge order: the set's words shuffled once with a fixed seed, played front to
// back and then again from the start. It ignores learning progress, so every attempt
// on the set sees exactly the same sequence.
export class ChallengeSpawner {
  private order: WordSetWord[];
  private cursor = 0;

  constructor(words: WordSetWord[], seed: number) {
    const unique = new Map<string, WordSetWord>();
    for (const word of words) {
      const key = termKey(word.term);
      if (key && !unique.has(key)) unique.set(key, word);
    }
    const random = seededRandom(seed);
    const arr = [...unique.values()];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    this.order = arr;
  }

  next(activeTerms: Set<string>): WordSetWord | null {
    const count = this.order.length;
    // a word still on screen from the previous lap is skipped, not reordered
    for (let i = 0; i < count; i++) {
      const word = this.order[this.cursor];
      this.cursor = (this.cursor + 1) % count;
      if (!activeTerms.has(termKey(word.term))) return word;
    }
    return null;
  }
}
