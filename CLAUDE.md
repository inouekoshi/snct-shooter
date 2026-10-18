# SNCT Shooter - Claude Code ガイド

## プロジェクト概要

スマートフォンブラウザで動作する縦スクロールシューティングゲーム。高専祭などで多人数が遊ぶ想定で、オンラインランキングを備える。

- 全8ステージ（ステージ8のボス撃破で `GAME_CLEAR`）
- 難易度選択: EASY / NORMAL / EXTRA（`/game?mode=easy|normal|extra`）。EASY はランキング登録対象外
- EXTRA: NORMAL クリアで解禁される全3ステージの高難度モード。ランキングは NORMAL と別
- オンラインランキング（Firestore）、ローカルのハイスコア・プレイ履歴・統計

ドキュメント:
- 仕様書: `docs/spec.md`
- 設計: `docs/architecture.md`
- タスク・ロードマップ: `docs/tasks.md`

## 技術スタック

- **フレームワーク**: Next.js 15 (App Router) + React 19（Node.js 22）
- **言語**: TypeScript
- **ゲーム描画**: Canvas API + requestAnimationFrame（delta-time ベース）
- **操作**: Touch Events API（`passive: false` で `addEventListener` 直接登録）
- **ローカル保存**: localStorage（ハイスコア・プレイヤー名・プレイ履歴。使用不可時はフォールバック）
- **オンラインランキング**: Firebase Firestore + Firebase Admin SDK（`/api/scores` 経由のみ。クライアントから直接触らない）
- **PWA**: Serwist（next-pwa は App Router 非互換のため不採用）。`/api/*` はキャッシュしない
- **テスト**: Vitest（`npm test`）
- **Lint**: ESLint（`next/core-web-vitals`、`npm run lint` は ESLint CLI。`next lint` は Next 16 で廃止のため使わない）
- **デプロイ**: Vercel

## 開発ワークフロー

詳細は `GEMINI.md` を参照。

- `main`: 本番。直接コミットせず、`dev` からマージする
- タスクは GitHub Issues で管理（一覧と全体像は `docs/tasks.md`）
- `dev`: 開発用。push すると Vercel のプレビュー環境（固定URL、README 参照）に自動デプロイされる
- Firestore のコレクションは `VERCEL_ENV` で自動切替（本番 `scores`・`scores_extra`・`rate_limits` / それ以外は末尾に `_dev`）
- 環境変数 `FIREBASE_SERVICE_ACCOUNT_KEY` が必要（ローカルは `.env.local`）。任意で `NG_WORDS`（NG ワード追加）・`SCORES_RATE_LIMIT_PER_MINUTE`（IP ごとの投稿上限、既定20）・`SCORES_SUBMISSION_DISABLED=1`（投稿の緊急停止）。一覧は `docs/architecture.md` §4.6
- コミット前に `npm test`・`npm run lint`・`npm run build` が通ることを確認する
- `dev` / `main` への push と PR では GitHub Actions（`.github/workflows/ci.yml`）が同じ3つと `npm audit --omit=dev --audit-level=high`（本番の依存の脆弱性チェック）を自動実行する
- Dependabot（`.github/dependabot.yml`）が `dev` 宛てに依存の更新 PR を作る（npm は毎週、GitHub Actions は毎月）

## ディレクトリ構成

詳細は `docs/architecture.md` §1。要点:

- `src/app/`: 画面（`page.tsx` スタート、`game/page.tsx` ゲーム）と API（`api/scores/route.ts`）
- `src/components/`: `GameCanvas`・`HUD`・`ResultScreen`・`ScoreSubmit`・`Leaderboard`・`StatsModal` など
- `src/lib/game/`: ゲームロジック。`engine.ts` が統括し、難易度（`difficulty.ts`）・パワーアップ（`powerup.ts`）・命中処理（`collision.ts`）・演出（`effects.ts`・`overlays.ts`）などに分割。共通定数は `constants.ts`
- `src/lib/`: `firestore.ts`（サーバー専用）、`leaderboard.ts`（ランキング種別・スコア上限・名前チェック・順位表示・API 呼び出し）、`ngWords.ts`（NG ワード判定、サーバー専用）、`rateLimit.ts`（投稿回数の制限、サーバー専用）、`playerName.ts`
- 展開に影響する乱数は `src/lib/game/random.ts` のシード付き乱数から取る（`Math.random` を直接使わない。見た目だけの乱数は除く）
- テスト: `src/**/__tests__/*.test.ts`

## 重要な実装メモ

### Canvas 解像度
```typescript
// 論理解像度 390×844 固定
canvas.width = 390 * devicePixelRatio
canvas.height = 844 * devicePixelRatio
canvas.style.width = '390px'
canvas.style.height = '844px'
ctx.scale(devicePixelRatio, devicePixelRatio)
// 座標計算はすべて 390×844 基準
```
コードでは `src/lib/game/constants.ts` の `CANVAS_WIDTH` / `CANVAS_HEIGHT` を使い、390・844 を直接書かない。

### ゲームループ（delta-time + クランプ）
```typescript
const delta = Math.min(currentTime - prevTime, 100) // 上限 100ms
```

### タッチイベント（スクロール抑制）
```typescript
// Reactの合成イベントではなく直接登録
canvas.addEventListener('touchstart', handler, { passive: false })
canvas.addEventListener('touchmove', handler, { passive: false })
// handler内で event.preventDefault() を呼ぶ
```

### State Machine 型定義（`src/lib/game/state.ts`）
```typescript
type GameState =
  | { type: 'IDLE' }
  | { type: 'PLAYING'; stage: number }
  | { type: 'BOSS_APPEARING'; stage: number; elapsed: number }
  | { type: 'BOSS_FIGHT'; stage: number }
  | { type: 'STAGE_CLEAR'; stage: number; elapsed: number }
  | { type: 'POWER_UP_SELECT'; stage: number; options: [PowerUpOption, PowerUpOption] }
  | { type: 'PAUSED'; resumeTo: GameState }
  | { type: 'COUNTDOWN'; resumeTo: GameState; remaining: number }
  | { type: 'GAME_OVER'; score: number; stage: number }
  | { type: 'GAME_CLEAR'; score: number; stage: number }
```

### HUD の重ね合わせ
- HUD は `position: absolute` の HTML 要素で Canvas に重ねる
- `pointer-events: none` 必須

### iOS Safari 対応
- `touch-action: none` を Canvas に設定
- セーフエリア: `env(safe-area-inset-*)` を Canvas の外側（layout.tsx）で吸収
- PWA インストール誘導: `beforeinstallprompt` 非対応のため Safari 共有ボタン案内テキストで対応

### ランキング API のチート対策
- 名前: 1〜10文字（文字・数字・空白・`-_.`）。判定は `isValidPlayerName` をクライアントとサーバーで共有
- 名前の NG ワード（`ngWords.ts`）は 400（`inappropriate name`）
- 投稿はクライアントID（未指定時はIP）ごとに1分20件まで（`rateLimit.ts`・`clientId.ts`）。超えたら 429（`too many requests`）
- ステージ別スコア上限（`src/lib/leaderboard.ts` の `SCORE_LIMITS`、NORMAL / EXTRA 別）を超える投稿は 400
- ゲームバランスを変えたら上限値も見直すこと

## ゲームパラメータ早見表（実装値）

| パラメータ | 初期値 | 上限/下限 |
|---|---|---|
| 自機当たり判定 | 半径 12px | — |
| 無敵時間 | 2秒（オートガード発動時は 1秒） | — |
| オートガード | 雑魚+1・攻撃敵+3 で溜まり、満タン（EASY 20 / NORMAL 30 / EXTRA 45）で被弾すると残機の代わりに使って敵弾を全消去 | — |
| 連射間隔 | 200ms（強化で -30ms） | 80ms（下限） |
| 弾ダメージ | 10 | — |
| 自機弾速 | 600px/秒（強化で +120） | 1080px/秒（上限） |
| 武器レベル | 1 | 3（ツイン → 3-Way）。EXTRA は 5（5-Way → 貫通レーザー） |
| 残機 | 3 | 上限なし |
| 移動可能範囲 | Canvas端から 20px パディング | — |
| 雑魚敵（通常）当たり判定 | 半径 15px | — |
| 攻撃敵当たり判定 | 半径 20px | — |
| 回復敵当たり判定 | 半径 14px（撃破または接触で残機+1） | — |
| ボス当たり判定 | 半径 40px | — |
| ボスHP（NORMAL） | ステージ1で 450（ステージ毎 +150） | — |
| ボス弾幕切替 | HP 50% 以下でパターン2、25% 以下でパターン3 | — |
| EASY 補正 | 敵速度×0.7、敵弾速×0.6、間隔×1.5、ボスHP×0.6 | — |
| EXTRA 開始時の自機 | 残機5・連射140ms・弾速840・武器Lv.3 | — |
| EXTRA ボスHP | 1900 / 2400 / 3600（最終ボス） | — |
| 星パーティクル数 | 80 個 | — |

難易度の詳細は `src/lib/game/difficulty.ts` を参照（内部的には `stage + 2` を実効ステージとして補間）。

## コーディング規約

- コメントは原則不要（命名で意図を伝える）
- `'use client'` はゲーム関連コンポーネントすべてに付与
- エラーハンドリングは `localStorage` 不可時のフォールバックと API Routes の失敗応答のみ
- 画像ファイルは使わない（Canvas 図形描画のみ）
- サウンドなし
- ゲームロジック（`lib/game/`）や API を変更したらテストも追加・更新する
