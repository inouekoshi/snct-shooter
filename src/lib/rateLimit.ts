import { createHash } from 'crypto'

export interface RateLimitWindow {
  windowStart: number
  count: number
}

export const RATE_LIMIT_WINDOW_MS = 60_000
export const DEFAULT_SUBMISSIONS_PER_MINUTE = 20

export function parseRateLimit(value: string | undefined): number {
  if (value === undefined || value.trim() === '') return DEFAULT_SUBMISSIONS_PER_MINUTE
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : DEFAULT_SUBMISSIONS_PER_MINUTE
}

export function consumeRateLimit(
  current: RateLimitWindow | undefined,
  now: number,
  limit: number
): { allowed: boolean; next: RateLimitWindow } {
  if (!current || now - current.windowStart >= RATE_LIMIT_WINDOW_MS) {
    return { allowed: true, next: { windowStart: now, count: 1 } }
  }
  if (current.count >= limit) {
    return { allowed: false, next: current }
  }
  return { allowed: true, next: { windowStart: current.windowStart, count: current.count + 1 } }
}

export function clientIpOf(headers: Headers): string | null {
  const candidate = headers.get('x-real-ip') ?? headers.get('x-forwarded-for')?.split(',')[0]
  const trimmed = candidate?.trim()
  return trimmed ? trimmed : null
}

export function hashClientIp(ip: string): string {
  return createHash('sha256').update(`snct-shooter:${ip}`).digest('hex')
}
