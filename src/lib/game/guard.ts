import type { DifficultyMode } from './difficulty'
import type { EnemyKind } from './enemy'

export const GUARD_COLOR = '#00E5FF'
export const GUARD_INVINCIBLE_DURATION = 1000

const GUARD_POINTS: Record<EnemyKind, number> = {
  normal: 1,
  attack: 3,
  boss: 0,
  heal: 0,
}

const GUARD_GAUGE_MAX: Record<DifficultyMode, number> = {
  EASY: 20,
  NORMAL: 30,
  EXTRA: 60,
}

export interface GuardGauge {
  value: number
  max: number
}

export function createGuardGauge(mode: DifficultyMode): GuardGauge {
  return { value: 0, max: GUARD_GAUGE_MAX[mode] }
}

export function chargeGuard(gauge: GuardGauge, kind: EnemyKind): void {
  gauge.value = Math.min(gauge.max, gauge.value + GUARD_POINTS[kind])
}

export function isGuardReady(gauge: GuardGauge): boolean {
  return gauge.value >= gauge.max
}

export function consumeGuard(gauge: GuardGauge): boolean {
  if (!isGuardReady(gauge)) return false
  gauge.value = 0
  return true
}

export function renderGuardAura(ctx: CanvasRenderingContext2D, x: number, y: number, time: number): void {
  const pulse = 0.5 + 0.5 * Math.sin(time / 150)
  ctx.save()
  ctx.strokeStyle = GUARD_COLOR
  ctx.globalAlpha = 0.4 + 0.4 * pulse
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(x, y, 22 + 2 * pulse, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}
