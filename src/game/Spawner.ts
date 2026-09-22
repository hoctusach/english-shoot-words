import type { WordSetWord } from '@/types/wordset';

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export class Spawner {
  private pool: WordSetWord[];
  private index = 0;

  constructor(words: WordSetWord[]) {
    this.pool = shuffle(words);
  }

  next(activeTerms: Set<string>): WordSetWord | null {
    if (this.pool.length === 0) return null;
    for (let attempts = 0; attempts < this.pool.length; attempts++) {
      if (this.index >= this.pool.length) {
        this.pool = shuffle(this.pool);
        this.index = 0;
      }
      const candidate = this.pool[this.index];
      this.index++;
      if (!activeTerms.has(candidate.term.toLowerCase())) {
        return candidate;
      }
    }
    return null;
  }
}
