'use client'

import { useEffect, useState } from 'react'
import { computeViewportScale, type ViewportSize } from '@/lib/viewport'

function availableSize(): ViewportSize {
  const style = getComputedStyle(document.body)
  const px = (value: string) => parseFloat(value) || 0
  return {
    width: window.innerWidth - px(style.paddingLeft) - px(style.paddingRight),
    height: window.innerHeight - px(style.paddingTop) - px(style.paddingBottom),
  }
}

function isEditingText(): boolean {
  const el = document.activeElement
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
}

export function useViewportScale(): number {
  const [scale, setScale] = useState(1)

  useEffect(() => {
    let lastWidth = window.innerWidth
    const update = () => {
      const widthChanged = window.innerWidth !== lastWidth
      lastWidth = window.innerWidth
      if (isEditingText() && !widthChanged) return
      setScale(computeViewportScale(availableSize()))
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return scale
}
