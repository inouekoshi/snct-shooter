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

describe('createGameEngine のオートガード', () => {
  const runFrames = (engine: ReturnType<typeof startEngine>, until: () => boolean, maxFrames = 20000) => {
    const raf = vi.mocked(requestAnimationFrame)
    let time = 0
    for (let i = 0; i < maxFrames && !until(); i++) {
      const callback = raf.mock.calls[raf.mock.calls.length - 1][0]
      time += 16
      callback(time)
    }
    return until()
  }

  it('開始時はゲージが空で、モードに応じた満タン量を持つ', () => {
    expect(startEngine().guard).toEqual({ value: 0, max: 30 })
  })

  it('ゲージが満タンなら、被弾しても残機は減らずにゲージを使う。次の被弾では残機が減る', () => {
    const engine = startEngine()
    engine.guard.value = engine.guard.max

    expect(runFrames(engine, () => engine.guard.value < engine.guard.max)).toBe(true)
    expect(engine.lives).toBe(3)

    expect(runFrames(engine, () => engine.lives < 3)).toBe(true)
    expect(engine.lives).toBe(2)
  })
})

describe('createGameEngine の乱数シード', () => {
  const playTrace = (seed: number, frames = 3000) => {
    const raf = vi.mocked(requestAnimationFrame)
    const touch = createTouchBuffer()
    const engine = createGameEngine(canvas, touch, () => undefined, 'NORMAL')
    engine.start(seed)
    const trace: string[] = []
    for (let i = 0; i < frames; i++) {
      touch.active = true
      touch.x = 195 + 150 * Math.sin(i / 50)
      touch.y = 760
      raf.mock.calls[raf.mock.calls.length - 1][0](i * 16)
      trace.push(`${engine.state.type}:${engine.score.total}:${engine.lives}:${engine.guard.value}`)
    }
    return trace
  }

  it('同じシードと同じ入力なら同じ展開になる', () => {
    expect(playTrace(7)).toEqual(playTrace(7))
  })

  it('シードが違えば展開が変わる', () => {
    expect(playTrace(7)).not.toEqual(playTrace(8))
  })
})
