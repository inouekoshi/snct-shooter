import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

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
const COLLECTION_NAME = process.env.VERCEL_ENV === 'production' ? 'scores' : 'scores_dev'

export async function getTopScores(n = 20): Promise<LeaderboardEntry[]> {
  const db = initFirebase()
  const snap = await db.collection(COLLECTION_NAME).orderBy('score', 'desc').limit(n).get()
  return snap.docs.map(doc => {
    const d = doc.data()
    const ts = d.createdAt instanceof Timestamp ? d.createdAt.toMillis() : undefined
    return { name: d.name, score: d.score, stage: d.stage, createdAt: ts }
  })
}

export async function addScore(entry: LeaderboardEntry): Promise<{ rank: number }> {
  const db = initFirebase()
  await db.collection(COLLECTION_NAME).add({
    name: entry.name,
    score: entry.score,
    stage: entry.stage,
    createdAt: Timestamp.now(),
  })
  const top100 = await getTopScores(100)
  const rank = top100.filter(e => e.score > entry.score).length + 1
  return { rank }
}
