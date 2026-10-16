import { describe, it, expect, vi, afterEach } from 'vitest'
import { generatePowerUpOptions } from '../powerup'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('generatePowerUpOptions', () => {
  it('左はステージ1〜4でHP +1、ステージ5以降はHP +2', () => {
    expect(generatePowerUpOptions(1, 1, 'NORMAL')[0].kind).toBe('HP')
    expect(generatePowerUpOptions(4, 1, 'NORMAL')[0].kind).toBe('HP')
    expect(generatePowerUpOptions(5, 1, 'NORMAL')[0].kind).toBe('HP_2')
  })

  it('NORMALはステージ3・5で武器強化（Lv.3まで）', () => {
    expect(generatePowerUpOptions(3, 1, 'NORMAL')[1].kind).toBe('WEAPON_UPGRADE')
    expect(generatePowerUpOptions(5, 2, 'NORMAL')[1].kind).toBe('WEAPON_UPGRADE')
    expect(generatePowerUpOptions(5, 3, 'NORMAL')[1].kind).not.toBe('WEAPON_UPGRADE')
    expect(generatePowerUpOptions(4, 1, 'NORMAL')[1].kind).not.toBe('WEAPON_UPGRADE')
  })

  it('武器強化の説明に進化後の武器名を出す', () => {
    expect(generatePowerUpOptions(3, 1, 'NORMAL')[1].sub).toBe('ツインショットに進化')
    expect(generatePowerUpOptions(1, 3, 'EXTRA')[1].sub).toBe('5-Wayに進化')
    expect(generatePowerUpOptions(2, 4, 'EXTRA')[1].sub).toBe('貫通レーザーに進化')
  })

  it('武器強化がないときは連射強化か弾速強化をランダムに出す', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    expect(generatePowerUpOptions(1, 1, 'NORMAL')[1].kind).toBe('FIRE_RATE')
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    expect(generatePowerUpOptions(1, 1, 'NORMAL')[1].kind).toBe('BULLET_SPEED')
  })

  it('EXTRAは常にHP +2で、Lv.5未満なら武器強化', () => {
    const [left, right] = generatePowerUpOptions(1, 3, 'EXTRA')
    expect(left.kind).toBe('HP_2')
    expect(right.kind).toBe('WEAPON_UPGRADE')
    expect(generatePowerUpOptions(2, 5, 'EXTRA')[1].kind).not.toBe('WEAPON_UPGRADE')
  })

  it('EASYはNORMALと同じルール', () => {
    expect(generatePowerUpOptions(3, 1, 'EASY')[1].kind).toBe('WEAPON_UPGRADE')
    expect(generatePowerUpOptions(5, 1, 'EASY')[0].kind).toBe('HP_2')
  })
})
