import type { TouchBuffer } from './touch'
import type { PowerUpKind } from './state'

export const PLAYER_RADIUS = 12


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
}

export function createPlayer(): Player {
  return {
    x: 195,
    y: 760,
    lives: 3,
    invincibleTimer: 0,
    fireTimer: 0,
    fireInterval: 200,
    bulletSpeed: 600,
  }
}

export function resetPlayerPosition(player: Player): void {
  player.x = 195
  player.y = 760
}

export function updatePlayer(
  player: Player,
  touch: TouchBuffer,
  delta: number
): void {
  if (touch.active) {
    const targetX = Math.max(PADDING, Math.min(390 - PADDING, touch.x))
    const targetY = Math.max(PADDING, Math.min(844 - PADDING, touch.y))
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
  } else if (kind === 'FIRE_RATE') {
    player.fireInterval = Math.max(80, player.fireInterval - 30)
  } else if (kind === 'BULLET_SPEED') {
    player.bulletSpeed = Math.min(1080, player.bulletSpeed + 120)
  } else if (kind === 'WEAPON_UPGRADE') {
    player.weaponLevel = Math.min(3, player.weaponLevel + 1)
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
