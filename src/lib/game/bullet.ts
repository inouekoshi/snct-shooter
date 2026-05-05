export interface Bullet {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  damage: number
  isEnemy: boolean
  isBoss: boolean
}

export function createPlayerBullet(x: number, y: number): Bullet {
  return {
    x,
    y,
    vx: 0,
    vy: -600,
    radius: 4,
    damage: 10,
    isEnemy: false,
    isBoss: false,
  }
}

export function createEnemyBullet(
  x: number,
  y: number,
  vx: number,
  vy: number,
  isBoss = false
): Bullet {
  return {
    x,
    y,
    vx,
    vy,
    radius: isBoss ? 7 : 5,
    damage: 1,
    isEnemy: true,
    isBoss,
  }
}

export function updateBullets(bullets: Bullet[], delta: number): void {
  const dt = delta / 1000
  for (const b of bullets) {
    b.x += b.vx * dt
    b.y += b.vy * dt
  }
}

export function removeOffscreenBullets(bullets: Bullet[]): Bullet[] {
  return bullets.filter((b) => b.y > -20 && b.y < 864 && b.x > -20 && b.x < 410)
}

export function renderBullets(ctx: CanvasRenderingContext2D, bullets: Bullet[]): void {
  for (const b of bullets) {
    if (b.isEnemy) {
      ctx.fillStyle = b.isBoss ? '#FF0000' : '#FF4444'
    } else {
      ctx.fillStyle = '#FFFF00'
    }
    ctx.beginPath()
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2)
    ctx.fill()
  }
}
