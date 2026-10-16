export type BossVariant = 'normal' | 'final'

export interface DifficultyParams {
  normalEnemySpeed: number
  normalEnemyInterval: number
  attackEnemySpeed: number
  attackEnemyHp: number
  attackEnemyBulletSpeed: number
  attackEnemyFireInterval: number
  attackEnemySpawnRatio: number
  attackEnemyShots: { straight: number; zigzag: number }
  bossScoreThreshold: number
  bossHp: number
  bossSpeed: number
  bossVariant: BossVariant
  bossParams: {
    interval1: number
    interval2: number
    interval3: number
    bulletSpeed1: number
    bulletSpeed2: number
    bulletSpeed3: number
    aimedShots: number
    fanWays: number
    spiralArms: number
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.min(t, 1)
}

export type DifficultyMode = 'EASY' | 'NORMAL' | 'EXTRA'

export const NORMAL_STAGE_COUNT = 8
export const EXTRA_STAGE_COUNT = 3

export function getStageCount(mode: DifficultyMode): number {
  return mode === 'EXTRA' ? EXTRA_STAGE_COUNT : NORMAL_STAGE_COUNT
}

export function getStageClearBonus(stage: number, mode: DifficultyMode): number {
  return mode === 'EXTRA' ? (stage + NORMAL_STAGE_COUNT) * 100 : stage * 100
}

export function getDifficulty(stage: number, mode: DifficultyMode = 'NORMAL'): DifficultyParams {
  if (mode === 'EXTRA') return getExtraDifficulty(stage)

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
    attackEnemyHp: 30,
    attackEnemyBulletSpeed: lerp(200, 500, t),
    attackEnemyFireInterval: lerp(2000, 400, t),
    attackEnemySpawnRatio: attackRatio,
    attackEnemyShots: { straight: 1, zigzag: 3 },
    bossScoreThreshold: bossThreshold,
    bossHp: 150 + (effectiveStage - 1) * 150,
    bossSpeed: Math.min(40 + (effectiveStage - 1) * 15, 150),
    bossVariant: 'normal',
    bossParams: {
      interval1: lerp(800, 300, t),
      interval2: lerp(1200, 500, t),
      interval3: lerp(500, 150, t),
      bulletSpeed1: lerp(250, 450, t),
      bulletSpeed2: lerp(300, 500, t),
      bulletSpeed3: lerp(320, 550, t),
      aimedShots: 1,
      fanWays: 5,
      spiralArms: 3,
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

function getExtraDifficulty(stage: number): DifficultyParams {
  const i = Math.max(0, Math.min(stage, EXTRA_STAGE_COUNT) - 1)
  const pick = (values: [number, number, number]) => values[i]
  const isFinal = stage >= EXTRA_STAGE_COUNT

  return {
    normalEnemySpeed: pick([310, 330, 350]),
    normalEnemyInterval: pick([170, 155, 140]),
    attackEnemySpeed: pick([200, 210, 220]),
    attackEnemyHp: 50,
    attackEnemyBulletSpeed: pick([480, 510, 540]),
    attackEnemyFireInterval: pick([600, 550, 500]),
    attackEnemySpawnRatio: 1,
    attackEnemyShots: { straight: 3, zigzag: 5 },
    bossScoreThreshold: pick([2000, 2500, 3000]),
    bossHp: pick([2400, 3000, 4500]),
    bossSpeed: pick([150, 150, 160]),
    bossVariant: isFinal ? 'final' : 'normal',
    bossParams: {
      interval1: pick([400, 360, 320]),
      interval2: pick([650, 600, 550]),
      interval3: pick([180, 160, 140]),
      bulletSpeed1: pick([420, 440, 460]),
      bulletSpeed2: pick([440, 460, 480]),
      bulletSpeed3: pick([460, 480, 500]),
      aimedShots: 3,
      fanWays: isFinal ? 9 : 7,
      spiralArms: isFinal ? 6 : 4,
    },
  }
}
