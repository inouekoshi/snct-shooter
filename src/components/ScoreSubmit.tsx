'use client'

import { useEffect, useState } from 'react'
import type { LeaderboardBoard } from '@/lib/leaderboard'
import { loadPlayerName, savePlayerName } from '@/lib/playerName'
import { BTN_PRIMARY, BTN_OUTLINE } from './buttonStyles'

type SubmitState = 'idle' | 'inputting' | 'submitting' | 'done' | 'error'

interface Props {
  score: number
  stage: number
  board: LeaderboardBoard
  onShowLeaderboard: () => void
}

export default function ScoreSubmit({ score, stage, board, onShowLeaderboard }: Props) {
  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [playerName, setPlayerName] = useState('')
  const [myRank, setMyRank] = useState<number | null>(null)

  useEffect(() => {
    setPlayerName(loadPlayerName())
  }, [])

  async function submitScore() {
    setSubmitState('submitting')
    savePlayerName(playerName)
    try {
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: playerName || 'PLAYER', score, stage, mode: board }),
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
            onClick={submitScore}
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
          onClick={onShowLeaderboard}
          style={{ ...BTN_OUTLINE, fontSize: '14px', padding: '8px 20px' }}
        >
          ランキングを見る
        </button>
      </div>
    )
  }
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
