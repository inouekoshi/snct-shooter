import { describe, it, expect } from 'vitest'
import { circlesOverlap, applyPlayerBulletHits } from '../collision'
import { createPlayerBullet, createPlayerLaser, createEnemyBullet, LASER_DAMAGE } from '../bullet'
import { createAttackEnemy } from '../enemy'
import { getDifficulty } from '../difficulty'

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

describe('applyPlayerBulletHits', () => {
  const diff = getDifficulty(1)
  const enemyAt = (x: number, y: number) => {
    const e = createAttackEnemy(diff)
    e.x = x
    e.y = y
    return e
  }

  it('通常弾は最初に当たった敵にダメージを与えて消える', () => {
    const a = enemyAt(100, 100)
    const b = enemyAt(100, 100)
    const remaining = applyPlayerBulletHits([createPlayerBullet(100, 100, 0, -600)], [a, b])
    expect(remaining).toHaveLength(0)
    expect(a.hp).toBe(20)
    expect(b.hp).toBe(30)
  })

  it('当たらなかった弾と敵弾は残る', () => {
    const e = enemyAt(300, 300)
    const miss = createPlayerBullet(10, 10, 0, -600)
    const enemyBullet = createEnemyBullet(300, 300, 0, 100)
    expect(applyPlayerBulletHits([miss, enemyBullet], [e])).toEqual([miss, enemyBullet])
    expect(e.hp).toBe(30)
  })

  it('撃破済みの敵には当たらず、後ろの敵に当たる', () => {
    const dead = enemyAt(100, 100)
    dead.hp = 0
    const alive = enemyAt(100, 100)
    applyPlayerBulletHits([createPlayerBullet(100, 100, 0, -600)], [dead, alive])
    expect(dead.hp).toBe(0)
    expect(alive.hp).toBe(20)
  })

  it('貫通レーザーは重なった敵すべてにダメージを与えて残る', () => {
    const a = enemyAt(100, 100)
    const b = enemyAt(100, 100)
    const laser = createPlayerLaser(100, 100, 600)
    expect(applyPlayerBulletHits([laser], [a, b])).toEqual([laser])
    expect(a.hp).toBe(30 - LASER_DAMAGE)
    expect(b.hp).toBe(30 - LASER_DAMAGE)
  })

  it('貫通レーザーは同じ敵に1回しか当たらない', () => {
    const e = enemyAt(100, 100)
    const laser = createPlayerLaser(100, 100, 600)
    applyPlayerBulletHits([laser], [e])
    applyPlayerBulletHits([laser], [e])
    expect(e.hp).toBe(30 - LASER_DAMAGE)
  })
})
