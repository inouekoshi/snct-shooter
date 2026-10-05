import type { PowerUpOption } from './state'
import type { DifficultyMode } from './difficulty'
import { weaponName, MAX_WEAPON_LEVEL } from './player'

const NORMAL_MAX_WEAPON_LEVEL = 3
const NORMAL_WEAPON_STAGES = [3, 5]
const HP_2_FROM_STAGE = 5

const STAT_UPGRADES: PowerUpOption[] = [
  { kind: 'FIRE_RATE', label: '連射強化', sub: '発射間隔 -30ms' },
  { kind: 'BULLET_SPEED', label: '弾速強化', sub: '弾速 +120px/秒' },
]

function offersWeaponUpgrade(stage: number, weaponLevel: number, mode: DifficultyMode): boolean {
  if (mode === 'EXTRA') return weaponLevel < MAX_WEAPON_LEVEL
  return NORMAL_WEAPON_STAGES.includes(stage) && weaponLevel < NORMAL_MAX_WEAPON_LEVEL
}

export function generatePowerUpOptions(
  stage: number,
  weaponLevel: number,
  mode: DifficultyMode
): [PowerUpOption, PowerUpOption] {
  const left: PowerUpOption = stage >= HP_2_FROM_STAGE || mode === 'EXTRA'
    ? { kind: 'HP_2', label: 'HP +2', sub: '残機を2回復' }
    : { kind: 'HP', label: 'HP +1', sub: '残機を1回復' }

  const right: PowerUpOption = offersWeaponUpgrade(stage, weaponLevel, mode)
    ? { kind: 'WEAPON_UPGRADE', label: '武器強化', sub: `${weaponName(weaponLevel + 1)}に進化` }
    : STAT_UPGRADES[Math.floor(Math.random() * STAT_UPGRADES.length)]

  return [left, right]
}
