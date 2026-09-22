import type { FallingWord } from './FallingWord';
import type { BackgroundTheme } from '@/ui/backgrounds';
import {
  type Projectile,
  type Particle,
  projectilePosition,
  turretPosition,
  bottomMargin,
  TURRET_BARREL_LENGTH,
} from './effects';

export interface RenderScene {
  words: FallingWord[];
  typedValue: string;
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

    this.theme.paint(ctx, width, height, scene.elapsedMs);

    ctx.strokeStyle = 'rgba(248, 113, 113, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const dangerY = height - bottomMargin(height);
    ctx.moveTo(0, dangerY);
    ctx.lineTo(width, dangerY);
    ctx.stroke();

    this.drawWords(scene.words, scene.typedValue);
    this.drawProjectiles(scene.projectiles);
    this.drawParticles(scene.particles);
    this.drawTurret(width, height, scene.aim);
  }

  private drawWords(words: FallingWord[], typedValue: string): void {
    const ctx = this.ctx;
    for (const word of words) {
      const lowerTerm = word.term.toLowerCase();
      const matchLen = typedValue && lowerTerm.startsWith(typedValue) ? typedValue.length : 0;
      const matched = word.term.slice(0, matchLen);
      const rest = word.term.slice(matchLen);

      ctx.font = '600 20px system-ui, -apple-system, sans-serif';
      const textWidth = ctx.measureText(word.term).width;
      ctx.fillStyle = 'rgba(5, 7, 15, 0.55)';
      ctx.beginPath();
      ctx.roundRect(word.x - 6, word.y - 20, textWidth + 12, 28, 6);
      ctx.fill();

      let x = word.x;
      ctx.fillStyle = '#4ade80';
      ctx.fillText(matched, x, word.y);
      x += ctx.measureText(matched).width;
      ctx.fillStyle = '#f8fafc';
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
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
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

    ctx.save();
    ctx.translate(x, y);
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

    ctx.fillStyle = '#475569';
    ctx.strokeStyle = 'rgba(5, 7, 15, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 20, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(x - 28, y, 56, 12, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  destroy(): void {
    this.resizeObserver.disconnect();
  }
}
