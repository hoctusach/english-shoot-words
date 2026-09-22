import type { WordSet } from '@/types/wordset';
import { speak } from '@/audio/pronounce';
import { playTick, playSuccess } from '@/audio/sfx';
import { getSpeedSetting, getBackgroundThemeId } from '@/data/settingsStore';
import { getThemeById } from '@/ui/backgrounds';
import type { FallingWord } from './FallingWord';
import { Spawner } from './Spawner';
import { CanvasRenderer } from './CanvasRenderer';
import { InputController } from './InputController';
import { createScoreState, applyKill, applyMiss, type ScoreState } from './Scoring';
import { spawnIntervalMs, fallSpeedPxPerSec } from './DifficultyCurve';
import { difficultySpeedMultiplier } from './difficultyScore';

export interface GameEngineEvents {
  onScoreChange?: (state: ScoreState) => void;
  onWordKilled?: (word: FallingWord) => void;
  onGameOver?: (finalScore: number, wordsKilled: number) => void;
}

const BOTTOM_MARGIN = 48;
const SIDE_MARGIN = 16;
const WORD_SLOT_WIDTH = 160;

export class GameEngine {
  private ctx: CanvasRenderingContext2D;
  private renderer: CanvasRenderer;
  private spawner: Spawner;
  private input: InputController;
  private speed = getSpeedSetting();
  private activeWords: FallingWord[] = [];
  private scoreState: ScoreState = createScoreState();
  private rafId: number | null = null;
  private lastFrameTime = 0;
  private lastSpawnTime = 0;
  private lastMatchedLen = 0;
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
    this.spawner = new Spawner(wordSet.words);
    this.input = new InputController(container, (value) => this.handleInput(value));
  }

  start(): void {
    this.running = true;
    this.paused = false;
    this.lastFrameTime = performance.now();
    this.lastSpawnTime = this.lastFrameTime;
    this.events.onScoreChange?.(this.scoreState);
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
  }

  private resume(): void {
    if (!this.running || !this.paused) return;
    this.paused = false;
    this.lastFrameTime = performance.now();
    this.input.focus();
    this.rafId = requestAnimationFrame(this.loop);
  }

  private togglePause(): void {
    if (this.paused) this.resume();
    else this.pause();
  }

  private loop = (time: number): void => {
    if (!this.running || this.paused) return;
    const dt = time - this.lastFrameTime;
    this.lastFrameTime = time;
    this.update(time, dt);
    if (!this.running) return;
    this.renderer.render(this.activeWords, this.input.value.trim().toLowerCase(), time);
    this.rafId = requestAnimationFrame(this.loop);
  };

  private update(time: number, dt: number): void {
    const interval = spawnIntervalMs(this.scoreState.level, this.speed);
    if (time - this.lastSpawnTime >= interval) {
      this.trySpawn();
      this.lastSpawnTime = time;
    }

    const baseSpeed = fallSpeedPxPerSec(this.scoreState.level, this.speed);
    const heightCss = this.renderer.heightCss;
    for (const word of this.activeWords) {
      word.y += baseSpeed * word.speedMultiplier * (dt / 1000);
    }

    const missed = this.activeWords.filter((w) => w.y >= heightCss - BOTTOM_MARGIN);
    if (missed.length > 0) {
      const missedIds = new Set(missed.map((w) => w.id));
      this.activeWords = this.activeWords.filter((w) => !missedIds.has(w.id));
      for (let i = 0; i < missed.length; i++) {
        this.scoreState = applyMiss(this.scoreState);
      }
      this.events.onScoreChange?.(this.scoreState);
      if (this.scoreState.lives <= 0) {
        this.gameOver();
      }
    }
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
      speedMultiplier: difficultySpeedMultiplier(word.term),
    });
  }

  private handleInput(rawValue: string): void {
    const value = rawValue.trim().toLowerCase();
    if (!value) {
      this.lastMatchedLen = 0;
      return;
    }
    const exactMatch = this.activeWords.find((w) => w.term.toLowerCase() === value);
    if (exactMatch) {
      this.killWord(exactMatch);
      return;
    }
    const hasCandidate = this.activeWords.some((w) => w.term.toLowerCase().startsWith(value));
    if (hasCandidate) {
      if (value.length > this.lastMatchedLen) {
        playTick();
        this.lastMatchedLen = value.length;
      }
    } else {
      this.canvas.classList.add('flash-invalid');
      window.setTimeout(() => this.canvas.classList.remove('flash-invalid'), 200);
    }
  }

  private killWord(word: FallingWord): void {
    this.activeWords = this.activeWords.filter((w) => w.id !== word.id);
    this.input.clear();
    this.lastMatchedLen = 0;
    speak(word.term);
    playSuccess();
    this.scoreState = applyKill(this.scoreState, word.term);
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
