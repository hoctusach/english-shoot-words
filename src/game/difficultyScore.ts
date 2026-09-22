import type { WordSetWord } from '@/types/wordset';
import { snapSpeedFactor } from './DifficultyCurve';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// A dependency-free difficulty estimate. No external word-frequency API is used —
// this repo's content is largely phrasal verbs/idioms/collocations that a
// single-word frequency lookup (e.g. Datamuse) wouldn't meaningfully score anyway,
// and a network call per word would make import slow and offline-unreliable on a
// static GitHub Pages site. Length + word count (multi-word phrase) + estimated
// syllable count (vowel-group runs) + rare-letter count is a decent, instant proxy.
export function wordDifficulty(term: string): number {
  const trimmed = term.trim();
  const letters = trimmed.replace(/[^a-zA-Z]/g, '');
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  const vowelGroups = (letters.toLowerCase().match(/[aeiouy]+/g) ?? []).length;
  const rareLetters = (letters.toLowerCase().match(/[jqxzw]/g) ?? []).length;

  return letters.length * 0.6 + wordCount * 4 + rareLetters * 2 + Math.max(0, vowelGroups - 1) * 1.5;
}

const SAMPLE_SIZE = 400;

export function averageDifficulty(words: WordSetWord[]): number {
  if (words.length === 0) return 12;
  const stride = Math.max(1, Math.floor(words.length / SAMPLE_SIZE));
  let total = 0;
  let count = 0;
  for (let i = 0; i < words.length; i += stride) {
    total += wordDifficulty(words[i].term);
    count++;
  }
  return total / count;
}

const EASY_ANCHOR = 7;
const HARD_ANCHOR = 20;

// An easy set (short, common words) starts brisk; a hard set (long phrases,
// C1-style vocabulary) starts slower. The player can still override it in game.
export function defaultSpeedForSet(words: WordSetWord[]): number {
  const t = clamp((averageDifficulty(words) - EASY_ANCHOR) / (HARD_ANCHOR - EASY_ANCHOR), 0, 1);
  return snapSpeedFactor(1.3 - t * 0.55);
}
