import { describe, it, expect, beforeEach } from 'vitest'
import {
  createKillCounts,
  totalKillCount,
  loadStats,
  saveGameRecord,
  type GameRecord,
  type LifetimeStats,
} from '../stats'

const makeRecord = (score: number, stage: number, overrides?: Partial<GameRecord>): GameRecord => ({
  score,
  stage,
  playedAt: 1000000,
  kills: { normal: 10, attack: 3, boss: 1, heal: 0 },
  ...overrides,
})

// Node.js環境でlocalStorageをシミュレート
const store: Record<string, string> = {}
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value },
  removeItem: (key: string) => { delete store[key] },
  clear: () => { for (const k of Object.keys(store)) delete store[k] },
}
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true })

describe('createKillCounts', () => {
  it('すべてのカウントが0で初期化される', () => {
    const k = createKillCounts()
    expect(k).toEqual({ normal: 0, attack: 0, boss: 0, heal: 0 })
  })
})

describe('totalKillCount', () => {
  it('全種類の合計を返す', () => {
    expect(totalKillCount({ normal: 5, attack: 3, boss: 1, heal: 2 })).toBe(11)
  })

  it('すべて0のとき0を返す', () => {
    expect(totalKillCount(createKillCounts())).toBe(0)
  })
})

describe('loadStats', () => {
  beforeEach(() => localStorageMock.clear())

  it('データがないとき空の統計を返す', () => {
    const stats = loadStats()
    expect(stats.records).toHaveLength(0)
    expect(stats.totalPlays).toBe(0)
    expect(stats.maxStageReached).toBe(0)
    expect(stats.totalKills).toEqual({ normal: 0, attack: 0, boss: 0, heal: 0 })
  })

  it('壊れたJSONのとき空の統計を返す（エラーにしない）', () => {
    store['shooter-stats'] = '{broken json'
    const stats = loadStats()
    expect(stats.totalPlays).toBe(0)
  })
})

describe('saveGameRecord', () => {
  beforeEach(() => localStorageMock.clear())

  it('初回保存で記録が1件になる', () => {
    saveGameRecord(makeRecord(1000, 3))
    const stats = loadStats()
    expect(stats.records).toHaveLength(1)
    expect(stats.records[0].score).toBe(1000)
    expect(stats.totalPlays).toBe(1)
  })

  it('新しい記録が先頭に追加される', () => {
    saveGameRecord(makeRecord(500, 2))
    saveGameRecord(makeRecord(1200, 4))
    const stats = loadStats()
    expect(stats.records[0].score).toBe(1200)
    expect(stats.records[1].score).toBe(500)
  })

  it('maxStageReached が正しく更新される', () => {
    saveGameRecord(makeRecord(500, 3))
    saveGameRecord(makeRecord(800, 5))
    saveGameRecord(makeRecord(200, 2))
    const stats = loadStats()
    expect(stats.maxStageReached).toBe(5)
  })

  it('totalPlays が積算される', () => {
    saveGameRecord(makeRecord(100, 1))
    saveGameRecord(makeRecord(200, 2))
    saveGameRecord(makeRecord(300, 3))
    expect(loadStats().totalPlays).toBe(3)
  })

  it('totalKills が種類別に積算される', () => {
    saveGameRecord(makeRecord(100, 1, { kills: { normal: 5, attack: 2, boss: 1, heal: 0 } }))
    saveGameRecord(makeRecord(200, 2, { kills: { normal: 10, attack: 3, boss: 1, heal: 1 } }))
    const stats = loadStats()
    expect(stats.totalKills).toEqual({ normal: 15, attack: 5, boss: 2, heal: 1 })
  })

  it('記録が20件を超えたとき最新20件のみ保持する', () => {
    for (let i = 0; i < 25; i++) {
      saveGameRecord(makeRecord(i * 100, 1))
    }
    const stats = loadStats()
    expect(stats.records).toHaveLength(20)
    expect(stats.records[0].score).toBe(2400)
  })

  it('killCounts がスナップショットとして保存される（参照共有しない）', () => {
    const kills = { normal: 5, attack: 1, boss: 0, heal: 0 }
    saveGameRecord(makeRecord(500, 2, { kills }))
    kills.normal = 999
    const stats = loadStats()
    expect(stats.records[0].kills.normal).toBe(5)
  })
})
