'use client'

import { useEffect, useState } from 'react'

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

export default function StarBackground() {
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
