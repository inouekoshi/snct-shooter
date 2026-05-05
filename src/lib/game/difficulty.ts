export interface DifficultyParams {
  normalEnemySpeed: number
  normalEnemyInterval: number
  attackEnemySpeed: number
  attackEnemyBulletSpeed: number
  attackEnemyFireInterval: number
  attackEnemySpawnRatio: number
  bossScoreThreshold: number
  bossHp: number
  bossSpeed: number
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.min(t, 1)
}

export function getDifficulty(stage: number): DifficultyParams {
  const t = Math.max(0, Math.min((stage - 1) / 4, 1))

  const attackRatioTable: Record<number, number> = {
    1: 0,
    2: 4,
    3: 3,
    4: 2,
  }
  const attackRatio = stage >= 5 ? 1 : (attackRatioTable[stage] ?? 0)

  const bossThresholdTable: Record<number, number> = {
    1: 300,
    2: 500,
  }
  const bossThreshold = bossThresholdTable[stage] ?? 700

  return {
    normalEnemySpeed: lerp(80, 200, t),
    normalEnemyInterval: lerp(1200, 400, t),
    attackEnemySpeed: lerp(60, 140, t),
    attackEnemyBulletSpeed: lerp(200, 350, t),
    attackEnemyFireInterval: lerp(2000, 800, t),
    attackEnemySpawnRatio: attackRatio,
    bossScoreThreshold: bossThreshold,
    bossHp: 100 + (stage - 1) * 50,
    bossSpeed: Math.min(40 + (stage - 1) * 10, 100),
  }
}
