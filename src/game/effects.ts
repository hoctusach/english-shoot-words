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

export function advanceParticles(particles: Particle[], dt: number): Particle[] {
  for (const p of particles) {
    p.x += p.vx * (dt / 1000);
    p.y += p.vy * (dt / 1000);
    p.vy += 140 * (dt / 1000);
    p.life -= dt;
  }
  return particles.filter((p) => p.life > 0);
}
