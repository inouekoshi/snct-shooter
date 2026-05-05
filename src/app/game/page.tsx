'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import RotatePrompt from '@/components/RotatePrompt'

const GameCanvas = dynamic(() => import('@/components/GameCanvas'), { ssr: false })

interface GameOverData {
  score: number
  stage: number
  highScore: number
}

export default function GamePage() {
  const router = useRouter()
  const [gameOver, setGameOver] = useState<GameOverData | null>(null)

  const handleGameOver = useCallback((score: number, stage: number, highScore: number) => {
    setGameOver({ score, stage, highScore })
  }, [])

  return (
    <>
      <RotatePrompt />
      <div style={{ position: 'relative', width: '390px', height: '844px' }}>
        {!gameOver && <GameCanvas onGameOver={handleGameOver} />}

        {gameOver && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: '#000',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '24px',
              fontFamily: 'monospace',
              color: '#FFFFFF',
            }}
          >
            <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: '#FF4444' }}>GAME OVER</h2>

            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <p style={{ fontSize: '12px', color: '#888' }}>SCORE</p>
                <p style={{ fontSize: '36px', fontWeight: 'bold' }}>{gameOver.score.toLocaleString()}</p>
              </div>
              <div>
                <p style={{ fontSize: '12px', color: '#888' }}>BEST</p>
                <p style={{ fontSize: '24px', color: '#FFFF00' }}>{gameOver.highScore.toLocaleString()}</p>
              </div>
              <div>
                <p style={{ fontSize: '12px', color: '#888' }}>STAGE</p>
                <p style={{ fontSize: '20px' }}>{gameOver.stage}</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <button
                onClick={() => {
                  setGameOver(null)
                }}
                style={{
                  padding: '14px 32px',
                  background: '#FFFFFF',
                  color: '#000000',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  fontFamily: 'monospace',
                  cursor: 'pointer',
                }}
              >
                RETRY
              </button>
              <button
                onClick={() => router.push('/')}
                style={{
                  padding: '14px 32px',
                  background: 'transparent',
                  color: '#FFFFFF',
                  border: '2px solid #FFFFFF',
                  borderRadius: '8px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  fontFamily: 'monospace',
                  cursor: 'pointer',
                }}
              >
                HOME
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
