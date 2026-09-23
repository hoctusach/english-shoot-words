export const TURRET_BARREL_LENGTH = 30;

// The turret and the danger line follow the height of the play area, so they stay
// clear of the bottom edge on a tall desktop window and still leave room to type
// on a short one (phone with the keyboard open).
export function turretOffsetY(height: number): number {
  return Math.round(Math.min(52, Math.max(28, height * 0.06)));
}

export function turretScale(height: number): number {
  return Math.min(1.35, Math.max(1, height / 700));
}

export function bottomMargin(height: number): number {
  return turretOffsetY(height) + 14;
}

export function turretPosition(width: number, height: number): { x: number; y: number } {
  return { x: width / 2, y: height - turretOffsetY(height) };
}

export interface Projectile {
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  t: number;
  duration: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  // paper confetti: a spinning rectangle that drifts down and sways
  kind?: 'dot' | 'confetti';
  w?: number;
  h?: number;
  rot?: number;
  spin?: number;
  sway?: number;
}

export function createProjectile(sx: number, sy: number, tx: number, ty: number): Projectile {
  return { sx, sy, tx, ty, t: 0, duration: 160 };
}

export function advanceProjectiles(projectiles: Projectile[], dt: number): Projectile[] {
  for (const p of projectiles) {
    p.t += dt / p.duration;
  }
  return projectiles.filter((p) => p.t < 1);
}

export function projectilePosition(p: Projectile): { x: number; y: number } {
  return {
    x: p.sx + (p.tx - p.sx) * p.t,
    y: p.sy + (p.ty - p.sy) * p.t,
  };
}

const BURST_COLORS = ['#4ade80', '#fde047', '#f8fafc', '#38bdf8'];

export function createBurst(x: number, y: number, count = 12): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
    const speed = 60 + Math.random() * 90;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 420,
      maxLife: 420,
      color: BURST_COLORS[i % BURST_COLORS.length],
    });
  }
  return particles;
}

const IMPACT_COLORS = ['#f87171', '#fb923c', '#ef4444', '#fca5a5'];

// Red sparks spraying up from the danger line where a word hit it.
export function createImpactBurst(x: number, y: number, count = 16): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9;
    const speed = 90 + Math.random() * 130;
    particles.push({
      x: x + (Math.random() - 0.5) * 30,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 520,
      maxLife: 520,
      color: IMPACT_COLORS[i % IMPACT_COLORS.length],
    });
  }
  return particles;
}

const CONFETTI_COLORS = ['#f472b6', '#fde047', '#4ade80', '#38bdf8', '#a78bfa', '#fb923c'];
const CONFETTI_LIFE = 1400;

export function createConfetti(x: number, y: number, count = 18): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      kind: 'confetti',
      x: x + (Math.random() - 0.5) * 24,
      y,
      vx: (Math.random() - 0.5) * 220,
      vy: -70 - Math.random() * 110,
      life: CONFETTI_LIFE - Math.random() * 300,
      maxLife: CONFETTI_LIFE,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      w: 4 + Math.random() * 2,
      h: 7 + Math.random() * 4,
      rot: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 12,
      sway: Math.random() * Math.PI * 2,
    });
  }
  return particles;
}

export function advanceParticles(particles: Particle[], dt: number): Particle[] {
  const s = dt / 1000;
  for (const p of particles) {
    if (p.kind === 'confetti') {
      // paper: light gravity, air drag, a little side-to-side flutter
      const drag = Math.pow(0.35, s);
      p.vx *= drag;
      p.vy = p.vy * drag + 260 * s;
      p.sway = (p.sway ?? 0) + 6 * s;
      p.x += (p.vx + Math.sin(p.sway) * 30) * s;
      p.y += p.vy * s;
      p.rot = (p.rot ?? 0) + (p.spin ?? 0) * s;
    } else {
      p.x += p.vx * s;
      p.y += p.vy * s;
      p.vy += 140 * s;
    }
    p.life -= dt;
  }
  return particles.filter((p) => p.life > 0);
}
