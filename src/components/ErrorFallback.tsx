'use client'

import { BTN_PRIMARY, BTN_OUTLINE } from './buttonStyles'

interface Props {
  title: string
  message: string
  showReload?: boolean
}

export default function ErrorFallback({ title, message, showReload }: Props) {
  return (
    <div
      style={{
        width: '100%',
        minHeight: '100dvh',
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '24px',
        padding: '24px',
        fontFamily: 'monospace',
        color: '#FFFFFF',
        textAlign: 'center',
      }}
    >
      <h1 style={{ fontSize: '22px', fontWeight: 'bold' }}>{title}</h1>
      <p style={{ fontSize: '14px', color: '#888', lineHeight: 1.6 }}>{message}</p>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {showReload && (
          <button onClick={() => window.location.reload()} style={BTN_PRIMARY}>
            再読み込み
          </button>
        )}
        <button onClick={() => window.location.assign('/')} style={BTN_OUTLINE}>
          HOME
        </button>
      </div>
    </div>
  )
}
