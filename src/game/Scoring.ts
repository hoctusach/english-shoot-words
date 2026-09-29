import { KILLS_PER_LEVEL } from './DifficultyCurve';
import { wordDifficulty } from './difficultyScore';

export interface ScoreState {
  score: number;
  // Infinity in practice (no game over)
  lives: number;
  missed: number;
  level: number;
  killsThisLevel: number;
  wordsKilled: number;
}

export function createScoreState(lives = Infinity): ScoreState {
  return { score: 0, lives, missed: 0, level: 1, killsThisLevel: 0, wordsKilled: 0 };
}

export function pointsForWord(term: string, level: number): number {
  return Math.round(wordDifficulty(term) * 6 * (1 + level * 0.1));
}

export function applyKill(state: ScoreState, term: string, speedMultiplier = 1): ScoreState {
  const points = Math.round(pointsForWord(term, state.level) * speedMultiplier);
  const killsThisLevel = state.killsThisLevel + 1;
  const levelUp = killsThisLevel >= KILLS_PER_LEVEL;
  return {
    score: state.score + points,
    lives: state.lives,
    missed: state.missed,
    level: levelUp ? state.level + 1 : state.level,
    killsThisLevel: levelUp ? 0 : killsThisLevel,
    wordsKilled: state.wordsKilled + 1,
  };
}

export function applyMiss(state: ScoreState): ScoreState {
  return { ...state, lives: Math.max(0, state.lives - 1), missed: state.missed + 1 };
}
