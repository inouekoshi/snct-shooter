'use client'

import { useEffect, useRef, useState } from 'react'
import { createGameEngine } from '@/lib/game/engine'
import { registerTouchHandlers, createTouchBuffer } from '@/lib/game/touch'
import { loadHighScore } from '@/lib/game/score'
import type { GameState } from '@/lib/game/state'
import type { ScoreState } from '@/lib/game/score'
import HUD from './HUD'

interface Props {
  onGameOver: (score: number, stage: number, highScore: number) => void
}

export default function GameCanvas({ onGameOver }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<ReturnType<typeof createGameEngine> | null>(null)
  const [hudData, setHudData] = useState({ score: 0, lives: 3, stage: 1 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = 390 * dpr
    canvas.height = 844 * dpr
    canvas.style.width = '390px'
    canvas.style.height = '844px'
    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)

    const touch = createTouchBuffer()
    const cleanupTouch = registerTouchHandlers(canvas, touch)

    const initialHighScore = loadHighScore()

    const engine = createGameEngine(
      canvas,
      touch,
      (state: GameState, score: ScoreState) => {
        if (state.type === 'GAME_OVER') {
          onGameOver(state.score, state.stage, score.highScore)
          return
        }

        let stageNum = 1
        if ('stage' in state) stageNum = (state as { stage: number }).stage

        setHudData({
          score: score.total,
          lives: engine.lives,
          stage: stageNum,
        })
      }
    )

    engine.score.highScore = initialHighScore
    engineRef.current = engine
    engine.start()

    const onVisibility = () => {
      if (document.hidden) {
        engine.pause()
      } else {
        engine.resume()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      engine.stop()
      cleanupTouch()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [onGameOver])


  return (
    <div style={{ position: 'relative', width: '390px', height: '844px' }}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', touchAction: 'none', userSelect: 'none' }}
      />
      <HUD score={hudData.score} lives={hudData.lives} stage={hudData.stage} />
    </div>
  )
}
