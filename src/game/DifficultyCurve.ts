export const KILLS_PER_LEVEL = 10;

export const SPEED_STEPS = [0.5, 0.65, 0.8, 1, 1.25, 1.5, 1.8, 2.2];
export const DEFAULT_SPEED_FACTOR = 1;

export function snapSpeedFactor(factor: number): number {
  return SPEED_STEPS.reduce((best, step) =>
    Math.abs(step - factor) < Math.abs(best - factor) ? step : best,
  );
}

export function stepSpeedFactor(factor: number, direction: 1 | -1): number {
  const index = SPEED_STEPS.indexOf(snapSpeedFactor(factor));
  const next = Math.min(SPEED_STEPS.length - 1, Math.max(0, index + direction));
  return SPEED_STEPS[next];
}

export function formatSpeed(factor: number): string {
  return `${factor.toFixed(2).replace(/\.?0+$/, '')}×`;
}

// Every word falls at the same speed — the set's difficulty only picks the
// starting speed, and the player tunes it from there.
export function spawnIntervalMs(level: number, factor: number): number {
  const base = Math.max(900, 2600 - level * 110);
  return Math.max(400, Math.round(base / factor));
}

export function fallSpeedPxPerSec(level: number, factor: number): number {
  const base = 28 + level * 3.5;
  return Math.round(base * factor);
}

export function speedScoreMultiplier(factor: number): number {
  return factor;
}
