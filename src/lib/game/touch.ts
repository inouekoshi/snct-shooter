export interface TouchBuffer {
  active: boolean
  x: number
  y: number
}

export function createTouchBuffer(): TouchBuffer {
  return { active: false, x: 0, y: 0 }
}

function toLogicalCoords(
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement,
  rect: DOMRect
): { x: number; y: number } {
  const dpr = window.devicePixelRatio || 1
  return {
    x: (clientX - rect.left) * (canvas.width / dpr) / rect.width,
    y: (clientY - rect.top) * (canvas.height / dpr) / rect.height,
  }
}

export function registerTouchHandlers(
  canvas: HTMLCanvasElement,
  buffer: TouchBuffer
): () => void {
  const onStart = (e: TouchEvent) => {
    e.preventDefault()
    const t = e.touches[0]
    const rect = canvas.getBoundingClientRect()
    const { x, y } = toLogicalCoords(t.clientX, t.clientY, canvas, rect)
    buffer.active = true
    buffer.x = x
    buffer.y = y
  }

  const onMove = (e: TouchEvent) => {
    e.preventDefault()
    const t = e.touches[0]
    const rect = canvas.getBoundingClientRect()
    const { x, y } = toLogicalCoords(t.clientX, t.clientY, canvas, rect)
    buffer.x = x
    buffer.y = y
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
