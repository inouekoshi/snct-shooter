import { describe, it, expect } from 'vitest'
import { getDifficulty } from '../difficulty'

describe('getDifficulty', () => {
  it('モード省略時はNORMALと同じ値を返す', () => {
    expect(getDifficulty(3)).toEqual(getDifficulty(3, 'NORMAL'))
  })

  it('ステージが進むほど敵が速く・出現間隔が短くなる', () => {
    for (let stage = 1; stage < 8; stage++) {
      const cur = getDifficulty(stage)
      const next = getDifficulty(stage + 1)
      expect(next.normalEnemySpeed).toBeGreaterThan(cur.normalEnemySpeed)
      expect(next.normalEnemyInterval).toBeLessThan(cur.normalEnemyInterval)
      expect(next.bossHp).toBeGreaterThan(cur.bossHp)
      expect(next.bossScoreThreshold).toBeGreaterThan(cur.bossScoreThreshold)
    }
  })

  it('補間値は最終値で頭打ちになる', () => {
    expect(getDifficulty(8).normalEnemySpeed).toBe(300)
    expect(getDifficulty(20).normalEnemySpeed).toBe(300)
    expect(getDifficulty(20).normalEnemyInterval).toBe(150)
  })

  it('ボス速度は150を超えない', () => {
    expect(getDifficulty(20).bossSpeed).toBe(150)
  })

  it('攻撃敵の出現比率はステージに応じて小さくなる（頻度が上がる）', () => {
    expect(getDifficulty(1).attackEnemySpawnRatio).toBe(3)
    expect(getDifficulty(3).attackEnemySpawnRatio).toBe(2)
    expect(getDifficulty(5).attackEnemySpawnRatio).toBe(1)
    expect(getDifficulty(8).attackEnemySpawnRatio).toBe(1)
  })

  it('ステージ1・2のボス出現スコアはテーブル値を使う', () => {
    expect(getDifficulty(1).bossScoreThreshold).toBe(700)
    expect(getDifficulty(2).bossScoreThreshold).toBe(900)
    expect(getDifficulty(3).bossScoreThreshold).toBe(1100)
  })

  describe('EASYモード', () => {
    it('敵と弾が遅く、出現・発射間隔が長くなる', () => {
      for (let stage = 1; stage <= 8; stage++) {
        const normal = getDifficulty(stage, 'NORMAL')
        const easy = getDifficulty(stage, 'EASY')
        expect(easy.normalEnemySpeed).toBeLessThan(normal.normalEnemySpeed)
        expect(easy.normalEnemyInterval).toBeGreaterThan(normal.normalEnemyInterval)
        expect(easy.attackEnemyBulletSpeed).toBeLessThan(normal.attackEnemyBulletSpeed)
        expect(easy.attackEnemyFireInterval).toBeGreaterThan(normal.attackEnemyFireInterval)
        expect(easy.bossParams.bulletSpeed1).toBeLessThan(normal.bossParams.bulletSpeed1)
        expect(easy.bossParams.interval3).toBeGreaterThan(normal.bossParams.interval3)
      }
    })

    it('ボスHPは6割の整数になる', () => {
      const normal = getDifficulty(1, 'NORMAL')
      const easy = getDifficulty(1, 'EASY')
      expect(easy.bossHp).toBe(Math.floor(normal.bossHp * 0.6))
      expect(Number.isInteger(easy.bossHp)).toBe(true)
    })

    it('ボス出現スコアと攻撃敵の比率は変わらない', () => {
      const normal = getDifficulty(4, 'NORMAL')
      const easy = getDifficulty(4, 'EASY')
      expect(easy.bossScoreThreshold).toBe(normal.bossScoreThreshold)
      expect(easy.attackEnemySpawnRatio).toBe(normal.attackEnemySpawnRatio)
    })
  })
})
