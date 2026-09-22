export const KILLS_PER_LEVEL = 10;

export function spawnIntervalMs(level: number): number {
  return Math.max(600, 2200 - level * 150);
}

export function fallSpeedPxPerSec(level: number): number {
  return 40 + level * 8;
}
