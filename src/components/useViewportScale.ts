'use client'

import { useEffect, useState } from 'react'
import { CANVAS_HEIGHT } from '@/lib/game/constants'

export function useViewportScale(): number {
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const update = () => setScale(Math.min(1, window.innerHeight / CANVAS_HEIGHT))
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return scale
}
