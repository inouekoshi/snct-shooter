const STORAGE_KEY = 'shooting-highscore'

export interface ScoreState {
  total: number
  stage: number
  highScore: number
}

export function createScoreState(highScore: number): ScoreState {
  return { total: 0, stage: 0, highScore }
}

export function loadHighScore(): number {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v ? parseInt(v, 10) : 0
  } catch {
    return 0
  }
}

export function saveHighScore(score: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(score))
  } catch {
    // localStorage unavailable — session-only display
  }
}
