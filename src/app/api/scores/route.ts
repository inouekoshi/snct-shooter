import { NextRequest, NextResponse } from 'next/server'
import { getTopScores, addScore } from '@/lib/firestore'
import { SCORE_LIMITS, parseBoard, maxStageOf } from '@/lib/leaderboard'

export const revalidate = 10

const NAME_PATTERN = /^[\p{L}\p{N}\s\-_.]{1,10}$/u

export async function GET(req: NextRequest) {
  const board = parseBoard(req.nextUrl.searchParams.get('mode') ?? undefined)
  if (!board) {
    return NextResponse.json({ error: 'invalid mode' }, { status: 400 })
  }
  try {
    const entries = await getTopScores(20, board)
    return NextResponse.json({ entries })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch scores' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, score, stage, mode } = body

    const board = parseBoard(mode)
    if (!board) {
      return NextResponse.json({ error: 'invalid mode' }, { status: 400 })
    }
    if (typeof name !== 'string' || !NAME_PATTERN.test(name.trim())) {
      return NextResponse.json({ error: 'invalid name' }, { status: 400 })
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

    const { rank } = await addScore({ name: name.trim(), score, stage }, board)
    return NextResponse.json({ ok: true, rank })
  } catch {
    return NextResponse.json({ error: 'Failed to submit score' }, { status: 500 })
  }
}
