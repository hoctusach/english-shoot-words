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

export function normalizeForTyping(text: string): string {
  return text.toLowerCase().replace(LOOKALIKE_PATTERN, (ch) => LOOKALIKES[ch]);
}
