import { describe, it, expect } from 'vitest'
import { createGuardGauge, chargeGuard, consumeGuard, isGuardReady } from '../guard'

describe('createGuardGauge', () => {
  it('空の状態で始まり、満タンに必要な量はモードで変わる', () => {
    expect(createGuardGauge('EASY')).toEqual({ value: 0, max: 20 })
    expect(createGuardGauge('NORMAL')).toEqual({ value: 0, max: 30 })
    expect(createGuardGauge('EXTRA')).toEqual({ value: 0, max: 45 })
  })
})

describe('chargeGuard', () => {
  it('雑魚敵は1、攻撃敵は3、ボスと回復敵は0たまる', () => {
    const gauge = createGuardGauge('NORMAL')
    chargeGuard(gauge, 'normal')
    expect(gauge.value).toBe(1)
    chargeGuard(gauge, 'attack')
    expect(gauge.value).toBe(4)
    chargeGuard(gauge, 'boss')
    chargeGuard(gauge, 'heal')
    expect(gauge.value).toBe(4)
  })

  it('満タンを超えてたまらない', () => {
    const gauge = createGuardGauge('EASY')
    for (let i = 0; i < 10; i++) chargeGuard(gauge, 'attack')
    expect(gauge.value).toBe(20)
  })
})

describe('consumeGuard', () => {
  it('満タンでなければ使えず、ゲージも減らない', () => {
    const gauge = { value: 29, max: 30 }
    expect(isGuardReady(gauge)).toBe(false)
    expect(consumeGuard(gauge)).toBe(false)
    expect(gauge.value).toBe(29)
  })

  it('満タンなら使えて、ゲージは0に戻る', () => {
    const gauge = { value: 30, max: 30 }
    expect(isGuardReady(gauge)).toBe(true)
    expect(consumeGuard(gauge)).toBe(true)
    expect(gauge).toEqual({ value: 0, max: 30 })
    expect(consumeGuard(gauge)).toBe(false)
  })
})
