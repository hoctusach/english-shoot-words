import type { FallingWord } from './FallingWord';
import type { BackgroundTheme } from '@/ui/backgrounds';
import {
  type Projectile,
  type Particle,
  projectilePosition,
  turretPosition,
  turretScale,
  bottomMargin,
  TURRET_BARREL_LENGTH,
} from './effects';

const WORD_FONT = '600 20px system-ui, -apple-system, sans-serif';
const TARGET_COLOR = '#fde047';

export interface RenderScene {
  words: FallingWord[];
  typedValue: string;
  // a wrong key was pressed: show the letter each candidate word is waiting for in red
  wrongHint: boolean;
  // the word the turret is aiming at while the child types it
  targetId: string | null;
  // 0..1: how close the lowest word is to the danger line
  dangerLevel: number;
  // screen shake offset and red flash strength (0..1) after a word hits the line
  shake: { x: number; y: number };
  impactFlash: number;
  elapsedMs: number;
  projectiles: Projectile[];
  particles: Particle[];
  aim: { x: number; y: number } | null;
}

export class CanvasRenderer {
  private dpr = window.devicePixelRatio || 1;
  private resizeObserver: ResizeObserver;

  constructor(
    private canvas: HTMLCanvasElement,
    private ctx: CanvasRenderingContext2D,
    private theme: BackgroundTheme,
  ) {
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas.parentElement ?? canvas);
    this.resize();
  }

  get widthCss(): number {
    return this.canvas.width / this.dpr;
  }

  get heightCss(): number {
    return this.canvas.height / this.dpr;
  }

  resize(): void {
    this.dpr = window.devicePixelRatio || 1;
    const rect = (this.canvas.parentElement ?? this.canvas).getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    this.canvas.width = Math.round(width * this.dpr);
    this.canvas.height = Math.round(height * this.dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  render(scene: RenderScene): void {
    const width = this.widthCss;
    const height = this.heightCss;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, width, height);

    ctx.save();
    // overscan so the shaken scene never shows a bare edge
    if (scene.shake.x || scene.shake.y) {
      ctx.translate(scene.shake.x, scene.shake.y);
      ctx.scale(1.02, 1.02);
      ctx.translate(-width * 0.01, -height * 0.01);
    }
    this.theme.paint(ctx, width, height, scene.elapsedMs);
    this.drawDangerLine(width, height - bottomMargin(height), scene.elapsedMs, scene.dangerLevel);
    this.drawWords(scene.words, scene.typedValue, scene.wrongHint, scene.targetId, scene.elapsedMs);
    this.drawProjectiles(scene.projectiles);
    this.drawParticles(scene.particles);
    this.drawTurret(width, height, scene.aim);
    ctx.restore();

    if (scene.impactFlash > 0) this.drawImpactFlash(width, height, scene.impactFlash);
  }

  // A bright red line with a glowing haze above it; the haze grows as a word closes in.
  private drawDangerLine(width: number, y: number, elapsedMs: number, danger: number): void {
    const ctx = this.ctx;
    const breathe = 0.85 + 0.15 * Math.sin(elapsedMs / 600);
    const hazeHeight = 44 + 44 * danger;
    const hazeAlpha = (0.5 + 0.3 * danger) * breathe;

    const haze = ctx.createLinearGradient(0, y - hazeHeight, 0, y);
    haze.addColorStop(0, 'rgba(248, 63, 94, 0)');
    haze.addColorStop(1, `rgba(248, 63, 94, ${hazeAlpha})`);
    ctx.fillStyle = haze;
    ctx.fillRect(0, y - hazeHeight, width, hazeHeight);

    const under = ctx.createLinearGradient(0, y, 0, y + 12);
    under.addColorStop(0, `rgba(248, 63, 94, ${0.22 * breathe})`);
    under.addColorStop(1, 'rgba(248, 63, 94, 0)');
    ctx.fillStyle = under;
    ctx.fillRect(0, y, width, 12);

    ctx.save();
    ctx.shadowColor = '#ff4d5e';
    ctx.shadowBlur = 18 + 10 * danger;
    ctx.strokeStyle = danger > 0.5 ? '#ff6b78' : '#ff4d5e';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
    ctx.restore();
  }

  private drawImpactFlash(width: number, height: number, strength: number): void {
    const ctx = this.ctx;
    const r = Math.max(width, height) * 0.75;
    const flash = ctx.createRadialGradient(width / 2, height / 2, r * 0.45, width / 2, height / 2, r);
    flash.addColorStop(0, 'rgba(220, 38, 38, 0)');
    flash.addColorStop(1, `rgba(220, 38, 38, ${0.45 * strength})`);
    ctx.fillStyle = flash;
    ctx.fillRect(0, 0, width, height);
  }

  measureWordWidth(term: string): number {
    this.ctx.font = WORD_FONT;
    return this.ctx.measureText(term).width;
  }

  private drawWords(
    words: FallingWord[],
    typedValue: string,
    wrongHint: boolean,
    targetId: string | null,
    elapsedMs: number,
  ): void {
    const ctx = this.ctx;
    const pulse = 0.5 + 0.5 * Math.sin(elapsedMs / 160);
    for (const word of words) {
      const lowerTerm = word.term.toLowerCase();
      const isCandidate = !typedValue || lowerTerm.startsWith(typedValue);
      const matchLen = typedValue && isCandidate ? typedValue.length : 0;
      const hintLen = wrongHint && isCandidate && matchLen < word.term.length ? 1 : 0;
      const matched = word.term.slice(0, matchLen);
      const next = word.term.slice(matchLen, matchLen + hintLen);
      const rest = word.term.slice(matchLen + hintLen);

      const isTarget = word.id === targetId;
      ctx.font = WORD_FONT;
      const textWidth = ctx.measureText(word.term).width;
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 3;
      ctx.fillStyle = 'rgba(5, 7, 15, 0.6)';
      ctx.beginPath();
      ctx.roundRect(word.x - 6, word.y - 20, textWidth + 12, 28, 6);
      ctx.fill();
      ctx.restore();
      if (isTarget) {
        // the word being typed: a yellow frame, like a lock-on
        ctx.save();
        ctx.shadowColor = 'rgba(253, 224, 71, 0.45)';
        ctx.shadowBlur = 10;
        ctx.strokeStyle = TARGET_COLOR;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(word.x - 6, word.y - 20, textWidth + 12, 28, 6);
        ctx.stroke();
        ctx.restore();
      }

      let x = word.x;
      ctx.fillStyle = '#4ade80';
      ctx.fillText(matched, x, word.y);
      x += ctx.measureText(matched).width;

      if (next) {
        // the key the child should press next: red, on a pulsing box, underlined
        const nextWidth = Math.max(ctx.measureText(next).width, 8);
        ctx.fillStyle = `rgba(248, 113, 113, ${0.18 + 0.22 * pulse})`;
        ctx.beginPath();
        ctx.roundRect(x - 2, word.y - 19, nextWidth + 4, 25, 4);
        ctx.fill();
        ctx.fillStyle = '#f87171';
        ctx.fillRect(x - 1, word.y + 4, nextWidth + 2, 3);
        ctx.fillText(next, x, word.y);
        x += ctx.measureText(next).width;
      }

      ctx.fillStyle = isTarget ? TARGET_COLOR : '#f8fafc';
      ctx.fillText(rest, x, word.y);
    }
  }

  private drawProjectiles(projectiles: Projectile[]): void {
    const ctx = this.ctx;
    for (const p of projectiles) {
      const { x, y } = projectilePosition(p);
      const trailT = Math.max(0, p.t - 0.12);
      const trailX = p.sx + (p.tx - p.sx) * trailT;
      const trailY = p.sy + (p.ty - p.sy) * trailT;

      ctx.strokeStyle = 'rgba(253, 224, 71, 0.75)';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(trailX, trailY);
      ctx.lineTo(x, y);
      ctx.stroke();

      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawParticles(particles: Particle[]): void {
    const ctx = this.ctx;
    for (const p of particles) {
      ctx.fillStyle = p.color;
      if (p.kind === 'confetti') {
        // stays solid, fades over the last 30% of its life
        ctx.globalAlpha = Math.min(1, Math.max(0, p.life / (p.maxLife * 0.3)));
        const w = p.w ?? 4;
        const h = p.h ?? 8;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot ?? 0);
        // squash on one axis so the paper looks like it flips as it spins
        ctx.scale(1, Math.cos((p.rot ?? 0) * 1.7));
        ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.restore();
        continue;
      }
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawTurret(width: number, height: number, aim: { x: number; y: number } | null): void {
    const ctx = this.ctx;
    const { x, y } = turretPosition(width, height);
    const angle = aim ? Math.atan2(aim.y - y, aim.x - x) : -Math.PI / 2;
    const scale = turretScale(height);

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.rotate(angle);
    ctx.fillStyle = '#cbd5e1';
    ctx.strokeStyle = 'rgba(5, 7, 15, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(0, -7, TURRET_BARREL_LENGTH, 14, 5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.roundRect(TURRET_BARREL_LENGTH - 8, -5, 8, 10, 3);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = '#475569';
    ctx.strokeStyle = 'rgba(5, 7, 15, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 20, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(-28, 0, 56, 12, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  destroy(): void {
    this.resizeObserver.disconnect();
  }
}
