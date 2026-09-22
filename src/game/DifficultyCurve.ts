export const KILLS_PER_LEVEL = 10;

export type SpeedSetting = 'slow' | 'normal' | 'fast';

export const SPEED_SETTINGS: SpeedSetting[] = ['slow', 'normal', 'fast'];

export const SPEED_LABELS: Record<SpeedSetting, string> = {
  slow: 'Slow',
  normal: 'Normal',
  fast: 'Fast',
};

const INTERVAL_MULTIPLIER: Record<SpeedSetting, number> = {
  slow: 1.4,
  normal: 1,
  fast: 0.75,
};

const SPEED_MULTIPLIER: Record<SpeedSetting, number> = {
  slow: 0.7,
  normal: 1,
  fast: 1.3,
};

export function spawnIntervalMs(level: number, speed: SpeedSetting = 'normal'): number {
  const base = Math.max(600, 2200 - level * 150);
  return Math.max(400, Math.round(base * INTERVAL_MULTIPLIER[speed]));
}

export function fallSpeedPxPerSec(level: number, speed: SpeedSetting = 'normal'): number {
  const base = 40 + level * 8;
  return Math.round(base * SPEED_MULTIPLIER[speed]);
}
