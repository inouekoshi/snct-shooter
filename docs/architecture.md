# アーキテクチャと設計資料

本ドキュメントでは、SNCT Shooter のシステム設計およびアーキテクチャについて解説します。コードベースの全体像を理解し、開発に参加するためのガイドとして利用してください。

## 1. ディレクトリ構造

本プロジェクトは Next.js 15 の App Router（React 19・Node.js 22） を基盤に構築されています。主要なディレクトリとファイルは以下の通りです。

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
│           ├── route.ts      # リーダーボードAPI (GET: top20取得 / POST: スコア投稿)
│           └── __tests__/    # API のユニットテスト
├── components/
│   ├── GameCanvas.tsx        # Canvas とゲームエンジンを接続するコンポーネント。一時停止ボタンと一時停止中の HOME ボタン
│   ├── HUD.tsx               # スコア・残機・オートガードのゲージを表示するHUD (Canvas上にCSSで重ねる)
│   ├── ResultScreen.tsx      # ゲームオーバー／クリア画面
│   ├── ScoreSubmit.tsx       # スコア投稿フロー（名前入力〜順位表示）
│   ├── Leaderboard.tsx       # ランキング表示UI (NORMAL / EXTRA タブ付きオーバーレイ)
│   ├── StatsModal.tsx        # プレイ履歴・統計 (オーバーレイ)
│   ├── RotatePrompt.tsx      # デバイスが横向きの場合に縦持ちを促すコンポーネント
│   ├── useViewportScale.ts   # 画面の高さに合わせた表示倍率を返すフック (スタート画面・ゲーム画面で共用)
│   └── buttonStyles.ts       # 共通ボタンスタイル
├── lib/
│   ├── firestore.ts          # Firebase Admin SDK の初期化とFirestore操作 (サーバーサイド専用)
│   ├── leaderboard.ts        # ランキング種別・エントリ型・スコア上限・名前チェック・順位表示・API呼び出し
│   ├── ngWords.ts            # 名前の NG ワード判定 (サーバーサイドのみ)
│   ├── rateLimit.ts          # IP ごとの投稿回数の制限 (サーバーサイドのみ)
│   ├── playerName.ts         # プレイヤー名の localStorage 保存
│   ├── __tests__/            # leaderboard・ngWords・rateLimit・firestore のユニットテスト
│   └── game/                 # ゲームのコアロジック群
│       ├── engine.ts         # ゲームループ・状態遷移・スポーン・当たり処理の統括
│       ├── state.ts          # State Machine の型定義、一時停止できる状態の判定、状態からのステージ番号の取得
│       ├── constants.ts      # 論理解像度 (CANVAS_WIDTH / CANVAS_HEIGHT) などの共通定数
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
│       ├── guard.ts          # オートガードのゲージと発動判定・自機周りの輪の描画
│       ├── random.ts         # シード付き乱数生成器 (mulberry32)
│       ├── touch.ts          # タッチ入力イベントバッファ
│       └── __tests__/        # Vitest のユニットテスト
└── public/
    ├── manifest.json         # PWAの設定メタデータ
    └── icons/                # PWAアプリアイコン (PNG)
```

ルートには以下の Firebase / Vercel 設定ファイルも含まれます。

```text
firebase.json                 # Firebase CLI 設定 (Firestore ルール・インデックスのパスを定義)
.firebaserc                   # Firebase プロジェクトID (snct-shooter)
firestore.rules               # Firestore セキュリティルール (API Routes 経由のみ許可)
firestore.indexes.json        # Firestore インデックス定義 (現状なし。順位計算の count() は単一フィールドの自動インデックスで動く)
.github/workflows/ci.yml      # GitHub Actions の CI (脆弱性チェック・テスト・Lint・ビルド)
.github/dependabot.yml        # 依存パッケージの更新 PR を dev 宛てに自動作成
.eslintrc.json                # ESLint 設定 (next/core-web-vitals)
LICENSE                       # MIT License
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
- `PAUSED`: 一時停止ボタン、またはタブの移動・バックグラウンド移行による一時停止。一時停止中は HOME ボタンでスタート画面に戻れる
- `COUNTDOWN`: PAUSED からの復帰カウントダウン（2秒）。この間にバックグラウンドへ移ると PAUSED に戻る
- `GAME_OVER`: プレイヤーの残機がゼロになった状態
- `GAME_CLEAR`: 最終ステージをクリアした状態（NORMAL/EASY は8、EXTRA は3）

### 2.3 描画システム (Canvas API)
React のステートを用いずに、直接 HTML Canvas 2D API (`GameCanvas.tsx`) を操作して描画します。
- **解像度戦略**: 論理解像度 (390 × 844) を基本とし、デバイスの `devicePixelRatio` に乗じて実描画サイズを決定しています。コードでは `constants.ts` の `CANVAS_WIDTH` / `CANVAS_HEIGHT` を使い、数値を直接書きません。
- これにより、様々なスマートフォンでもRetinaディスプレイ対応の高画質で表示されます。

### 2.4 タッチ入力処理
Reactの合成イベント (SyntheticEvent) ではなく、ネイティブの `Touch Events API` を使用します。
- タッチ操作によるブラウザのデフォルトスクロールを防ぐため、`passive: false` でイベントリスナを登録。
- 入力情報を一度バッファ (`touch.ts`) に保存し、ゲームループの `update()` フェーズで反映させています。

### 2.4.1 モジュールの分担
`engine.ts` はゲームループと状態遷移の統括に専念し、個々の処理は次のモジュールに任せています。`update` は状態ごとの関数に分かれています（戦闘中の `updateBattle`、演出中の `updateBossAppearing`・`updateStageClear`、`updatePowerUpSelect`、`updateCountdown`）。

- **ロジック**（Canvas に依存しない純粋な関数。`__tests__/` でユニットテスト済み）: `difficulty.ts`、`powerup.ts`、`collision.ts` の命中処理、`player.ts` の発射パターン、`guard.ts` のオートガードのゲージ、`effects.ts` のパーティクル・揺れの更新
- **描画**: 各モジュールの `render*` 関数と、画面全体に重ねる演出をまとめた `overlays.ts`
- **乱数**: 展開に影響する乱数（敵の出現位置・攻撃敵のジグザグ判定と射撃タイミング・回復敵の出現間隔・パワーアップの選択肢）は、`random.ts` のシード付き乱数生成器から取る。`engine.start(seed)` でシードを指定でき、省略時はランダムなシードになる（`engine.seed` で参照可能）。見た目だけの乱数（背景の星・破片・画面揺れ）は `Math.random` のまま。スコアアタック・ゴーストに向けた下準備で、完全な再現には更新間隔の固定も必要（[#21](https://github.com/inouekoshi/snct-shooter/issues/21)）
- **保存**: `score.ts`（ハイスコア・EXTRA 解禁）、`stats.ts`（統計）、`lib/playerName.ts`（名前）。いずれも localStorage が使えない環境では例外を出さずに無視する

### 2.5 衝突判定
全てのオブジェクト（自機、敵、弾）の当たり判定は、複雑なポリゴンを利用せず **円の衝突判定 (Circle Collision)** に統一されています。
これにより、計算負荷を極小化しつつ、プレイヤーからの視覚的なヒット感覚を直感的なものにしています。

自機弾の命中処理は `collision.ts` の `applyPlayerBulletHits` にまとめています。通常弾は最初に当たった敵で消え、貫通レーザー（EXTRA の武器 Lv.5）は重なった敵すべてに1回ずつ当たって残ります。

自機の被弾処理は `engine.ts` の `takeHit` にまとめています。

- 回復敵に触れたときは被弾ではなく回収（残機+1）になる（`collision.ts` の `findTouchedEnemies`）。無敵中でも回収できる
- 敵弾と敵（回復敵・ボスを除く）への接触は、無敵でなければ1フレームに1回だけ被弾として扱う
- 被弾時にオートガード（`guard.ts`）が満タンなら、残機の代わりにゲージを使い、画面内の敵弾を消して1秒間無敵になる

## 3. PWA (Progressive Web App) 対応
iOS/Android 双方でのオフライン動作およびアプリライクな体験を提供するために `Serwist` を導入しています。
- **Service Worker**: `app/sw.ts` により、リソースのキャッシュを行います。`@serwist/next` の `defaultCache` は `/api/*` の GET もキャッシュするため、その前に `/api/*` を `NetworkOnly` にするルールを置き、ランキングが古いまま表示されないようにしています。
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
| 投稿回数の制限（ランキングではない） | `rate_limits` | `rate_limits_dev` |

```
scores / scores_extra (または *_dev)/{auto-id}
  name: string       // プレイヤー名（1〜10文字）
  score: number      // スコア
  stage: number      // 到達ステージ
  createdAt: Timestamp

rate_limits (または rate_limits_dev)/{IPのSHA-256ハッシュ}
  windowStart: number  // 1分間の数え始め（ミリ秒）
  count: number        // その1分間の投稿数
  expiresAt: Timestamp // 1時間後。Firestore の TTL ポリシーを設定すれば自動で消える（任意）
```

ランキング取得時は `orderBy('score', 'desc').limit(20)` でトップ20を取得します。

### 4.3 API エンドポイント

| メソッド | パス | 機能 |
|---|---|---|
| GET | `/api/scores?mode=normal\|extra` | トップ20のスコアを取得（`mode` 省略時は NORMAL）。各エントリにドキュメントID（`id`）を含む。成功時は `Cache-Control: public, s-maxage=10, stale-while-revalidate=50` を付け、Vercel の CDN で10秒キャッシュして Firestore の読み取り回数を減らす（クエリごとに別キャッシュ）。投稿直後にランキングを開くときは `&after=<ドキュメントID>` を付けてキャッシュを外し、自分のスコアを必ず表示する |
| POST | `/api/scores` | スコアを投稿（ボディ: `{ name, score, stage, mode }`、`mode` 省略時は NORMAL）。バリデーション通過後にFirestoreへ書き込み、登録された順位とドキュメントID（`{ ok: true, rank, id }`）を返却。失敗時のエラーは下表 |

POST のエラー応答（クライアントは `src/lib/leaderboard.ts` の `submitLeaderboardScore` で理由ごとに分け、画面に出し分ける）:

| ステータス | `error` | 理由 | 画面の表示 |
|---|---|---|---|
| 400 | `invalid name` | 名前に使えない文字がある・長さが範囲外 | 使えない文字が含まれています |
| 400 | `inappropriate name` | NG ワードを含む | この名前は登録できません |
| 400 | `invalid score` / `invalid stage` / `invalid mode` | スコア・ステージ・モードが不正、またはスコア上限を超えた | 送信に失敗しました |
| 429 | `too many requests` | 同じ IP からの投稿が1分間の上限を超えた | 投稿が集中しています。1分ほど待ってからもう一度お試しください |
| 503 | `submission disabled` | `SCORES_SUBMISSION_DISABLED=1` で投稿を停止中 | 現在スコアの投稿を停止しています |
| 500 | `Failed to submit score` | Firestore のエラーなど | 送信に失敗しました |

### 4.4 サーバーサイドバリデーション（チート対策）
`src/app/api/scores/route.ts` でリクエストを以下の観点で検証する。

- **名前**: 正規表現 `/^[\p{L}\p{N}\s\-_.]{1,10}$/u` に一致するUnicode文字・数字・一部記号のみ。判定は `src/lib/leaderboard.ts` の `isValidPlayerName` をクライアント（入力中の案内）とサーバーで共有する
- **投稿回数の制限**: 入力チェックを通った投稿だけを、送信元 IP ごとに1分間20件までに制限し、超えたら `{ error: 'too many requests' }` を429で返す（`src/lib/rateLimit.ts`、`firestore.ts` の `consumeSubmissionQuota`）。高専祭の会場では多くの来場者が同じ Wi-Fi（同じ IP）から投稿するため、正当な投稿を弾かないよう上限はゆるくし、スクリプトによる大量投稿だけを止める。IP はハッシュ化して保存し、生の IP は残さない。回数は Firestore のトランザクションで数えるので、投稿ごとに読み書きが1回ずつ増える。IP が分からない場合（ローカル開発など）は制限しない
- **NG ワード**: `src/lib/ngWords.ts` の `containsNgWord` で不適切な名前を弾く（サーバーのみ）。環境変数 `NG_WORDS` で語を追加できる。詳細は [spec.md §2.11](spec.md#211-オンラインリーダーボード)
- **スコア**: 0以上9,999,999以下の整数
- **モード**: `normal` / `extra`（省略時は `normal`）以外は400エラー
- **ステージ**: NORMAL は1〜8、EXTRA は1〜3の整数
- **ステージ別スコア上限**: 各ステージの理論最大スコア（`engine.ts` / `difficulty.ts` の数値から逆算）の1.5倍を上限とし、超過した値は400エラーで弾く。上限値は `src/lib/leaderboard.ts` の `SCORE_LIMITS` で管理

### 4.5 順位計算
- 登録時の順位（rank）は、`count()` 集計クエリ（`where('score', '>', score).count()`）で「自分のスコアより高いエントリ数 + 1」として算出する。順位に関係なく正しい値が出て、読み取りコストも 1000件あたり1読み取りで済む
- ランキング一覧の順位も同じ考え方で、同点は同じ順位にし、次の順位は人数分飛ばす（例: 1, 2, 2, 4）。`src/lib/leaderboard.ts` の `rankEntries`
- 投稿後にランキングを開くと、投稿で返ってきたドキュメントIDのエントリだけをハイライトする（同点の他人はハイライトしない）

### 4.6 環境変数
Firebase Admin SDK のサービスアカウントキーは `FIREBASE_SERVICE_ACCOUNT_KEY` という環境変数（1行JSON）で提供する。`.env.local`（ローカル開発）と Vercel の Environment Variables（Production / Preview / Development）に同じ値を設定する。

| 環境変数 | 必須 | 内容 |
|---|---|---|
| `FIREBASE_SERVICE_ACCOUNT_KEY` | ランキングを使うなら必須 | Firebase Admin SDK のサービスアカウントキー（1行JSON） |
| `NG_WORDS` | 任意 | 名前の NG ワードを追加する（カンマ区切り、部分一致）。イベント中に新しい荒らしが出たときの追加用 |
| `SCORES_RATE_LIMIT_PER_MINUTE` | 任意 | 1つの IP から1分間に投稿できる件数（既定 20）。`0` で制限なし。会場で正当な投稿が弾かれるようなら上げる |
| `SCORES_SUBMISSION_DISABLED` | 任意 | `1` にするとスコア投稿を止める（POST が `{ error: 'submission disabled' }` を503で返し、画面に「現在スコアの投稿を停止しています」と出る）。荒らされたときの緊急停止用。ランキングの閲覧はそのまま |

### 4.7 UI コンポーネント
`src/components/Leaderboard.tsx` は固定の論理解像度（390×844）上にオーバーレイ表示するコンポーネント。NORMAL / EXTRA をタブで切り替えられる。ホーム画面の RANKING ボタンと、結果画面（`ResultScreen.tsx`）の「ランキングを見る」ボタンから呼び出される。投稿した自分のエントリ（ドキュメントIDが一致する1件）だけが黄色（`#FFFF00`）でハイライトされる。

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
- Node.js のバージョンは `package.json` の `engines`（`22.x`）で指定しています（firebase-admin 14 が Node 22 以上を必要とするため）。

### 5.3 CI・依存パッケージの管理
- **GitHub Actions**（`.github/workflows/ci.yml`）: `dev` / `main` への push と PR のたびに、`npm ci` → `npm audit --omit=dev --audit-level=high`（本番の依存に high 以上の脆弱性があれば失敗）→ `npm test` → `npm run lint` → `npm run build` を実行します。
- **Dependabot**（`.github/dependabot.yml`）: npm は毎週、GitHub Actions は毎月、`dev` 宛てに更新 PR を作ります。minor / patch の更新は1つの PR にまとめます。CI が通っていればマージして構いません。
- Next.js に同梱されている postcss は、`package.json` の `overrides` で新しい版に上げています（脆弱性対策）。Next.js を更新したときは、この指定が不要になっていないか確認してください。
