import { describe, it, expect } from 'vitest'
import { createPlayerBullet, createEnemyBullet, updateBullets, removeOffscreenBullets } from '../bullet'

describe('弾の生成', () => {
  it('自機弾はダメージ10・味方扱い', () => {
    const b = createPlayerBullet(100, 200, 0, -600)
    expect(b).toMatchObject({ damage: 10, isEnemy: false, isBoss: false, radius: 4 })
  })

  it('ボス弾は通常の敵弾より大きい', () => {
    expect(createEnemyBullet(0, 0, 0, 100).radius).toBe(5)
    expect(createEnemyBullet(0, 0, 0, 100, true).radius).toBe(7)
    expect(createEnemyBullet(0, 0, 0, 100, true)).toMatchObject({ isEnemy: true, isBoss: true })
  })
})

describe('updateBullets', () => {
  it('速度×経過時間（秒）だけ移動する', () => {
    const b = createPlayerBullet(100, 500, 50, -600)
    updateBullets([b], 500)
    expect(b.x).toBe(125)
    expect(b.y).toBe(200)
  })
})

describe('removeOffscreenBullets', () => {
  it('画面外（20pxの余白を超えた）弾だけを取り除く', () => {
    const inside = createPlayerBullet(195, 422, 0, 0)
    const edge = createPlayerBullet(-19, 863, 0, 0)
    const above = createPlayerBullet(195, -21, 0, 0)
    const below = createPlayerBullet(195, 864, 0, 0)
    const left = createPlayerBullet(-20, 422, 0, 0)
    const right = createPlayerBullet(410, 422, 0, 0)
    expect(removeOffscreenBullets([inside, edge, above, below, left, right])).toEqual([inside, edge])
  })
})
