# アーキテクチャと設計資料

本ドキュメントでは、SNCT Shooter のシステム設計およびアーキテクチャについて解説します。コードベースの全体像を理解し、開発に参加するためのガイドとして利用してください。

## 1. ディレクトリ構造

本プロジェクトは Next.js 14 の App Router を基盤に構築されています。主要なディレクトリとファイルは以下の通りです。

```text
src/
├── app/
│   ├── page.tsx              # スタート画面 (IDLE)。RANKING ボタンを含む。'use client'
│   ├── layout.tsx            # PWA設定、メタタグ、Portrait固定等の共通レイアウト
│   ├── sw.ts                 # Serwist Service Worker のエントリポイント
│   ├── game/
│   │   └── page.tsx          # ゲームプレイ画面。スコア投稿フローを含む。'use client'
│   └── api/
│       └── scores/
│           └── route.ts      # リーダーボードAPI (GET: top20取得 / POST: スコア投稿)
├── components/
│   ├── GameCanvas.tsx        # Canvas描画を行う中心的なコンポーネント
│   ├── HUD.tsx               # スコアや残機を表示するHUD (Canvas上にCSSで重ねる)
│   ├── RotatePrompt.tsx      # デバイスが横向きの場合に縦持ちを促すコンポーネント
│   └── Leaderboard.tsx       # ランキング表示UI (オーバーレイ)
├── lib/
│   ├── firestore.ts          # Firebase Admin SDK の初期化とFirestore操作 (サーバーサイド専用)
│   └── game/                 # ゲームのコアロジック群
│       ├── engine.ts         # ゲームループ (requestAnimationFrame と delta-time 計算)
│       ├── state.ts          # State Machine (型定義と状態遷移)
│       ├── player.ts         # 自機の移動や弾の発射制御
│       ├── enemy.ts          # 敵 (雑魚・攻撃型・回復・ボス) の挙動とスポーンロジック
│       ├── bullet.ts         # 自機・敵の弾の処理
│       ├── collision.ts      # 円ベースの衝突判定モジュール
│       ├── score.ts          # スコア計算と localStorage への永続化処理
│       ├── difficulty.ts     # ステージ進行による難易度(敵HP, 弾速等)スケーリング
│       └── touch.ts          # タッチ入力イベントバッファと操作処理
└── public/
    ├── manifest.json         # PWAの設定メタデータ
    └── icons/                # PWAアプリアイコン群
```

ルートには以下の Firebase / Vercel 設定ファイルも含まれます。

```text
firebase.json                 # Firebase CLI 設定 (Firestore ルール・インデックスのパスを定義)
.firebaserc                   # Firebase プロジェクトID (snct-shooter)
firestore.rules               # Firestore セキュリティルール (API Routes 経由のみ許可)
firestore.indexes.json        # Firestore インデックス定義 (現状なし)
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
- `BOSS_APPEARING`: ボス出現前の演出状態（自機無敵）
- `BOSS_FIGHT`: ボス戦闘中
- `STAGE_CLEAR`: ボス撃破時のステージクリア演出（2秒）
- `POWER_UP_SELECT`: ステージクリア後のパワーアップ選択画面（タップで選択）
- `PAUSED`: タブの移動やバックグラウンド移行時の自動一時停止
- `COUNTDOWN`: PAUSED からの復帰カウントダウン
- `GAME_OVER`: プレイヤーの残機がゼロになった状態
- `GAME_CLEAR`: 全8ステージをクリアした状態

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

## 4. オンラインリーダーボード

文化祭などのイベントで多人数が遊ぶことを想定し、Firebase Firestore をバックエンドとしたランキングシステムを構築しています。

### 4.1 設計方針
- **クライアントから直接 Firestore は叩かない**。すべて Next.js API Routes (`src/app/api/scores/route.ts`) 経由でアクセスする。
- Firestore のセキュリティルールは「すべての直接アクセスを拒否」に設定し、サーバーサイドの Firebase Admin SDK のみが読み書きできる構成。これによりクライアントからの改ざんを防止。

### 4.2 データ構造
Firestore コレクション: `scores`

```
scores/{auto-id}
  name: string       // プレイヤー名（1〜10文字）
  score: number      // スコア
  stage: number      // 到達ステージ
  createdAt: Timestamp
```

ランキング取得時は `orderBy('score', 'desc').limit(20)` でトップ20を取得。

### 4.3 API エンドポイント

| メソッド | パス | 機能 |
|---|---|---|
| GET | `/api/scores` | トップ20のスコアを取得。`export const revalidate = 10` で Edge Cache を10秒利用しFirestore読み取り回数を削減 |
| POST | `/api/scores` | スコアを投稿。バリデーション通過後にFirestoreへ書き込み、登録された順位を返却 |

### 4.4 サーバーサイドバリデーション（チート対策）
`src/app/api/scores/route.ts` でリクエストを以下の観点で検証する。

- **名前**: 正規表現 `/^[\p{L}\p{N}\s\-_.]{1,10}$/u` に一致するUnicode文字・数字・一部記号のみ
- **スコア**: 0以上9,999,999以下の整数
- **ステージ**: 1〜8の整数
- **ステージ別スコア上限**: 各ステージの理論最大スコア（`engine.ts` / `difficulty.ts` の数値から逆算）の1.5倍を上限とし、超過した値は400エラーで弾く

### 4.5 順位計算
登録時の順位（rank）は、`getTopScores(100)` の結果から「自分のスコアより高いエントリ数 + 1」で算出。Firestoreの `count()` 集計クエリ（課金対象）を回避することで、無料枠の消費を抑えている。

### 4.6 環境変数
Firebase Admin SDK のサービスアカウントキーは `FIREBASE_SERVICE_ACCOUNT_KEY` という環境変数（1行JSON）で提供する。`.env.local`（ローカル開発）と Vercel の Environment Variables（Production / Preview / Development）に同じ値を設定する。

### 4.7 UI コンポーネント
`src/components/Leaderboard.tsx` は固定の論理解像度（390×844）上にオーバーレイ表示するコンポーネント。ホーム画面の RANKING ボタンとゲームオーバー／クリア画面の「ランキングを見る」ボタンから呼び出される。自分のスコアは黄色（`#FFFF00`）でハイライトされる。

## 5. デプロイ・ブランチ構成

本プロジェクトは Vercel と GitHub を連携し、ブランチベースの自動デプロイを活用して環境を分離しています。

### 5.1 ブランチ戦略
- **`main` ブランチ (本番環境 / Production)**
  - プロダクション用の安定版。ユーザーが実際にプレイする環境。
  - 本番URL: `https://snct-shooter-koshiinoues-projects.vercel.app`
- **`dev` ブランチ (プレビュー環境 / Preview)**
  - 開発用ブランチ。ローカル環境 (`localhost`) は極力使用せず、`dev` ブランチへのプッシュ時に自動生成される Vercel Preview URL にて動作確認を行う運用としています。
  - プレビューURL例: `https://snct-shooter-git-dev-koshiinoues-projects.vercel.app`

### 5.2 環境変数・インフラ
- 環境変数 `FIREBASE_SERVICE_ACCOUNT_KEY` は Vercel ダッシュボードで Production / Preview / Development の3環境すべてに設定されています。
- Next.js の API Routes (`/api/scores`) は Vercel Functions (Fluid Compute) として自動的にプロビジョニングされ、サーバーレス環境で実行されます。
