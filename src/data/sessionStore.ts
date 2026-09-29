// Every round played, one record each, updated after every shot or miss so nothing is
// lost if the app is closed mid-round. Practice rounds can be compared over time; a
// set's challenge attempts form its leaderboard.
import { SESSIONS_KEY, CHALLENGE_PREFS_KEY } from '@/utils/storageKeys';

export interface Session {
  id: string;
  setId: string;
  mode: 'practice' | 'challenge';
  player: string;
  score: number;
  wordsShot: number;
  missed: number;
  speed: number;
  missLimit?: number;
  startedAt: string;
  updatedAt: string;
  // how it ended: ran out of misses, stopped by the player, or still open (app closed)
  end: 'gameover' | 'stopped' | null;
}

const MAX_SESSIONS = 300;

function load(): Session[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(SESSIONS_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(sessions: Session[]): void {
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions.slice(-MAX_SESSIONS)));
  } catch {
    // storage full or blocked: the round still plays
  }
}

export function startSession(fields: Pick<Session, 'setId' | 'mode' | 'player' | 'speed' | 'missLimit'>): Session {
  const now = new Date().toISOString();
  const session: Session = { id: crypto.randomUUID(), score: 0, wordsShot: 0, missed: 0, startedAt: now, updatedAt: now, end: null, ...fields };
  const sessions = load();
  sessions.push(session);
  save(sessions);
  return session;
}

export function updateSession(id: string, patch: Partial<Pick<Session, 'score' | 'wordsShot' | 'missed' | 'speed' | 'end'>>): void {
  const sessions = load();
  const session = sessions.find((s) => s.id === id);
  if (!session) return;
  Object.assign(session, patch, { updatedAt: new Date().toISOString() });
  save(sessions);
}

// A round that never really started (no shot, no miss) isn't worth keeping.
export function discardIfEmpty(id: string): boolean {
  const sessions = load();
  const session = sessions.find((s) => s.id === id);
  if (!session || session.wordsShot > 0 || session.missed > 0) return false;
  save(sessions.filter((s) => s.id !== id));
  return true;
}

export function getSession(id: string): Session | undefined {
  return load().find((s) => s.id === id);
}

export function deleteSessionsForSet(setId: string): void {
  save(load().filter((s) => s.setId !== setId));
}

// Attempts compared fairly: same set, same miss limit, same speed. Highest score first;
// ties go to fewer misses, then to the earlier attempt.
export function challengeBoard(setId: string, missLimit: number, speed: number): Session[] {
  return load()
    .filter((s) => s.mode === 'challenge' && s.setId === setId && s.missLimit === missLimit && s.speed === speed)
    .sort((a, b) => b.score - a.score || a.missed - b.missed || a.startedAt.localeCompare(b.startedAt));
}

export function recentPractice(setId: string, count: number): Session[] {
  return load()
    .filter((s) => s.mode === 'practice' && s.setId === setId)
    .slice(-count)
    .reverse();
}

// ---- challenge setup remembered per set, and the last challenger's name ----

export interface ChallengePrefs {
  missLimit: number;
  speed: number;
  lastPlayer?: string;
}

function loadPrefs(): Record<string, ChallengePrefs> {
  try {
    const parsed = JSON.parse(localStorage.getItem(CHALLENGE_PREFS_KEY) ?? '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function getChallengePrefs(setId: string): ChallengePrefs | undefined {
  return loadPrefs()[setId];
}

export function setChallengePrefs(setId: string, prefs: ChallengePrefs): void {
  const all = loadPrefs();
  all[setId] = prefs;
  try {
    localStorage.setItem(CHALLENGE_PREFS_KEY, JSON.stringify(all));
  } catch {
    // ignore
  }
}
