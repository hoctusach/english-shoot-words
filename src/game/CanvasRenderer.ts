import type { FallingWord } from './FallingWord';

export class CanvasRenderer {
  private dpr = window.devicePixelRatio || 1;
  private resizeObserver: ResizeObserver;

  constructor(
    private canvas: HTMLCanvasElement,
    private ctx: CanvasRenderingContext2D,
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

  render(words: FallingWord[], typedValue: string): void {
    const width = this.widthCss;
    const height = this.heightCss;
    this.ctx.clearRect(0, 0, width, height);

    this.ctx.fillStyle = '#0b1020';
    this.ctx.fillRect(0, 0, width, height);

    this.ctx.strokeStyle = 'rgba(248, 113, 113, 0.35)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(0, height - 48);
    this.ctx.lineTo(width, height - 48);
    this.ctx.stroke();

    for (const word of words) {
      const lowerTerm = word.term.toLowerCase();
      const matchLen = typedValue && lowerTerm.startsWith(typedValue) ? typedValue.length : 0;
      const matched = word.term.slice(0, matchLen);
      const rest = word.term.slice(matchLen);

      this.ctx.font = '600 20px system-ui, -apple-system, sans-serif';
      let x = word.x;
      this.ctx.fillStyle = '#4ade80';
      this.ctx.fillText(matched, x, word.y);
      x += this.ctx.measureText(matched).width;
      this.ctx.fillStyle = '#f8fafc';
      this.ctx.fillText(rest, x, word.y);

      this.ctx.font = '400 13px system-ui, -apple-system, sans-serif';
      this.ctx.fillStyle = '#94a3b8';
      this.ctx.fillText(word.meaning, word.x, word.y + 18);
    }
  }

  destroy(): void {
    this.resizeObserver.disconnect();
  }
}
