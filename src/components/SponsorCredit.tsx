'use client'

import type { CSSProperties } from 'react'
import Image from 'next/image'

const LOGO_HEIGHT = 18
const LOGO_WIDTH = Math.round(LOGO_HEIGHT * 1354 / 188)

interface Props {
  style?: CSSProperties
}

export default function SponsorCredit({ style }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#666',
        pointerEvents: 'none',
        ...style,
      }}
    >
      <span>sponsored by</span>
      <Image
        src="/bengo4-logo.png"
        alt="弁護士ドットコム"
        width={LOGO_WIDTH}
        height={LOGO_HEIGHT}
        unoptimized
        style={{ filter: 'invert(1)', opacity: 0.6 }}
      />
    </div>
  )
}
