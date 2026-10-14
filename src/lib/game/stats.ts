import type { DifficultyMode } from './difficulty'

const STATS_KEY = 'shooter-stats'
const MAX_RECORDS = 20

export interface KillCounts {
  normal: number
  attack: number
  boss: number
  heal: number
}

export interface GameRecord {
  score: number
  stage: number
  playedAt: number
  kills: KillCounts
  mode?: DifficultyMode
}

export interface LifetimeStats {
  records: GameRecord[]
  bestScore: number
  maxStageReached: number
  totalPlays: number
  totalKills: KillCounts
}

export function createKillCounts(): KillCounts {
  return { normal: 0, attack: 0, boss: 0, heal: 0 }
}

export function totalKillCount(kills: KillCounts): number {
  return kills.normal + kills.attack + kills.boss + kills.heal
}

const EMPTY_STATS: LifetimeStats = {
  records: [],
  bestScore: 0,
  maxStageReached: 0,
  totalPlays: 0,
  totalKills: createKillCounts(),
}

function isSummaryTarget(record: GameRecord): boolean {
  return record.mode === undefined || record.mode === 'NORMAL'
}

function bestScoreOf(records: GameRecord[]): number {
  return Math.max(0, ...records.filter(isSummaryTarget).map((r) => r.score))
}

export function loadStats(): LifetimeStats {
  try {
    const raw = localStorage.getItem(STATS_KEY)
    if (!raw) return EMPTY_STATS
    const parsed = JSON.parse(raw) as Partial<LifetimeStats>
    const records = parsed.records ?? []
    return {
      records,
      bestScore: parsed.bestScore ?? bestScoreOf(records),
      maxStageReached: parsed.maxStageReached ?? 0,
      totalPlays: parsed.totalPlays ?? records.length,
      totalKills: { ...EMPTY_STATS.totalKills, ...parsed.totalKills },
    }
  } catch {
    return EMPTY_STATS
  }
}

export function saveGameRecord(record: GameRecord): void {
  try {
    const current = loadStats()
    const records = [record, ...current.records].slice(0, MAX_RECORDS)
    const counted = isSummaryTarget(record)
    const bestScore = counted ? Math.max(current.bestScore, record.score) : current.bestScore
    const maxStageReached = counted
      ? Math.max(current.maxStageReached, record.stage)
      : current.maxStageReached
    const totalPlays = current.totalPlays + 1
    const totalKills: KillCounts = {
      normal: current.totalKills.normal + record.kills.normal,
      attack: current.totalKills.attack + record.kills.attack,
      boss: current.totalKills.boss + record.kills.boss,
      heal: current.totalKills.heal + record.kills.heal,
    }
    const next: LifetimeStats = { records, bestScore, maxStageReached, totalPlays, totalKills }
    localStorage.setItem(STATS_KEY, JSON.stringify(next))
  } catch {
    // localStorage unavailable — skip
  }
}
