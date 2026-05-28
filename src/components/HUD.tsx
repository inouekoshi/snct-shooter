'use client'

interface HUDProps {
  score: number
  lives: number
  stage: number
  mode?: import('@/lib/game/difficulty').DifficultyMode
}

export default function HUD({ score, lives, stage, mode }: HUDProps) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '390px',
        height: '844px',
        pointerEvents: 'none',
        padding: '12px 16px',
        boxSizing: 'border-box',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        color: '#FFFFFF',
        fontFamily: 'monospace',
        fontSize: '16px',
        textShadow: '1px 1px 2px #000',
      }}
    >
      <div>
        <div>SCORE</div>
        <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{score.toLocaleString()}</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div>STAGE</div>
        <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{stage}</div>
        {mode === 'EASY' && (
          <div style={{ color: '#00CC88', fontSize: '12px', marginTop: '4px', textShadow: 'none' }}>EASY MODE</div>
        )}
      </div>
      <div style={{ textAlign: 'right' }}>
        <div>LIVES</div>
        <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{'♥'.repeat(Math.max(0, lives))}</div>
      </div>
    </div>
  )
}
