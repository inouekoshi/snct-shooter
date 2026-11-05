'use client'

import { useEffect, useState } from 'react'
import {
  fetchClosingSummary, podiumEntries, type ClosingSummary, type LeaderboardBoard,
} from '@/lib/leaderboard'
import StarBackground from './StarBackground'
import SponsorCredit from './SponsorCredit'
import { BTN_PRIMARY, BTN_OUTLINE } from './buttonStyles'

interface Props {
  onPlay: () => void
  onShowRanking: () => void
}

type SummaryState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; summary: ClosingSummary }

const BOARD_LABELS: Record<LeaderboardBoard, { title: string; color: string }> = {
  normal: { title: 'NORMAL', color: '#FFFFFF' },
  extra: { title: 'EXTRA', color: '#FF2266' },
}

const RANK_COLORS = ['#FFD700', '#C8C8C8', '#CD7F32']
const RANK_SUFFIXES = ['ST', 'ND', 'RD']

function Podium({ board, summary }: { board: LeaderboardBoard; summary: ClosingSummary }) {
  const { title, color } = BOARD_LABELS[board]
  const podium = podiumEntries(summary[board].top)
  return (
    <section style={{ width: '100%' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          borderBottom: `1px solid ${color}55`,
          paddingBottom: '4px',
          marginBottom: '6px',
        }}
      >
        <h3 style={{ fontSize: '15px', fontWeight: 'bold', letterSpacing: '2px', color }}>{title}</h3>
        <span style={{ fontSize: '11px', color: '#888' }}>
          登録 {summary[board].total.toLocaleString()} 件
        </span>
      </div>
      {podium.length === 0 && (
        <p style={{ fontSize: '13px', color: '#666', padding: '6px 0' }}>登録はありませんでした</p>
      )}
      {podium.map(({ rank, entry }, i) => (
        <div
          key={entry.id ?? i}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '3px 0' }}
        >
          <span
            style={{
              width: '40px',
              flexShrink: 0,
              fontSize: '15px',
              fontWeight: 'bold',
              color: RANK_COLORS[rank - 1],
            }}
          >
            {rank}{RANK_SUFFIXES[rank - 1]}
          </span>
          <span style={{ flex: 1, fontSize: '16px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {entry.name}
          </span>
          <span style={{ fontSize: '16px', fontWeight: 'bold', flexShrink: 0 }}>
            {entry.score.toLocaleString()}
          </span>
        </div>
      ))}
    </section>
  )
}

function SummaryBody({ state, onRetry }: { state: SummaryState; onRetry: () => void }) {
  if (state.status === 'loading') {
    return <p style={{ color: '#888', textAlign: 'center', padding: '40px 0' }}>LOADING...</p>
  }
  if (state.status === 'error') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '28px 0' }}>
        <p style={{ color: '#FF4444', fontSize: '14px' }}>結果を読み込めませんでした</p>
        <button onClick={onRetry} style={{ ...BTN_OUTLINE, fontSize: '14px', padding: '8px 20px' }}>
          もう一度読み込む
        </button>
      </div>
    )
  }
  const { summary } = state
  const total = summary.normal.total + summary.extra.total
  return (
    <>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '12px', color: '#888' }}>ランキング登録数</p>
        <p style={{ fontSize: '30px', fontWeight: 'bold', color: '#FFFF00' }}>
          {total.toLocaleString()}
          <span style={{ fontSize: '14px', marginLeft: '4px' }}>件</span>
        </p>
      </div>
      <Podium board="normal" summary={summary} />
      <Podium board="extra" summary={summary} />
    </>
  )
}

export default function ClosingScreen({ onPlay, onShowRanking }: Props) {
  const [state, setState] = useState<SummaryState>({ status: 'loading' })
  const [reloadCount, setReloadCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })
    fetchClosingSummary()
      .then(summary => { if (!cancelled) setState({ status: 'ready', summary }) })
      .catch(() => { if (!cancelled) setState({ status: 'error' }) })
    return () => { cancelled = true }
  }, [reloadCount])

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontFamily: 'monospace',
        color: '#FFFFFF',
        padding: '40px 32px 16px',
        zIndex: 5,
        overflow: 'hidden',
      }}
    >
      <StarBackground />
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '18px',
          minHeight: 0,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: '#888', letterSpacing: '3px', marginBottom: '8px' }}>
            高専祭 SHOOTING
          </p>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', letterSpacing: '1px', lineHeight: 1.3 }}>
            THANK YOU<br />FOR PLAYING!
          </h1>
          <p style={{ fontSize: '13px', color: '#CCCCCC', lineHeight: 1.7, marginTop: '12px' }}>
            高専祭で遊んでくださった皆さん、<br />
            本当にありがとうございました！
          </p>
        </div>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            width: '100%',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <SummaryBody state={state} onRetry={() => setReloadCount(c => c + 1)} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', width: '100%', flexShrink: 0 }}>
          <p style={{ fontSize: '12px', color: '#888', textAlign: 'center', lineHeight: 1.6 }}>
            ランキングの受付は終了しました。<br />
            ゲームはこれからも遊べます。
          </p>
          <button onClick={onPlay} style={{ ...BTN_PRIMARY, width: '100%', maxWidth: '280px' }}>
            ゲームで遊ぶ
          </button>
          <button
            onClick={onShowRanking}
            style={{ ...BTN_OUTLINE, width: '100%', maxWidth: '280px', fontSize: '15px', padding: '10px 0' }}
          >
            最終ランキングを見る
          </button>
          <SponsorCredit style={{ marginTop: '4px' }} />
        </div>
      </div>
    </div>
  )
}
