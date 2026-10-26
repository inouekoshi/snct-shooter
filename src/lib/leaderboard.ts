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

export const LEADERBOARD_REQUEST_TIMEOUT_MS = 8000

async function requestJson(input: string, init: RequestInit = {}): Promise<{ res: Response; data: unknown }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), LEADERBOARD_REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(input, { ...init, signal: controller.signal })
    const data: unknown = await res.json()
    return { res, data }
  } finally {
    clearTimeout(timer)
  }
}

function isLeaderboardEntry(value: unknown): value is LeaderboardEntry {
  if (typeof value !== 'object' || value === null) return false
  const entry = value as Record<string, unknown>
  return typeof entry.name === 'string' && Number.isFinite(entry.score) && Number.isFinite(entry.stage)
}

export function parseLeaderboardEntries(data: unknown): LeaderboardEntry[] {
  const entries = (data as { entries?: unknown } | null)?.entries
  return Array.isArray(entries) ? entries.filter(isLeaderboardEntry) : []
}

export async function fetchLeaderboard(board: LeaderboardBoard, submittedId?: string): Promise<LeaderboardEntry[]> {
  const query = submittedId ? `mode=${board}&after=${encodeURIComponent(submittedId)}` : `mode=${board}`
  const { res, data } = await requestJson(`/api/scores?${query}`)
  if (!res.ok) throw new Error(`Failed to fetch leaderboard: ${res.status}`)
  return parseLeaderboardEntries(data)
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
    const { res, data: body } = await requestJson('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...entry, mode: board, clientId }),
    })
    const data = (body ?? {}) as { ok?: unknown; rank?: unknown; id?: unknown; error?: unknown }
    if (res.ok && data.ok && Number.isFinite(data.rank) && typeof data.id === 'string') {
      return { ok: true, rank: data.rank as number, id: data.id }
    }
    if (data.error === 'invalid name') return { ok: false, reason: 'invalid_name' }
    if (data.error === 'inappropriate name') return { ok: false, reason: 'inappropriate_name' }
    if (data.error === 'submission disabled') return { ok: false, reason: 'disabled' }
    if (data.error === 'too many requests') return { ok: false, reason: 'rate_limited' }
    return { ok: false, reason: 'failed' }
  } catch {
    return { ok: false, reason: 'failed' }
  }
}
