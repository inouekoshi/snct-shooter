import { NextResponse } from 'next/server'
import { countScores, getTopScores } from '@/lib/firestore'
import type { BoardSummary, ClosingSummary, LeaderboardBoard } from '@/lib/leaderboard'

export const dynamic = 'force-dynamic'

const SUMMARY_TOP_COUNT = 10
const SUMMARY_CACHE_CONTROL = 'public, s-maxage=300, stale-while-revalidate=3600'

async function summarize(board: LeaderboardBoard): Promise<BoardSummary> {
  const [total, top] = await Promise.all([countScores(board), getTopScores(SUMMARY_TOP_COUNT, board)])
  return { total, top }
}

export async function GET() {
  try {
    const [normal, extra] = await Promise.all([summarize('normal'), summarize('extra')])
    const summary: ClosingSummary = { normal, extra }
    return NextResponse.json(summary, { headers: { 'Cache-Control': SUMMARY_CACHE_CONTROL } })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch summary' }, { status: 500 })
  }
}
