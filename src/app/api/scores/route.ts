import { NextRequest, NextResponse } from 'next/server'
import { getTopScores, addScore } from '@/lib/firestore'

export const revalidate = 10

const SCORE_LIMIT_BY_STAGE: Record<number, number> = {
  1: 2000, 2: 4500, 3: 7400, 4: 10700,
  5: 14500, 6: 18800, 7: 23500, 8: 28600,
}

const NAME_PATTERN = /^[\p{L}\p{N}\s\-_.]{1,10}$/u

export async function GET() {
  try {
    const entries = await getTopScores(20)
    return NextResponse.json({ entries })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch scores' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, score, stage } = body

    if (typeof name !== 'string' || !NAME_PATTERN.test(name.trim())) {
      return NextResponse.json({ error: 'invalid name' }, { status: 400 })
    }
    if (!Number.isInteger(score) || score < 0 || score > 9_999_999) {
      return NextResponse.json({ error: 'invalid score' }, { status: 400 })
    }
    if (!Number.isInteger(stage) || stage < 1 || stage > 8) {
      return NextResponse.json({ error: 'invalid stage' }, { status: 400 })
    }
    const limit = SCORE_LIMIT_BY_STAGE[stage] ?? 2000
    if (score > limit) {
      return NextResponse.json({ error: 'invalid score' }, { status: 400 })
    }

    const { rank } = await addScore({ name: name.trim(), score, stage })
    return NextResponse.json({ ok: true, rank })
  } catch {
    return NextResponse.json({ error: 'Failed to submit score' }, { status: 500 })
  }
}
