import { describe, it, expect } from 'vitest'
import { isPausable } from '../state'

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
