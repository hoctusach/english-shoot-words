import { SPEED_KEY, BACKGROUND_THEME_KEY, VOICE_KEY } from '@/utils/storageKeys';
import { type SpeedSetting, SPEED_SETTINGS } from '@/game/DifficultyCurve';
import { BACKGROUND_THEMES } from '@/ui/backgrounds';

function hasLocalStorage(): boolean {
  return typeof localStorage !== 'undefined';
}

export function getSpeedSetting(): SpeedSetting {
  if (!hasLocalStorage()) return 'normal';
  const raw = localStorage.getItem(SPEED_KEY);
  return (SPEED_SETTINGS as string[]).includes(raw ?? '') ? (raw as SpeedSetting) : 'normal';
}

export function setSpeedSetting(speed: SpeedSetting): void {
  if (!hasLocalStorage()) return;
  localStorage.setItem(SPEED_KEY, speed);
}

export function getBackgroundThemeId(): string {
  if (!hasLocalStorage()) return BACKGROUND_THEMES[0].id;
  const raw = localStorage.getItem(BACKGROUND_THEME_KEY);
  return BACKGROUND_THEMES.some((t) => t.id === raw) ? (raw as string) : BACKGROUND_THEMES[0].id;
}

export function setBackgroundThemeId(id: string): void {
  if (!hasLocalStorage()) return;
  localStorage.setItem(BACKGROUND_THEME_KEY, id);
}

export function getVoiceName(): string {
  if (!hasLocalStorage()) return '';
  return localStorage.getItem(VOICE_KEY) ?? '';
}

export function setVoiceName(name: string): void {
  if (!hasLocalStorage()) return;
  localStorage.setItem(VOICE_KEY, name);
}
