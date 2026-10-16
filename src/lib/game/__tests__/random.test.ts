import { describe, it, expect } from 'vitest'
import { createSeededRng, createRandomSeed } from '../random'
import { createNormalEnemy, createAttackEnemy, createHealEnemy } from '../enemy'
import { generatePowerUpOptions } from '../powerup'
import { getDifficulty } from '../difficulty'

const take = (rng: () => number, n: number) => Array.from({ length: n }, () => rng())

describe('createSeededRng', () => {
  it('同じシードなら同じ列を返す', () => {
    expect(take(createSeededRng(42), 10)).toEqual(take(createSeededRng(42), 10))
  })

  it('シードが違えば違う列を返す', () => {
    expect(take(createSeededRng(1), 10)).not.toEqual(take(createSeededRng(2), 10))
  })

  it('値は0以上1未満', () => {
    for (const v of take(createSeededRng(123), 1000)) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('createRandomSeed', () => {
  it('32bit の非負整数を返す', () => {
    const seed = createRandomSeed()
    expect(Number.isInteger(seed)).toBe(true)
    expect(seed).toBeGreaterThanOrEqual(0)
    expect(seed).toBeLessThan(4294967296)
  })
})

describe('シード付き乱数で展開が再現できる', () => {
  const diff = getDifficulty(3)

  it('同じシードなら敵の出現が同じになる', () => {
    const spawn = (seed: number) => {
      const rng = createSeededRng(seed)
      return [createNormalEnemy(diff, rng), createAttackEnemy(diff, rng), createHealEnemy(rng)]
    }
    expect(spawn(7)).toEqual(spawn(7))
  })

  it('同じシードならパワーアップの選択肢が同じになる', () => {
    const options = (seed: number) => {
      const rng = createSeededRng(seed)
      return Array.from({ length: 5 }, () => generatePowerUpOptions(2, 1, 'NORMAL', rng))
    }
    expect(options(99)).toEqual(options(99))
  })
})
