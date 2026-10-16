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
  firePlayerBullets,
  weaponName,
  MAX_WEAPON_LEVEL,
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

  it('武器レベルは5が上限', () => {
    const p = createPlayer()
    for (let i = 0; i < 10; i++) applyUpgrade(p, 'WEAPON_UPGRADE')
    expect(p.weaponLevel).toBe(MAX_WEAPON_LEVEL)
  })
})

describe('EXTRAモードの自機', () => {
  it('強化済みの状態で始まる', () => {
    expect(createPlayer('EXTRA')).toMatchObject({ lives: 5, fireInterval: 140, bulletSpeed: 840, weaponLevel: 3 })
  })

  it('EASY・NORMALは通常の初期値', () => {
    expect(createPlayer('EASY')).toEqual(createPlayer('NORMAL'))
  })
})

describe('firePlayerBullets', () => {
  const fire = (weaponLevel: number) => {
    const p = createPlayer()
    p.weaponLevel = weaponLevel
    return firePlayerBullets(p)
  }

  it('武器レベルごとの弾数', () => {
    expect(fire(1)).toHaveLength(1)
    expect(fire(2)).toHaveLength(2)
    expect(fire(3)).toHaveLength(3)
    expect(fire(4)).toHaveLength(5)
    expect(fire(5)).toHaveLength(5)
  })

  it('どの弾も自機の弾速で上方向へ飛ぶ', () => {
    for (let level = 1; level <= MAX_WEAPON_LEVEL; level++) {
      for (const b of fire(level)) {
        expect(Math.hypot(b.vx, b.vy)).toBeCloseTo(600)
        expect(b.vy).toBeLessThan(0)
      }
    }
  })

  it('Lv.5だけ貫通レーザーを含む', () => {
    expect(fire(4).some((b) => b.pierce)).toBe(false)
    const lv5 = fire(5)
    expect(lv5.filter((b) => b.pierce)).toHaveLength(1)
    expect(lv5.find((b) => b.pierce)!.vx).toBe(0)
  })

  it('武器名を返す', () => {
    expect(weaponName(4)).toBe('5-Way')
    expect(weaponName(5)).toBe('貫通レーザー')
  })
})
