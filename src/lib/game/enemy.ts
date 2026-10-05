import type { BossVariant, DifficultyParams } from './difficulty'
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
  vx: number
  movePhase: number
  shotCount: number
  bossParams?: DifficultyParams['bossParams']
  bossVariant?: BossVariant
}

const ATTACK_SPREAD_DEG = 20
const AIMED_SPREAD_DEG = 15
const FAN_TOTAL_DEG = 80

const PLAYER_BASE_Y = 760

function randomSpawnX(): number {
  return 40 + Math.random() * 310
}

export function createNormalEnemy(diff: DifficultyParams): Enemy {
  return {
    kind: 'normal',
    x: randomSpawnX(),
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
    shotCount: 0,
  }
}

export function createAttackEnemy(diff: DifficultyParams): Enemy {
  const zigzag = Math.random() < 0.4
  return {
    kind: 'attack',
    x: randomSpawnX(),
    y: -20,
    radius: 20,
    hp: diff.attackEnemyHp,
    maxHp: diff.attackEnemyHp,
    speed: diff.attackEnemySpeed,
    fireTimer: diff.attackEnemyFireInterval * Math.random(),
    fireInterval: diff.attackEnemyFireInterval,
    bulletSpeed: diff.attackEnemyBulletSpeed,
    score: 30,
    vx: zigzag ? (Math.random() < 0.5 ? 1 : -1) * 70 : 0,
    movePhase: 0,
    shotCount: zigzag ? diff.attackEnemyShots.zigzag : diff.attackEnemyShots.straight,
  }
}

export function createHealEnemy(): Enemy {
  return {
    kind: 'heal',
    x: randomSpawnX(),
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
    shotCount: 0,
  }
}

export function createBoss(stage: number, diff: DifficultyParams): Enemy {
  const isFinal = diff.bossVariant === 'final'
  return {
    kind: 'boss',
    x: 195,
    y: -60,
    radius: isFinal ? 48 : 40,
    hp: diff.bossHp,
    maxHp: diff.bossHp,
    speed: diff.bossSpeed,
    fireTimer: diff.bossParams.interval1,
    fireInterval: diff.bossParams.interval1,
    bulletSpeed: diff.bossParams.bulletSpeed1,
    score: isFinal ? 1000 : 500,
    vx: 0,
    movePhase: 0,
    shotCount: 0,
    bossParams: diff.bossParams,
    bossVariant: diff.bossVariant,
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
        const baseAngle = Math.atan2(PLAYER_BASE_Y - e.y, playerX - e.x)
        const speed = e.vx === 0 ? e.bulletSpeed : e.bulletSpeed * 0.85
        fireSpread(bullets, e.x, e.y, baseAngle, speed, e.shotCount, ATTACK_SPREAD_DEG, false)
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
    const bp = boss.bossParams!
    if (hpRatio > 0.5) {
      boss.fireTimer = bp.interval1
      const aim = Math.atan2(PLAYER_BASE_Y - boss.y, playerX - boss.x)
      fireSpread(bullets, boss.x, boss.y, aim, bp.bulletSpeed1, bp.aimedShots, AIMED_SPREAD_DEG, true)
    } else if (hpRatio > 0.25) {
      boss.fireTimer = bp.interval2
      const step = bp.fanWays > 1 ? FAN_TOTAL_DEG / (bp.fanWays - 1) : 0
      fireSpread(bullets, boss.x, boss.y, Math.PI / 2, bp.bulletSpeed2, bp.fanWays, step, true)
    } else {
      boss.fireTimer = bp.interval3
      boss.movePhase = (boss.movePhase + Math.PI / 6) % (Math.PI * 2)
      for (let i = 0; i < bp.spiralArms; i++) {
        const angle = boss.movePhase + (i * Math.PI * 2) / bp.spiralArms
        bullets.push(createEnemyBullet(boss.x, boss.y, Math.cos(angle) * bp.bulletSpeed3, Math.sin(angle) * bp.bulletSpeed3, true))
      }
    }
  }
}

function fireSpread(
  bullets: Bullet[],
  x: number,
  y: number,
  centerAngle: number,
  speed: number,
  count: number,
  stepDeg: number,
  isBoss: boolean
): void {
  for (let i = 0; i < count; i++) {
    const angle = centerAngle + ((i - (count - 1) / 2) * stepDeg * Math.PI) / 180
    bullets.push(createEnemyBullet(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, isBoss))
  }
}

export function removeOffscreenEnemies(enemies: Enemy[]): Enemy[] {
  return enemies.filter((e) => e.y < 920)
}

export function enemyColor(e: Enemy): string {
  if (e.kind === 'normal') return '#FF4444'
  if (e.kind === 'attack') return e.vx !== 0 ? '#FFAA00' : '#FF8800'
  if (e.kind === 'heal') return '#00CC88'
  return e.bossVariant === 'final' ? '#FF2266' : '#AA00FF'
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
  ctx.fillStyle = enemyColor(e)
  ctx.beginPath()
  ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(e.x - 6, e.y - 2, 12, 4)
  ctx.fillRect(e.x - 2, e.y - 6, 4, 12)
}

function renderNormalEnemy(ctx: CanvasRenderingContext2D, e: Enemy): void {
  const s = e.radius
  ctx.fillStyle = enemyColor(e)
  ctx.beginPath()
  ctx.moveTo(e.x, e.y + s)
  ctx.lineTo(e.x - s, e.y - s)
  ctx.lineTo(e.x + s, e.y - s)
  ctx.closePath()
  ctx.fill()
}

function renderAttackEnemy(ctx: CanvasRenderingContext2D, e: Enemy): void {
  const s = e.radius
  ctx.fillStyle = enemyColor(e)
  ctx.beginPath()
  ctx.moveTo(e.x, e.y + s)
  ctx.lineTo(e.x - s, e.y - s)
  ctx.lineTo(e.x + s, e.y - s)
  ctx.closePath()
  ctx.fill()
}

function renderBoss(ctx: CanvasRenderingContext2D, e: Enemy): void {
  const r = e.radius
  ctx.fillStyle = enemyColor(e)
  ctx.beginPath()
  if (e.bossVariant === 'final') {
    const points = 16
    for (let i = 0; i < points; i++) {
      const angle = (i * Math.PI * 2) / points + e.movePhase
      const len = i % 2 === 0 ? r * 1.3 : r * 0.75
      const px = e.x + Math.cos(angle) * len
      const py = e.y + Math.sin(angle) * len
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
    }
  } else {
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3 - Math.PI / 6
      const px = e.x + Math.cos(angle) * r * 1.4
      const py = e.y + Math.sin(angle) * r * 0.8
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
    }
  }
  ctx.closePath()
  ctx.fill()

  const barW = 100
  const barH = 8
  const barX = e.x - barW / 2
  const barY = e.y - r - 20
  ctx.fillStyle = '#333'
  ctx.fillRect(barX, barY, barW, barH)
  ctx.fillStyle = enemyColor(e)
  ctx.fillRect(barX, barY, barW * (e.hp / e.maxHp), barH)
  ctx.strokeStyle = '#FFFFFF'
  ctx.lineWidth = 1
  ctx.strokeRect(barX, barY, barW, barH)
}
