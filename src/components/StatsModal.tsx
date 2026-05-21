'use client'

import { useEffect, useState } from 'react'
import { loadStats, totalKillCount, type LifetimeStats } from '@/lib/game/stats'

interface Props {
  onClose: () => void
}

function formatDate(ts: number): string {
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function BarChart({ records }: { records: LifetimeStats['records'] }) {
  if (records.length === 0) return null

  const recent = records.slice(0, 10)
  const maxScore = Math.max(...recent.map((r) => r.score), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {recent.map((r, i) => {
        const ratio = r.score / maxScore
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '11px',
                color: '#888',
                width: '30px',
                textAlign: 'right',
                flexShrink: 0,
              }}
            >
              {formatDate(r.playedAt)}
            </span>
            <div
              style={{
                flex: 1,
                height: '18px',
                background: '#111',
                borderRadius: '3px',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <div
                style={{
                  width: `${ratio * 100}%`,
                  height: '100%',
                  background: i === 0 ? '#FFFF00' : '#555',
                  borderRadius: '3px',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
            <span
              style={{
                fontSize: '12px',
                color: i === 0 ? '#FFFF00' : '#CCC',
                width: '58px',
                textAlign: 'right',
                flexShrink: 0,
              }}
            >
              {r.score.toLocaleString()}
            </span>
            <span
              style={{
                fontSize: '11px',
                color: '#666',
                width: '24px',
                textAlign: 'right',
                flexShrink: 0,
              }}
            >
              S{r.stage}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default function StatsModal({ onClose }: Props) {
  const [stats, setStats] = useState<LifetimeStats | null>(null)

  useEffect(() => {
    setStats(loadStats())
  }, [])

  if (!stats) return null

  const hasPlayed = stats.totalPlays > 0
  const bestScore = stats.records.length > 0 ? Math.max(...stats.records.map((r) => r.score)) : 0

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 100,
        fontFamily: 'monospace',
        color: '#FFFFFF',
        overflowY: 'auto',
      }}
    >
      <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', letterSpacing: '2px', margin: 0 }}>
            STATS
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid #444',
              color: '#888',
              borderRadius: '4px',
              padding: '4px 12px',
              fontSize: '14px',
              fontFamily: 'monospace',
              cursor: 'pointer',
            }}
          >
            CLOSE
          </button>
        </div>

        {!hasPlayed ? (
          <p style={{ color: '#555', fontSize: '14px', textAlign: 'center', marginTop: '40px' }}>
            まだプレイ記録がありません
          </p>
        ) : (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
              }}
            >
              <StatCard label="TOTAL PLAYS" value={String(stats.totalPlays)} />
              <StatCard label="BEST SCORE" value={bestScore.toLocaleString()} highlight />
              <StatCard label="MAX STAGE" value={`Stage ${stats.maxStageReached}`} />
              <StatCard label="TOTAL KILLS" value={String(totalKillCount(stats.totalKills))} />
            </div>

            <section>
              <SectionTitle>SCORE HISTORY</SectionTitle>
              <BarChart records={stats.records} />
            </section>

            <section>
              <SectionTitle>ENEMY KILLS</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <KillRow label="通常敵" count={stats.totalKills.normal} color="#FF4444" />
                <KillRow label="攻撃敵" count={stats.totalKills.attack} color="#FF8800" />
                <KillRow label="ボス" count={stats.totalKills.boss} color="#AA00FF" />
                <KillRow label="回復敵" count={stats.totalKills.heal} color="#00CC88" />
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      style={{
        background: '#111',
        border: '1px solid #333',
        borderRadius: '8px',
        padding: '12px',
        textAlign: 'center',
      }}
    >
      <p style={{ fontSize: '10px', color: '#666', marginBottom: '4px', letterSpacing: '1px' }}>{label}</p>
      <p style={{ fontSize: '20px', fontWeight: 'bold', color: highlight ? '#FFFF00' : '#FFFFFF', margin: 0 }}>
        {value}
      </p>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: '12px',
        color: '#666',
        letterSpacing: '2px',
        marginBottom: '10px',
      }}
    >
      {children}
    </p>
  )
}

function KillRow({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: '14px', color }}>{label}</span>
      <span style={{ fontSize: '14px', color: '#CCC' }}>{count.toLocaleString()}</span>
    </div>
  )
}
