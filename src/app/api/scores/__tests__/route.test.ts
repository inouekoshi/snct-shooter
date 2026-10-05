import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/firestore', () => ({
  getTopScores: vi.fn(),
  addScore: vi.fn(),
}))

import { GET, POST } from '../route'
import { getTopScores, addScore } from '@/lib/firestore'

const post = (body: unknown) =>
  POST(new NextRequest('http://localhost/api/scores', { method: 'POST', body: JSON.stringify(body) }))

beforeEach(() => {
  vi.mocked(getTopScores).mockReset()
  vi.mocked(addScore).mockReset().mockResolvedValue({ rank: 3 })
})

describe('GET /api/scores', () => {
  it('トップ20を返す', async () => {
    vi.mocked(getTopScores).mockResolvedValue([{ name: 'a', score: 100, stage: 1 }])
    const res = await GET()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ entries: [{ name: 'a', score: 100, stage: 1 }] })
    expect(getTopScores).toHaveBeenCalledWith(20)
  })

  it('Firestoreエラー時は500を返す', async () => {
    vi.mocked(getTopScores).mockRejectedValue(new Error('down'))
    expect((await GET()).status).toBe(500)
  })
})

describe('POST /api/scores', () => {
  it('正しい入力なら名前をtrimして保存し順位を返す', async () => {
    const res = await post({ name: '  たろう ', score: 1500, stage: 1 })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, rank: 3 })
    expect(addScore).toHaveBeenCalledWith({ name: 'たろう', score: 1500, stage: 1 })
  })

  it.each([
    ['空文字', ''],
    ['11文字', 'abcdefghijk'],
    ['記号', '<script>'],
    ['文字列以外', 123],
  ])('不正な名前（%s）は400', async (_, name) => {
    const res = await post({ name, score: 100, stage: 1 })
    expect(res.status).toBe(400)
    expect(addScore).not.toHaveBeenCalled()
  })

  it.each([
    ['負数', -1],
    ['小数', 10.5],
    ['文字列', '100'],
  ])('不正なスコア（%s）は400', async (_, score) => {
    expect((await post({ name: 'a', score, stage: 1 })).status).toBe(400)
  })

  it.each([0, 9, 1.5])('範囲外のステージ（%s）は400', async (stage) => {
    expect((await post({ name: 'a', score: 100, stage })).status).toBe(400)
  })

  it('ステージ別のスコア上限ちょうどは受け付け、超えたら400', async () => {
    expect((await post({ name: 'a', score: 2000, stage: 1 })).status).toBe(200)
    expect((await post({ name: 'a', score: 2001, stage: 1 })).status).toBe(400)
    expect((await post({ name: 'a', score: 28600, stage: 8 })).status).toBe(200)
    expect((await post({ name: 'a', score: 28601, stage: 8 })).status).toBe(400)
  })

  it('保存に失敗したら500を返す', async () => {
    vi.mocked(addScore).mockRejectedValue(new Error('down'))
    expect((await post({ name: 'a', score: 100, stage: 1 })).status).toBe(500)
  })
})
