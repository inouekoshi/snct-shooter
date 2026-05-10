import type { DifficultyParams } from './difficulty'
import { createEnemyBullet, type Bullet } from './bullet'

export type EnemyKind = 'normal' | 'attack' | 'boss' | 'heal'

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
  vx: number         // horizontal velocity (0 = straight, ±N = zigzag)
  movePhase: number  // boss rotation accumulator
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
    vx: 0,
    movePhase: 0,
  }
}

export function createAttackEnemy(diff: DifficultyParams): Enemy {
  const zigzag = Math.random() < 0.4
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
    vx: zigzag ? (Math.random() < 0.5 ? 1 : -1) * 70 : 0,
    movePhase: 0,
  }
}

export function createHealEnemy(): Enemy {
  return {
    kind: 'heal',
    x: 40 + Math.random() * 310,
    y: -20,
    radius: 14,
    hp: 1,
    maxHp: 1,
    speed: 65,
    fireTimer: 0,
    fireInterval: Infinity,
    bulletSpeed: 0,
    score: 0,
    vx: 0,
    movePhase: 0,
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
    vx: 0,
    movePhase: 0,
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
    if (e.kind === 'normal' || e.kind === 'heal') {
      e.y += e.speed * dt
    } else if (e.kind === 'attack') {
      e.y += e.speed * dt

      if (e.vx !== 0) {
        e.x += e.vx * dt
        if (e.x < 30 || e.x > 360) e.vx = -e.vx
      }

      e.fireTimer -= delta
      if (e.fireTimer <= 0) {
        e.fireTimer = e.fireInterval
        const dx = playerX - e.x
        const dy = 760 - e.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const baseAngle = Math.atan2(dy, dx)

        if (e.vx === 0) {
          // Aimed single shot
          const speed = e.bulletSpeed
          bullets.push(createEnemyBullet(e.x, e.y, (dx / dist) * speed, (dy / dist) * speed))
        } else {
          // 3-way spread toward player
          for (const offset of [-20, 0, 20]) {
            const angle = baseAngle + (offset * Math.PI) / 180
            const speed = e.bulletSpeed * 0.85
            bullets.push(createEnemyBullet(e.x, e.y, Math.cos(angle) * speed, Math.sin(angle) * speed))
          }
        }
      }
    } else if (e.kind === 'boss') {
      updateBoss(e, delta, playerX, bullets)
    }
  }
}

function updateBoss(boss: Enemy, delta: number, playerX: number, bullets: Bullet[]): void {
  const dt = delta / 1000

  const dx = playerX - boss.x
  const moveX = Math.min(Math.abs(dx), boss.speed * dt) * Math.sign(dx)
  boss.x = Math.max(50, Math.min(340, boss.x + moveX))

  if (boss.y < 120) {
    boss.y = Math.min(120, boss.y + boss.speed * dt)
  }

  boss.fireTimer -= delta
  if (boss.fireTimer <= 0) {
    const hpRatio = boss.hp / boss.maxHp
    if (hpRatio > 0.5) {
      // Phase 1: single aimed shot
      boss.fireTimer = 800
      const tx = playerX - boss.x
      const ty = 760 - boss.y
      const dist = Math.sqrt(tx * tx + ty * ty) || 1
      bullets.push(createEnemyBullet(boss.x, boss.y, (tx / dist) * 250, (ty / dist) * 250, true))
    } else if (hpRatio > 0.25) {
      // Phase 2: 5-way fan
      boss.fireTimer = 1200
      for (const offset of [-40, -20, 0, 20, 40]) {
        const angle = Math.PI / 2 + (offset * Math.PI) / 180
        bullets.push(createEnemyBullet(boss.x, boss.y, Math.cos(angle) * 300, Math.sin(angle) * 300, true))
      }
    } else {
      // Phase 3: rotating 3-way burst
      boss.fireTimer = 500
      boss.movePhase = (boss.movePhase + Math.PI / 6) % (Math.PI * 2)
      for (let i = 0; i < 3; i++) {
        const angle = boss.movePhase + (i * Math.PI * 2) / 3
        bullets.push(createEnemyBullet(boss.x, boss.y, Math.cos(angle) * 320, Math.sin(angle) * 320, true))
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
    } else if (e.kind === 'heal') {
      renderHealEnemy(ctx, e)
    }
  }
}

function renderHealEnemy(ctx: CanvasRenderingContext2D, e: Enemy): void {
  ctx.fillStyle = '#00CC88'
  ctx.beginPath()
  ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(e.x - 6, e.y - 2, 12, 4)
  ctx.fillRect(e.x - 2, e.y - 6, 4, 12)
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
  ctx.fillStyle = e.vx !== 0 ? '#FFAA00' : '#FF8800'
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
