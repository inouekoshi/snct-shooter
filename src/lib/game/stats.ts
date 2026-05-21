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
}

export interface LifetimeStats {
  records: GameRecord[]
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
  maxStageReached: 0,
  totalPlays: 0,
  totalKills: { normal: 0, attack: 0, boss: 0, heal: 0 },
}

export function loadStats(): LifetimeStats {
  try {
    const raw = localStorage.getItem(STATS_KEY)
    if (!raw) return EMPTY_STATS
    const parsed = JSON.parse(raw) as LifetimeStats
    return parsed
  } catch {
    return EMPTY_STATS
  }
}

export function saveGameRecord(record: GameRecord): void {
  try {
    const current = loadStats()
    const records = [record, ...current.records].slice(0, MAX_RECORDS)
    const maxStageReached = Math.max(current.maxStageReached, record.stage)
    const totalPlays = current.totalPlays + 1
    const totalKills: KillCounts = {
      normal: current.totalKills.normal + record.kills.normal,
      attack: current.totalKills.attack + record.kills.attack,
      boss: current.totalKills.boss + record.kills.boss,
      heal: current.totalKills.heal + record.kills.heal,
    }
    const next: LifetimeStats = { records, maxStageReached, totalPlays, totalKills }
    localStorage.setItem(STATS_KEY, JSON.stringify(next))
  } catch {
    // localStorage unavailable — skip
  }
}
