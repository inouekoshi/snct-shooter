import { describe, it, expect, beforeEach } from 'vitest'
import { createScoreState, loadHighScore, saveHighScore, isExtraUnlocked, unlockExtra } from '../score'

const store: Record<string, string> = {}
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value },
  removeItem: (key: string) => { delete store[key] },
  clear: () => { for (const k of Object.keys(store)) delete store[k] },
}

describe('score', () => {
  beforeEach(() => {
    localStorageMock.clear()
    Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true, configurable: true })
  })

  it('createScoreState はハイスコアを引き継いで0から始まる', () => {
    expect(createScoreState(1234)).toEqual({ total: 0, stage: 0, highScore: 1234 })
  })

  it('未保存なら0を返す', () => {
    expect(loadHighScore()).toBe(0)
  })

  it('保存したハイスコアを読み込める', () => {
    saveHighScore(5000)
    expect(loadHighScore()).toBe(5000)
  })

  it('EXTRAのハイスコアは別に保存される', () => {
    saveHighScore(1000)
    saveHighScore(9000, 'EXTRA')
    expect(loadHighScore()).toBe(1000)
    expect(loadHighScore('EASY')).toBe(1000)
    expect(loadHighScore('EXTRA')).toBe(9000)
  })

  it('EXTRAは最初ロックされていて、解禁後は遊べる', () => {
    expect(isExtraUnlocked()).toBe(false)
    unlockExtra()
    expect(isExtraUnlocked()).toBe(true)
  })

  it('localStorageが使えなくても例外を投げず0を返す', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      get() { throw new Error('SecurityError') },
      configurable: true,
    })
    expect(() => saveHighScore(100)).not.toThrow()
    expect(loadHighScore()).toBe(0)
    expect(() => unlockExtra()).not.toThrow()
    expect(isExtraUnlocked()).toBe(false)
  })
})
