import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import type { LeaderboardBoard } from './leaderboard'

function initFirebase() {
  if (getApps().length === 0) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is not set')
    let parsed = JSON.parse(raw)
    if (typeof parsed === 'string') parsed = JSON.parse(parsed)
    initializeApp({ credential: cert(parsed) })
  }
  return getFirestore()
}

export interface LeaderboardEntry {
  name: string
  score: number
  stage: number
  createdAt?: number
}

// 環境に応じてコレクションを切り替える (本番は 'scores', 開発・プレビューは 'scores_dev')
const ENV_SUFFIX = process.env.VERCEL_ENV === 'production' ? '' : '_dev'

function collectionName(board: LeaderboardBoard): string {
  const base = board === 'extra' ? 'scores_extra' : 'scores'
  return base + ENV_SUFFIX
}

export async function getTopScores(n = 20, board: LeaderboardBoard = 'normal'): Promise<LeaderboardEntry[]> {
  const db = initFirebase()
  const snap = await db.collection(collectionName(board)).orderBy('score', 'desc').limit(n).get()
  return snap.docs.map(doc => {
    const d = doc.data()
    const ts = d.createdAt instanceof Timestamp ? d.createdAt.toMillis() : undefined
    return { name: d.name, score: d.score, stage: d.stage, createdAt: ts }
  })
}

export async function addScore(entry: LeaderboardEntry, board: LeaderboardBoard = 'normal'): Promise<{ rank: number }> {
  const db = initFirebase()
  await db.collection(collectionName(board)).add({
    name: entry.name,
    score: entry.score,
    stage: entry.stage,
    createdAt: Timestamp.now(),
  })
  const top100 = await getTopScores(100, board)
  const rank = top100.filter(e => e.score > entry.score).length + 1
  return { rank }
}
