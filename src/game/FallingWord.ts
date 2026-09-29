export interface FallingWord {
  id: string;
  term: string;
  meaning: string;
  example?: string;
  // left edge of the text; the plate extends PLATE_PADDING × scale further left
  x: number;
  y: number;
  // 1 = normal size; smaller for a phrase too long for the screen
  scale: number;
  // on-screen width of the plate, padding included
  width: number;
}

// horizontal padding of the dark plate behind a word, at scale 1
export const PLATE_PADDING = 6;
