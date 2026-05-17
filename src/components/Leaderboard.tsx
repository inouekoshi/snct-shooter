'use client'

import { useEffect, useState } from 'react'

interface LeaderboardEntry {
  name: string
  score: number
  stage: number
}

interface Props {
  highlightScore?: number
  onClose: () => void
}

export default function Leaderboard({ highlightScore, onClose }: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/scores')
      .then(r => r.json())
      .then(data => {
        setEntries(data.entries ?? [])
        setLoading(false)
      })
      .catch(() => {
        setError(true)
        setLoading(false)
      })
  }, [])

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'monospace',
        color: '#FFFFFF',
        zIndex: 10,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '24px 24px 12px',
          flexShrink: 0,
        }}
      >
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', letterSpacing: '2px' }}>RANKING</h2>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            color: '#FFFFFF',
            border: '2px solid #FFFFFF',
            borderRadius: '8px',
            padding: '6px 16px',
            fontSize: '14px',
            fontWeight: 'bold',
            fontFamily: 'monospace',
            cursor: 'pointer',
          }}
        >
          CLOSE
        </button>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0 24px 24px',
        }}
      >
        {loading && (
          <p style={{ textAlign: 'center', color: '#888', marginTop: '40px' }}>LOADING...</p>
        )}
        {error && (
          <p style={{ textAlign: 'center', color: '#FF4444', marginTop: '40px' }}>
            読み込みに失敗しました
          </p>
        )}
        {!loading && !error && entries.length === 0 && (
          <p style={{ textAlign: 'center', color: '#888', marginTop: '40px' }}>
            まだスコアがありません
          </p>
        )}
        {!loading && !error && entries.map((entry, i) => {
          const isHighlight = highlightScore !== undefined && entry.score === highlightScore
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 0',
                borderBottom: '1px solid #222',
                color: isHighlight ? '#FFFF00' : '#FFFFFF',
              }}
            >
              <span style={{ fontSize: '16px', width: '28px', textAlign: 'right', flexShrink: 0, color: i < 3 ? '#FFFF00' : '#888' }}>
                {i + 1}
              </span>
              <span style={{ fontSize: '16px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {entry.name}
              </span>
              <span style={{ fontSize: '16px', fontWeight: 'bold', flexShrink: 0 }}>
                {entry.score.toLocaleString()}
              </span>
              <span style={{ fontSize: '12px', color: '#888', flexShrink: 0, width: '40px', textAlign: 'right' }}>
                Stg{entry.stage}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
