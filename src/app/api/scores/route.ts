import { NextRequest, NextResponse } from 'next/server'
import { getTopScores, addScore, consumeSubmissionQuota } from '@/lib/firestore'
import { SCORE_LIMITS, parseBoard, maxStageOf, isValidPlayerName } from '@/lib/leaderboard'
import { containsNgWord, parseNgWords } from '@/lib/ngWords'
import { clientIpOf, hashClientIp, parseRateLimit } from '@/lib/rateLimit'

const LEADERBOARD_CACHE_CONTROL = 'public, s-maxage=10, stale-while-revalidate=50'

export async function GET(req: NextRequest) {
  const board = parseBoard(req.nextUrl.searchParams.get('mode') ?? undefined)
  if (!board) {
    return NextResponse.json({ error: 'invalid mode' }, { status: 400 })
  }
  try {
    const entries = await getTopScores(20, board)
    return NextResponse.json({ entries }, { headers: { 'Cache-Control': LEADERBOARD_CACHE_CONTROL } })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch scores' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (process.env.SCORES_SUBMISSION_DISABLED === '1') {
    return NextResponse.json({ error: 'submission disabled' }, { status: 503 })
  }
  try {
    const body = await req.json()
    const { name, score, stage, mode } = body

    const board = parseBoard(mode)
    if (!board) {
      return NextResponse.json({ error: 'invalid mode' }, { status: 400 })
    }
    if (typeof name !== 'string' || !isValidPlayerName(name)) {
      return NextResponse.json({ error: 'invalid name' }, { status: 400 })
    }
    if (containsNgWord(name, parseNgWords(process.env.NG_WORDS))) {
      return NextResponse.json({ error: 'inappropriate name' }, { status: 400 })
    }
    if (!Number.isInteger(score) || score < 0 || score > 9_999_999) {
      return NextResponse.json({ error: 'invalid score' }, { status: 400 })
    }
    if (!Number.isInteger(stage) || stage < 1 || stage > maxStageOf(board)) {
      return NextResponse.json({ error: 'invalid stage' }, { status: 400 })
    }
    if (score > SCORE_LIMITS[board][stage]) {
      return NextResponse.json({ error: 'invalid score' }, { status: 400 })
    }

    const limit = parseRateLimit(process.env.SCORES_RATE_LIMIT_PER_MINUTE)
    const clientIp = clientIpOf(req.headers, req.ip)
    if (limit > 0 && clientIp && !(await consumeSubmissionQuota(hashClientIp(clientIp), limit))) {
      return NextResponse.json({ error: 'too many requests' }, { status: 429 })
    }

    const { rank, id } = await addScore({ name: name.trim(), score, stage }, board)
    return NextResponse.json({ ok: true, rank, id })
  } catch {
    return NextResponse.json({ error: 'Failed to submit score' }, { status: 500 })
  }
}
