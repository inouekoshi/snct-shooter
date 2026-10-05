export type LeaderboardBoard = 'normal' | 'extra'

export interface LeaderboardEntry {
  name: string
  score: number
  stage: number
  createdAt?: number
}

export const SCORE_LIMITS: Record<LeaderboardBoard, Record<number, number>> = {
  normal: {
    1: 2000, 2: 4500, 3: 7400, 4: 10700,
    5: 14500, 6: 18800, 7: 23500, 8: 28600,
  },
  extra: {
    1: 5200, 2: 11300, 3: 19000,
  },
}

export function parseBoard(value: unknown): LeaderboardBoard | null {
  if (value === undefined || value === null || value === 'normal') return 'normal'
  if (value === 'extra') return 'extra'
  return null
}

export function maxStageOf(board: LeaderboardBoard): number {
  return Object.keys(SCORE_LIMITS[board]).length
}
