'use client'

import { useState } from 'react'
import type { DifficultyMode } from '@/lib/game/difficulty'
import Leaderboard from './Leaderboard'
import ScoreSubmit from './ScoreSubmit'
import { BTN_PRIMARY, BTN_OUTLINE } from './buttonStyles'

export interface GameResult {
  kind: 'over' | 'clear'
  score: number
  stage: number
  highScore: number
}

interface Props {
  result: GameResult
  mode: DifficultyMode
  onRetry: () => void
  onHome: () => void
}

interface StatProps {
  label: string
  value: string | number
  fontSize: string
  bold?: boolean
  color?: string
}

function Stat({ label, value, fontSize, bold, color }: StatProps) {
  return (
    <div>
      <p style={{ fontSize: '12px', color: '#888' }}>{label}</p>
      <p style={{ fontSize, fontWeight: bold ? 'bold' : undefined, color }}>{value}</p>
    </div>
  )
}

function Title({ result, mode }: { result: GameResult; mode: DifficultyMode }) {
  if (result.kind === 'over') {
    return <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: '#FF4444' }}>GAME OVER</h2>
  }
  const isExtra = mode === 'EXTRA'
  return (
    <>
      <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: isExtra ? '#FF2266' : '#FFFF00', textAlign: 'center' }}>
        CONGRATULATIONS!<br/>{isExtra ? 'EXTRA CLEAR' : 'GAME CLEAR'}
      </h2>
      {mode === 'NORMAL' && (
        <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#FF2266', textAlign: 'center' }}>
          EXTRAモードが解禁されました！
        </p>
      )}
    </>
  )
}

export default function ResultScreen({ result, mode, onRetry, onHome }: Props) {
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const board = mode === 'EXTRA' ? 'extra' : 'normal'
  const isClear = result.kind === 'clear'

  return (
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
      <Title result={result} mode={mode} />

      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Stat label={isClear ? 'FINAL SCORE' : 'SCORE'} value={result.score.toLocaleString()} fontSize="36px" bold />
        <Stat label="BEST" value={result.highScore.toLocaleString()} fontSize="24px" color="#FFFF00" />
        {!isClear && <Stat label="STAGE" value={result.stage} fontSize="20px" />}
      </div>

      {mode === 'EASY' ? (
        <div style={{ textAlign: 'center', marginTop: '8px' }}>
          <p style={{ fontSize: '12px', color: '#00CC88' }}>※EASYモードはランキング登録対象外です</p>
        </div>
      ) : (
        <ScoreSubmit
          score={result.score}
          stage={result.stage}
          board={board}
          onShowLeaderboard={() => setShowLeaderboard(true)}
        />
      )}

      <div style={{ display: 'flex', gap: '16px' }}>
        <button onClick={onRetry} style={BTN_PRIMARY}>
          {isClear ? 'PLAY AGAIN' : 'RETRY'}
        </button>
        <button onClick={onHome} style={BTN_OUTLINE}>
          HOME
        </button>
      </div>

      {showLeaderboard && (
        <Leaderboard
          highlightScore={result.score}
          initialBoard={board}
          onClose={() => setShowLeaderboard(false)}
        />
      )}
    </div>
  )
}
