import type { DifficultyMode } from './difficulty'

const STORAGE_KEY = 'shooting-highscore'
const EXTRA_STORAGE_KEY = 'shooting-highscore-extra'
const EXTRA_UNLOCKED_KEY = 'shooter-extra-unlocked'

export interface ScoreState {
  total: number
  stage: number
  highScore: number
}

export function createScoreState(highScore: number): ScoreState {
  return { total: 0, stage: 0, highScore }
}

function highScoreKey(mode: DifficultyMode): string {
  return mode === 'EXTRA' ? EXTRA_STORAGE_KEY : STORAGE_KEY
}

export function loadHighScore(mode: DifficultyMode = 'NORMAL'): number {
  try {
    const v = localStorage.getItem(highScoreKey(mode))
    return v ? parseInt(v, 10) : 0
  } catch {
    return 0
  }
}

export function saveHighScore(score: number, mode: DifficultyMode = 'NORMAL'): void {
  try {
    localStorage.setItem(highScoreKey(mode), String(score))
  } catch {
    // localStorage unavailable — session-only display
  }
}

export function isExtraUnlocked(): boolean {
  try {
    return localStorage.getItem(EXTRA_UNLOCKED_KEY) === '1'
  } catch {
    return false
  }
}

export function unlockExtra(): void {
  try {
    localStorage.setItem(EXTRA_UNLOCKED_KEY, '1')
  } catch {
    // localStorage unavailable — unlock lasts for this session only
  }
}
