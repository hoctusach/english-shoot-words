export interface WordSetWord {
  term: string;
  meaning: string;
}

export interface WordSet {
  id: string;
  name: string;
  words: WordSetWord[];
  createdAt: string;
  bestScore?: number;
  sourceFileName?: string;
}
