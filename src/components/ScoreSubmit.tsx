'use client'

import { useEffect, useState } from 'react'
import {
  PLAYER_NAME_MAX_LENGTH, isValidPlayerName, submitLeaderboardScore, type LeaderboardBoard,
} from '@/lib/leaderboard'
import { loadPlayerName, savePlayerName } from '@/lib/playerName'
import { BTN_PRIMARY, BTN_OUTLINE } from './buttonStyles'

type SubmitState = 'idle' | 'inputting' | 'submitting' | 'done' | 'error' | 'disabled'

interface Props {
  score: number
  stage: number
  board: LeaderboardBoard
  onSubmitted: (id: string) => void
  onShowLeaderboard: () => void
}

const NAME_REJECTED_MESSAGES = {
  invalid_name: '使えない文字が含まれています',
  inappropriate_name: 'この名前は登録できません',
} as const

type NameRejectedReason = keyof typeof NAME_REJECTED_MESSAGES

const SUBMIT_FAILED_MESSAGE = '送信に失敗しました'
const RATE_LIMITED_MESSAGE = '投稿が集中しています。1分ほど待ってからもう一度お試しください'

export default function ScoreSubmit({ score, stage, board, onSubmitted, onShowLeaderboard }: Props) {
  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [playerName, setPlayerName] = useState('')
  const [myRank, setMyRank] = useState<number | null>(null)
  const [rejectedReason, setRejectedReason] = useState<NameRejectedReason | null>(null)
  const [errorMessage, setErrorMessage] = useState(SUBMIT_FAILED_MESSAGE)

  useEffect(() => {
    setPlayerName(loadPlayerName())
  }, [])

  async function submitScore() {
    setSubmitState('submitting')
    savePlayerName(playerName)
    const result = await submitLeaderboardScore({ name: playerName, score, stage }, board)
    if (result.ok) {
      setMyRank(result.rank)
      setSubmitState('done')
      onSubmitted(result.id)
    } else if (result.reason === 'failed' || result.reason === 'rate_limited') {
      setErrorMessage(result.reason === 'rate_limited' ? RATE_LIMITED_MESSAGE : SUBMIT_FAILED_MESSAGE)
      setSubmitState('error')
    } else if (result.reason === 'disabled') {
      setSubmitState('disabled')
    } else {
      setRejectedReason(result.reason)
      setSubmitState('inputting')
    }
  }

  const trimmedName = playerName.trim()
  const hasInvalidChars = trimmedName.length > 0 && !isValidPlayerName(playerName)
  const nameMessage = hasInvalidChars ? NAME_REJECTED_MESSAGES.invalid_name
    : rejectedReason ? NAME_REJECTED_MESSAGES[rejectedReason]
    : null
  const canSubmit = trimmedName.length > 0 && !hasInvalidChars

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
        <p style={{ fontSize: '12px', color: '#888' }}>名前を入力（1〜{PLAYER_NAME_MAX_LENGTH}文字・記号は - _ . のみ）</p>
        <input
          type="text"
          value={playerName}
          onChange={e => {
            setPlayerName(e.target.value)
            setRejectedReason(null)
          }}
          maxLength={PLAYER_NAME_MAX_LENGTH}
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
        {nameMessage && (
          <p style={{ fontSize: '12px', color: '#FF4444' }}>{nameMessage}</p>
        )}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={submitScore}
            disabled={!canSubmit}
            style={{ ...BTN_PRIMARY, fontSize: '16px', padding: '10px 24px', opacity: canSubmit ? 1 : 0.5 }}
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
  if (submitState === 'disabled') {
    return <p style={{ fontSize: '14px', color: '#888' }}>現在スコアの投稿を停止しています</p>
  }
  return (
    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
      <p style={{ fontSize: '14px', color: '#FF4444' }}>{errorMessage}</p>
      <button
        onClick={() => setSubmitState('inputting')}
        style={{ ...BTN_OUTLINE, fontSize: '14px', padding: '8px 16px' }}
      >
        もう一度試す
      </button>
    </div>
  )
}
