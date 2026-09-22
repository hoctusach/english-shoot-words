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

const EASY_ANCHOR = 6;
const HARD_ANCHOR = 24;

export function difficultySpeedMultiplier(term: string): number {
  const difficulty = wordDifficulty(term);
  const t = clamp((difficulty - EASY_ANCHOR) / (HARD_ANCHOR - EASY_ANCHOR), 0, 1);
  return 1.25 - t * 0.5; // 1.25x (easy, falls faster) down to 0.75x (hard, falls slower)
}
