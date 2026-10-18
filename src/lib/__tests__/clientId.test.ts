import { describe, it, expect, beforeEach } from 'vitest'
import { loadClientId, isValidClientId } from '../clientId'

const store: Record<string, string> = {}
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value },
  removeItem: (key: string) => { delete store[key] },
  clear: () => { for (const k of Object.keys(store)) delete store[k] },
}

describe('isValidClientId', () => {
  it('正しいUUID形式（v4など）ならtrue', () => {
    expect(isValidClientId('a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d')).toBe(true)
    expect(isValidClientId('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
  })

  it('不正な形式ならfalse', () => {
    expect(isValidClientId('')).toBe(false)
    expect(isValidClientId('not-a-uuid')).toBe(false)
    expect(isValidClientId(123)).toBe(false)
    expect(isValidClientId(null)).toBe(false)
    expect(isValidClientId(undefined)).toBe(false)
    expect(isValidClientId('550e8400-e29b-61d4-a716-446655440000')).toBe(false) // バージョン6は対象外
  })
})

describe('loadClientId', () => {
  beforeEach(() => {
    localStorageMock.clear()
    Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true, configurable: true })
  })

  it('初回はUUIDを新しく生成して保存する', () => {
    const id = loadClientId()
    expect(isValidClientId(id)).toBe(true)
    expect(localStorage.getItem('snct-shooter-client-id')).toBe(id)
  })

  it('2回目以降は同じUUIDを返す', () => {
    const id1 = loadClientId()
    const id2 = loadClientId()
    expect(id1).toBe(id2)
  })

  it('不正な値が保存されていたら再生成する', () => {
    localStorage.setItem('snct-shooter-client-id', 'invalid')
    const id = loadClientId()
    expect(isValidClientId(id)).toBe(true)
    expect(id).not.toBe('invalid')
  })
})
