# アーキテクチャと設計資料

本ドキュメントでは、「暇つぶしシューティングゲーム」のシステム設計およびアーキテクチャについて解説します。コードベースの全体像を理解し、開発に参加するためのガイドとして利用してください。

## 1. ディレクトリ構造

本プロジェクトは Next.js 14 の App Router を基盤に構築されています。主要なディレクトリとファイルは以下の通りです。

```text
src/
├── app/
│   ├── page.tsx              # スタート画面 (IDLE)。'use client'
│   ├── layout.tsx            # PWA設定、メタタグ、Portrait固定等の共通レイアウト
│   ├── sw.ts                 # Serwist Service Worker のエントリポイント
│   └── game/
│       └── page.tsx          # ゲームプレイ画面。'use client'
├── components/
│   ├── GameCanvas.tsx        # Canvas描画を行う中心的なコンポーネント
│   ├── HUD.tsx               # スコアや残機を表示するHUD (Canvas上にCSSで重ねる)
│   └── RotatePrompt.tsx      # デバイスが横向きの場合に縦持ちを促すコンポーネント
├── lib/
│   └── game/                 # ゲームのコアロジック群
│       ├── engine.ts         # ゲームループ (requestAnimationFrame と delta-time 計算)
│       ├── state.ts          # State Machine (型定義と状態遷移)
│       ├── player.ts         # 自機の移動や弾の発射制御
│       ├── enemy.ts          # 敵 (雑魚・攻撃型・ボス) の挙動とスポーンロジック
│       ├── bullet.ts         # 自機・敵の弾の処理
│       ├── collision.ts      # 円ベースの衝突判定モジュール
│       ├── score.ts          # スコア計算と localStorage への永続化処理
│       ├── difficulty.ts     # ステージ進行による難易度(敵HP, 弾速等)スケーリング
│       └── touch.ts          # タッチ入力イベントバッファと操作処理
└── public/
    ├── manifest.json         # PWAの設定メタデータ
    └── icons/                # PWAアプリアイコン群
```

## 2. コア技術・ゲームエンジン設計

### 2.1 ゲームループ (Delta-time アプローチ)
`engine.ts` にて `requestAnimationFrame` を用いたメインゲームループを実装しています。
デバイスごとのリフレッシュレートの差異を吸収するため、**Delta-time** を使用しています。

- 前回のフレームからの経過時間（ミリ秒）を取得し、上限（例: 100ms）でクランプします。
- この時間を用いてオブジェクトの移動距離を算出することで、120Hz/60Hz などのディスプレイ環境に依存しない一定のゲームスピードを実現します。

### 2.2 状態管理 (State Machine)
ゲームのライフサイクルは `state.ts` において、厳密な Union Type で管理されています。

- `IDLE`: スタート画面待機中
- `PLAYING`: 通常プレイ中（敵の迎撃や回避）
- `BOSS_APPEARING`: ボス出現前の演出状態（無敵）
- `BOSS_FIGHT`: ボス戦闘中
- `STAGE_CLEAR`: ボス撃破時のステージクリア演出
- `PAUSED`: タブの移動やバックグラウンド移行時の自動一時停止
- `COUNTDOWN`: PAUSED からの復帰カウントダウン
- `GAME_OVER`: プレイヤーの残機がゼロになった状態

### 2.3 描画システム (Canvas API)
React のステートを用いずに、直接 HTML Canvas 2D API (`GameCanvas.tsx`) を操作して描画します。
- **解像度戦略**: 論理解像度 (390 × 844) を基本とし、デバイスの `devicePixelRatio` に乗じて実描画サイズを決定しています。
- これにより、様々なスマートフォンでもRetinaディスプレイ対応の高画質で表示されます。

### 2.4 タッチ入力処理
Reactの合成イベント (SyntheticEvent) ではなく、ネイティブの `Touch Events API` を使用します。
- タッチ操作によるブラウザのデフォルトスクロールを防ぐため、`passive: false` でイベントリスナを登録。
- 入力情報を一度バッファ (`touch.ts`) に保存し、ゲームループの `update()` フェーズで反映させています。

### 2.5 衝突判定
全てのオブジェクト（自機、敵、弾）の当たり判定は、複雑なポリゴンを利用せず **円の衝突判定 (Circle Collision)** に統一されています。
これにより、計算負荷を極小化しつつ、プレイヤーからの視覚的なヒット感覚を直感的なものにしています。

## 3. PWA (Progressive Web App) 対応
iOS/Android 双方でのオフライン動作およびアプリライクな体験を提供するために `Serwist` を導入しています。
- **Service Worker**: `app/sw.ts` により、リソースのキャッシュを行います。
- `layout.tsx` レベルで `env(safe-area-inset-*)` を考慮し、ノッチ付きディスプレイにおいてもゲーム領域が隠れないよう設計されています。
