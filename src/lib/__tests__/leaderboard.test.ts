import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  isValidPlayerName, rankEntries, fetchLeaderboard, submitLeaderboardScore, parseLeaderboardEntries,
  LEADERBOARD_REQUEST_TIMEOUT_MS, type LeaderboardEntry,
} from '../leaderboard'

const entry = (score: number): LeaderboardEntry => ({ name: 'a', score, stage: 1 })

const mockFetch = (status: number, body: unknown) => {
  const fn = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }))
  vi.stubGlobal('fetch', fn)
  return fn
}

const mockHangingFetch = () => {
  vi.stubGlobal('fetch', vi.fn((_input: string, init?: RequestInit) => new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
  })))
}

const withSignal = expect.objectContaining({ signal: expect.any(AbortSignal) })

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('parseLeaderboardEntries', () => {
  it('形のおかしいエントリは捨てる', () => {
    const data = {
      entries: [entry(100), { name: 'b', score: 'x', stage: 1 }, { score: 50, stage: 1 }, null, entry(10)],
    }
    expect(parseLeaderboardEntries(data)).toEqual([entry(100), entry(10)])
  })

  it('entries が配列でなければ空にする', () => {
    expect(parseLeaderboardEntries({ entries: 'oops' })).toEqual([])
    expect(parseLeaderboardEntries(null)).toEqual([])
  })
})

describe('isValidPlayerName', () => {
  it.each(['PLAYER', 'たろう', 'カタカナ漢字abc', 'a-b_c.d', '  前後空白  ', '１２３'])('%s は使える', (name) => {
    expect(isValidPlayerName(name)).toBe(true)
  })

  it.each(['', '   ', 'abcdefghijk', '<script>', 'たろう😀', 'あ!', '☆スター'])('%s は使えない', (name) => {
    expect(isValidPlayerName(name)).toBe(false)
  })
})

describe('rankEntries', () => {
  it('同点は同じ順位にし、次の順位は人数分飛ばす', () => {
    expect(rankEntries([entry(500), entry(400), entry(400), entry(300)])).toEqual([1, 2, 2, 4])
  })

  it('全員同点なら全員1位', () => {
    expect(rankEntries([entry(100), entry(100), entry(100)])).toEqual([1, 1, 1])
  })

  it('空配列なら空配列', () => {
    expect(rankEntries([])).toEqual([])
  })
})

describe('fetchLeaderboard', () => {
  it('成功時はエントリを返す', async () => {
    const fn = mockFetch(200, { entries: [entry(100)] })
    await expect(fetchLeaderboard('extra')).resolves.toEqual([entry(100)])
    expect(fn).toHaveBeenCalledWith('/api/scores?mode=extra', withSignal)
  })

  it('投稿直後はドキュメントIDをクエリに付けてCDNキャッシュを外す', async () => {
    const fn = mockFetch(200, { entries: [] })
    await fetchLeaderboard('normal', 'doc/1')
    expect(fn).toHaveBeenCalledWith('/api/scores?mode=normal&after=doc%2F1', withSignal)
  })

  it('APIがエラーを返したら例外にする', async () => {
    mockFetch(500, { error: 'Failed to fetch scores' })
    await expect(fetchLeaderboard('normal')).rejects.toThrow()
  })

  it('JSON以外が返ってきたら例外にする', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>login</html>', { status: 200 })))
    await expect(fetchLeaderboard('normal')).rejects.toThrow()
  })

  it('応答がなければ一定時間で打ち切って例外にする', async () => {
    vi.useFakeTimers()
    mockHangingFetch()
    const result = expect(fetchLeaderboard('normal')).rejects.toThrow()
    await vi.advanceTimersByTimeAsync(LEADERBOARD_REQUEST_TIMEOUT_MS)
    await result
  })
})

describe('submitLeaderboardScore', () => {
  const submit = () => submitLeaderboardScore({ name: 'a', score: 100, stage: 1 }, 'normal')

  it('成功時は順位とIDを返す', async () => {
    const fn = mockFetch(200, { ok: true, rank: 4, id: 'doc1' })
    await expect(submit()).resolves.toEqual({ ok: true, rank: 4, id: 'doc1' })
    expect(JSON.parse(fn.mock.calls[0][1].body)).toEqual({
      name: 'a',
      score: 100,
      stage: 1,
      mode: 'normal',
      clientId: expect.any(String),
    })
  })

  it('名前が不正なら invalid_name', async () => {
    mockFetch(400, { error: 'invalid name' })
    await expect(submit()).resolves.toEqual({ ok: false, reason: 'invalid_name' })
  })

  it('不適切な名前なら inappropriate_name', async () => {
    mockFetch(400, { error: 'inappropriate name' })
    await expect(submit()).resolves.toEqual({ ok: false, reason: 'inappropriate_name' })
  })

  it('投稿停止中なら disabled', async () => {
    mockFetch(503, { error: 'submission disabled' })
    await expect(submit()).resolves.toEqual({ ok: false, reason: 'disabled' })
  })

  it('投稿回数の上限に達していたら rate_limited', async () => {
    mockFetch(429, { error: 'too many requests' })
    await expect(submit()).resolves.toEqual({ ok: false, reason: 'rate_limited' })
  })

  it('サーバーエラーなら failed', async () => {
    mockFetch(500, { error: 'Failed to submit score' })
    await expect(submit()).resolves.toEqual({ ok: false, reason: 'failed' })
  })

  it('通信できなければ failed', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')))
    await expect(submit()).resolves.toEqual({ ok: false, reason: 'failed' })
  })

  it('応答がなければ一定時間で打ち切って failed', async () => {
    vi.useFakeTimers()
    mockHangingFetch()
    const result = submit()
    await vi.advanceTimersByTimeAsync(LEADERBOARD_REQUEST_TIMEOUT_MS)
    await expect(result).resolves.toEqual({ ok: false, reason: 'failed' })
  })

  it('成功応答に順位やIDが欠けていたら failed', async () => {
    mockFetch(200, { ok: true })
    await expect(submit()).resolves.toEqual({ ok: false, reason: 'failed' })
  })
})
