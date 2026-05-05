'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { loadHighScore } from '@/lib/game/score'
import RotatePrompt from '@/components/RotatePrompt'

export default function StartPage() {
  const router = useRouter()
  const [highScore, setHighScore] = useState(0)

  useEffect(() => {
    setHighScore(loadHighScore())
  }, [])

  return (
    <>
      <RotatePrompt />
      <div
        style={{
          width: '390px',
          height: '844px',
          background: '#000',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '32px',
          fontFamily: 'monospace',
          color: '#FFFFFF',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <StarBackground />
        <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', letterSpacing: '2px', marginBottom: '8px' }}>
            🚀 SHOOTING
          </h1>
          <p style={{ fontSize: '14px', color: '#888' }}>暇つぶしシューティング</p>
        </div>

        {highScore > 0 && (
          <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
            <p style={{ fontSize: '12px', color: '#888' }}>BEST</p>
            <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#FFFF00' }}>
              {highScore.toLocaleString()}
            </p>
          </div>
        )}

        <button
          onClick={() => router.push('/game')}
          style={{
            position: 'relative',
            zIndex: 1,
            padding: '16px 48px',
            background: '#FFFFFF',
            color: '#000000',
            border: 'none',
            borderRadius: '8px',
            fontSize: '20px',
            fontWeight: 'bold',
            fontFamily: 'monospace',
            cursor: 'pointer',
            letterSpacing: '2px',
          }}
        >
          START
        </button>

        <p
          style={{
            position: 'absolute',
            bottom: '24px',
            fontSize: '11px',
            color: '#444',
            textAlign: 'center',
            zIndex: 1,
          }}
        >
          iPhoneは「共有」→「ホーム画面に追加」でオフラインでも遊べます
        </p>
      </div>
    </>
  )
}

function StarBackground() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      {Array.from({ length: 60 }, (_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: `${1 + Math.random() * 2}px`,
            height: `${1 + Math.random() * 2}px`,
            background: '#FFF',
            borderRadius: '50%',
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            opacity: 0.3 + Math.random() * 0.7,
          }}
        />
      ))}
    </div>
  )
}
