export interface WordSetWord {
  term: string;
  meaning: string;
  // optional example sentence (3rd column of the imported file)
  example?: string;
}

export interface WordSet {
  id: string;
  name: string;
  words: WordSetWord[];
  createdAt: string;
  bestScore?: number;
  speedFactor?: number;
  sourceFileName?: string;
}
