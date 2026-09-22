export interface BackgroundTheme {
  id: string;
  name: string;
  previewCss: string;
  paint(ctx: CanvasRenderingContext2D, width: number, height: number, elapsedMs: number): void;
}

function fillGradient(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  top: string,
  bottom: string,
): void {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, top);
  gradient.addColorStop(1, bottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

interface KidOptions {
  skin: string;
  outfit: string;
  hair: string;
  accessory?: (ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) => void;
}

const KID_FEET_OFFSET = 36;

// `feetY` is where the character stands, so it never gets clipped by the bottom edge.
function drawKid(ctx: CanvasRenderingContext2D, x: number, feetY: number, scale: number, opts: KidOptions): void {
  ctx.save();
  ctx.translate(x, feetY - KID_FEET_OFFSET * scale);
  ctx.scale(scale, scale);

  // legs
  ctx.fillStyle = opts.outfit;
  ctx.fillRect(-14, 10, 10, 26);
  ctx.fillRect(4, 10, 10, 26);

  // torso
  ctx.beginPath();
  ctx.roundRect(-18, -22, 36, 34, 10);
  ctx.fill();

  // arms
  ctx.fillRect(-26, -14, 9, 24);
  ctx.fillRect(17, -14, 9, 24);

  // head
  ctx.fillStyle = opts.skin;
  ctx.beginPath();
  ctx.arc(0, -34, 16, 0, Math.PI * 2);
  ctx.fill();

  // hair
  ctx.fillStyle = opts.hair;
  ctx.beginPath();
  ctx.arc(0, -40, 15, Math.PI, Math.PI * 2);
  ctx.fill();

  opts.accessory?.(ctx, 0, -34, 1);
  ctx.restore();
}

function drawStars(ctx: CanvasRenderingContext2D, width: number, height: number, elapsedMs: number, count: number): void {
  for (let i = 0; i < count; i++) {
    const seedX = (i * 97) % width;
    const seedY = (i * 53) % Math.max(1, height * 0.6);
    const twinkle = 0.4 + 0.6 * Math.abs(Math.sin(elapsedMs / 600 + i));
    ctx.fillStyle = `rgba(255,255,255,${twinkle.toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(seedX, seedY, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

const nightSky: BackgroundTheme = {
  id: 'night-sky',
  name: 'Night Sky',
  previewCss: 'linear-gradient(#0b1030, #1e1b4b)',
  paint(ctx, width, height, elapsedMs) {
    fillGradient(ctx, width, height, '#0b1030', '#1e1b4b');
    drawStars(ctx, width, height, elapsedMs, 40);

    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.arc(width - 50, 50, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath();
    ctx.arc(width - 42, 44, 18, 0, Math.PI * 2);
    ctx.fill();

    drawKid(ctx, width - 60, height - 4, 1.2, {
      skin: '#f5c99b',
      outfit: '#60a5fa',
      hair: '#1f2937',
      accessory: (c, x, y) => {
        c.strokeStyle = 'rgba(226,232,240,0.9)';
        c.lineWidth = 3;
        c.beginPath();
        c.arc(x, y, 18, 0, Math.PI * 2);
        c.stroke();
      },
    });
  },
};

const sunnyDay: BackgroundTheme = {
  id: 'sunny-day',
  name: 'Sunny Day',
  previewCss: 'linear-gradient(#7dd3fc, #bbf7d0)',
  paint(ctx, width, height) {
    fillGradient(ctx, width, height, '#7dd3fc', '#bbf7d0');

    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(width - 60, 50, 26, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    [[60, 60, 20], [90, 60, 16], [40, 70, 14]].forEach(([cx, cy, r]) => {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.moveTo(0, height - 40);
    ctx.quadraticCurveTo(width * 0.5, height - 90, width, height - 40);
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.fill();

    drawKid(ctx, 60, height - 6, 1.1, {
      skin: '#f2b98a',
      outfit: '#f97316',
      hair: '#7c2d12',
      accessory: (c, x, y) => {
        c.fillStyle = '#22c55e';
        c.beginPath();
        c.roundRect(x - 10, y - 4, 20, 26, 6);
        c.fill();
      },
    });
  },
};

const oceanWave: BackgroundTheme = {
  id: 'ocean-wave',
  name: 'Ocean Wave',
  previewCss: 'linear-gradient(#0891b2, #164e63)',
  paint(ctx, width, height, elapsedMs) {
    fillGradient(ctx, width, height, '#0891b2', '#164e63');

    for (let row = 0; row < 3; row++) {
      const baseY = height - 30 - row * 22;
      ctx.strokeStyle = `rgba(224,242,254,${0.35 - row * 0.08})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let x = 0; x <= width; x += 12) {
        const y = baseY + Math.sin(x / 24 + elapsedMs / 500 + row) * 6;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    for (let i = 0; i < 10; i++) {
      const bx = (i * 71 + (elapsedMs / 40)) % width;
      const by = height - 20 - ((i * 37) % 80);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      ctx.arc(bx, by, 3 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }
  },
};

const neonCity: BackgroundTheme = {
  id: 'neon-city',
  name: 'Neon City',
  previewCss: 'linear-gradient(#0f0326, #1e0b3c)',
  paint(ctx, width, height) {
    fillGradient(ctx, width, height, '#0f0326', '#1e0b3c');

    const horizon = height - 60;
    ctx.strokeStyle = 'rgba(236,72,153,0.5)';
    ctx.lineWidth = 1;
    for (let i = -10; i <= 10; i++) {
      ctx.beginPath();
      ctx.moveTo(width / 2, horizon);
      ctx.lineTo(width / 2 + i * 60, height);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(0, horizon);
    ctx.lineTo(width, horizon);
    ctx.strokeStyle = 'rgba(56,189,248,0.7)';
    ctx.lineWidth = 2;
    ctx.stroke();

    const blocks = [30, 70, 110, 150, 190, 230];
    blocks.forEach((bx, i) => {
      const h = 30 + (i % 3) * 20;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(168,85,247,0.6)' : 'rgba(56,189,248,0.6)';
      ctx.fillRect(bx, horizon - h, 24, h);
    });
  },
};

const candyPop: BackgroundTheme = {
  id: 'candy-pop',
  name: 'Candy Pop',
  previewCss: 'linear-gradient(#fbcfe8, #ddd6fe)',
  paint(ctx, width, height, elapsedMs) {
    fillGradient(ctx, width, height, '#fbcfe8', '#ddd6fe');

    const colors = ['#f472b6', '#fbbf24', '#34d399', '#60a5fa'];
    for (let i = 0; i < 14; i++) {
      const x = (i * 53) % width;
      const baseY = (i * 41) % height;
      const y = (baseY + elapsedMs / 30) % height;
      ctx.fillStyle = colors[i % colors.length];
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.arc(x, y, 6 + (i % 3) * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  },
};

const forestAdventure: BackgroundTheme = {
  id: 'forest-adventure',
  name: 'Forest Adventure',
  previewCss: 'linear-gradient(#166534, #14532d)',
  paint(ctx, width, height) {
    fillGradient(ctx, width, height, '#4ade80', '#166534');

    const drawTree = (tx: number, ty: number, s: number) => {
      ctx.fillStyle = '#78350f';
      ctx.fillRect(tx - 4 * s, ty, 8 * s, 20 * s);
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.moveTo(tx - 20 * s, ty);
      ctx.lineTo(tx + 20 * s, ty);
      ctx.lineTo(tx, ty - 34 * s);
      ctx.fill();
    };
    [0.18, 0.4, 0.65, 0.85].forEach((f, i) => drawTree(width * f, height - 20, 0.9 + (i % 2) * 0.3));

    drawKid(ctx, width * 0.78, height - 6, 1.1, {
      skin: '#f2b98a',
      outfit: '#22c55e',
      hair: '#78350f',
      accessory: (c, x, y) => {
        c.fillStyle = '#a16207';
        c.beginPath();
        c.moveTo(x - 16, y - 8);
        c.lineTo(x + 16, y - 8);
        c.lineTo(x, y - 22);
        c.fill();
      },
    });
  },
};

export const BACKGROUND_THEMES: BackgroundTheme[] = [
  nightSky,
  sunnyDay,
  oceanWave,
  neonCity,
  candyPop,
  forestAdventure,
];

export function getThemeById(id: string): BackgroundTheme {
  return BACKGROUND_THEMES.find((t) => t.id === id) ?? BACKGROUND_THEMES[0];
}
