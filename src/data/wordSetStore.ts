import { WORD_SETS_KEY, LAST_SELECTED_SET_KEY } from '@/utils/storageKeys';
import type { WordSet, WordSetWord } from '@/types/wordset';
import { deleteProgress } from '@/data/progressStore';

function hasLocalStorage(): boolean {
  return typeof localStorage !== 'undefined';
}

export function loadWordSets(): WordSet[] {
  if (!hasLocalStorage()) return [];
  const raw = localStorage.getItem(WORD_SETS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveWordSets(sets: WordSet[]): void {
  if (!hasLocalStorage()) return;
  localStorage.setItem(WORD_SETS_KEY, JSON.stringify(sets));
}

export function getWordSet(id: string): WordSet | undefined {
  return loadWordSets().find((s) => s.id === id);
}

export function createWordSet(name: string, words: WordSetWord[], sourceFileName?: string): WordSet {
  const sets = loadWordSets();
  const set: WordSet = {
    id: crypto.randomUUID(),
    name,
    words,
    createdAt: new Date().toISOString(),
    sourceFileName,
  };
  sets.push(set);
  saveWordSets(sets);
  return set;
}

export function renameWordSet(id: string, newName: string): void {
  const sets = loadWordSets();
  const set = sets.find((s) => s.id === id);
  if (!set) return;
  set.name = newName;
  saveWordSets(sets);
}

export function deleteWordSet(id: string): void {
  const sets = loadWordSets().filter((s) => s.id !== id);
  saveWordSets(sets);
  deleteProgress(id);
  if (getLastSelectedSetId() === id) {
    clearLastSelectedSetId();
  }
}

export function setWordSetSpeedFactor(id: string, factor: number): void {
  const sets = loadWordSets();
  const set = sets.find((s) => s.id === id);
  if (!set) return;
  set.speedFactor = factor;
  saveWordSets(sets);
}

export function recordBestScore(id: string, score: number): void {
  const sets = loadWordSets();
  const set = sets.find((s) => s.id === id);
  if (!set) return;
  if (set.bestScore === undefined || score > set.bestScore) {
    set.bestScore = score;
    saveWordSets(sets);
  }
}

export function getLastSelectedSetId(): string | null {
  if (!hasLocalStorage()) return null;
  return localStorage.getItem(LAST_SELECTED_SET_KEY);
}

export function setLastSelectedSetId(id: string): void {
  if (!hasLocalStorage()) return;
  localStorage.setItem(LAST_SELECTED_SET_KEY, id);
}

function clearLastSelectedSetId(): void {
  if (!hasLocalStorage()) return;
  localStorage.removeItem(LAST_SELECTED_SET_KEY);
}
