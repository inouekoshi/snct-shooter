import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createGameEngine } from '../engine'
import { createTouchBuffer } from '../touch'

const noopContext = new Proxy({}, { get: () => () => undefined }) as CanvasRenderingContext2D
const canvas = { getContext: () => noopContext } as unknown as HTMLCanvasElement

beforeEach(() => {
  vi.stubGlobal('window', {})
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => undefined })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const startEngine = () => {
  const engine = createGameEngine(canvas, createTouchBuffer(), () => undefined, 'NORMAL')
  engine.start(1)
  return engine
}

describe('createGameEngine の一時停止', () => {
  it('プレイ中に一時停止するとPAUSEDになり、再開するとカウントダウンに入る', () => {
    const engine = startEngine()
    expect(engine.state).toEqual({ type: 'PLAYING', stage: 1 })

    engine.pause()
    expect(engine.state).toEqual({ type: 'PAUSED', resumeTo: { type: 'PLAYING', stage: 1 } })

    engine.resume()
    expect(engine.state).toEqual({ type: 'COUNTDOWN', resumeTo: { type: 'PLAYING', stage: 1 }, remaining: 2000 })
  })

  it('カウントダウン中に一時停止すると、元の状態に戻るPAUSEDになりカウントダウンはやり直し', () => {
    const engine = startEngine()
    engine.pause()
    engine.resume()

    engine.pause()
    expect(engine.state).toEqual({ type: 'PAUSED', resumeTo: { type: 'PLAYING', stage: 1 } })

    engine.resume()
    expect(engine.state).toEqual({ type: 'COUNTDOWN', resumeTo: { type: 'PLAYING', stage: 1 }, remaining: 2000 })
  })

  it('start に渡したシードを保持する', () => {
    expect(startEngine().seed).toBe(1)
  })
})
