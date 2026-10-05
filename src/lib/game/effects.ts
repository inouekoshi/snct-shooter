export const MAX_PARTICLES = 400
const PARTICLE_DRAG = 3

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
}

export interface ExplosionOptions {
  count: number
  speed: number
  life: number
  size: number
}

export const EXPLOSION_SMALL: ExplosionOptions = { count: 10, speed: 180, life: 450, size: 3 }
export const EXPLOSION_MEDIUM: ExplosionOptions = { count: 16, speed: 220, life: 550, size: 3.5 }
export const EXPLOSION_LARGE: ExplosionOptions = { count: 70, speed: 380, life: 1100, size: 5 }

export function spawnExplosion(
  particles: Particle[],
  x: number,
  y: number,
  color: string,
  options: ExplosionOptions
): void {
  const room = MAX_PARTICLES - particles.length
  const count = Math.min(options.count, room)
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = options.speed * (0.3 + Math.random() * 0.7)
    const life = options.life * (0.6 + Math.random() * 0.4)
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life,
      maxLife: life,
      size: options.size * (0.5 + Math.random() * 0.5),
      color,
    })
  }
}

export function updateParticles(particles: Particle[], delta: number): Particle[] {
  const dt = delta / 1000
  const drag = Math.exp(-PARTICLE_DRAG * dt)
  for (const p of particles) {
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.vx *= drag
    p.vy *= drag
    p.life -= delta
  }
  return particles.filter((p) => p.life > 0)
}

export function renderParticles(ctx: CanvasRenderingContext2D, particles: Particle[]): void {
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife)
    ctx.fillStyle = p.color
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size)
  }
  ctx.globalAlpha = 1
}

export interface ScreenShake {
  intensity: number
  duration: number
  remaining: number
}

export const SHAKE_PLAYER_HIT = { intensity: 6, duration: 250 }
export const SHAKE_BOSS_DEFEAT = { intensity: 12, duration: 600 }

export function createScreenShake(): ScreenShake {
  return { intensity: 0, duration: 0, remaining: 0 }
}

export function triggerShake(shake: ScreenShake, intensity: number, duration: number): void {
  if (currentShakeAmplitude(shake) > intensity) return
  shake.intensity = intensity
  shake.duration = duration
  shake.remaining = duration
}

export function updateShake(shake: ScreenShake, delta: number): void {
  shake.remaining = Math.max(0, shake.remaining - delta)
}

export function currentShakeAmplitude(shake: ScreenShake): number {
  if (shake.remaining <= 0 || shake.duration <= 0) return 0
  return shake.intensity * (shake.remaining / shake.duration)
}

export function shakeOffset(shake: ScreenShake): { x: number; y: number } {
  const amplitude = currentShakeAmplitude(shake)
  if (amplitude === 0) return { x: 0, y: 0 }
  return {
    x: (Math.random() * 2 - 1) * amplitude,
    y: (Math.random() * 2 - 1) * amplitude,
  }
}
