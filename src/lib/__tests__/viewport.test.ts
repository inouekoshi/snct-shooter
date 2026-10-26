import { describe, it, expect } from 'vitest'
import { computeViewportScale } from '../viewport'
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../game/constants'

describe('computeViewportScale', () => {
  it('論理解像度より広い画面では拡大しない', () => {
    expect(computeViewportScale({ width: 1000, height: 2000 })).toBe(1)
  })

  it('高さが足りなければ高さに合わせて縮める', () => {
    expect(computeViewportScale({ width: CANVAS_WIDTH, height: CANVAS_HEIGHT / 2 })).toBe(0.5)
  })

  it('幅が足りなければ幅に合わせて縮める', () => {
    expect(computeViewportScale({ width: CANVAS_WIDTH / 2, height: CANVAS_HEIGHT })).toBe(0.5)
  })

  it('幅と高さの両方が足りなければ小さいほうに合わせる', () => {
    const scale = computeViewportScale({ width: 344, height: 700 })
    expect(scale).toBeCloseTo(Math.min(344 / CANVAS_WIDTH, 700 / CANVAS_HEIGHT))
    expect(CANVAS_WIDTH * scale).toBeLessThanOrEqual(344)
    expect(CANVAS_HEIGHT * scale).toBeLessThanOrEqual(700)
  })

  it('サイズが取れないときは等倍にする', () => {
    expect(computeViewportScale({ width: 0, height: 0 })).toBe(1)
    expect(computeViewportScale({ width: NaN, height: 800 })).toBe(1)
  })
})
