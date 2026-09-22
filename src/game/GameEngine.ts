import type { WordSet } from '@/types/wordset';
import { speak } from '@/audio/pronounce';
import { playTick, playSuccess } from '@/audio/sfx';
import { getBackgroundThemeId } from '@/data/settingsStore';
import { setWordSetSpeedFactor } from '@/data/wordSetStore';
import { getThemeById } from '@/ui/backgrounds';
import type { FallingWord } from './FallingWord';
import { Spawner } from './Spawner';
import { CanvasRenderer } from './CanvasRenderer';
import { InputController } from './InputController';
import { createScoreState, applyKill, applyMiss, type ScoreState } from './Scoring';
import {
  spawnIntervalMs,
  fallSpeedPxPerSec,
  speedScoreMultiplier,
  stepSpeedFactor,
  snapSpeedFactor,
} from './DifficultyCurve';
import { defaultSpeedForSet } from './difficultyScore';
import {
  type Projectile,
  type Particle,
  createProjectile,
  advanceProjectiles,
  createBurst,
  advanceParticles,
  turretPosition,
  bottomMargin,
  TURRET_BARREL_LENGTH,
} from './effects';

export interface GameEngineEvents {
  onScoreChange?: (state: ScoreState) => void;
  onWordKilled?: (word: FallingWord) => void;
  onPauseChange?: (paused: boolean) => void;
  onSpeedChange?: (factor: number) => void;
  onGameOver?: (finalScore: number, wordsKilled: number) => void;
}

const SIDE_MARGIN = 16;
const WORD_SLOT_WIDTH = 160;

export class GameEngine {
  private ctx: CanvasRenderingContext2D;
  private renderer: CanvasRenderer;
  private spawner: Spawner;
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
    this.spawner = new Spawner(wordSet.words);
    this.input = new InputController(container, (value) => this.handleInput(value));
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

  private handleVisibility = (): void => {
    if (document.hidden) this.pause();
  };

  private handleKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') this.togglePause();
  };

  private pause(): void {
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
    this.renderer.render({
      words: this.activeWords,
      typedValue: this.validValue,
      elapsedMs: time,
      projectiles: this.projectiles,
      particles: this.particles,
      aim: this.aimTarget(),
    });
    this.rafId = requestAnimationFrame(this.loop);
  };

  private update(time: number, dt: number): void {
    const interval = spawnIntervalMs(this.scoreState.level, this.speedFactor);
    if (time - this.lastSpawnTime >= interval) {
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
      for (let i = 0; i < missed.length; i++) {
        this.scoreState = applyMiss(this.scoreState);
      }
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

  private aimTarget(): { x: number; y: number } | null {
    const candidates = this.validValue ? this.matchingWords(this.validValue) : this.activeWords;
    if (candidates.length === 0) return null;
    return candidates.reduce((lowest, w) => (w.y > lowest.y ? w : lowest));
  }

  private resetInput(): void {
    this.validValue = '';
    this.input.clear();
  }

  private trySpawn(): void {
    const activeTerms = new Set(this.activeWords.map((w) => w.term.toLowerCase()));
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
        playTick();
        this.fireAt(candidates.reduce((lowest, w) => (w.y > lowest.y ? w : lowest)));
      }
      return;
    }

    // wrong letter: reject it instead of letting it stick and block every later word
    this.input.setValue(this.validValue);
    this.canvas.classList.add('flash-invalid');
    window.setTimeout(() => this.canvas.classList.remove('flash-invalid'), 200);
  }

  private fireAt(word: FallingWord): void {
    const turret = turretPosition(this.renderer.widthCss, this.renderer.heightCss);
    const angle = Math.atan2(word.y - turret.y, word.x - turret.x);
    this.projectiles.push(
      createProjectile(
        turret.x + Math.cos(angle) * TURRET_BARREL_LENGTH,
        turret.y + Math.sin(angle) * TURRET_BARREL_LENGTH,
        word.x,
        word.y,
      ),
    );
  }

  private killWord(word: FallingWord): void {
    this.fireAt(word);
    this.particles.push(...createBurst(word.x, word.y));
    this.activeWords = this.activeWords.filter((w) => w.id !== word.id);
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
