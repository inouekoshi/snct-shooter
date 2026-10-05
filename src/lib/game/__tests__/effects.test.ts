import { describe, it, expect } from 'vitest'
import {
  spawnExplosion,
  updateParticles,
  createScreenShake,
  triggerShake,
  updateShake,
  currentShakeAmplitude,
  shakeOffset,
  MAX_PARTICLES,
  EXPLOSION_SMALL,
  EXPLOSION_LARGE,
  type Particle,
} from '../effects'

describe('spawnExplosion', () => {
  it('指定数のパーティクルを指定位置・色で生成する', () => {
    const particles: Particle[] = []
    spawnExplosion(particles, 100, 200, '#FF4444', EXPLOSION_SMALL)
    expect(particles).toHaveLength(EXPLOSION_SMALL.count)
    expect(particles.every((p) => p.x === 100 && p.y === 200 && p.color === '#FF4444')).toBe(true)
  })

  it('速度・寿命は指定値を超えない', () => {
    const particles: Particle[] = []
    spawnExplosion(particles, 0, 0, '#FFF', EXPLOSION_LARGE)
    for (const p of particles) {
      expect(Math.hypot(p.vx, p.vy)).toBeLessThanOrEqual(EXPLOSION_LARGE.speed)
      expect(p.life).toBeLessThanOrEqual(EXPLOSION_LARGE.life)
      expect(p.life).toBe(p.maxLife)
    }
  })

  it('上限数を超えて生成しない', () => {
    const particles: Particle[] = []
    for (let i = 0; i < 20; i++) spawnExplosion(particles, 0, 0, '#FFF', EXPLOSION_LARGE)
    expect(particles).toHaveLength(MAX_PARTICLES)
  })
})

describe('updateParticles', () => {
  const make = (life: number): Particle => ({ x: 0, y: 0, vx: 100, vy: 0, life, maxLife: life, size: 2, color: '#FFF' })

  it('移動しながら減速する', () => {
    const [p] = updateParticles([make(1000)], 100)
    expect(p.x).toBeCloseTo(10)
    expect(p.vx).toBeLessThan(100)
    expect(p.life).toBe(900)
  })

  it('寿命が尽きたパーティクルは取り除かれる', () => {
    const alive = make(200)
    const dead = make(100)
    expect(updateParticles([alive, dead], 100)).toEqual([alive])
  })
})

describe('画面揺れ', () => {
  it('初期状態では揺れない', () => {
    expect(shakeOffset(createScreenShake())).toEqual({ x: 0, y: 0 })
  })

  it('揺れ幅は時間とともに減衰し、終了後は0になる', () => {
    const shake = createScreenShake()
    triggerShake(shake, 10, 200)
    expect(currentShakeAmplitude(shake)).toBe(10)
    updateShake(shake, 100)
    expect(currentShakeAmplitude(shake)).toBe(5)
    updateShake(shake, 150)
    expect(currentShakeAmplitude(shake)).toBe(0)
  })

  it('オフセットは現在の揺れ幅の範囲に収まる', () => {
    const shake = createScreenShake()
    triggerShake(shake, 8, 300)
    for (let i = 0; i < 50; i++) {
      const { x, y } = shakeOffset(shake)
      expect(Math.abs(x)).toBeLessThanOrEqual(8)
      expect(Math.abs(y)).toBeLessThanOrEqual(8)
    }
  })

  it('強い揺れの最中に弱い揺れが来ても上書きしない', () => {
    const shake = createScreenShake()
    triggerShake(shake, 12, 600)
    triggerShake(shake, 6, 250)
    expect(currentShakeAmplitude(shake)).toBe(12)
  })

  it('減衰して弱まった揺れは新しい揺れで上書きされる', () => {
    const shake = createScreenShake()
    triggerShake(shake, 12, 600)
    updateShake(shake, 500)
    triggerShake(shake, 6, 250)
    expect(currentShakeAmplitude(shake)).toBe(6)
  })
})
