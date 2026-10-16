import type { PowerUpOption } from './state'
import type { BossVariant } from './difficulty'
import { CANVAS_WIDTH, CANVAS_HEIGHT, CANVAS_CENTER_X } from './constants'

const STAGE_CLEAR_FADE_IN = 600

function fillScreen(ctx: CanvasRenderingContext2D, color: string): void {
  ctx.fillStyle = color
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
}

function centerText(ctx: CanvasRenderingContext2D, text: string, font: string, y: number): void {
  ctx.fillStyle = '#FFFFFF'
  ctx.font = font
  ctx.textAlign = 'center'
  ctx.fillText(text, CANVAS_CENTER_X, y)
}

export function renderBossAppearing(ctx: CanvasRenderingContext2D, variant: BossVariant): void {
  const isFinal = variant === 'final'
  fillScreen(ctx, isFinal ? 'rgba(255,34,102,0.35)' : 'rgba(170,0,255,0.3)')
  centerText(ctx, isFinal ? 'FINAL BOSS!' : 'BOSS!', 'bold 36px sans-serif', 422)
}

export function renderStageClear(ctx: CanvasRenderingContext2D, elapsed: number, bonus: number): void {
  fillScreen(ctx, `rgba(0,0,0,${0.5 * Math.min(1, elapsed / STAGE_CLEAR_FADE_IN)})`)
  centerText(ctx, 'STAGE CLEAR!', 'bold 42px sans-serif', 400)
  centerText(ctx, `BONUS +${bonus}`, '24px sans-serif', 450)
}

function drawOptionBox(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  opt: PowerUpOption, color: string
): void {
  ctx.fillStyle = color
  ctx.strokeStyle = '#FFFFFF'
  ctx.lineWidth = 2
  ctx.fillRect(x, y, w, h)
  ctx.strokeRect(x, y, w, h)

  ctx.fillStyle = '#FFFFFF'
  ctx.font = 'bold 22px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(opt.label, x + w / 2, y + h / 2 - 10)
  ctx.font = '16px sans-serif'
  ctx.fillText(opt.sub, x + w / 2, y + h / 2 + 20)
}

export function renderPowerUpSelect(
  ctx: CanvasRenderingContext2D,
  options: [PowerUpOption, PowerUpOption]
): void {
  fillScreen(ctx, 'rgba(0,0,0,0.75)')
  centerText(ctx, 'POWER UP!', 'bold 28px sans-serif', 200)
  centerText(ctx, 'どちらかを選んでタップ', '18px sans-serif', 240)
  drawOptionBox(ctx, 20, 300, 165, 220, options[0], '#1A4488')
  drawOptionBox(ctx, 205, 300, 165, 220, options[1], '#885500')
}

export function renderCountdown(ctx: CanvasRenderingContext2D, remaining: number): void {
  fillScreen(ctx, 'rgba(0,0,0,0.5)')
  centerText(ctx, String(Math.ceil(remaining / 1000)), 'bold 72px sans-serif', 450)
}
