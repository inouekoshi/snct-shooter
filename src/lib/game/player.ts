import type { TouchBuffer } from './touch'
import type { PowerUpKind } from './state'
import type { DifficultyMode } from './difficulty'
import { createPlayerBullet, createPlayerLaser, type Bullet } from './bullet'
import { CANVAS_WIDTH, CANVAS_HEIGHT, CANVAS_CENTER_X, PLAYER_START_Y } from './constants'

export const PLAYER_RADIUS = 12
export const MAX_WEAPON_LEVEL = 5

const PLAYER_WIDTH = 24
const PLAYER_HEIGHT = 30
const PADDING = 20
const INVINCIBLE_DURATION = 2000
const FOLLOW_SPEED = 20

export interface Player {
  x: number
  y: number
  lives: number
  invincibleTimer: number
  fireTimer: number
  fireInterval: number
  bulletSpeed: number
  weaponLevel: number
}

export function createPlayer(mode: DifficultyMode = 'NORMAL'): Player {
  const player: Player = {
    x: CANVAS_CENTER_X,
    y: PLAYER_START_Y,
    lives: 3,
    invincibleTimer: 0,
    fireTimer: 0,
    fireInterval: 200,
    bulletSpeed: 600,
    weaponLevel: 1,
  }
  if (mode === 'EXTRA') {
    player.lives = 5
    player.fireInterval = 140
    player.bulletSpeed = 840
    player.weaponLevel = 3
  }
  return player
}

const WEAPON_NAMES: Record<number, string> = {
  1: 'シングル',
  2: 'ツインショット',
  3: '3-Way',
  4: '5-Way',
  5: '貫通レーザー',
}

export function weaponName(level: number): string {
  return WEAPON_NAMES[level] ?? WEAPON_NAMES[MAX_WEAPON_LEVEL]
}

function spreadShots(x: number, y: number, speed: number, degrees: number[]): Bullet[] {
  return degrees.map((deg) => {
    const rad = (deg * Math.PI) / 180
    return createPlayerBullet(x, y, speed * Math.sin(rad), -speed * Math.cos(rad))
  })
}

export function firePlayerBullets(player: Player): Bullet[] {
  const speed = player.bulletSpeed
  const x = player.x
  const y = player.y - 15
  switch (player.weaponLevel) {
    case 1:
      return [createPlayerBullet(x, y, 0, -speed)]
    case 2:
      return [createPlayerBullet(x - 8, y, 0, -speed), createPlayerBullet(x + 8, y, 0, -speed)]
    case 3:
      return spreadShots(x, y, speed, [0, -15, 15])
    case 4:
      return spreadShots(x, y, speed, [0, -10, 10, -20, 20])
    default:
      return [createPlayerLaser(x, y, speed), ...spreadShots(x, y, speed, [-10, 10, -20, 20])]
  }
}

export function resetPlayerPosition(player: Player): void {
  player.x = CANVAS_CENTER_X
  player.y = PLAYER_START_Y
}

export function updatePlayer(
  player: Player,
  touch: TouchBuffer,
  delta: number
): void {
  if (touch.active) {
    const targetX = Math.max(PADDING, Math.min(CANVAS_WIDTH - PADDING, touch.x))
    const targetY = Math.max(PADDING, Math.min(CANVAS_HEIGHT - PADDING, touch.y))
    const t = 1 - Math.exp(-FOLLOW_SPEED * delta / 1000)
    player.x += (targetX - player.x) * t
    player.y += (targetY - player.y) * t
  }
  if (player.invincibleTimer > 0) {
    player.invincibleTimer = Math.max(0, player.invincibleTimer - delta)
  }
  if (player.fireTimer > 0) {
    player.fireTimer = Math.max(0, player.fireTimer - delta)
  }
}

export function isPlayerInvincible(player: Player): boolean {
  return player.invincibleTimer > 0
}

export function hitPlayer(player: Player): void {
  player.lives -= 1
  player.invincibleTimer = INVINCIBLE_DURATION
}

export function canFire(player: Player): boolean {
  return player.fireTimer <= 0
}

export function resetFireTimer(player: Player): void {
  player.fireTimer = player.fireInterval
}

export function applyUpgrade(player: Player, kind: PowerUpKind): void {
  if (kind === 'HP') {
    player.lives += 1
  } else if (kind === 'HP_2') {
    player.lives += 2
  } else if (kind === 'FIRE_RATE') {
    player.fireInterval = Math.max(80, player.fireInterval - 30)
  } else if (kind === 'BULLET_SPEED') {
    player.bulletSpeed = Math.min(1080, player.bulletSpeed + 120)
  } else if (kind === 'WEAPON_UPGRADE') {
    player.weaponLevel = Math.min(MAX_WEAPON_LEVEL, player.weaponLevel + 1)
  }
}

export function renderPlayer(ctx: CanvasRenderingContext2D, player: Player): void {
  const { x, y } = player
  if (player.invincibleTimer > 0) {
    const blink = Math.floor(player.invincibleTimer / 100) % 2 === 0
    if (!blink) return
  }

  ctx.fillStyle = '#FFFFFF'
  ctx.beginPath()
  ctx.moveTo(x, y - PLAYER_HEIGHT / 2)
  ctx.lineTo(x - PLAYER_WIDTH / 2, y + PLAYER_HEIGHT / 2)
  ctx.lineTo(x + PLAYER_WIDTH / 2, y + PLAYER_HEIGHT / 2)
  ctx.closePath()
  ctx.fill()
}
