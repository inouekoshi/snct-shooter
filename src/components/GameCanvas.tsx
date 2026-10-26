'use client'

import { useEffect, useRef, useState } from 'react'
import { createGameEngine, type GameEngine } from '@/lib/game/engine'
import type { DifficultyMode } from '@/lib/game/difficulty'
import { registerTouchHandlers, createTouchBuffer } from '@/lib/game/touch'
import { loadHighScore, type ScoreState } from '@/lib/game/score'
import { isPausable, stageOf, type GameState } from '@/lib/game/state'
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/lib/game/constants'
import HUD from './HUD'
import { BTN_OUTLINE } from './buttonStyles'

interface Props {
  mode: DifficultyMode
  onGameOver: (score: number, stage: number, highScore: number) => void
  onGameClear: (score: number, highScore: number) => void
  onQuit: () => void
}

export default function GameCanvas({ mode, onGameOver, onGameClear, onQuit }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<GameEngine | null>(null)
  const autoPausedRef = useRef(false)
  const [hudData, setHudData] = useState({ score: 0, lives: 3, stage: 1, guardValue: 0, guardMax: 1 })
  const [stateType, setStateType] = useState<GameState['type']>('IDLE')

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = CANVAS_WIDTH * dpr
    canvas.height = CANVAS_HEIGHT * dpr
    canvas.style.width = `${CANVAS_WIDTH}px`
    canvas.style.height = `${CANVAS_HEIGHT}px`
    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)

    const touch = createTouchBuffer()
    const cleanupTouch = registerTouchHandlers(canvas, touch)

    const initialHighScore = loadHighScore(mode)

    const engine = createGameEngine(
      canvas,
      touch,
      (state: GameState, score: ScoreState) => {
        setStateType(state.type)

        if (state.type === 'GAME_OVER') {
          onGameOver(state.score, state.stage, score.highScore)
          return
        }
        if (state.type === 'GAME_CLEAR') {
          onGameClear(state.score, score.highScore)
          return
        }

        setHudData({
          score: score.total,
          lives: engine.lives,
          stage: stageOf(state) ?? 1,
          guardValue: engine.guard.value,
          guardMax: engine.guard.max,
        })
      },
      mode
    )

    engine.score.highScore = initialHighScore
    engineRef.current = engine
    engine.start()

    const pauseForInterruption = () => {
      const before = engine.state
      if (before.type === 'PAUSED') return
      engine.pause()
      autoPausedRef.current = engine.state !== before
    }
    const resumeAfterInterruption = () => {
      if (!autoPausedRef.current || document.hidden) return
      autoPausedRef.current = false
      engine.resume()
    }
    const onVisibility = () => {
      if (document.hidden) pauseForInterruption()
      else resumeAfterInterruption()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('blur', pauseForInterruption)
    window.addEventListener('focus', resumeAfterInterruption)

    return () => {
      engine.stop()
      cleanupTouch()
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('blur', pauseForInterruption)
      window.removeEventListener('focus', resumeAfterInterruption)
    }
  }, [mode, onGameOver, onGameClear])

  const isPaused = stateType === 'PAUSED'
  const showPauseButton = isPaused || isPausable(stateType)

  const handlePauseToggle = () => {
    const engine = engineRef.current
    if (!engine) return
    autoPausedRef.current = false
    if (isPaused) engine.resume()
    else engine.pause()
  }

  return (
    <div style={{ position: 'relative', width: `${CANVAS_WIDTH}px`, height: `${CANVAS_HEIGHT}px` }}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', touchAction: 'none', userSelect: 'none' }}
      />

      <HUD
        score={hudData.score}
        lives={hudData.lives}
        stage={hudData.stage}
        guardValue={hudData.guardValue}
        guardMax={hudData.guardMax}
        mode={mode}
      />

      {showPauseButton && (
        <button
          onClick={handlePauseToggle}
          style={{
            position: 'absolute',
            bottom: '24px',
            right: '16px',
            width: '48px',
            height: '48px',
            background: 'rgba(255,255,255,0.15)',
            border: '2px solid rgba(255,255,255,0.4)',
            borderRadius: '50%',
            color: '#FFFFFF',
            fontSize: '18px',
            lineHeight: 1,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isPaused ? '▶' : '⏸'}
        </button>
      )}

      {isPaused && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '32px',
            fontFamily: 'monospace',
            color: '#FFFFFF',
            pointerEvents: 'none',
          }}
        >
          <p style={{ fontSize: '28px', fontWeight: 'bold', letterSpacing: '4px' }}>PAUSED</p>
          <button onClick={onQuit} style={{ ...BTN_OUTLINE, background: '#000000', pointerEvents: 'auto' }}>
            HOME
          </button>
        </div>
      )}
    </div>
  )
}
