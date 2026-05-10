export type PowerUpKind = 'HP' | 'FIRE_RATE' | 'BULLET_SPEED'

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
