import type { DifficultyMode } from './difficulty'

const STORAGE_KEY = 'shooting-highscore'
const EASY_STORAGE_KEY = 'shooting-highscore-easy'
const EXTRA_STORAGE_KEY = 'shooting-highscore-extra'
const EXTRA_UNLOCKED_KEY = 'shooter-extra-unlocked'

export interface ScoreState {
  total: number
  highScore: number
}

export function createScoreState(highScore: number): ScoreState {
  return { total: 0, highScore }
}

function highScoreKey(mode: DifficultyMode): string {
  if (mode === 'EASY') return EASY_STORAGE_KEY
  if (mode === 'EXTRA') return EXTRA_STORAGE_KEY
  return STORAGE_KEY
}

export function loadHighScore(mode: DifficultyMode = 'NORMAL'): number {
  try {
    const v = parseInt(localStorage.getItem(highScoreKey(mode)) ?? '', 10)
    return Number.isFinite(v) && v > 0 ? v : 0
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
