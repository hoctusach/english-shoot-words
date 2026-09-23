import { loadProgress, saveProgress, statFor, termKey, type ProgressMap, type WordStat } from '@/data/progressStore';

export class ProgressTracker {
  private map: ProgressMap;

  constructor(private setId: string) {
    this.map = loadProgress(setId);
  }

  stat(term: string): WordStat {
    return statFor(this.map, term);
  }

  recordCorrect(term: string): void {
    const entry = this.entry(term);
    entry[0]++;
    entry[1]++;
    saveProgress(this.setId, this.map);
  }

  recordMiss(term: string): void {
    this.entry(term)[0]++;
    saveProgress(this.setId, this.map);
  }

  private entry(term: string): [number, number] {
    const key = termKey(term);
    if (!this.map[key]) this.map[key] = [0, 0];
    return this.map[key];
  }
}
