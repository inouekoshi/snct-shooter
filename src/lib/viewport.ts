import { CANVAS_WIDTH, CANVAS_HEIGHT } from './game/constants'

export interface ViewportSize {
  width: number
  height: number
}

export function computeViewportScale({ width, height }: ViewportSize): number {
  if (!(width > 0) || !(height > 0)) return 1
  return Math.min(1, width / CANVAS_WIDTH, height / CANVAS_HEIGHT)
}
