# アーキテクチャと設計資料

本ドキュメントでは、SNCT Shooter のシステム設計およびアーキテクチャについて解説します。コードベースの全体像を理解し、開発に参加するためのガイドとして利用してください。

## 1. ディレクトリ構造

本プロジェクトは Next.js 14 の App Router を基盤に構築されています。主要なディレクトリとファイルは以下の通りです。

```text
src/
├── app/
│   ├── page.tsx              # スタート画面 (IDLE)。難易度選択・EXTRA・RANKING・STATS ボタン
│   ├── layout.tsx            # PWA設定、メタタグ、Portrait固定等の共通レイアウト
│   ├── sw.ts                 # Serwist Service Worker のエントリポイント
│   ├── game/
│   │   └── page.tsx          # ゲームプレイ画面。モード判定・EXTRA解禁チェック・結果画面の切り替え
│   └── api/
│       └── scores/
│           └── route.ts      # リーダーボードAPI (GET: top20取得 / POST: スコア投稿)
├── components/
│   ├── GameCanvas.tsx        # Canvas とゲームエンジンを接続するコンポーネント
│   ├── HUD.tsx               # スコアや残機を表示するHUD (Canvas上にCSSで重ねる)
│   ├── ResultScreen.tsx      # ゲームオーバー／クリア画面
│   ├── ScoreSubmit.tsx       # スコア投稿フロー（名前入力〜順位表示）
│   ├── Leaderboard.tsx       # ランキング表示UI (NORMAL / EXTRA タブ付きオーバーレイ)
│   ├── StatsModal.tsx        # プレイ履歴・統計 (オーバーレイ)
│   ├── RotatePrompt.tsx      # デバイスが横向きの場合に縦持ちを促すコンポーネント
│   └── buttonStyles.ts       # 共通ボタンスタイル
├── lib/
│   ├── firestore.ts          # Firebase Admin SDK の初期化とFirestore操作 (サーバーサイド専用)
│   ├── leaderboard.ts        # ランキング種別 (normal / extra)・エントリ型・ステージ別スコア上限
│   ├── playerName.ts         # プレイヤー名の localStorage 保存
│   └── game/                 # ゲームのコアロジック群
│       ├── engine.ts         # ゲームループ・状態遷移・スポーン・当たり処理の統括
│       ├── state.ts          # State Machine の型定義
│       ├── constants.ts      # 論理解像度などの共通定数
│       ├── difficulty.ts     # ステージ・モード別の難易度パラメータ
│       ├── player.ts         # 自機の移動・武器レベル別の弾の発射
│       ├── enemy.ts          # 敵 (雑魚・攻撃型・回復・ボス) の生成・挙動・描画
│       ├── bullet.ts         # 自機弾・貫通レーザー・敵弾
│       ├── collision.ts      # 円の衝突判定と自機弾の命中処理
│       ├── powerup.ts        # ステージクリア後のパワーアップ選択肢
│       ├── effects.ts        # 撃破パーティクル・画面揺れ
│       ├── background.ts     # 星の背景
│       ├── overlays.ts       # BOSS / STAGE CLEAR / POWER UP / カウントダウンの描画
│       ├── score.ts          # ハイスコアと EXTRA 解禁状態の localStorage 保存
│       ├── stats.ts          # プレイ履歴・統計の localStorage 保存
│       ├── touch.ts          # タッチ入力イベントバッファ
│       └── __tests__/        # Vitest のユニットテスト
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
- `GAME_CLEAR`: 最終ステージをクリアした状態（NORMAL/EASY は8、EXTRA は3）

### 2.3 描画システム (Canvas API)
React のステートを用いずに、直接 HTML Canvas 2D API (`GameCanvas.tsx`) を操作して描画します。
- **解像度戦略**: 論理解像度 (390 × 844) を基本とし、デバイスの `devicePixelRatio` に乗じて実描画サイズを決定しています。
- これにより、様々なスマートフォンでもRetinaディスプレイ対応の高画質で表示されます。

### 2.4 タッチ入力処理
Reactの合成イベント (SyntheticEvent) ではなく、ネイティブの `Touch Events API` を使用します。
- タッチ操作によるブラウザのデフォルトスクロールを防ぐため、`passive: false` でイベントリスナを登録。
- 入力情報を一度バッファ (`touch.ts`) に保存し、ゲームループの `update()` フェーズで反映させています。

### 2.4.1 モジュールの分担
`engine.ts` はゲームループと状態遷移の統括に専念し、個々の処理は次のモジュールに任せています。

- **ロジック**（Canvas に依存しない純粋な関数。`__tests__/` でユニットテスト済み）: `difficulty.ts`、`powerup.ts`、`collision.ts` の命中処理、`player.ts` の発射パターン、`effects.ts` のパーティクル・揺れの更新
- **描画**: 各モジュールの `render*` 関数と、画面全体に重ねる演出をまとめた `overlays.ts`
- **保存**: `score.ts`（ハイスコア・EXTRA 解禁）、`stats.ts`（統計）、`lib/playerName.ts`（名前）。いずれも localStorage が使えない環境では例外を出さずに無視する

### 2.5 衝突判定
全てのオブジェクト（自機、敵、弾）の当たり判定は、複雑なポリゴンを利用せず **円の衝突判定 (Circle Collision)** に統一されています。
これにより、計算負荷を極小化しつつ、プレイヤーからの視覚的なヒット感覚を直感的なものにしています。

自機弾の命中処理は `collision.ts` の `applyPlayerBulletHits` にまとめています。通常弾は最初に当たった敵で消え、貫通レーザー（EXTRA の武器 Lv.5）は重なった敵すべてに1回ずつ当たって残ります。

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
Firestore コレクションはデプロイ環境（`VERCEL_ENV`）に応じて自動的に切り替わり、テストデータが本番環境に混入するのを防ぎます。

ランキングは NORMAL と EXTRA の2種類あり、それぞれ別コレクションに保存します（`src/lib/firestore.ts` の `collectionName`）。

| ランキング | Production (`main`) | Preview / Development (`dev` 等) |
|---|---|---|
| NORMAL | `scores` | `scores_dev` |
| EXTRA | `scores_extra` | `scores_extra_dev` |

```
scores / scores_extra (または *_dev)/{auto-id}
  name: string       // プレイヤー名（1〜10文字）
  score: number      // スコア
  stage: number      // 到達ステージ
  createdAt: Timestamp
```

ランキング取得時は `orderBy('score', 'desc').limit(20)` でトップ20を取得します。

### 4.3 API エンドポイント

| メソッド | パス | 機能 |
|---|---|---|
| GET | `/api/scores?mode=normal\|extra` | トップ20のスコアを取得（`mode` 省略時は NORMAL）。`export const revalidate = 10` で Edge Cache を10秒利用しFirestore読み取り回数を削減 |
| POST | `/api/scores` | スコアを投稿（ボディ: `{ name, score, stage, mode }`、`mode` 省略時は NORMAL）。バリデーション通過後にFirestoreへ書き込み、登録された順位を返却 |

### 4.4 サーバーサイドバリデーション（チート対策）
`src/app/api/scores/route.ts` でリクエストを以下の観点で検証する。

- **名前**: 正規表現 `/^[\p{L}\p{N}\s\-_.]{1,10}$/u` に一致するUnicode文字・数字・一部記号のみ
- **スコア**: 0以上9,999,999以下の整数
- **モード**: `normal` / `extra`（省略時は `normal`）以外は400エラー
- **ステージ**: NORMAL は1〜8、EXTRA は1〜3の整数
- **ステージ別スコア上限**: 各ステージの理論最大スコア（`engine.ts` / `difficulty.ts` の数値から逆算）の1.5倍を上限とし、超過した値は400エラーで弾く。上限値は `src/lib/leaderboard.ts` の `SCORE_LIMITS` で管理

### 4.5 順位計算
登録時の順位（rank）は、`getTopScores(100, board)` の結果から「自分のスコアより高いエントリ数 + 1」で算出している。
この方式では100位より下の順位が正しく出ないため、`count()` 集計クエリへの置き換えを [#4](https://github.com/inouekoshi/snct-shooter/issues/4) で検討中。

### 4.6 環境変数
Firebase Admin SDK のサービスアカウントキーは `FIREBASE_SERVICE_ACCOUNT_KEY` という環境変数（1行JSON）で提供する。`.env.local`（ローカル開発）と Vercel の Environment Variables（Production / Preview / Development）に同じ値を設定する。

### 4.7 UI コンポーネント
`src/components/Leaderboard.tsx` は固定の論理解像度（390×844）上にオーバーレイ表示するコンポーネント。NORMAL / EXTRA をタブで切り替えられる。ホーム画面の RANKING ボタンと、結果画面（`ResultScreen.tsx`）の「ランキングを見る」ボタンから呼び出される。自分のスコアは黄色（`#FFFF00`）でハイライトされる。

スコア投稿フロー（名前入力・送信・順位表示）は `ScoreSubmit.tsx` にまとめている。EASY モードでは表示しない。

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
