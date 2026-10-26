'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { loadHighScore, isExtraUnlocked } from '@/lib/game/score'
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/lib/game/constants'
import RotatePrompt from '@/components/RotatePrompt'
import Leaderboard from '@/components/Leaderboard'
import StatsModal from '@/components/StatsModal'
import SponsorCredit from '@/components/SponsorCredit'
import { useViewportScale } from '@/components/useViewportScale'

const MENU_BUTTON: CSSProperties = {
  borderRadius: '8px',
  fontSize: '16px',
  fontWeight: 'bold',
  fontFamily: 'monospace',
  cursor: 'pointer',
}

const MODE_BUTTON: CSSProperties = {
  ...MENU_BUTTON,
  padding: '16px 20px',
  letterSpacing: '1px',
  flex: 1,
  maxWidth: '140px',
}

const SUB_BUTTON: CSSProperties = {
  ...MENU_BUTTON,
  padding: '10px 36px',
  background: 'transparent',
  letterSpacing: '2px',
}

const EXTRA_WIDTH = '296px'

export default function StartPage() {
  const router = useRouter()
  const [highScore, setHighScore] = useState(0)
  const [easyHighScore, setEasyHighScore] = useState(0)
  const [extraUnlocked, setExtraUnlocked] = useState(false)
  const [extraHighScore, setExtraHighScore] = useState(0)
  const scale = useViewportScale()
  const [showRanking, setShowRanking] = useState(false)
  const [showStats, setShowStats] = useState(false)

  useEffect(() => {
    setHighScore(loadHighScore())
    setEasyHighScore(loadHighScore('EASY'))
    setExtraUnlocked(isExtraUnlocked())
    setExtraHighScore(loadHighScore('EXTRA'))
  }, [])

  return (
    <>
      <RotatePrompt />
      <div
        style={{
          width: `${CANVAS_WIDTH}px`,
          height: `${CANVAS_HEIGHT}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
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

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '16px', width: '100%', justifyContent: 'center' }}>
            <button
              onClick={() => router.push('/game?mode=easy')}
              style={{ ...MODE_BUTTON, background: '#222222', color: '#00CC88', border: '2px solid #00CC88' }}
            >
              EASY<br/>
              <span style={{ fontSize: '12px', color: '#888' }}>
                {easyHighScore > 0 ? `BEST ${easyHighScore.toLocaleString()}` : '初心者向け'}
              </span>
            </button>
            <button
              onClick={() => router.push('/game?mode=normal')}
              style={{ ...MODE_BUTTON, background: '#FFFFFF', color: '#000000', border: 'none' }}
            >
              NORMAL<br/><span style={{fontSize: '12px', color: '#666'}}>標準難易度</span>
            </button>
          </div>
          {extraUnlocked ? (
            <button
              onClick={() => router.push('/game?mode=extra')}
              style={{
                ...MENU_BUTTON,
                padding: '12px 20px',
                background: '#FF2266',
                color: '#FFFFFF',
                border: 'none',
                letterSpacing: '1px',
                width: EXTRA_WIDTH,
              }}
            >
              EXTRA<br/>
              <span style={{ fontSize: '12px', color: '#FFD0DC' }}>
                {extraHighScore > 0 ? `BEST ${extraHighScore.toLocaleString()}` : '全3ステージの高難度モード'}
              </span>
            </button>
          ) : (
            <div
              style={{
                padding: '12px 20px',
                border: '2px dashed #442233',
                borderRadius: '8px',
                fontSize: '14px',
                color: '#664455',
                textAlign: 'center',
                width: EXTRA_WIDTH,
                boxSizing: 'border-box',
              }}
            >
              🔒 EXTRA<br/>
              <span style={{ fontSize: '12px' }}>NORMALをクリアで解禁</span>
            </div>
          )}
          <button
            onClick={() => setShowRanking(true)}
            style={{ ...SUB_BUTTON, color: '#FFFFFF', border: '2px solid #FFFFFF' }}
          >
            RANKING
          </button>
          <button
            onClick={() => setShowStats(true)}
            style={{ ...SUB_BUTTON, color: '#AAAAAA', border: '2px solid #555555' }}
          >
            STATS
          </button>
        </div>

        <p
          style={{
            position: 'absolute',
            bottom: '44px',
            fontSize: '11px',
            color: '#444',
            textAlign: 'center',
            zIndex: 1,
          }}
        >
          iPhoneは「共有」→「ホーム画面に追加」でオフラインでも遊べます
        </p>
        <SponsorCredit style={{ position: 'absolute', bottom: '16px', zIndex: 1 }} />

        {showRanking && (
          <Leaderboard onClose={() => setShowRanking(false)} />
        )}
        {showStats && (
          <StatsModal onClose={() => setShowStats(false)} />
        )}
      </div>
    </>
  )
}

interface BackgroundStar {
  size: number
  left: number
  top: number
  opacity: number
}

function createBackgroundStars(count: number): BackgroundStar[] {
  return Array.from({ length: count }, () => ({
    size: 1 + Math.random() * 2,
    left: Math.random() * 100,
    top: Math.random() * 100,
    opacity: 0.3 + Math.random() * 0.7,
  }))
}

function StarBackground() {
  const [stars, setStars] = useState<BackgroundStar[]>([])

  useEffect(() => {
    setStars(createBackgroundStars(60))
  }, [])

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      {stars.map((star, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: `${star.size}px`,
            height: `${star.size}px`,
            background: '#FFF',
            borderRadius: '50%',
            left: `${star.left}%`,
            top: `${star.top}%`,
            opacity: star.opacity,
          }}
        />
      ))}
    </div>
  )
}
