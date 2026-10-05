import { describe, it, expect, beforeEach } from 'vitest'
import { createScoreState, loadHighScore, saveHighScore } from '../score'

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

  it('localStorageが使えなくても例外を投げず0を返す', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      get() { throw new Error('SecurityError') },
      configurable: true,
    })
    expect(() => saveHighScore(100)).not.toThrow()
    expect(loadHighScore()).toBe(0)
  })
})
