import type { WordSet } from '@/types/wordset';
import { speak } from '@/audio/pronounce';
import { playTick, playSuccess, playMiss } from '@/audio/sfx';
import { getBackgroundThemeId } from '@/data/settingsStore';
import { setWordSetSpeedFactor } from '@/data/wordSetStore';
import { getThemeById } from '@/ui/backgrounds';
import type { FallingWord } from './FallingWord';
import { Spawner } from './Spawner';
import { ProgressTracker } from './ProgressTracker';
import { termKey } from '@/data/progressStore';
import { CanvasRenderer } from './CanvasRenderer';
import { InputController } from './InputController';
import { createScoreState, applyKill, applyMiss, type ScoreState } from './Scoring';
import {
  spawnIntervalMs,
  fallSpeedPxPerSec,
  speedScoreMultiplier,
  stepSpeedFactor,
  snapSpeedFactor,
  maxWordsOnScreen,
} from './DifficultyCurve';
import { defaultSpeedForSet } from './difficultyScore';
import {
  type Projectile,
  type Particle,
  createProjectile,
  advanceProjectiles,
  createBurst,
  createConfetti,
  createImpactBurst,
  advanceParticles,
  turretPosition,
  turretScale,
  bottomMargin,
  TURRET_BARREL_LENGTH,
} from './effects';

export interface GameEngineEvents {
  onScoreChange?: (state: ScoreState) => void;
  onWordKilled?: (word: FallingWord) => void;
  onPauseChange?: (paused: boolean) => void;
  onSpeedChange?: (factor: number) => void;
  onInputFocusChange?: (focused: boolean) => void;
  onSuggestionBlocked?: () => void;
  onVietnameseInput?: () => void;
  onGameOver?: (finalScore: number, wordsKilled: number) => void;
}

const SIDE_MARGIN = 16;
const NON_ASCII = /[^\x00-\x7f]/;
const SHAKE_MS = 380;
const SHAKE_PX = 9;
// how far above the danger line a word starts to make the line glow harder
const DANGER_ZONE_PX = 120;
const EMPTY_SCREEN_SPAWN_MS = 700;
const WORD_SLOT_WIDTH = 160;

export class GameEngine {
  private ctx: CanvasRenderingContext2D;
  private renderer: CanvasRenderer;
  private spawner: Spawner;
  private progress: ProgressTracker;
  private input: InputController;
  private wordSetId: string;
  private speedFactor: number;
  private activeWords: FallingWord[] = [];
  private projectiles: Projectile[] = [];
  private particles: Particle[] = [];
  private scoreState: ScoreState = createScoreState();
  private rafId: number | null = null;
  private lastFrameTime = 0;
  private lastSpawnTime = 0;
  private validValue = '';
  // a wrong key was pressed and no correct one since: the renderer marks the next letter
  private wrongHint = false;
  private shakeUntil = 0;
  // exposed for tests: the offset applied to the scene this frame
  shakeOffset = { x: 0, y: 0 };
  private running = false;
  private paused = false;

  constructor(
    private canvas: HTMLCanvasElement,
    container: HTMLElement,
    wordSet: WordSet,
    private events: GameEngineEvents,
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;
    this.renderer = new CanvasRenderer(canvas, this.ctx, getThemeById(getBackgroundThemeId()));
    this.wordSetId = wordSet.id;
    this.speedFactor = snapSpeedFactor(wordSet.speedFactor ?? defaultSpeedForSet(wordSet.words));
    this.progress = new ProgressTracker(wordSet.id);
    this.spawner = new Spawner(wordSet.words, this.progress);
    this.input = new InputController(
      container,
      (value) => this.handleInput(value),
      (focused) => this.events.onInputFocusChange?.(focused),
      () => {
        this.flashInvalid();
        this.events.onSuggestionBlocked?.();
      },
    );
  }

  start(): void {
    this.running = true;
    this.paused = false;
    this.lastFrameTime = performance.now();
    this.lastSpawnTime = this.lastFrameTime;
    this.events.onScoreChange?.(this.scoreState);
    this.events.onSpeedChange?.(this.speedFactor);
    this.input.focus();
    document.addEventListener('visibilitychange', this.handleVisibility);
    window.addEventListener('keydown', this.handleKeydown);
    this.rafId = requestAnimationFrame(this.loop);
  }

  destroy(): void {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    document.removeEventListener('visibilitychange', this.handleVisibility);
    window.removeEventListener('keydown', this.handleKeydown);
    this.input.destroy();
    this.renderer.destroy();
  }

  get isPaused(): boolean {
    return this.paused;
  }

  get speed(): number {
    return this.speedFactor;
  }

  adjustSpeed(direction: 1 | -1): void {
    const next = stepSpeedFactor(this.speedFactor, direction);
    if (next === this.speedFactor) return;
    this.speedFactor = next;
    setWordSetSpeedFactor(this.wordSetId, next);
    this.events.onSpeedChange?.(next);
    this.input.focus();
  }

  togglePause(): void {
    if (this.paused) this.resume();
    else this.pause();
  }

  focusInput(): void {
    this.input.focus();
  }

  private handleVisibility = (): void => {
    if (document.hidden) this.pause();
  };

  private handleKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') this.togglePause();
  };

  pause(): void {
    if (!this.running || this.paused) return;
    this.paused = true;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.events.onPauseChange?.(true);
  }

  private resume(): void {
    if (!this.running || !this.paused) return;
    this.paused = false;
    this.lastFrameTime = performance.now();
    this.input.focus();
    this.rafId = requestAnimationFrame(this.loop);
    this.events.onPauseChange?.(false);
  }

  private loop = (time: number): void => {
    if (!this.running || this.paused) return;
    const dt = time - this.lastFrameTime;
    this.lastFrameTime = time;
    this.update(time, dt);
    if (!this.running) return;
    const shakeLeft = Math.max(0, this.shakeUntil - time) / SHAKE_MS;
    const amplitude = SHAKE_PX * shakeLeft * shakeLeft;
    this.shakeOffset = shakeLeft
      ? { x: (Math.random() * 2 - 1) * amplitude, y: (Math.random() * 2 - 1) * amplitude }
      : { x: 0, y: 0 };
    this.renderer.render({
      words: this.activeWords,
      typedValue: this.validValue,
      wrongHint: this.wrongHint,
      targetId: this.targetWord()?.id ?? null,
      dangerLevel: this.dangerLevel(),
      shake: this.shakeOffset,
      impactFlash: shakeLeft,
      elapsedMs: time,
      projectiles: this.projectiles,
      particles: this.particles,
      aim: this.aimTarget(),
    });
    this.rafId = requestAnimationFrame(this.loop);
  };

  private update(time: number, dt: number): void {
    const interval = spawnIntervalMs(this.scoreState.level, this.speedFactor);
    const sinceSpawn = time - this.lastSpawnTime;
    const hasRoom = this.activeWords.length < maxWordsOnScreen(this.speedFactor);
    // don't leave a slow player staring at an empty screen until the next timed spawn
    const screenEmpty = this.activeWords.length === 0 && sinceSpawn >= EMPTY_SCREEN_SPAWN_MS;
    if (hasRoom && (sinceSpawn >= interval || screenEmpty)) {
      this.trySpawn();
      this.lastSpawnTime = time;
    }

    const fallSpeed = fallSpeedPxPerSec(this.scoreState.level, this.speedFactor);
    const heightCss = this.renderer.heightCss;
    for (const word of this.activeWords) {
      word.y += fallSpeed * (dt / 1000);
    }

    this.projectiles = advanceProjectiles(this.projectiles, dt);
    this.particles = advanceParticles(this.particles, dt);

    const missed = this.activeWords.filter((w) => w.y >= heightCss - bottomMargin(heightCss));
    if (missed.length > 0) {
      const missedIds = new Set(missed.map((w) => w.id));
      this.activeWords = this.activeWords.filter((w) => !missedIds.has(w.id));
      for (const word of missed) {
        this.progress.recordMiss(word.term);
        this.scoreState = applyMiss(this.scoreState);
        const center = word.x + this.renderer.measureWordWidth(word.term) / 2;
        this.particles.push(...createImpactBurst(center, heightCss - bottomMargin(heightCss)));
      }
      this.impact(time);
      this.events.onScoreChange?.(this.scoreState);
      if (this.scoreState.lives <= 0) {
        this.gameOver();
        return;
      }
    }

    // the word being typed can fall off screen — don't leave a dead prefix blocking input
    if (this.validValue && !this.matchingWords(this.validValue).length) {
      this.resetInput();
    }
  }

  private matchingWords(value: string): FallingWord[] {
    return this.activeWords.filter((w) => w.term.toLowerCase().startsWith(value));
  }

  // A word reached the danger line: jolt the screen, flash red, thud, buzz the phone.
  private impact(time: number): void {
    this.shakeUntil = time + SHAKE_MS;
    playMiss();
    try {
      navigator.vibrate?.(60);
    } catch {
      // vibration blocked or unsupported
    }
  }

  private dangerLevel(): number {
    if (this.activeWords.length === 0) return 0;
    const height = this.renderer.heightCss;
    const lowest = Math.max(...this.activeWords.map((w) => w.y));
    const gap = height - bottomMargin(height) - lowest;
    return Math.min(1, Math.max(0, 1 - gap / DANGER_ZONE_PX));
  }

  // the word being typed — the lowest one matching what's typed so far
  private targetWord(): FallingWord | null {
    if (!this.validValue) return null;
    const candidates = this.matchingWords(this.validValue);
    if (candidates.length === 0) return null;
    return candidates.reduce((lowest, w) => (w.y > lowest.y ? w : lowest));
  }

  private aimTarget(): { x: number; y: number } | null {
    const candidates = this.validValue ? this.matchingWords(this.validValue) : this.activeWords;
    if (candidates.length === 0) return null;
    return candidates.reduce((lowest, w) => (w.y > lowest.y ? w : lowest));
  }

  private resetInput(): void {
    this.validValue = '';
    this.wrongHint = false;
    this.input.clear();
  }

  private trySpawn(): void {
    const activeTerms = new Set(this.activeWords.map((w) => termKey(w.term)));
    const word = this.spawner.next(activeTerms);
    if (!word) return;
    const widthCss = this.renderer.widthCss;
    const maxX = Math.max(SIDE_MARGIN, widthCss - SIDE_MARGIN - WORD_SLOT_WIDTH);
    const x = SIDE_MARGIN + Math.random() * maxX;
    this.activeWords.push({
      id: crypto.randomUUID(),
      term: word.term,
      meaning: word.meaning,
      x,
      y: -20,
    });
  }

  private handleInput(rawValue: string): void {
    const value = rawValue.trim().toLowerCase();

    if (!value) {
      this.validValue = '';
      return;
    }

    const exactMatch = this.activeWords.find((w) => w.term.toLowerCase() === value);
    if (exactMatch) {
      this.killWord(exactMatch);
      return;
    }

    const candidates = this.matchingWords(value);
    if (candidates.length > 0) {
      const isProgress = value.length > this.validValue.length;
      this.validValue = value;
      if (isProgress) {
        this.wrongHint = false;
        playTick();
        this.fireAt(candidates.reduce((lowest, w) => (w.y > lowest.y ? w : lowest)));
      }
      return;
    }

    // Vietnamese typing (Telex) left on turns w-a-s into "wá". Wiping that back to "wa"
    // resets the input method, so every retry gives "wá" again. Leave it in the field:
    // pressing the same key again makes the input method undo it ("wá" + s = "was").
    if (NON_ASCII.test(value) && value.length <= this.validValue.length + 1) {
      this.wrongHint = true;
      this.flashInvalid();
      this.events.onVietnameseInput?.();
      return;
    }

    // wrong letter: reject it instead of letting it stick and block every later word
    this.input.setValue(this.validValue);
    this.wrongHint = true;
    this.flashInvalid();
  }

  private flashInvalid(): void {
    this.canvas.classList.add('flash-invalid');
    window.setTimeout(() => this.canvas.classList.remove('flash-invalid'), 200);
  }

  private fireAt(word: FallingWord): void {
    const height = this.renderer.heightCss;
    const turret = turretPosition(this.renderer.widthCss, height);
    const angle = Math.atan2(word.y - turret.y, word.x - turret.x);
    const barrel = TURRET_BARREL_LENGTH * turretScale(height);
    this.projectiles.push(
      createProjectile(
        turret.x + Math.cos(angle) * barrel,
        turret.y + Math.sin(angle) * barrel,
        word.x,
        word.y,
      ),
    );
  }

  private killWord(word: FallingWord): void {
    this.fireAt(word);
    this.particles.push(...createBurst(word.x, word.y));
    this.particles.push(...createConfetti(word.x + this.renderer.measureWordWidth(word.term) / 2, word.y - 8));
    this.activeWords = this.activeWords.filter((w) => w.id !== word.id);
    this.progress.recordCorrect(word.term);
    this.resetInput();
    speak(word.term);
    playSuccess();
    this.scoreState = applyKill(this.scoreState, word.term, speedScoreMultiplier(this.speedFactor));
    this.events.onScoreChange?.(this.scoreState);
    this.events.onWordKilled?.(word);
  }

  private gameOver(): void {
    const finalScore = this.scoreState.score;
    const wordsKilled = this.scoreState.wordsKilled;
    this.destroy();
    this.events.onGameOver?.(finalScore, wordsKilled);
  }
}
