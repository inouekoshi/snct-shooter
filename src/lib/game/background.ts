import { CANVAS_WIDTH, CANVAS_HEIGHT } from './constants'

const STAR_COUNT = 80

export interface Star {
  x: number
  y: number
  r: number
  speed: number
}

export function createStars(): Star[] {
  return Array.from({ length: STAR_COUNT }, () => ({
    x: Math.random() * CANVAS_WIDTH,
    y: Math.random() * CANVAS_HEIGHT,
    r: 0.5 + Math.random() * 1.5,
    speed: 20 + Math.random() * 40,
  }))
}

export function updateStars(stars: Star[], delta: number): void {
  const dt = delta / 1000
  for (const s of stars) {
    s.y += s.speed * dt
    if (s.y > CANVAS_HEIGHT) {
      s.y = -2
      s.x = Math.random() * CANVAS_WIDTH
    }
  }
}

export function renderStars(ctx: CanvasRenderingContext2D, stars: Star[]): void {
  ctx.fillStyle = '#FFFFFF'
  for (const s of stars) {
    ctx.beginPath()
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
    ctx.fill()
  }
}
