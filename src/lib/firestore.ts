import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import type { LeaderboardBoard, LeaderboardEntry } from './leaderboard'
import { consumeRateLimit, RATE_LIMIT_WINDOW_MS, type RateLimitWindow } from './rateLimit'

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
    return { id: doc.id, name: d.name, score: d.score, stage: d.stage, createdAt: ts }
  })
}

export async function addScore(
  entry: LeaderboardEntry,
  board: LeaderboardBoard = 'normal'
): Promise<{ rank: number; id: string }> {
  const db = initFirebase()
  const collection = db.collection(collectionName(board))
  const ref = await collection.add({
    name: entry.name,
    score: entry.score,
    stage: entry.stage,
    createdAt: Timestamp.now(),
  })
  const higher = await collection.where('score', '>', entry.score).count().get()
  return { rank: higher.data().count + 1, id: ref.id }
}

const RATE_LIMIT_DOC_TTL_MS = RATE_LIMIT_WINDOW_MS * 60

export async function consumeSubmissionQuota(clientKey: string, limit: number): Promise<boolean> {
  const db = initFirebase()
  const ref = db.collection(`rate_limits${ENV_SUFFIX}`).doc(clientKey)
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const current = snap.exists ? (snap.data() as RateLimitWindow) : undefined
    const { allowed, next } = consumeRateLimit(current, Date.now(), limit)
    if (allowed) {
      tx.set(ref, {
        windowStart: next.windowStart,
        count: next.count,
        expiresAt: Timestamp.fromMillis(next.windowStart + RATE_LIMIT_DOC_TTL_MS),
      })
    }
    return allowed
  })
}
