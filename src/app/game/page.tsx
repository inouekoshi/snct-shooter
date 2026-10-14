'use client'

import { useState, useCallback, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getStageCount, type DifficultyMode } from '@/lib/game/difficulty'
import { isExtraUnlocked } from '@/lib/game/score'
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/lib/game/constants'
import dynamic from 'next/dynamic'
import RotatePrompt from '@/components/RotatePrompt'
import ResultScreen, { type GameResult } from '@/components/ResultScreen'
import { useViewportScale } from '@/components/useViewportScale'

const GameCanvas = dynamic(() => import('@/components/GameCanvas'), { ssr: false })

function parseMode(value: string | null): DifficultyMode {
  const upper = value?.toUpperCase()
  if (upper === 'EASY' || upper === 'EXTRA') return upper
  return 'NORMAL'
}

function GamePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const gameMode = parseMode(searchParams.get('mode'))
  const isExtra = gameMode === 'EXTRA'
  const [extraAllowed, setExtraAllowed] = useState<boolean | null>(null)
  const [result, setResult] = useState<GameResult | null>(null)
  const scale = useViewportScale()

  useEffect(() => {
    if (!isExtra) return
    const allowed = isExtraUnlocked()
    setExtraAllowed(allowed)
    if (!allowed) router.replace('/')
  }, [isExtra, router])

  const handleGameOver = useCallback((score: number, stage: number, highScore: number) => {
    setResult({ kind: 'over', score, stage, highScore })
  }, [])

  const handleGameClear = useCallback((score: number, highScore: number) => {
    setResult({ kind: 'clear', score, stage: getStageCount(gameMode), highScore })
  }, [gameMode])

  const canPlay = !isExtra || extraAllowed

  return (
    <>
      <RotatePrompt />
      <div style={{ position: 'relative', width: `${CANVAS_WIDTH}px`, height: `${CANVAS_HEIGHT}px`, transform: `scale(${scale})`, transformOrigin: 'top center' }}>
        {!result && canPlay && (
          <GameCanvas mode={gameMode} onGameOver={handleGameOver} onGameClear={handleGameClear} onQuit={() => router.push('/')} />
        )}
        {result && (
          <ResultScreen
            result={result}
            mode={gameMode}
            onRetry={() => setResult(null)}
            onHome={() => router.push('/')}
          />
        )}
      </div>
    </>
  )
}

export default function GamePage() {
  return (
    <Suspense fallback={<div style={{ width: '100vw', height: '100vh', background: '#000' }} />}>
      <GamePageContent />
    </Suspense>
  )
}
