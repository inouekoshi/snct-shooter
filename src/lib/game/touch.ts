export interface TouchBuffer {
  active: boolean
  x: number
  y: number
}

export function createTouchBuffer(): TouchBuffer {
  return { active: false, x: 0, y: 0 }
}

export function registerTouchHandlers(
  canvas: HTMLCanvasElement,
  buffer: TouchBuffer
): () => void {
  const onStart = (e: TouchEvent) => {
    e.preventDefault()
    const t = e.touches[0]
    const rect = canvas.getBoundingClientRect()
    buffer.active = true
    buffer.x = t.clientX - rect.left
    buffer.y = t.clientY - rect.top
  }

  const onMove = (e: TouchEvent) => {
    e.preventDefault()
    const t = e.touches[0]
    const rect = canvas.getBoundingClientRect()
    buffer.x = t.clientX - rect.left
    buffer.y = t.clientY - rect.top
  }

  const onEnd = (e: TouchEvent) => {
    e.preventDefault()
    if (e.touches.length === 0) buffer.active = false
  }

  canvas.addEventListener('touchstart', onStart, { passive: false })
  canvas.addEventListener('touchmove', onMove, { passive: false })
  canvas.addEventListener('touchend', onEnd, { passive: false })
  canvas.addEventListener('touchcancel', onEnd, { passive: false })

  return () => {
    canvas.removeEventListener('touchstart', onStart)
    canvas.removeEventListener('touchmove', onMove)
    canvas.removeEventListener('touchend', onEnd)
    canvas.removeEventListener('touchcancel', onEnd)
  }
}
