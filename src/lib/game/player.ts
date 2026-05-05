import type { TouchBuffer } from './touch'

export const PLAYER_RADIUS = 12
export const PLAYER_WIDTH = 24
export const PLAYER_HEIGHT = 30
const PADDING = 20
const INVINCIBLE_DURATION = 2000
const FIRE_INTERVAL = 200
const FOLLOW_SPEED = 20

export interface Player {
  x: number
  y: number
  lives: number
  invincibleTimer: number
  fireTimer: number
}

export function createPlayer(): Player {
  return {
    x: 195,
    y: 760,
    lives: 3,
    invincibleTimer: 0,
    fireTimer: 0,
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
  player.fireTimer = FIRE_INTERVAL
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
