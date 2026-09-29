// Practice: endless, adaptive word choice, speed adjustable while playing.
// Challenge: every attempt on a set gets the same words in the same order at a fixed
// speed, and ends after `missLimit` missed words, so kids' scores can be compared.
export type GameMode =
  | { kind: 'practice' }
  | { kind: 'challenge'; missLimit: number; speed: number; seed: number };

export const PRACTICE: GameMode = { kind: 'practice' };
export const DEFAULT_MISS_LIMIT = 10;
export const MAX_MISS_LIMIT = 30;

// Stable 32-bit hash of a string (FNV-1a), used to seed a set's challenge order.
export function hashString(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

// Small deterministic random generator (mulberry32): same seed, same sequence.
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
