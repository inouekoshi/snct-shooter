export type PowerUpKind = 'HP' | 'HP_2' | 'FIRE_RATE' | 'BULLET_SPEED' | 'WEAPON_UPGRADE'

export interface PowerUpOption {
  kind: PowerUpKind
  label: string
  sub: string
}

export type GameState =
  | { type: 'IDLE' }
  | { type: 'PLAYING'; stage: number }
  | { type: 'BOSS_APPEARING'; stage: number; elapsed: number }
  | { type: 'BOSS_FIGHT'; stage: number }
  | { type: 'STAGE_CLEAR'; stage: number; elapsed: number }
  | { type: 'POWER_UP_SELECT'; stage: number; options: [PowerUpOption, PowerUpOption] }
  | { type: 'PAUSED'; resumeTo: GameState }
  | { type: 'COUNTDOWN'; resumeTo: GameState; remaining: number }
  | { type: 'GAME_OVER'; score: number; stage: number }
  | { type: 'GAME_CLEAR'; score: number; stage: number }

const PAUSABLE_STATE_TYPES: ReadonlyArray<GameState['type']> = [
  'PLAYING', 'BOSS_APPEARING', 'BOSS_FIGHT', 'STAGE_CLEAR', 'POWER_UP_SELECT',
]

export function isPausable(type: GameState['type']): boolean {
  return PAUSABLE_STATE_TYPES.includes(type)
}

export function stageOf(state: GameState): number | null {
  if (state.type === 'PAUSED' || state.type === 'COUNTDOWN') return stageOf(state.resumeTo)
  return 'stage' in state ? state.stage : null
}
