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

- **フレームワーク**: Next.js 14 (App Router)
- **言語**: TypeScript
- **ゲーム描画**: Canvas API + requestAnimationFrame（delta-time ベース）
- **操作**: Touch Events API（`passive: false` で `addEventListener` 直接登録）
- **ローカル保存**: localStorage（ハイスコア・プレイヤー名・プレイ履歴。使用不可時はフォールバック）
- **オンラインランキング**: Firebase Firestore + Firebase Admin SDK（`/api/scores` 経由のみ。クライアントから直接触らない）
- **PWA**: Serwist（next-pwa は App Router 非互換のため不採用）。`/api/*` はキャッシュしない
- **テスト**: Vitest（`npm test`）
- **デプロイ**: Vercel

## 開発ワークフロー

詳細は `GEMINI.md` を参照。

- `main`: 本番。直接コミットせず、`dev` からマージする
- `dev`: 開発用。push すると Vercel のプレビュー環境（固定URL、README 参照）に自動デプロイされる
- Firestore のコレクションは `VERCEL_ENV` で自動切替（本番 `scores`・`scores_extra` / それ以外は末尾に `_dev`）
- 環境変数 `FIREBASE_SERVICE_ACCOUNT_KEY` が必要（ローカルは `.env.local`）
- コミット前に `npm test` と `npm run build` が通ることを確認する

## ディレクトリ構成

```
src/
  app/
    page.tsx              # スタート画面（難易度選択・ランキング・統計）
    game/page.tsx         # ゲーム画面（ゲームオーバー/クリア・スコア投稿）
    layout.tsx            # PWA・Portrait固定・セーフエリア
    sw.ts                 # Serwist Service Worker エントリ
    api/scores/route.ts   # ランキングAPI（GET: top20 / POST: 投稿・バリデーション）
  components/
    GameCanvas.tsx        # Canvas コンポーネント
    HUD.tsx               # pointer-events: none でCanvas上に重ねる
    Leaderboard.tsx       # ランキング表示
    StatsModal.tsx        # プレイ履歴・統計表示
    RotatePrompt.tsx      # 横向き時の回転促進
  lib/
    firestore.ts          # Firebase Admin SDK（サーバー専用）
    leaderboard.ts        # ランキング種別（normal/extra）とスコア上限
    game/
      engine.ts           # ゲームループ・状態遷移・スポーン・当たり処理
      state.ts            # State Machine の型定義
      player.ts           # 自機・パワーアップ適用
      enemy.ts            # 敵（通常・攻撃・回復・ボス）
      bullet.ts           # 弾（自機・敵）
      collision.ts        # 衝突判定（円同士）・自機弾の命中処理
      effects.ts          # 撃破パーティクル・画面揺れ
      score.ts            # ハイスコア・EXTRA解禁状態（localStorage）
      stats.ts            # プレイ履歴・撃破数統計
      difficulty.ts       # ステージ・難易度別パラメータ
      touch.ts            # タッチ入力バッファ
      __tests__/          # Vitest のテスト
public/
  manifest.json
  icons/icon-192.png, icon-512.png
```

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
- 名前: 1〜10文字（文字・数字・空白・`-_.`）
- ステージ別スコア上限（`src/lib/leaderboard.ts` の `SCORE_LIMITS`、NORMAL / EXTRA 別）を超える投稿は 400
- ゲームバランスを変えたら上限値も見直すこと

## ゲームパラメータ早見表（実装値）

| パラメータ | 初期値 | 上限/下限 |
|---|---|---|
| 自機当たり判定 | 半径 12px | — |
| 無敵時間 | 2秒 | — |
| 連射間隔 | 200ms（強化で -30ms） | 80ms（下限） |
| 弾ダメージ | 10 | — |
| 自機弾速 | 600px/秒（強化で +120） | 1080px/秒（上限） |
| 武器レベル | 1 | 3（ツイン → 3-Way）。EXTRA は 5（5-Way → 貫通レーザー） |
| 残機 | 3 | 上限なし |
| 移動可能範囲 | Canvas端から 20px パディング | — |
| 雑魚敵（通常）当たり判定 | 半径 15px | — |
| 攻撃敵当たり判定 | 半径 20px | — |
| 回復敵当たり判定 | 半径 14px | — |
| ボス当たり判定 | 半径 40px | — |
| ボスHP（NORMAL） | ステージ1で 450（ステージ毎 +150） | — |
| ボス弾幕切替 | HP 50% 以下でパターン2、25% 以下でパターン3 | — |
| EASY 補正 | 敵速度×0.7、敵弾速×0.6、間隔×1.5、ボスHP×0.6 | — |
| EXTRA 開始時の自機 | 残機5・連射140ms・弾速840・武器Lv.3 | — |
| EXTRA ボスHP | 2400 / 3000 / 4500（最終ボス） | — |
| 星パーティクル数 | 80 個 | — |

難易度の詳細は `src/lib/game/difficulty.ts` を参照（内部的には `stage + 2` を実効ステージとして補間）。

## コーディング規約

- コメントは原則不要（命名で意図を伝える）
- `'use client'` はゲーム関連コンポーネントすべてに付与
- エラーハンドリングは `localStorage` 不可時のフォールバックと API Routes の失敗応答のみ
- 画像ファイルは使わない（Canvas 図形描画のみ）
- サウンドなし
- ゲームロジック（`lib/game/`）や API を変更したらテストも追加・更新する
