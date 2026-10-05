import { describe, it, expect } from 'vitest'
import { circlesOverlap } from '../collision'

describe('circlesOverlap', () => {
  it('中心が同じ円は重なる', () => {
    expect(circlesOverlap(100, 100, 10, 100, 100, 5)).toBe(true)
  })

  it('半径の和より近ければ重なる', () => {
    expect(circlesOverlap(0, 0, 12, 20, 0, 15)).toBe(true)
  })

  it('ちょうど接している場合は重ならない', () => {
    expect(circlesOverlap(0, 0, 12, 27, 0, 15)).toBe(false)
  })

  it('斜め方向の距離も正しく判定する', () => {
    expect(circlesOverlap(0, 0, 3, 3, 4, 2.1)).toBe(true)
    expect(circlesOverlap(0, 0, 3, 3, 4, 1.9)).toBe(false)
  })
})
