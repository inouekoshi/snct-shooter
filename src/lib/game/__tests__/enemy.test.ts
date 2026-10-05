import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  createNormalEnemy,
  createAttackEnemy,
  createHealEnemy,
  createBoss,
  updateEnemies,
  removeOffscreenEnemies,
  enemyColor,
} from '../enemy'
import { getDifficulty } from '../difficulty'
import type { Bullet } from '../bullet'

const diff = getDifficulty(1)

afterEach(() => {
  vi.restoreAllMocks()
})

describe('敵の生成', () => {
  it('仕様どおりの当たり判定半径を持つ', () => {
    expect(createNormalEnemy(diff).radius).toBe(15)
    expect(createAttackEnemy(diff).radius).toBe(20)
    expect(createHealEnemy().radius).toBe(14)
    expect(createBoss(1, diff).radius).toBe(40)
  })

  it('出現X座標は40〜350の範囲に収まる', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    expect(createNormalEnemy(diff).x).toBe(40)
    vi.spyOn(Math, 'random').mockReturnValue(0.999999)
    expect(createNormalEnemy(diff).x).toBeCloseTo(350)
  })

  it('ボスは難易度のHPで生成される', () => {
    const boss = createBoss(1, diff)
    expect(boss.hp).toBe(diff.bossHp)
    expect(boss.maxHp).toBe(diff.bossHp)
  })
})

describe('updateEnemies', () => {
  it('通常敵は速度に応じて下へ移動する', () => {
    const e = createNormalEnemy(diff)
    const startY = e.y
    updateEnemies([e], 1000, 195, [])
    expect(e.y).toBeCloseTo(startY + diff.normalEnemySpeed)
  })

  it('攻撃敵は発射タイマーが切れると自機方向へ1発撃つ', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const e = createAttackEnemy(diff)
    expect(e.vx).toBe(0)
    e.fireTimer = 10
    const bullets: Bullet[] = []
    updateEnemies([e], 16, e.x, bullets)
    expect(bullets).toHaveLength(1)
    expect(bullets[0].vx).toBeCloseTo(0)
    expect(bullets[0].vy).toBeGreaterThan(0)
    expect(e.fireTimer).toBe(e.fireInterval)
  })

  it('ジグザグ移動の攻撃敵は3-Wayで撃ち、画面端で反転する', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1)
    const e = createAttackEnemy(diff)
    expect(e.vx).not.toBe(0)
    e.x = 359
    e.vx = 70
    e.fireTimer = 10
    const bullets: Bullet[] = []
    updateEnemies([e], 16, 195, bullets)
    expect(bullets).toHaveLength(3)
    expect(e.vx).toBe(-70)
  })

  describe('ボスの弾幕パターン', () => {
    const fireOnce = (hpRatio: number) => {
      const boss = createBoss(1, diff)
      boss.hp = boss.maxHp * hpRatio
      boss.fireTimer = 0
      const bullets: Bullet[] = []
      updateEnemies([boss], 16, 195, bullets)
      return { boss, bullets }
    }

    it('HP50%超はパターン1（自機狙い1発）', () => {
      const { boss, bullets } = fireOnce(1)
      expect(bullets).toHaveLength(1)
      expect(boss.fireTimer).toBe(diff.bossParams.interval1)
    })

    it('HP50%以下はパターン2（5-Way）', () => {
      const { boss, bullets } = fireOnce(0.5)
      expect(bullets).toHaveLength(5)
      expect(boss.fireTimer).toBe(diff.bossParams.interval2)
    })

    it('HP25%以下はパターン3（回転3方向）', () => {
      const { boss, bullets } = fireOnce(0.25)
      expect(bullets).toHaveLength(3)
      expect(boss.fireTimer).toBe(diff.bossParams.interval3)
      expect(bullets.every((b) => b.isBoss)).toBe(true)
    })
  })

  it('ボスはy=120で降下を止め、x=50〜340の範囲で自機を追う', () => {
    const boss = createBoss(1, diff)
    boss.fireTimer = Infinity
    for (let i = 0; i < 500; i++) updateEnemies([boss], 16, 0, [])
    expect(boss.y).toBe(120)
    expect(boss.x).toBe(50)
  })
})

describe('removeOffscreenEnemies', () => {
  it('画面下端を十分過ぎた敵を取り除く', () => {
    const a = createNormalEnemy(diff)
    const b = createNormalEnemy(diff)
    a.y = 919
    b.y = 920
    expect(removeOffscreenEnemies([a, b])).toEqual([a])
  })
})

describe('enemyColor', () => {
  it('敵の種類ごとの色を返す', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    expect(enemyColor(createNormalEnemy(diff))).toBe('#FF4444')
    expect(enemyColor(createAttackEnemy(diff))).toBe('#FF8800')
    expect(enemyColor(createHealEnemy())).toBe('#00CC88')
    expect(enemyColor(createBoss(1, diff))).toBe('#AA00FF')
    vi.spyOn(Math, 'random').mockReturnValue(0.1)
    expect(enemyColor(createAttackEnemy(diff))).toBe('#FFAA00')
  })
})
