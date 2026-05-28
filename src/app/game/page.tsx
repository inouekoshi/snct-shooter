'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { DifficultyMode } from '@/lib/game/difficulty'
import dynamic from 'next/dynamic'
import RotatePrompt from '@/components/RotatePrompt'
import Leaderboard from '@/components/Leaderboard'

const GameCanvas = dynamic(() => import('@/components/GameCanvas'), { ssr: false })

interface GameOverData {
  score: number
  stage: number
  highScore: number
}

interface GameClearData {
  score: number
  highScore: number
}

type SubmitState = 'idle' | 'inputting' | 'submitting' | 'done' | 'error'

const NAME_KEY = 'shooter-player-name'

const BTN_PRIMARY: React.CSSProperties = {
  padding: '14px 32px',
  background: '#FFFFFF',
  color: '#000000',
  border: 'none',
  borderRadius: '8px',
  fontSize: '18px',
  fontWeight: 'bold',
  fontFamily: 'monospace',
  cursor: 'pointer',
}

const BTN_OUTLINE: React.CSSProperties = {
  padding: '14px 32px',
  background: 'transparent',
  color: '#FFFFFF',
  border: '2px solid #FFFFFF',
  borderRadius: '8px',
  fontSize: '18px',
  fontWeight: 'bold',
  fontFamily: 'monospace',
  cursor: 'pointer',
}

export default function GamePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const gameMode = (searchParams.get('mode')?.toUpperCase() === 'EASY' ? 'EASY' : 'NORMAL') as DifficultyMode

  const [gameOver, setGameOver] = useState<GameOverData | null>(null)
  const [gameClear, setGameClear] = useState<GameClearData | null>(null)
  const [scale, setScale] = useState(1)

  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [playerName, setPlayerName] = useState('')
  const [myRank, setMyRank] = useState<number | null>(null)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const currentScore = useRef<number>(0)

  useEffect(() => {
    const update = () => setScale(Math.min(1, window.innerHeight / 844))
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const handleGameOver = useCallback((score: number, stage: number, highScore: number) => {
    setGameOver({ score, stage, highScore })
    setSubmitState('idle')
    setMyRank(null)
    currentScore.current = score
    try {
      const saved = localStorage.getItem(NAME_KEY)
      setPlayerName(saved ?? 'PLAYER')
    } catch {
      setPlayerName('PLAYER')
    }
  }, [])

  const handleGameClear = useCallback((score: number, highScore: number) => {
    setGameClear({ score, highScore })
    setSubmitState('idle')
    setMyRank(null)
    currentScore.current = score
    try {
      const saved = localStorage.getItem(NAME_KEY)
      setPlayerName(saved ?? 'PLAYER')
    } catch {
      setPlayerName('PLAYER')
    }
  }, [])

  async function submitScore(score: number, stage: number) {
    setSubmitState('submitting')
    try {
      localStorage.setItem(NAME_KEY, playerName)
    } catch { /* ignore */ }
    try {
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: playerName || 'PLAYER', score, stage }),
      })
      const data = await res.json()
      if (res.ok && data.ok) {
        setMyRank(data.rank)
        setSubmitState('done')
      } else {
        setSubmitState('error')
      }
    } catch {
      setSubmitState('error')
    }
  }

  function renderSubmitFlow(score: number, stage: number) {
    if (gameMode === 'EASY') {
      return (
        <div style={{ textAlign: 'center', marginTop: '8px' }}>
          <p style={{ fontSize: '12px', color: '#00CC88' }}>※EASYモードはランキング登録対象外です</p>
        </div>
      )
    }

    if (submitState === 'idle') {
      return (
        <button
          onClick={() => setSubmitState('inputting')}
          style={{ ...BTN_OUTLINE, fontSize: '16px', padding: '10px 24px' }}
        >
          スコアを投稿
        </button>
      )
    }
    if (submitState === 'inputting') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', width: '100%' }}>
          <p style={{ fontSize: '12px', color: '#888' }}>名前を入力（1〜10文字）</p>
          <input
            type="text"
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            maxLength={10}
            autoFocus
            style={{
              background: '#111',
              border: '2px solid #FFFFFF',
              borderRadius: '8px',
              color: '#FFFFFF',
              fontFamily: 'monospace',
              fontSize: '18px',
              padding: '8px 16px',
              textAlign: 'center',
              width: '200px',
            }}
          />
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => submitScore(score, stage)}
              disabled={!playerName.trim()}
              style={{ ...BTN_PRIMARY, fontSize: '16px', padding: '10px 24px', opacity: playerName.trim() ? 1 : 0.5 }}
            >
              投稿する
            </button>
            <button
              onClick={() => setSubmitState('idle')}
              style={{ ...BTN_OUTLINE, fontSize: '14px', padding: '10px 16px' }}
            >
              キャンセル
            </button>
          </div>
        </div>
      )
    }
    if (submitState === 'submitting') {
      return <p style={{ fontSize: '16px', color: '#888' }}>SUBMITTING...</p>
    }
    if (submitState === 'done') {
      return (
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
          <p style={{ fontSize: '18px', color: '#FFFF00', fontWeight: 'bold' }}>
            #{myRank}位で登録しました！
          </p>
          <button
            onClick={() => setShowLeaderboard(true)}
            style={{ ...BTN_OUTLINE, fontSize: '14px', padding: '8px 20px' }}
          >
            ランキングを見る
          </button>
        </div>
      )
    }
    if (submitState === 'error') {
      return (
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
          <p style={{ fontSize: '14px', color: '#FF4444' }}>送信に失敗しました</p>
          <button
            onClick={() => setSubmitState('inputting')}
            style={{ ...BTN_OUTLINE, fontSize: '14px', padding: '8px 16px' }}
          >
            もう一度試す
          </button>
        </div>
      )
    }
    return null
  }

  return (
    <>
      <RotatePrompt />
      <div style={{ position: 'relative', width: '390px', height: '844px', transform: `scale(${scale})`, transformOrigin: 'top center' }}>
        {!gameOver && !gameClear && <GameCanvas mode={gameMode} onGameOver={handleGameOver} onGameClear={handleGameClear} />}

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
              padding: '0 24px',
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

            {renderSubmitFlow(gameOver.score, gameOver.stage)}

            <div style={{ display: 'flex', gap: '16px' }}>
              <button
                onClick={() => { setGameOver(null); setSubmitState('idle') }}
                style={BTN_PRIMARY}
              >
                RETRY
              </button>
              <button
                onClick={() => router.push('/')}
                style={BTN_OUTLINE}
              >
                HOME
              </button>
            </div>

            {showLeaderboard && (
              <Leaderboard
                highlightScore={gameOver.score}
                onClose={() => setShowLeaderboard(false)}
              />
            )}
          </div>
        )}

        {gameClear && (
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
              padding: '0 24px',
            }}
          >
            <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: '#FFFF00', textAlign: 'center' }}>
              CONGRATULATIONS!<br/>GAME CLEAR
            </h2>

            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <p style={{ fontSize: '12px', color: '#888' }}>FINAL SCORE</p>
                <p style={{ fontSize: '36px', fontWeight: 'bold' }}>{gameClear.score.toLocaleString()}</p>
              </div>
              <div>
                <p style={{ fontSize: '12px', color: '#888' }}>BEST</p>
                <p style={{ fontSize: '24px', color: '#FFFF00' }}>{gameClear.highScore.toLocaleString()}</p>
              </div>
            </div>

            {renderSubmitFlow(gameClear.score, 8)}

            <div style={{ display: 'flex', gap: '16px' }}>
              <button
                onClick={() => { setGameClear(null); setSubmitState('idle') }}
                style={BTN_PRIMARY}
              >
                PLAY AGAIN
              </button>
              <button
                onClick={() => router.push('/')}
                style={BTN_OUTLINE}
              >
                HOME
              </button>
            </div>

            {showLeaderboard && (
              <Leaderboard
                highlightScore={gameClear.score}
                onClose={() => setShowLeaderboard(false)}
              />
            )}
          </div>
        )}
      </div>
    </>
  )
}
