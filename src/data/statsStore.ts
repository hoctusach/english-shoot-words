import { STATS_KEY } from '@/utils/storageKeys';

export interface PlayerStats {
  playerName: string;
  totalScore: number;
  totalWordsShot: number;
}

const DEFAULT_STATS: PlayerStats = { playerName: 'Player', totalScore: 0, totalWordsShot: 0 };

function hasLocalStorage(): boolean {
  return typeof localStorage !== 'undefined';
}

export function getStats(): PlayerStats {
  if (!hasLocalStorage()) return { ...DEFAULT_STATS };
  const raw = localStorage.getItem(STATS_KEY);
  if (!raw) return { ...DEFAULT_STATS };
  try {
    const parsed = JSON.parse(raw);
    return {
      playerName: typeof parsed.playerName === 'string' ? parsed.playerName : DEFAULT_STATS.playerName,
      totalScore: typeof parsed.totalScore === 'number' ? parsed.totalScore : 0,
      totalWordsShot: typeof parsed.totalWordsShot === 'number' ? parsed.totalWordsShot : 0,
    };
  } catch {
    return { ...DEFAULT_STATS };
  }
}

function saveStats(stats: PlayerStats): void {
  if (!hasLocalStorage()) return;
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

export function setPlayerName(name: string): void {
  const stats = getStats();
  stats.playerName = name;
  saveStats(stats);
}

export function addRoundResult(score: number, wordsShot: number): PlayerStats {
  const stats = getStats();
  stats.totalScore += score;
  stats.totalWordsShot += wordsShot;
  saveStats(stats);
  return stats;
}
