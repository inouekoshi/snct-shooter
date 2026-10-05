import { describe, it, expect } from 'vitest'
import {
  createPlayer,
  updatePlayer,
  hitPlayer,
  isPlayerInvincible,
  canFire,
  resetFireTimer,
  resetPlayerPosition,
  applyUpgrade,
} from '../player'
import { createTouchBuffer } from '../touch'

describe('createPlayer', () => {
  it('仕様どおりの初期値で生成される', () => {
    const p = createPlayer()
    expect(p).toMatchObject({ x: 195, y: 760, lives: 3, fireInterval: 200, bulletSpeed: 600, weaponLevel: 1 })
    expect(isPlayerInvincible(p)).toBe(false)
    expect(canFire(p)).toBe(true)
  })
})

describe('updatePlayer', () => {
  it('タッチしていなければ移動しない', () => {
    const p = createPlayer()
    updatePlayer(p, createTouchBuffer(), 16)
    expect(p.x).toBe(195)
    expect(p.y).toBe(760)
  })

  it('タッチ位置へ近づく', () => {
    const p = createPlayer()
    const touch = { active: true, x: 300, y: 500 }
    updatePlayer(p, touch, 16)
    expect(p.x).toBeGreaterThan(195)
    expect(p.x).toBeLessThan(300)
    expect(p.y).toBeLessThan(760)
    expect(p.y).toBeGreaterThan(500)
  })

  it('移動範囲はCanvas端から20pxの内側に制限される', () => {
    const p = createPlayer()
    const touch = { active: true, x: -100, y: 2000 }
    for (let i = 0; i < 200; i++) updatePlayer(p, touch, 16)
    expect(p.x).toBeCloseTo(20)
    expect(p.y).toBeCloseTo(824)
  })

  it('無敵時間と連射タイマーを減らし、0未満にはしない', () => {
    const p = createPlayer()
    p.invincibleTimer = 100
    p.fireTimer = 50
    updatePlayer(p, createTouchBuffer(), 80)
    expect(p.invincibleTimer).toBe(20)
    expect(p.fireTimer).toBe(0)
  })
})

describe('被弾', () => {
  it('残機が1減り、2秒間無敵になる', () => {
    const p = createPlayer()
    hitPlayer(p)
    expect(p.lives).toBe(2)
    expect(isPlayerInvincible(p)).toBe(true)
    updatePlayer(p, createTouchBuffer(), 1999)
    expect(isPlayerInvincible(p)).toBe(true)
    updatePlayer(p, createTouchBuffer(), 1)
    expect(isPlayerInvincible(p)).toBe(false)
  })
})

describe('連射', () => {
  it('発射後は連射間隔が経過するまで撃てない', () => {
    const p = createPlayer()
    resetFireTimer(p)
    expect(canFire(p)).toBe(false)
    updatePlayer(p, createTouchBuffer(), 199)
    expect(canFire(p)).toBe(false)
    updatePlayer(p, createTouchBuffer(), 1)
    expect(canFire(p)).toBe(true)
  })
})

describe('resetPlayerPosition', () => {
  it('初期位置に戻る', () => {
    const p = createPlayer()
    p.x = 10
    p.y = 10
    resetPlayerPosition(p)
    expect(p.x).toBe(195)
    expect(p.y).toBe(760)
  })
})

describe('applyUpgrade', () => {
  it('HP / HP_2 で残機が増える', () => {
    const p = createPlayer()
    applyUpgrade(p, 'HP')
    expect(p.lives).toBe(4)
    applyUpgrade(p, 'HP_2')
    expect(p.lives).toBe(6)
  })

  it('連射間隔は30msずつ短くなり、80msが下限', () => {
    const p = createPlayer()
    applyUpgrade(p, 'FIRE_RATE')
    expect(p.fireInterval).toBe(170)
    for (let i = 0; i < 10; i++) applyUpgrade(p, 'FIRE_RATE')
    expect(p.fireInterval).toBe(80)
  })

  it('弾速は120px/秒ずつ速くなり、1080px/秒が上限', () => {
    const p = createPlayer()
    applyUpgrade(p, 'BULLET_SPEED')
    expect(p.bulletSpeed).toBe(720)
    for (let i = 0; i < 10; i++) applyUpgrade(p, 'BULLET_SPEED')
    expect(p.bulletSpeed).toBe(1080)
  })

  it('武器レベルは3が上限', () => {
    const p = createPlayer()
    for (let i = 0; i < 5; i++) applyUpgrade(p, 'WEAPON_UPGRADE')
    expect(p.weaponLevel).toBe(3)
  })
})
