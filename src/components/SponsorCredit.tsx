'use client'

import type { CSSProperties } from 'react'
import Image from 'next/image'

const LOGO_HEIGHT = 12
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
        gap: '6px',
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#555',
        pointerEvents: 'none',
        ...style,
      }}
    >
      <span>supported by</span>
      <Image
        src="/bengo4-logo.png"
        alt="弁護士ドットコム"
        width={LOGO_WIDTH}
        height={LOGO_HEIGHT}
        unoptimized
        style={{ filter: 'invert(1)', opacity: 0.55 }}
      />
    </div>
  )
}
