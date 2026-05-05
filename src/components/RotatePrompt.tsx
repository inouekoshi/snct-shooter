'use client'

import { useEffect, useState } from 'react'

export default function RotatePrompt() {
  const [landscape, setLandscape] = useState(false)

  useEffect(() => {
    const check = () => setLandscape(window.innerWidth > window.innerHeight)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  if (!landscape) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#FFFFFF',
        zIndex: 9999,
        fontFamily: 'sans-serif',
        textAlign: 'center',
        padding: '24px',
      }}
    >
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>↻</div>
      <div style={{ fontSize: '20px' }}>縦画面でプレイしてください</div>
      <div style={{ fontSize: '14px', marginTop: '8px', color: '#888' }}>
        Please rotate your device to portrait
      </div>
    </div>
  )
}
