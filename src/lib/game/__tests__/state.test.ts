import { describe, it, expect } from 'vitest'
import { isPausable, stageOf } from '../state'

describe('isPausable', () => {
  it('プレイ中・ボス演出・ボス戦・ステージクリア・パワーアップ選択は一時停止できる', () => {
    expect(isPausable('PLAYING')).toBe(true)
    expect(isPausable('BOSS_APPEARING')).toBe(true)
    expect(isPausable('BOSS_FIGHT')).toBe(true)
    expect(isPausable('STAGE_CLEAR')).toBe(true)
    expect(isPausable('POWER_UP_SELECT')).toBe(true)
  })

  it('開始前・一時停止中・カウントダウン中・終了後は対象外', () => {
    expect(isPausable('IDLE')).toBe(false)
    expect(isPausable('PAUSED')).toBe(false)
    expect(isPausable('COUNTDOWN')).toBe(false)
    expect(isPausable('GAME_OVER')).toBe(false)
    expect(isPausable('GAME_CLEAR')).toBe(false)
  })
})

describe('stageOf', () => {
  it('ステージを持つ状態はそのステージを返す', () => {
    expect(stageOf({ type: 'PLAYING', stage: 3 })).toBe(3)
    expect(stageOf({ type: 'BOSS_FIGHT', stage: 5 })).toBe(5)
    expect(stageOf({ type: 'GAME_OVER', score: 100, stage: 2 })).toBe(2)
  })

  it('一時停止中とカウントダウン中は、再開先のステージを返す', () => {
    expect(stageOf({ type: 'PAUSED', resumeTo: { type: 'BOSS_FIGHT', stage: 4 } })).toBe(4)
    expect(stageOf({ type: 'COUNTDOWN', resumeTo: { type: 'PLAYING', stage: 6 }, remaining: 2000 })).toBe(6)
  })

  it('開始前はステージがない', () => {
    expect(stageOf({ type: 'IDLE' })).toBeNull()
  })
})
