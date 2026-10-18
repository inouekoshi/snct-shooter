import { loadClientId } from './clientId'

export type LeaderboardBoard = 'normal' | 'extra'

export interface LeaderboardEntry {
  id?: string
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
    1: 4600, 2: 9900, 3: 16800,
  },
}

export const PLAYER_NAME_MAX_LENGTH = 10

const PLAYER_NAME_PATTERN = new RegExp(`^[\\p{L}\\p{N}\\s\\-_.]{1,${PLAYER_NAME_MAX_LENGTH}}$`, 'u')

export function isValidPlayerName(name: string): boolean {
  return PLAYER_NAME_PATTERN.test(name.trim())
}

export function parseBoard(value: unknown): LeaderboardBoard | null {
  if (value === undefined || value === null || value === 'normal') return 'normal'
  if (value === 'extra') return 'extra'
  return null
}

export function maxStageOf(board: LeaderboardBoard): number {
  return Object.keys(SCORE_LIMITS[board]).length
}

export function rankEntries(entries: LeaderboardEntry[]): number[] {
  const ranks: number[] = []
  entries.forEach((entry, i) => {
    const sameAsPrevious = i > 0 && entries[i - 1].score === entry.score
    ranks.push(sameAsPrevious ? ranks[i - 1] : i + 1)
  })
  return ranks
}

export async function fetchLeaderboard(board: LeaderboardBoard, submittedId?: string): Promise<LeaderboardEntry[]> {
  const query = submittedId ? `mode=${board}&after=${encodeURIComponent(submittedId)}` : `mode=${board}`
  const res = await fetch(`/api/scores?${query}`)
  if (!res.ok) throw new Error(`Failed to fetch leaderboard: ${res.status}`)
  const data = await res.json()
  return data.entries ?? []
}


export type SubmitScoreResult =
  | { ok: true; rank: number; id: string }
  | { ok: false; reason: 'invalid_name' | 'inappropriate_name' | 'disabled' | 'rate_limited' | 'failed' }

export async function submitLeaderboardScore(
  entry: { name: string; score: number; stage: number },
  board: LeaderboardBoard
): Promise<SubmitScoreResult> {
  try {
    const clientId = loadClientId()
    const res = await fetch('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...entry, mode: board, clientId }),
    })
    const data = await res.json()
    if (res.ok && data.ok) return { ok: true, rank: data.rank, id: data.id }
    if (data.error === 'invalid name') return { ok: false, reason: 'invalid_name' }
    if (data.error === 'inappropriate name') return { ok: false, reason: 'inappropriate_name' }
    if (data.error === 'submission disabled') return { ok: false, reason: 'disabled' }
    if (data.error === 'too many requests') return { ok: false, reason: 'rate_limited' }
    return { ok: false, reason: 'failed' }
  } catch {
    return { ok: false, reason: 'failed' }
  }
}
