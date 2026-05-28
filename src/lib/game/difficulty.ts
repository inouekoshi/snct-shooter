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
  bossParams: {
    interval1: number
    interval2: number
    interval3: number
    bulletSpeed1: number
    bulletSpeed2: number
    bulletSpeed3: number
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.min(t, 1)
}

export type DifficultyMode = 'EASY' | 'NORMAL'

export function getDifficulty(stage: number, mode: DifficultyMode = 'NORMAL'): DifficultyParams {
  const effectiveStage = stage + 2
  const t = Math.max(0, Math.min((effectiveStage - 1) / 9, 1))

  const attackRatioTable: Record<number, number> = {
    3: 3,
    4: 3,
    5: 2,
    6: 2,
    7: 1,
  }
  const attackRatio = effectiveStage >= 8 ? 1 : (attackRatioTable[effectiveStage] ?? 0)

  const bossThresholdTable: Record<number, number> = {
    3: 700,
    4: 900,
  }
  const bossThreshold = bossThresholdTable[effectiveStage] ?? (300 + (effectiveStage - 1) * 200)

  const params: DifficultyParams = {
    normalEnemySpeed: lerp(110, 300, t),
    normalEnemyInterval: lerp(900, 150, t),
    attackEnemySpeed: lerp(90, 200, t),
    attackEnemyBulletSpeed: lerp(200, 500, t),
    attackEnemyFireInterval: lerp(2000, 400, t),
    attackEnemySpawnRatio: attackRatio,
    bossScoreThreshold: bossThreshold,
    bossHp: 150 + (effectiveStage - 1) * 150,
    bossSpeed: Math.min(40 + (effectiveStage - 1) * 15, 150),
    bossParams: {
      interval1: lerp(800, 300, t),
      interval2: lerp(1200, 500, t),
      interval3: lerp(500, 150, t),
      bulletSpeed1: lerp(250, 450, t),
      bulletSpeed2: lerp(300, 500, t),
      bulletSpeed3: lerp(320, 550, t),
    }
  }

  if (mode === 'EASY') {
    params.normalEnemySpeed *= 0.7
    params.normalEnemyInterval *= 1.5
    params.attackEnemySpeed *= 0.7
    params.attackEnemyBulletSpeed *= 0.6
    params.attackEnemyFireInterval *= 1.5
    params.bossHp = Math.max(10, Math.floor(params.bossHp * 0.6))
    params.bossSpeed *= 0.8
    params.bossParams.interval1 *= 1.5
    params.bossParams.interval2 *= 1.5
    params.bossParams.interval3 *= 1.5
    params.bossParams.bulletSpeed1 *= 0.6
    params.bossParams.bulletSpeed2 *= 0.6
    params.bossParams.bulletSpeed3 *= 0.6
  }

  return params
}
