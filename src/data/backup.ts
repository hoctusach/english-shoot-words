// Everything the game saves lives in localStorage under "shootwords.*". A backup
// is those keys in one JSON file the player keeps on their device, so word sets
// and progress survive clearing browser data or moving to another device.

const KEY_PREFIX = 'shootwords.';
const BACKUP_APP = 'game-ban-tu';

interface BackupFile {
  app: string;
  version: 1;
  exportedAt: string;
  data: Record<string, string>;
}

export function downloadBackup(): void {
  const data: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(KEY_PREFIX)) data[key] = localStorage.getItem(key) ?? '';
  }
  const backup: BackupFile = { app: BACKUP_APP, version: 1, exportedAt: new Date().toISOString(), data };
  const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `game-ban-tu-backup-${backup.exportedAt.slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Returns the saved items in a backup file, or throws if the file is not one.
export function readBackup(text: string): Record<string, string> {
  const parsed = JSON.parse(text) as Partial<BackupFile>;
  if (!parsed || parsed.app !== BACKUP_APP || typeof parsed.data !== 'object' || parsed.data === null) {
    throw new Error('not a backup');
  }
  const data: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (key.startsWith(KEY_PREFIX) && typeof value === 'string') data[key] = value;
  }
  return data;
}

export function restoreBackup(data: Record<string, string>): void {
  const existing: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(KEY_PREFIX)) existing.push(key);
  }
  existing.forEach((key) => localStorage.removeItem(key));
  for (const [key, value] of Object.entries(data)) localStorage.setItem(key, value);
}
