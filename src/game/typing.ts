// Word lists copied from documents often use typographic punctuation (didn’t, “quote”,
// well–known), which no phone or laptop keyboard types by default. Fold each of those
// characters to the plain one a keyboard produces. Every mapping is one character to
// one character, so positions in the original term still line up for highlighting.
const LOOKALIKES: Record<string, string> = {
  '‘': "'", // ‘
  '’': "'", // ’
  '‚': "'", // ‚
  '‛': "'", // ‛
  '′': "'", // ′
  'ʼ': "'", // ʼ
  '´': "'", // ´
  '`': "'",
  '“': '"', // “
  '”': '"', // ”
  '„': '"', // „
  '‐': '-', // ‐
  '‑': '-', // non-breaking hyphen
  '‒': '-', // ‒
  '–': '-', // –
  '—': '-', // —
  '−': '-', // −
  ' ': ' ', // non-breaking space
};

const LOOKALIKE_PATTERN = new RegExp(`[${Object.keys(LOOKALIKES).join('')}]`, 'g');

// Accented letters in English loanwords (exposé, café, naïve, piñata) fold to the
// plain letter an English keyboard types, one character to one character. Only the
// marks those words use: Vietnamese-only marks (ư, ơ, ă, ả, ạ) stay, so a stray
// Vietnamese-typing "ư" doesn't pass for "u".
// grave, acute, circumflex, tilde, diaeresis, ring, cedilla
const LOANWORD_MARKS = /^[a-z][̧̀́̂̃̈̊]+$/;

function foldAccent(ch: string): string {
  if (ch === 'đ') return 'd';
  const base = ch.normalize('NFD');
  return LOANWORD_MARKS.test(base) ? base[0] : ch;
}

export function normalizeForTyping(text: string): string {
  return text
    .toLowerCase()
    .replace(LOOKALIKE_PATTERN, (ch) => LOOKALIKES[ch])
    .replace(/[^\x00-\x7f]/g, foldAccent);
}
