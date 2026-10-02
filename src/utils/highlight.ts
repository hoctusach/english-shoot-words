import { escapeHtml } from '@/utils/dom';

// Picks the term out of its example sentence, in bold: "hobbled" for hobble, "calm her
// down" (calm … down) for calm down, "was under house arrest" for "to be under house
// arrest", "brought up" for bring up.

// Small words of a phrase: matched exactly, never as a prefix ("a" must not light up
// every word starting with a).
const FUNCTION_WORDS = new Set([
  'a', 'an', 'the', 'to', 'of', 'in', 'on', 'at', 'by', 'for', 'from', 'with', 'up', 'down',
  'out', 'off', 'over', 'into', 'onto', 'about', 'around', 'round', 'away', 'back', 'through',
  'across', 'along', 'after', 'before', 'under', 'behind', 'as', 'and', 'or', 'but', 'it',
  'its', 'that', 'this', 'so', 'no', 'not', 'all', 'one', 'than', 'too', 'very', 'what',
  'how', 'if', 'own', 'your', 'my', 'his', 'her', 'their', 'our', 'is', 'yet', 'more',
  'less', 'well', 'apart', 'aside', 'ahead', 'together', 'upon', 'against', 'without',
]);

// Stand-ins for "somebody/something" in dictionary-style phrases.
const PLACEHOLDERS = new Set([
  'sb', 'sth', 'somebody', 'someone', 'something', "one's", 'oneself', "sb's", "someone's",
  "somebody's", "doing", 'etc', 'etc.', 'sb/sth', 'sth/sb',
]);

const BE_FORMS = ['be', 'am', 'is', 'are', 'was', 'were', 'been', 'being'];

// "your"/"yourself" in a dictionary phrase stand for whoever it is about
// (stick to your guns → sticks to her guns, kick yourself → kicked myself).
const POSSESSIVE = "(?:my|your|his|her|its|our|their|one's|[\\w-]+['’]s)";
const REFLEXIVE = '(?:myself|yourself|himself|herself|itself|ourselves|yourselves|themselves|oneself)';

// Irregular past forms of common verbs (regular -ed/-ing/-s forms are found by prefix).
const IRREGULAR: Record<string, string[]> = {
  arise: ['arose', 'arisen'], awake: ['awoke', 'awoken'], bear: ['bore', 'borne', 'born'],
  beat: ['beaten'], become: ['became'], begin: ['began', 'begun'], bend: ['bent'],
  bid: ['bade', 'bidden'], bind: ['bound'], bite: ['bit', 'bitten'], bleed: ['bled'],
  blow: ['blew', 'blown'], break: ['broke', 'broken'], breed: ['bred'], bring: ['brought'],
  build: ['built'], burn: ['burnt'], burst: ['burst'], buy: ['bought'], catch: ['caught'],
  choose: ['chose', 'chosen'], cling: ['clung'], come: ['came'], creep: ['crept'],
  deal: ['dealt'], dig: ['dug'], do: ['did', 'done', 'does', 'doing'], draw: ['drew', 'drawn'],
  dream: ['dreamt'], drink: ['drank', 'drunk'], drive: ['drove', 'driven'], eat: ['ate', 'eaten'],
  fall: ['fell', 'fallen'], feed: ['fed'], feel: ['felt'], fight: ['fought'], find: ['found'],
  flee: ['fled'], fling: ['flung'], fly: ['flew', 'flown', 'flies'], forbid: ['forbade', 'forbidden'],
  forget: ['forgot', 'forgotten'], forgive: ['forgave', 'forgiven'], freeze: ['froze', 'frozen'],
  get: ['got', 'gotten'], give: ['gave', 'given'], go: ['went', 'gone', 'goes'],
  grind: ['ground'], grow: ['grew', 'grown'], hang: ['hung'], have: ['had', 'has', 'having'],
  hear: ['heard'], hide: ['hid', 'hidden'], hold: ['held'], keep: ['kept'], kneel: ['knelt'],
  know: ['knew', 'known'], lay: ['laid'], lead: ['led'], leap: ['leapt'], learn: ['learnt'],
  leave: ['left'], lend: ['lent'], lie: ['lay', 'lain', 'lying'], light: ['lit'],
  lose: ['lost'], make: ['made'], mean: ['meant'], meet: ['met'], mislead: ['misled'],
  overcome: ['overcame'], overtake: ['overtook', 'overtaken'], pay: ['paid'], plead: ['pled'],
  ride: ['rode', 'ridden'], ring: ['rang', 'rung'], rise: ['rose', 'risen'], run: ['ran'],
  say: ['said'], see: ['saw', 'seen'], seek: ['sought'], sell: ['sold'], send: ['sent'],
  shake: ['shook', 'shaken'], shine: ['shone'], shoot: ['shot'], show: ['shown'],
  shrink: ['shrank', 'shrunk'], sing: ['sang', 'sung'], sink: ['sank', 'sunk'], sit: ['sat'],
  sleep: ['slept'], slide: ['slid'], sling: ['slung'], speak: ['spoke', 'spoken'],
  speed: ['sped'], spend: ['spent'], spin: ['spun'], spring: ['sprang', 'sprung'],
  stand: ['stood'], steal: ['stole', 'stolen'], stride: ['strode', 'stridden'], stick: ['stuck'], sting: ['stung'],
  stink: ['stank', 'stunk'], strike: ['struck', 'stricken'], strive: ['strove', 'striven'],
  swear: ['swore', 'sworn'], sweep: ['swept'], swim: ['swam', 'swum'], swing: ['swung'],
  take: ['took', 'taken'], teach: ['taught'], tear: ['tore', 'torn'], tell: ['told'],
  think: ['thought'], throw: ['threw', 'thrown'], tread: ['trod', 'trodden'],
  understand: ['understood'], undertake: ['undertook', 'undertaken'], undergo: ['underwent', 'undergone'],
  uphold: ['upheld'], wake: ['woke', 'woken'], wear: ['wore', 'worn'], weave: ['wove', 'woven'],
  weep: ['wept'], win: ['won'], wind: ['wound'], withdraw: ['withdrew', 'withdrawn'],
  withhold: ['withheld'], withstand: ['withstood'], wring: ['wrung'], write: ['wrote', 'written'],
  outgrow: ['outgrew', 'outgrown'], oversee: ['oversaw', 'overseen'], foresee: ['foresaw', 'foreseen'],
  forsake: ['forsook', 'forsaken'], mistake: ['mistook', 'mistaken'], partake: ['partook', 'partaken'],
  overhear: ['overheard'], overthrow: ['overthrew', 'overthrown'], dwell: ['dwelt'],
  spill: ['spilt'], spoil: ['spoilt'], spell: ['spelt'], smell: ['smelt'], lean: ['leant'],
};

const APOSTROPHE = "['’]";

const SUFFIX =
  '(?:s|es|ed|d|ing|n|en|er|ers|est|ly|y|ies|ied|ist|ists|ism|al|ful|less|ness|ment|ments|ion|ions|able|ive|ity|ise|ize|ised|ized)';
// up to two endings, with a doubled consonant allowed (pen → penned, mean → meaningful)
const SHORT_TAIL = `(?:[a-z]?${SUFFIX}){0,2}`;
// after a final e kept in place: cares, cared, careful, carer (but not care+er = "career")
const AFTER_E = '(?:s|d|r|rs|st|ly|ful|less|ness|ment|ments)';
// replacing a final e: caring, racist, creation, believable
const INSTEAD_OF_E = '(?:ing|ion|ions|able|al|ist|ists|ism|ity|ive|y|ied|ies)';

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// A word of the term as a pattern, with its other forms.
// `verb`: the first word of a phrase, which can be a verb even when it is a small word
// (back out → backed out).
function wordPattern(word: string, verb = false): string {
  const literal = (w: string) => escapeRegex(w).replace(/'/g, APOSTROPHE);
  if (word === 'be') return `(?:${BE_FORMS.join('|')})`;
  if (word === 'your') return POSSESSIVE;
  if (word === 'yourself' || word === 'yourselves') return REFLEXIVE;
  if (FUNCTION_WORDS.has(word) && !(verb && word.length >= 3)) return literal(word);
  const forms = (IRREGULAR[word] ?? []).map(literal);
  const w = literal(word);
  if (word.length > 5) {
    // long words: any word they start, minus a final e/y (hobble → hobbled, carry → carried)
    forms.unshift(`${literal(word.replace(/[ey]$/, ''))}[\\w-]*`);
  } else if (word.length > 3 && word.endsWith('e')) {
    // short words only take endings, so "care" doesn't light up "career"
    forms.unshift(`${w}${AFTER_E}?`, `${literal(word.slice(0, -1))}${INSTEAD_OF_E}${SHORT_TAIL}`);
  } else if (word.length >= 3 && /[^aeiou]y$/.test(word)) {
    forms.unshift(`${w}${SHORT_TAIL}`, `${literal(word.slice(0, -1))}i${SUFFIX}${SHORT_TAIL}`);
  } else {
    forms.unshift(`${w}${SHORT_TAIL}`);
  }
  return `(?:${forms.join('|')})`;
}

// The term as a list of slots, each slot one or more alternative words
// ("knock or pull or tear down" → [knock|pull|tear] [down]).
function termSlots(term: string): string[][] {
  const words = term
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/\([^)]*\)|\[[^\]]*\]/g, ' ')
    .split(/[\s/]+/)
    .map((w) => w.replace(/^['".,;:!?]+|['".,;:!?]+$/g, ''))
    .filter((w) => w && !PLACEHOLDERS.has(w) && !PLACEHOLDERS.has(w.replace(/'/g, '')));
  while (words.length > 1 && words[0] === 'to') words.shift();

  const slots: string[][] = [];
  for (let i = 0; i < words.length; i++) {
    if (words[i] === 'or' && slots.length > 0 && i + 1 < words.length) {
      slots[slots.length - 1].push(words[++i]);
    } else {
      slots.push([words[i]]);
    }
  }
  return slots;
}

const slotPattern = (slot: string[], index: number) =>
  `(${slot.map((w) => wordPattern(w, index === 0)).join('|')})`;
const WORD_START = "(?<![\\w'’-])";
const WORD_END = "(?![\\w'’-])";

// Each slot matched in order, up to three other words in between (calm her down).
function findPhrase(
  example: string,
  slots: string[][],
  maxGap = 3,
): { start: number; parts: [number, number][] } | null {
  if (slots.length === 0) return null;
  const gap = `((?:[^\\w'’]+[\\w'’-]+){0,${maxGap}}?[^\\w'’]+)`;
  const source = WORD_START + slots.map(slotPattern).join(gap) + WORD_END;
  const match = new RegExp(source, 'i').exec(example);
  if (!match) return null;
  const parts: [number, number][] = [];
  let at = match.index;
  for (let g = 1; g < match.length; g++) {
    const text = match[g] ?? '';
    if (g % 2 === 1) parts.push([at, at + text.length]);
    at += text.length;
  }
  return { start: match.index, parts };
}

// Fallback: the term's own words (not the small ones) wherever they appear.
function findWords(example: string, slots: string[][]): [number, number][] {
  const content = slots.flat().filter((w) => !FUNCTION_WORDS.has(w) && w !== 'be');
  if (content.length === 0) return [];
  const re = new RegExp(WORD_START + `(?:${content.map((w) => wordPattern(w)).join('|')})` + WORD_END, 'gi');
  const parts: [number, number][] = [];
  for (const m of example.matchAll(re)) parts.push([m.index!, m.index! + m[0].length]);
  return parts;
}

// Last resort for word-formation lists: a longer word built on the term (appear →
// disappear, know → acknowledged, reason → unreasonable).
function findInsideWords(example: string, slots: string[][]): [number, number][] {
  const content = slots.flat().filter((w) => w.length >= 4 && !FUNCTION_WORDS.has(w));
  if (content.length === 0) return [];
  const stems = content.map((w) => escapeRegex(w.length > 4 ? w.replace(/e$/, '') : w).replace(/'/g, APOSTROPHE));
  const re = new RegExp(`[\\w-]*(?:${stems.join('|')})[\\w-]*`, 'gi');
  const parts: [number, number][] = [];
  for (const m of example.matchAll(re)) parts.push([m.index!, m.index! + m[0].length]);
  return parts;
}

const ARTICLES = new Set(['a', 'an', 'the']);

// The term word by word, with no "or" alternatives: idioms like "no rhyme or reason".
function literalSlots(term: string): string[][] {
  return termSlots(term.replace(/\s+or\s+/gi, ' __or__ ')).map((slot) => slot.map((w) => (w === '__or__' ? 'or' : w)));
}

// Spans of the example to bold (empty when the term is not found).
export function termSpans(example: string, term: string): [number, number][] {
  return termMatch(example, term).spans;
}

// How the term was found: the whole phrase, only some of its words, or inside longer
// words (used by checks on the built-in examples).
export function termMatch(
  example: string,
  term: string,
): { spans: [number, number][]; kind: 'phrase' | 'words' | 'inside' | 'none' } {
  const slots = termSlots(term);
  const literal = literalSlots(term);
  // a leading article or "be" may be missing or contracted (I'm snowed under)
  const withoutArticle =
    slots.length > 1 && slots[0].every((w) => ARTICLES.has(w) || w === 'be') ? slots.slice(1) : null;
  // tightest first: the whole phrase as written, then with a leading article dropped
  // ("the company's bottom line"), then "or" read as a choice of words
  const phrase =
    (/\sor\s/i.test(term) ? findPhrase(example, literal, 0)?.parts : undefined) ??
    findPhrase(example, slots, 0)?.parts ??
    (withoutArticle ? findPhrase(example, withoutArticle)?.parts : undefined) ??
    findPhrase(example, slots)?.parts;
  if (phrase) return { spans: phrase, kind: 'phrase' };
  // "on top of that or what's more": each alternative as a phrase of its own
  const chunks = term.split(/\s+or\s+/i);
  if (chunks.length > 1) {
    for (const chunk of chunks) {
      const found = findPhrase(example, termSlots(chunk))?.parts;
      if (found && termSlots(chunk).length > 1) return { spans: found, kind: 'phrase' };
    }
  }
  const words = findWords(example, slots);
  if (words.length) return { spans: words, kind: slots.length > 1 ? 'words' : 'phrase' };
  const inside = findInsideWords(example, slots);
  return { spans: inside, kind: inside.length ? 'inside' : 'none' };
}

export function highlightTerm(example: string, term: string): string {
  // words of the phrase next to each other become one bold run
  const spans: [number, number][] = [];
  for (const [start, end] of termSpans(example, term)) {
    if (end <= start) continue;
    const prev = spans[spans.length - 1];
    if (prev && start >= prev[1] && /^\s*$/.test(example.slice(prev[1], start))) prev[1] = end;
    else spans.push([start, end]);
  }
  let html = '';
  let at = 0;
  for (const [start, end] of spans) {
    if (start < at) continue;
    html += escapeHtml(example.slice(at, start)) + `<b>${escapeHtml(example.slice(start, end))}</b>`;
    at = end;
  }
  return html + escapeHtml(example.slice(at));
}
