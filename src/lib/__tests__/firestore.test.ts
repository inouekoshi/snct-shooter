import { describe, it, expect, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => {
  const add = vi.fn()
  const countGet = vi.fn()
  const where = vi.fn(() => ({ count: () => ({ get: countGet }) }))
  const topGet = vi.fn()
  const limit = vi.fn(() => ({ get: topGet }))
  const orderBy = vi.fn(() => ({ limit }))
  const doc = vi.fn((id: string) => ({ id }))
  const collection = vi.fn(() => ({ add, where, orderBy, doc }))
  const txGet = vi.fn()
  const txSet = vi.fn()
  const runTransaction = vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({ get: txGet, set: txSet }))
  class Timestamp {
    constructor(private ms: number) {}
    static now() { return new Timestamp(1234) }
    static fromMillis(ms: number) { return new Timestamp(ms) }
    toMillis() { return this.ms }
  }
  return { add, countGet, where, topGet, limit, orderBy, doc, collection, txGet, txSet, runTransaction, Timestamp }
})

vi.mock('firebase-admin/app', () => ({
  initializeApp: vi.fn(),
  getApps: () => [{}],
  cert: vi.fn(),
}))

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({ collection: mocks.collection, runTransaction: mocks.runTransaction }),
  Timestamp: mocks.Timestamp,
}))

import { addScore, getTopScores, consumeSubmissionQuota } from '../firestore'

beforeEach(() => {
  vi.clearAllMocks()
  vi.useRealTimers()
})

describe('addScore', () => {
  it('保存したドキュメントIDと、自分より高いスコアの件数+1を順位として返す', async () => {
    mocks.add.mockResolvedValue({ id: 'new-doc' })
    mocks.countGet.mockResolvedValue({ data: () => ({ count: 150 }) })

    const result = await addScore({ name: 'たろう', score: 1200, stage: 3 }, 'normal')

    expect(result).toEqual({ rank: 151, id: 'new-doc' })
    expect(mocks.collection).toHaveBeenCalledWith('scores_dev')
    expect(mocks.where).toHaveBeenCalledWith('score', '>', 1200)
    expect(mocks.add).toHaveBeenCalledWith(expect.objectContaining({ name: 'たろう', score: 1200, stage: 3 }))
  })

  it('EXTRAは別コレクションに保存する', async () => {
    mocks.add.mockResolvedValue({ id: 'x' })
    mocks.countGet.mockResolvedValue({ data: () => ({ count: 0 }) })
    await expect(addScore({ name: 'a', score: 100, stage: 1 }, 'extra')).resolves.toEqual({ rank: 1, id: 'x' })
    expect(mocks.collection).toHaveBeenCalledWith('scores_extra_dev')
  })
})

describe('getTopScores', () => {
  it('スコアの高い順に取得し、ドキュメントIDを含めて返す', async () => {
    mocks.topGet.mockResolvedValue({
      docs: [{ id: 'd1', data: () => ({ name: 'a', score: 500, stage: 2, createdAt: new mocks.Timestamp(99) }) }],
    })
    await expect(getTopScores(20, 'normal')).resolves.toEqual([
      { id: 'd1', name: 'a', score: 500, stage: 2, createdAt: 99 },
    ])
    expect(mocks.orderBy).toHaveBeenCalledWith('score', 'desc')
    expect(mocks.limit).toHaveBeenCalledWith(20)
  })
})

describe('consumeSubmissionQuota', () => {
  it('記録がなければ1件目として保存して許可する', async () => {
    vi.useFakeTimers({ now: 100_000 })
    mocks.txGet.mockResolvedValue({ exists: false })
    await expect(consumeSubmissionQuota('hash1', 20)).resolves.toBe(true)
    expect(mocks.collection).toHaveBeenCalledWith('rate_limits_dev')
    expect(mocks.doc).toHaveBeenCalledWith('hash1')
    expect(mocks.txSet).toHaveBeenCalledWith({ id: 'hash1' }, expect.objectContaining({ windowStart: 100_000, count: 1 }))
  })

  it('同じ1分の中で上限に達していたら保存せず拒否する', async () => {
    vi.useFakeTimers({ now: 130_000 })
    mocks.txGet.mockResolvedValue({ exists: true, data: () => ({ windowStart: 100_000, count: 20 }) })
    await expect(consumeSubmissionQuota('hash1', 20)).resolves.toBe(false)
    expect(mocks.txSet).not.toHaveBeenCalled()
  })
})
