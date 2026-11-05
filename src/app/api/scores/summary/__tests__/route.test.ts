import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/firestore', () => ({
  getTopScores: vi.fn(),
  countScores: vi.fn(),
}))

import { GET } from '../route'
import { getTopScores, countScores } from '@/lib/firestore'

beforeEach(() => {
  vi.mocked(getTopScores).mockReset()
  vi.mocked(countScores).mockReset()
})

describe('GET /api/scores/summary', () => {
  it('NORMAL と EXTRA の登録数と上位スコアを返す', async () => {
    vi.mocked(countScores).mockImplementation(async (board) => (board === 'extra' ? 4 : 120))
    vi.mocked(getTopScores).mockImplementation(async (_n, board) => [
      { name: board === 'extra' ? 'ex' : 'nm', score: 100, stage: 1 },
    ])
    const res = await GET()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      normal: { total: 120, top: [{ name: 'nm', score: 100, stage: 1 }] },
      extra: { total: 4, top: [{ name: 'ex', score: 100, stage: 1 }] },
    })
    expect(getTopScores).toHaveBeenCalledWith(10, 'normal')
    expect(getTopScores).toHaveBeenCalledWith(10, 'extra')
  })

  it('成功時はCDNで5分キャッシュする', async () => {
    vi.mocked(countScores).mockResolvedValue(0)
    vi.mocked(getTopScores).mockResolvedValue([])
    const res = await GET()
    expect(res.headers.get('Cache-Control')).toBe('public, s-maxage=300, stale-while-revalidate=3600')
  })

  it('Firestoreエラー時は500を返し、キャッシュさせない', async () => {
    vi.mocked(countScores).mockRejectedValue(new Error('down'))
    vi.mocked(getTopScores).mockResolvedValue([])
    const res = await GET()
    expect(res.status).toBe(500)
    expect(res.headers.get('Cache-Control')).toBeNull()
  })
})
