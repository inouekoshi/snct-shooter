const NAME_KEY = 'shooter-player-name'
const DEFAULT_NAME = 'PLAYER'

export function loadPlayerName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? DEFAULT_NAME
  } catch {
    return DEFAULT_NAME
  }
}

export function savePlayerName(name: string): void {
  try {
    localStorage.setItem(NAME_KEY, name)
  } catch {
    // localStorage unavailable — name is not remembered
  }
}
