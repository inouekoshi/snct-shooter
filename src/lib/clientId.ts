const CLIENT_ID_KEY = 'snct-shooter-client-id'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isValidClientId(id: unknown): id is string {
  return typeof id === 'string' && UUID_PATTERN.test(id.trim())
}

function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // フォールバック（UUID v4 形式）
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function loadClientId(): string {
  try {
    const existing = localStorage.getItem(CLIENT_ID_KEY)
    if (existing && isValidClientId(existing)) {
      return existing
    }
    const newId = generateUuid()
    localStorage.setItem(CLIENT_ID_KEY, newId)
    return newId
  } catch {
    return generateUuid()
  }
}
