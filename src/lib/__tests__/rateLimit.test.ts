import { describe, it, expect } from 'vitest'
import {
  consumeRateLimit, parseRateLimit, clientIpOf, hashClientIp, rateLimitKeyOf, RATE_LIMIT_WINDOW_MS, DEFAULT_SUBMISSIONS_PER_MINUTE,
} from '../rateLimit'

describe('consumeRateLimit', () => {
  it('記録がなければ許可して1件目にする', () => {
    expect(consumeRateLimit(undefined, 1000, 3)).toEqual({ allowed: true, next: { windowStart: 1000, count: 1 } })
  })

  it('同じ1分の中では上限まで許可し、超えたら拒否する', () => {
    let window = consumeRateLimit(undefined, 0, 3).next
    window = consumeRateLimit(window, 10_000, 3).next
    const third = consumeRateLimit(window, 20_000, 3)
    expect(third).toEqual({ allowed: true, next: { windowStart: 0, count: 3 } })
    expect(consumeRateLimit(third.next, 30_000, 3)).toEqual({ allowed: false, next: third.next })
  })

  it('1分たてば数え直す', () => {
    const full = { windowStart: 0, count: 3 }
    expect(consumeRateLimit(full, RATE_LIMIT_WINDOW_MS - 1, 3).allowed).toBe(false)
    expect(consumeRateLimit(full, RATE_LIMIT_WINDOW_MS, 3)).toEqual({
      allowed: true,
      next: { windowStart: RATE_LIMIT_WINDOW_MS, count: 1 },
    })
  })
})

describe('parseRateLimit', () => {
  it('未設定や不正な値なら既定値', () => {
    expect(parseRateLimit(undefined)).toBe(DEFAULT_SUBMISSIONS_PER_MINUTE)
    expect(parseRateLimit('')).toBe(DEFAULT_SUBMISSIONS_PER_MINUTE)
    expect(parseRateLimit('abc')).toBe(DEFAULT_SUBMISSIONS_PER_MINUTE)
    expect(parseRateLimit('-1')).toBe(DEFAULT_SUBMISSIONS_PER_MINUTE)
    expect(parseRateLimit('1.5')).toBe(DEFAULT_SUBMISSIONS_PER_MINUTE)
  })

  it('0以上の整数ならその値（0は制限なし）', () => {
    expect(parseRateLimit('5')).toBe(5)
    expect(parseRateLimit('0')).toBe(0)
  })
})

describe('clientIpOf', () => {
  it('x-real-ip があればそれを優先する', () => {
    expect(clientIpOf(new Headers({ 'x-forwarded-for': '1.1.1.1', 'x-real-ip': '2.2.2.2' }))).toBe('2.2.2.2')
  })

  it('x-forwarded-for の先頭を使う', () => {
    expect(clientIpOf(new Headers({ 'x-forwarded-for': ' 203.0.113.5 , 10.0.0.1' }))).toBe('203.0.113.5')
  })

  it('分からなければ null', () => {
    expect(clientIpOf(new Headers())).toBeNull()
  })
})

describe('hashClientIp', () => {
  it('IPをそのまま保存しないようにハッシュ化し、同じIPなら同じ値になる', () => {
    const hashed = hashClientIp('203.0.113.5')
    expect(hashed).toMatch(/^[0-9a-f]{64}$/)
    expect(hashed).not.toContain('203')
    expect(hashClientIp('203.0.113.5')).toBe(hashed)
    expect(hashClientIp('203.0.113.6')).not.toBe(hashed)
  })
})

describe('rateLimitKeyOf', () => {
  it('clientId があればそれを優先してハッシュ化する', () => {
    const key = rateLimitKeyOf('36a5faee-9c16-466d-96e0-833446b5a37f', '203.0.113.5')
    expect(key).toMatch(/^[0-9a-f]{64}$/)
    expect(rateLimitKeyOf('36a5faee-9c16-466d-96e0-833446b5a37f', '192.168.1.1')).toBe(key)
    expect(rateLimitKeyOf('other-client-id', '203.0.113.5')).not.toBe(key)
  })

  it('clientId がなく IP があれば IP をハッシュ化する', () => {
    const key = rateLimitKeyOf(null, '203.0.113.5')
    expect(key).toMatch(/^[0-9a-f]{64}$/)
    expect(rateLimitKeyOf(undefined, '203.0.113.5')).toBe(key)
    expect(rateLimitKeyOf(null, '192.168.1.1')).not.toBe(key)
  })

  it('どちらもなければ null', () => {
    expect(rateLimitKeyOf(null, null)).toBeNull()
    expect(rateLimitKeyOf(undefined, null)).toBeNull()
  })
})
