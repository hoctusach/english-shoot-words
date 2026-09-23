import {
  loadProgress,
  saveProgress,
  statFor,
  termKey,
  type ProgressEntry,
  type ProgressMap,
  type WordStat,
} from '@/data/progressStore';

export class ProgressTracker {
  private map: ProgressMap;
  private rightThisRound = new Set<string>();

  constructor(private setId: string) {
    this.map = loadProgress(setId);
  }

  stat(term: string): WordStat {
    return statFor(this.map, term);
  }

  typedRightThisRound(term: string): boolean {
    return this.rightThisRound.has(termKey(term));
  }

  recordCorrect(term: string): void {
    const entry = this.entry(term);
    entry[0]++;
    entry[1]++;
    entry[2] = 1;
    this.rightThisRound.add(termKey(term));
    saveProgress(this.setId, this.map);
  }

  recordMiss(term: string): void {
    const entry = this.entry(term);
    entry[0]++;
    entry[2] = 0;
    saveProgress(this.setId, this.map);
  }

  private entry(term: string): ProgressEntry {
    const key = termKey(term);
    if (!this.map[key]) this.map[key] = [0, 0];
    return this.map[key];
  }
}
