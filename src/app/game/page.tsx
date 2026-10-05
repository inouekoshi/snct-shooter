'use client'

import { useState, useCallback, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getStageCount, type DifficultyMode } from '@/lib/game/difficulty'
import { isExtraUnlocked } from '@/lib/game/score'
import dynamic from 'next/dynamic'
import RotatePrompt from '@/components/RotatePrompt'
import ResultScreen, { type GameResult } from '@/components/ResultScreen'

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
  const [scale, setScale] = useState(1)

  useEffect(() => {
    if (!isExtra) return
    const allowed = isExtraUnlocked()
    setExtraAllowed(allowed)
    if (!allowed) router.replace('/')
  }, [isExtra, router])

  useEffect(() => {
    const update = () => setScale(Math.min(1, window.innerHeight / 844))
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

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
      <div style={{ position: 'relative', width: '390px', height: '844px', transform: `scale(${scale})`, transformOrigin: 'top center' }}>
        {!result && canPlay && (
          <GameCanvas mode={gameMode} onGameOver={handleGameOver} onGameClear={handleGameClear} />
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
