import type { DifficultyParams } from './difficulty'
import { createEnemyBullet, type Bullet } from './bullet'

export type EnemyKind = 'normal' | 'attack' | 'boss'

export interface Enemy {
  kind: EnemyKind
  x: number
  y: number
  radius: number
  hp: number
  maxHp: number
  speed: number
  fireTimer: number
  fireInterval: number
  bulletSpeed: number
  score: number
}

export function createNormalEnemy(diff: DifficultyParams): Enemy {
  return {
    kind: 'normal',
    x: 40 + Math.random() * 310,
    y: -20,
    radius: 15,
    hp: 1,
    maxHp: 1,
    speed: diff.normalEnemySpeed,
    fireTimer: 0,
    fireInterval: Infinity,
    bulletSpeed: 0,
    score: 10,
  }
}

export function createAttackEnemy(diff: DifficultyParams): Enemy {
  return {
    kind: 'attack',
    x: 40 + Math.random() * 310,
    y: -20,
    radius: 20,
    hp: 30,
    maxHp: 30,
    speed: diff.attackEnemySpeed,
    fireTimer: diff.attackEnemyFireInterval * Math.random(),
    fireInterval: diff.attackEnemyFireInterval,
    bulletSpeed: diff.attackEnemyBulletSpeed,
    score: 30,
  }
}

export function createBoss(stage: number, diff: DifficultyParams): Enemy {
  return {
    kind: 'boss',
    x: 195,
    y: -60,
    radius: 40,
    hp: diff.bossHp,
    maxHp: diff.bossHp,
    speed: diff.bossSpeed,
    fireTimer: 800,
    fireInterval: 800,
    bulletSpeed: 250,
    score: 500,
  }
}

export function updateEnemies(
  enemies: Enemy[],
  delta: number,
  playerX: number,
  bullets: Bullet[]
): void {
  const dt = delta / 1000
  for (const e of enemies) {
    if (e.kind === 'normal') {
      e.y += e.speed * dt
    } else if (e.kind === 'attack') {
      e.y += e.speed * dt
      e.fireTimer -= delta
      if (e.fireTimer <= 0) {
        e.fireTimer = e.fireInterval
        const dx = playerX - e.x
        const dy = 760 - e.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const speed = e.bulletSpeed
        bullets.push(createEnemyBullet(e.x, e.y, (dx / dist) * speed, (dy / dist) * speed))
      }
    } else if (e.kind === 'boss') {
      updateBoss(e, delta, playerX, bullets)
    }
  }
}

function updateBoss(boss: Enemy, delta: number, playerX: number, bullets: Bullet[]): void {
  const dt = delta / 1000

  // Move horizontally toward player X
  const dx = playerX - boss.x
  const moveX = Math.min(Math.abs(dx), boss.speed * dt) * Math.sign(dx)
  boss.x = Math.max(50, Math.min(340, boss.x + moveX))

  // Move into position (top quarter)
  if (boss.y < 120) {
    boss.y = Math.min(120, boss.y + boss.speed * dt)
  }

  // Fire
  boss.fireTimer -= delta
  if (boss.fireTimer <= 0) {
    const hpRatio = boss.hp / boss.maxHp
    if (hpRatio > 0.5) {
      // Pattern 1: single aimed shot
      boss.fireTimer = 800
      const tx = playerX - boss.x
      const ty = 760 - boss.y
      const dist = Math.sqrt(tx * tx + ty * ty) || 1
      bullets.push(createEnemyBullet(boss.x, boss.y, (tx / dist) * 250, (ty / dist) * 250, true))
    } else {
      // Pattern 2: fan 5-way (downward spread ±40°)
      boss.fireTimer = 1200
      for (const offset of [-40, -20, 0, 20, 40]) {
        const angle = Math.PI / 2 + (offset * Math.PI) / 180
        bullets.push(createEnemyBullet(boss.x, boss.y, Math.cos(angle) * 300, Math.sin(angle) * 300, true))
      }
    }
  }
}

export function removeOffscreenEnemies(enemies: Enemy[]): Enemy[] {
  return enemies.filter((e) => e.y < 920)
}

export function renderEnemies(ctx: CanvasRenderingContext2D, enemies: Enemy[]): void {
  for (const e of enemies) {
    if (e.kind === 'normal') {
      renderNormalEnemy(ctx, e)
    } else if (e.kind === 'attack') {
      renderAttackEnemy(ctx, e)
    } else if (e.kind === 'boss') {
      renderBoss(ctx, e)
    }
  }
}

function renderNormalEnemy(ctx: CanvasRenderingContext2D, e: Enemy): void {
  const s = e.radius
  ctx.fillStyle = '#FF4444'
  ctx.beginPath()
  ctx.moveTo(e.x, e.y + s)
  ctx.lineTo(e.x - s, e.y - s)
  ctx.lineTo(e.x + s, e.y - s)
  ctx.closePath()
  ctx.fill()
}

function renderAttackEnemy(ctx: CanvasRenderingContext2D, e: Enemy): void {
  const s = e.radius
  ctx.fillStyle = '#FF8800'
  ctx.beginPath()
  ctx.moveTo(e.x, e.y + s)
  ctx.lineTo(e.x - s, e.y - s)
  ctx.lineTo(e.x + s, e.y - s)
  ctx.closePath()
  ctx.fill()
}

function renderBoss(ctx: CanvasRenderingContext2D, e: Enemy): void {
  const r = e.radius
  ctx.fillStyle = '#AA00FF'
  ctx.beginPath()
  // Hexagon
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3 - Math.PI / 6
    const px = e.x + Math.cos(angle) * r * 1.4
    const py = e.y + Math.sin(angle) * r * 0.8
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.fill()

  // HP bar
  const barW = 100
  const barH = 8
  const barX = e.x - barW / 2
  const barY = e.y - r - 20
  ctx.fillStyle = '#333'
  ctx.fillRect(barX, barY, barW, barH)
  ctx.fillStyle = '#AA00FF'
  ctx.fillRect(barX, barY, barW * (e.hp / e.maxHp), barH)
  ctx.strokeStyle = '#FFFFFF'
  ctx.lineWidth = 1
  ctx.strokeRect(barX, barY, barW, barH)
}
