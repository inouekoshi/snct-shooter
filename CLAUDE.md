# Casual Games - Claude Code ガイド

## プロジェクト概要

スマートフォンブラウザで動作する縦スクロールシューティングゲーム。  
仕様書: `docs/spec.md`（v1.0.0 確定済み）

## 技術スタック

- **フレームワーク**: Next.js 14 (App Router)
- **言語**: TypeScript
- **ゲーム描画**: Canvas API + requestAnimationFrame（delta-time ベース）
- **操作**: Touch Events API（`passive: false` で `addEventListener` 直接登録）
- **スコア保存**: localStorage（使用不可時はフォールバック）
- **PWA**: Serwist（next-pwa は App Router 非互換のため不採用）
- **デプロイ**: Vercel（main ブランチ自動デプロイ）

## 実装着手順序

1. `npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*"` でプロジェクト初期化
2. Serwist 導入・PWA 設定（`next.config.js` に `withSerwist`、`src/app/sw.ts` 作成）
3. `lib/game/` コアロジック実装（engine → state → player → enemy → bullet → collision → score → difficulty → touch）
4. `GameCanvas.tsx` + HUD コンポーネント
5. 各画面（`app/page.tsx` スタート、`app/game/page.tsx` ゲーム、ゲームオーバー）
6. Vercel デプロイ

## ディレクトリ構成（目標）

```
src/
  app/
    page.tsx              # スタート画面（'use client'）
    game/page.tsx         # ゲーム画面（'use client'）
    layout.tsx            # PWA・Portrait固定・セーフエリア
    sw.ts                 # Serwist Service Worker エントリ
  components/
    GameCanvas.tsx        # 'use client' Canvas コンポーネント
    HUD.tsx               # pointer-events: none でCanvas上に重ねる
    RotatePrompt.tsx      # 横向き時の回転促進
  lib/
    game/
      engine.ts           # ゲームループ
      state.ts            # State Machine（型定義と遷移）
      player.ts           # 自機
      enemy.ts            # 敵（通常・攻撃・ボス）
      bullet.ts           # 弾（自機・敵）
      collision.ts        # 衝突判定（円同士）
      score.ts            # スコア・localStorage
      difficulty.ts       # ステージ別パラメータ
      touch.ts            # タッチ入力バッファ
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

### State Machine 型定義
```typescript
type GameState =
  | { type: 'IDLE' }
  | { type: 'PLAYING'; stage: number }
  | { type: 'BOSS_APPEARING'; stage: number; elapsed: number }
  | { type: 'BOSS_FIGHT'; stage: number }
  | { type: 'STAGE_CLEAR'; stage: number; elapsed: number }
  | { type: 'PAUSED'; resumeTo: GameState }
  | { type: 'COUNTDOWN'; resumeTo: GameState; remaining: number }
  | { type: 'GAME_OVER'; score: number; stage: number }
```

### HUD の重ね合わせ
- HUD は `position: absolute` の HTML 要素で Canvas に重ねる
- `pointer-events: none` 必須

### iOS Safari 対応
- `touch-action: none` を Canvas に設定
- セーフエリア: `env(safe-area-inset-*)` を Canvas の外側（layout.tsx）で吸収
- PWA インストール誘導: `beforeinstallprompt` 非対応のため Safari 共有ボタン案内テキストで対応

### manifest.json 必須フィールド
```json
{
  "display": "standalone",
  "orientation": "portrait",
  "start_url": "/",
  "background_color": "#000000",
  "theme_color": "#000000",
  "icons": [192x192, 512x512]
}
```

## ゲームパラメータ早見表

| パラメータ | 値 |
|---|---|
| 自機当たり判定 | 半径 12px |
| 無敵時間 | 2秒 |
| 連射間隔 | 200ms |
| 弾ダメージ | 10 |
| 自機弾速 | 600px/秒 |
| 移動可能範囲 | Canvas端から 20px パディング |
| 雑魚敵（通常）当たり判定 | 半径 15px |
| 攻撃敵当たり判定 | 半径 20px |
| ボス当たり判定 | 半径 40px |
| ボスHP（ステージ1） | 100（ステージ毎+50） |
| ボス弾幕切替 | HP 50% 以下でパターン2 |
| 星パーティクル数 | 約 80 個 |

## コーディング規約

- コメントは原則不要（命名で意図を伝える）
- `'use client'` はゲーム関連コンポーネントすべてに付与
- エラーハンドリングは `localStorage` 不可時のフォールバックのみ
- 画像ファイルは使わない（Canvas 図形描画のみ）
- サウンドなし
