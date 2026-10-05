# SNCT Shooter 仕様書

> バージョン: v1.4.0  
> 最終更新: 2026-10-05

---

## 1. プロジェクト概要

スマートフォンのブラウザで動作する縦スクロール型シューティングゲーム。  
オフラインでも遊べ、1セッション約15分の暇つぶしを目的とする。  
Chromeの恐竜ゲームのように、軽量・シンプルで誰でも即プレイ可能。

---

## 2. ゲーム仕様

### 2.1 ゲーム進行（ステージ制）

- ステージ制を採用。ボスを倒すと次のステージへ進む
- ステージが進むほど雑魚敵・ボスが強化される（ステージ8で難易度が上限に達する）
- 全8ステージ構成。ステージ8のボスを倒すとゲームクリア（`GAME_CLEAR`）
- ゲームオーバー後はスタート画面（IDLE）へ戻る（ステージリセット）

### 2.2 ボス出現条件

- 各ステージで「ステージ内スコア」が閾値に達するとボス出現
  - ステージ内スコアはステージ開始時にリセットされる（累計スコアとは別管理）
- ボス出現中は雑魚敵の出現を停止
- ボスを倒すとステージクリア → 次のステージへ

| ステージ | ボス出現ステージ内スコア |
|---|---|
| 1 | 700 |
| 2 | 900 |
| 3〜8 | 1100 から毎ステージ +200（ステージ8で 2100） |

- EASY モードでも閾値は同じ

### 2.3 操作方法

| 操作 | アクション |
|---|---|
| 画面ドラッグ（指を置いて動かす） | 自機の移動（指の位置に追従） |
| 弾の発射 | 自動連射（操作不要） |

- 指を画面に置いた瞬間から自機が追従する
- 指を離すと自機はその場で停止
- タップ操作は一切不要、片手でプレイ可能
- タッチ座標は入力バッファに格納し、ゲームループの update 処理で自機座標へ反映する

### 2.4 自機

| パラメータ | 初期値 | パワーアップ上限 |
|---|---|---|
| 残機 | 3 | 上限なし |
| 移動 | 指の位置に指数平滑 (lerp) 追従 | — |
| 移動可能範囲 | Canvas端から上下左右 20px のパディング内 | — |
| 自動連射間隔 | 200ms ごとに1発 | 80ms（下限） |
| 武器レベル | Lv.1（シングル） | Lv.3（3-Way） |
| 弾のダメージ | 10 | 固定 |
| 弾速 | 600px/秒 | 1080px/秒 |
| 当たり判定 | 自機中心から半径 12px の円 | — |
| 無敵時間 | 被弾後 2 秒間（点滅でフィードバック） | — |

- 敵または敵弾に接触すると残機 -1、2秒間無敵
- 残機 0 でゲームオーバー

#### 武器レベル（攻撃パターン）の変化
- **Lv.1（初期）**: シングルショット（正面1発）
- **Lv.2**: ツインショット（左右から並行して2発）
- **Lv.3（最大）**: 3-Way（正面＋左右斜め15°の計3発拡散）

### 2.5 敵の種類

| 種類 | 当たり判定 | 備考 |
|---|---|---|
| 雑魚敵（通常） | 半径 15px | 直進のみ |
| 攻撃敵 | 半径 20px | 自機への狙い撃ち弾あり。40%の確率でジグザグ移動 |
| 回復敵 | 半径 14px | 倒すと残機+1。スコアなし |

雑魚敵・攻撃敵の数値は実効ステージ（`ステージ + 2`）を元に、ステージ1〜8 の間で線形補間される（`difficulty.ts`）。以下は NORMAL の値（小数は四捨五入）。
| ボス | 半径 40px | HP ゲージ・3段階弾幕 |

#### 雑魚敵（通常）パラメータ

| パラメータ | ステージ1 | ステージ8（上限） |
|---|---|---|
| HP | 1 | 1 |
| 移動速度 | 152px/秒 | 300px/秒 |
| 出現間隔 | 733ms | 150ms |
| 撃破スコア | +10 | +10 |

#### 攻撃敵パラメータ（ステージ1から出現）

| パラメータ | ステージ1 | ステージ8（上限） |
|---|---|---|
| HP | 30 | 30 |
| 移動速度 | 114px/秒 | 200px/秒 |
| 弾速 | 267px/秒 | 500px/秒 |
| 射撃間隔 | 1644ms | 400ms |
| 当たり判定 | 半径 20px | 半径 20px |
| 弾の当たり判定 | 半径 5px | 半径 5px |
| 撃破スコア | +30 | +30 |

- 攻撃敵の HP は 30（自機弾ダメージ 10 × 3 発で撃破）
- 40% の確率でジグザグ移動バリアントとして出現。ジグザグ型は3方向同時発射（中央±20°）、通常型は自機への1方向狙い撃ち

#### 回復敵パラメータ

| パラメータ | 値 |
|---|---|
| HP | 1 |
| 移動速度 | 65px/秒 |
| 当たり判定 | 半径 14px |
| 撃破スコア | +0 |
| 出現ルール | 15〜25秒ごとに1体（タイマー制）。ボス戦中は出現しない |
| 形状 | 緑の円（`#00CC88`）に白い十字 |

- 倒すと残機+1（上限なし）
- 出現間隔が長く、ゲームバランスを崩さない頻度に設定

#### 攻撃敵の出現間隔・比率

| ステージ | 出現ルール |
|---|---|
| 1〜2 | 雑魚敵3体ごとに攻撃敵1体 |
| 3〜4 | 雑魚敵2体ごとに攻撃敵1体 |
| 5〜8 | 雑魚敵1体ごとに攻撃敵1体（交互） |

- 攻撃敵のスポーン間隔は雑魚敵と同じ出現間隔テーブルを共有

#### 難易度スケーリング（ステージ毎）

- ステージ1〜8 にかけて敵速度・出現間隔・弾速を線形に強化（ステージ8で上限）
- **難易度選択 (EASY / NORMAL)**:
  - スタート画面で選択し、`/game?mode=easy` または `/game?mode=normal` で遷移する
  - EASY では NORMAL の値に以下の補正をかける

| 項目 | EASY 補正 |
|---|---|
| 雑魚敵・攻撃敵の移動速度 | ×0.7 |
| 攻撃敵・ボスの弾速 | ×0.6 |
| 雑魚敵の出現間隔、攻撃敵・ボスの射撃間隔 | ×1.5 |
| ボスの HP | ×0.6（切り捨て） |
| ボスの移動速度 | ×0.8 |

### 2.6 ボス仕様

| パラメータ | ステージ1 | ステージ毎の増加 | 上限 |
|---|---|---|---|
| HP | 450 | +150 | ステージ8で 1500 |
| 移動速度 | 70px/秒 | +15px/秒 | 150px/秒 |
| 当たり判定 | 半径 40px | 固定 | — |
| BOSS_APPEARING 演出時間 | 1.5秒 | 固定 | — |

- 値は NORMAL。EASY は HP ×0.6、移動速度 ×0.8

#### ボスの移動パターン

- 自機の X 座標に向かって緩やかに追尾（Y 方向は画面上部 1/4 エリア内で固定）
- 追尾速度はボスの移動速度パラメータに従う（最大 150px/秒）
- X 座標は 50〜340px の範囲に制限
- 画面外（y = -60）から降下し、y = 120px で停止する

#### 弾幕パターン

射撃間隔・弾速はステージ1〜8 で線形に強化される（NORMAL の値）。

**パターン1（HP 50% 超）**
- 自機へ向けて 1 発ずつ狙い撃ち
- 射撃間隔: 689ms → 300ms
- 弾速: 294px/秒 → 450px/秒

**パターン2（HP 50% 以下〜25% 超）**
- 前方 5 方向に扇形同時発射（中央±20°、±40°）
- 射撃間隔: 1044ms → 500ms
- 弾速: 344px/秒 → 500px/秒

**パターン3（HP 25% 以下）**
- 3方向同時発射（120°間隔）、発射のたびに角度が回転するスパイラル弾幕
- 射撃間隔: 422ms → 150ms
- 弾速: 371px/秒 → 550px/秒
- `movePhase` を毎回 30° 進めて回転させる

- パターンは一方向のみ（閾値で固定切替、前パターンに戻らない）

### 2.7 スコア

| イベント | スコア |
|---|---|
| 雑魚敵（通常）撃破 | +10 |
| 攻撃敵撃破 | +30 |
| ボス撃破 | +500 |
| ステージクリアボーナス | ステージ番号 × 100 |

- **累計スコア**: ゲーム全体通算（ハイスコアの比較対象）
- **ステージ内スコア**: ステージ開始時にリセット（ボス出現トリガー用）
- ステージクリアボーナスは `STAGE_CLEAR` 状態へ遷移した瞬間に累計スコアへ加算する
- ハイスコアは `localStorage`（キー `shooting-highscore`）に保存（使用不可時はセッション内のみ表示）
- ゲームオーバー・ゲームクリア時にプレイ記録（スコア・到達ステージ・敵種別ごとの撃破数）を `localStorage`（キー `shooter-stats`）に保存し、スタート画面の統計モーダルで表示する

### 2.8 パワーアップシステム

ボスを倒してステージクリアすると、次のステージ開始前にパワーアップを1つ選択できる。

#### 選択肢

| 種類 | ラベル | 効果 | 上限 |
|---|---|---|---|
| HP回復 | HP +1 | 残機を1回復 | なし |
| HP回復（大） | HP +2 | 残機を2回復 | なし |
| 連射強化 | 連射強化 | 発射間隔 -30ms | 80ms（下限） |
| 弾速強化 | 弾速強化 | 弾速 +120px/秒 | 1080px/秒 |
| 武器強化 | 武器強化 | 武器レベル +1 | Lv.3 |

- 左半分タップ → 左の選択肢（ステージ1〜4 クリア後は HP +1、ステージ5以降は HP +2）
- 右半分タップ → 右の選択肢
  - ステージ3・5 クリア後で武器レベルが3未満なら武器強化
  - それ以外は連射強化 or 弾速強化をランダム
- ステージ8クリア後はパワーアップ選択を経ずに `GAME_CLEAR` へ遷移する
- ゲームオーバー → リトライでパラメータはリセット

### 2.9 状態遷移（State Machine）

#### 状態一覧

| 状態 | 説明 |
|---|---|
| `IDLE` | スタート画面。ゲーム未開始 |
| `PLAYING` | ゲームプレイ中（雑魚敵フェーズ） |
| `BOSS_APPEARING` | ボス出現演出中（1.5秒）。敵・弾の更新停止、自機無敵 |
| `BOSS_FIGHT` | ボス戦中 |
| `STAGE_CLEAR` | ステージクリア演出中（2秒）。全敵・全弾を即時消去 |
| `POWER_UP_SELECT` | パワーアップ選択画面。タップで左右どちらかを選択 |
| `PAUSED` | バックグラウンド移行による自動一時停止 |
| `COUNTDOWN` | 復帰後カウントダウン（2秒）。操作不可 |
| `GAME_OVER` | ゲームオーバー画面 |
| `GAME_CLEAR` | ゲームクリア画面（ステージ8クリア時） |

#### 遷移図

```
IDLE
  ─[スタートボタンタップ]→ PLAYING

PLAYING
  ─[ステージ内スコア≥閾値]→ BOSS_APPEARING
  ─[残機 = 0]→ GAME_OVER
  ─[visibilitychange: hidden]→ PAUSED

BOSS_APPEARING
  ─[演出 1.5 秒経過]→ BOSS_FIGHT
  ─[visibilitychange: hidden]→ PAUSED

BOSS_FIGHT
  ─[ボス HP = 0]→ STAGE_CLEAR
  ─[残機 = 0]→ GAME_OVER
  ─[visibilitychange: hidden]→ PAUSED

STAGE_CLEAR
  ─[演出 2 秒経過・ステージ1〜7]→ POWER_UP_SELECT
  ─[演出 2 秒経過・ステージ8]→ GAME_CLEAR
  ─[visibilitychange: hidden]→ PAUSED

POWER_UP_SELECT
  ─[タップ選択]→ PLAYING（次ステージ、自機位置リセット）
  ─[visibilitychange: hidden]→ PAUSED

PAUSED
  ─[visibilitychange: visible]→ COUNTDOWN
  ※ BOSS_APPEARING / STAGE_CLEAR 中に PAUSED になった場合、resumeTo の elapsed はリセット（演出を最初からやり直す）

COUNTDOWN
  ─[カウントダウン 2 秒完了]→ 一時停止前の状態へ復帰
  ─[visibilitychange: hidden]→ PAUSED（カウントダウンをリセットして再度待機）

GAME_OVER / GAME_CLEAR
  ─[リトライ / もう一度遊ぶ]→ PLAYING（ステージ1から）
  ─[ホームボタン]→ スタート画面
```

### 2.10 画面構成

| 画面 | 内容 |
|---|---|
| スタート画面（IDLE） | タイトル、ハイスコア表示、難易度選択（EASY / NORMAL）ボタン、RANKINGボタン、統計ボタン |
| ゲーム画面 | Canvas描画 + HUD（スコア・残機・ステージ番号） |
| ゲームオーバー画面 | 累計スコア、ハイスコア、到達ステージ、スコア投稿フロー、リトライ/ホームボタン |
| ゲームクリア画面 | 累計スコア、ハイスコア、スコア投稿フロー、もう一度遊ぶ/ホームボタン |
| リーダーボード（オーバーレイ） | トップ20のランキング表示、自分のスコアをハイライト、閉じるボタン |
| 統計（オーバーレイ） | プレイ回数・ベストスコア・最大到達ステージ・総撃破数（敵種別）・スコア履歴のローカル記録 |

### 2.11 オンラインリーダーボード

文化祭などのイベントで多人数が遊ぶことを想定したランキング機能。

#### バックエンド
- Firebase Firestore（Spark = 無料プラン）を利用
- Next.js API Routes (`/api/scores`) からのみアクセス。クライアントから Firestore へ直接アクセスはしない
- Firestore セキュリティルールはすべて拒否に設定し、サーバーサイドの Firebase Admin SDK のみが読み書きする

#### データ構造
Firestore コレクション（環境ごとに分離）:
- 本番環境 (Production): `scores`
- 開発・プレビュー環境 (Preview/Local): `scores_dev`

| フィールド | 型 | 説明 |
|---|---|---|
| `name` | string | プレイヤー名（1〜10文字） |
| `score` | number | スコア |
| `stage` | number | 到達ステージ（1〜8） |
| `createdAt` | Timestamp | 投稿日時 |

#### API エンドポイント

| メソッド | パス | 機能 |
|---|---|---|
| GET | `/api/scores` | トップ20を取得。`export const revalidate = 10` で Edge Cache を10秒間利用 |
| POST | `/api/scores` | スコア投稿。リクエストボディ: `{ name, score, stage }`。レスポンス: `{ ok: true, rank }` |

#### バリデーション（サーバーサイド）

| 項目 | ルール |
|---|---|
| 名前 | 正規表現 `/^[\p{L}\p{N}\s\-_.]{1,10}$/u`（Unicode 文字・数字・一部記号、1〜10文字） |
| スコア | 0以上 9,999,999以下の整数 |
| ステージ | 1〜8 の整数 |
| ステージ別上限 | 理論最大スコアの1.5倍を超えた場合は400エラー |

ステージ別スコア上限（チート対策）:

| ステージ | 累計理論最大 | バリデーション上限 |
|---|---|---|
| 1 | 1,330 | 2,000 |
| 2 | 2,960 | 4,500 |
| 3 | 4,890 | 7,400 |
| 4 | 7,120 | 10,700 |
| 5 | 9,650 | 14,500 |
| 6 | 12,480 | 18,800 |
| 7 | 15,610 | 23,500 |
| 8 | 19,040 | 28,600 |

#### UX フロー
- ゲームオーバー / クリア時に「スコアを投稿」ボタン → 名前入力 → 投稿 → 「#N位で登録しました！」の表示 → 「ランキングを見る」ボタン
- **※注意**: EASYモードでプレイした場合は公平性を保つため「スコアを投稿」フローが表示されず、ランキング登録対象外となる。
- 名前は localStorage（キー `shooter-player-name`）に保存し、次回プレイ時に自動復元
- 入力欄のデフォルト値は前回の名前、なければ `PLAYER`
- スタート画面の `RANKING` ボタンからもトップ20を閲覧可能

---

## 3. 非機能要件

| 項目 | 要件 |
|---|---|
| 動作環境 | スマートフォンブラウザ（iOS Safari / Android Chrome） |
| 画面向き | Portrait（縦）固定。横向き時は回転促進メッセージを表示 |
| フレームレート | delta-time ベース（上限クランプ: 100ms）。目標 60fps |
| オフライン | PWA（Serwist）によりオフラインプレイ可能 |
| サウンド | なし |
| パワーアップ | ステージクリア後に2択（HP回復 / 連射・弾速・武器強化） |
| データベース | Firebase Firestore（オンラインランキングのみ）。その他はローカル保存 |
| Canvas解像度 | `devicePixelRatio` スケーリング（Retina対応） |
| バックグラウンド | `visibilitychange` イベントで自動一時停止・2秒カウントダウン後再開 |
| localStorage 不可時 | スコアはセッション内のみ表示（エラーにしない） |
| タッチイベント | `passive: false` で `addEventListener` に直接登録し `preventDefault()` でスクロール抑制 |
| セーフエリア | `env(safe-area-inset-*)` を適用。ゲームプレイ領域はセーフエリアを除いた範囲 |

### Canvas 解像度戦略

- 論理解像度: 390 × 844 を固定（iPhone 14 相当）
- `canvas.width = 390 * devicePixelRatio`、`canvas.height = 844 * devicePixelRatio` で描画バッファを確保
- CSS サイズは `width: 390px`、`height: 844px` に固定し、セーフエリアは Canvas の**外側**で CSS（`env(safe-area-inset-*)`）によりレイアウト調整
- 全ての座標・速度・当たり判定は論理ピクセル（390×844）基準で計算（セーフエリアの影響を受けない）

---

## 4. 技術スタック

| 役割 | 技術 |
|---|---|
| フレームワーク | Next.js 14 (App Router) |
| 言語 | TypeScript |
| ゲーム描画 | Canvas API + requestAnimationFrame（delta-time ベース） |
| 操作 | Touch Events API（`addEventListener` で `passive: false` 登録） |
| ローカル保存 | localStorage（ハイスコア・プレイヤー名・統計。使用不可時はフォールバック） |
| オンラインランキング | Firebase Firestore + Firebase Admin SDK（API Routes 経由） |
| オフライン対応 | PWA（Serwist） ※ next-pwa は App Router 非互換のため不採用 |
| テスト | Vitest |
| デプロイ | Vercel |
| バージョン管理 | GitHub |

---

## 5. アーキテクチャ

### 5.1 ディレクトリ構成

```
src/
  app/
    page.tsx              # スタート画面（'use client'）
    game/
      page.tsx            # ゲーム画面（'use client'）
    layout.tsx            # PWA設定・メタタグ・Portrait固定・セーフエリア
    sw.ts                 # Serwist Service Worker エントリポイント
    api/
      scores/route.ts     # ランキングAPI（GET / POST）
  components/
    GameCanvas.tsx        # 'use client' Canvas コンポーネント
    HUD.tsx               # pointer-events: none のHTML要素でCanvas上に重ねる
    Leaderboard.tsx       # ランキング表示
    StatsModal.tsx        # プレイ履歴・統計表示
    RotatePrompt.tsx      # 横向き時の回転促進メッセージ
  lib/
    firestore.ts          # Firebase Admin SDK（サーバー専用）
    game/
      engine.ts           # ゲームループ（requestAnimationFrame + delta-time）
      state.ts            # State Machine（型定義）
      player.ts           # 自機
      enemy.ts            # 敵（通常・攻撃・回復・ボス）
      bullet.ts           # 弾（自機弾・敵弾）
      collision.ts        # 衝突判定（円同士）
      score.ts            # スコア管理・localStorage
      stats.ts            # プレイ履歴・統計
      difficulty.ts       # ステージ・難易度別パラメータ管理
      touch.ts            # タッチ入力バッファ管理
      __tests__/          # Vitest のテスト
  public/
    manifest.json         # PWAマニフェスト
    icons/                # PWAアイコン（192×192, 512×512）
```

### 5.2 ゲームループ（delta-time ベース）

```typescript
// useEffect でループ開始、クリーンアップで cancelAnimationFrame
let animationId: number
let prevTime = 0

function loop(currentTime: number) {
  const delta = Math.min(currentTime - prevTime, 100) // 上限 100ms クランプ
  prevTime = currentTime

  update(delta)   // 状態更新（移動・弾・衝突・難易度）
  render()        // Canvas 描画（clear → 背景 → 敵 → 自機 → 弾 → HUD）

  animationId = requestAnimationFrame(loop)
}

// visibilitychange: hidden → cancelAnimationFrame
// visibilitychange: visible → COUNTDOWN 状態で 2 秒後にループ再開
```

### 5.3 State Machine（型定義）

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

### 5.4 HUD の重ね合わせ

- HUD は CSS `position: absolute` の HTML 要素で Canvas に重ねる
- `pointer-events: none` を付与してタッチ入力と干渉しないようにする
- スコア・残機・ステージ番号を上部に表示

### 5.5 Serwist（PWA）設定

必要なファイル:

1. `src/app/sw.ts` — Service Worker エントリポイント
2. `next.config.js` — `withSerwist` でラップ
3. `public/manifest.json` — PWA マニフェスト

#### manifest.json 必須フィールド

```json
{
  "name": "暇つぶしシューティング",
  "short_name": "シューティング",
  "description": "スマホで遊べる縦スクロールシューティング",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#000000",
  "theme_color": "#000000",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

---

## 6. デプロイ

- **Vercel** にプッシュ → 自動デプロイ
- `main` ブランチ = 本番環境（Firestore コレクション `scores`）
- `dev` ブランチ = 開発・プレビュー環境（Firestore コレクション `scores_dev`）
- 環境変数 `FIREBASE_SERVICE_ACCOUNT_KEY` が必要
- iOS Safari では `beforeinstallprompt` が非対応のため、インストール誘導は「Safari の共有ボタンからホーム画面に追加」の案内テキストで対応

---

## 7. ビジュアル仕様

### 7.1 背景

- 黒背景（`#000000`）に星のパーティクルを散りばめた宇宙風
- 星は小さな白い点（半径 1〜2px）をランダム配置し、ゆっくり下方向にスクロール（奥行き感）
- 星の数: 約 80 個（パフォーマンス優先）

### 7.2 自機

- 白い上向き三角形（Canvas の `fillStyle: '#FFFFFF'`）
- サイズ: 幅 24px × 高さ 30px
- 被弾・無敵中は点滅（100ms 単位でオン/オフ）

### 7.3 敵

| 種類 | 形状 | 色 |
|---|---|---|
| 雑魚敵（通常） | 下向き三角形 | `#FF4444`（赤） |
| 攻撃敵（直進型） | 下向き三角形（やや大きめ） | `#FF8800`（オレンジ） |
| 攻撃敵（ジグザグ型） | 下向き三角形（やや大きめ） | `#FFAA00`（明るいオレンジ） |
| 回復敵 | 円 + 白十字 | `#00CC88`（緑） |
| ボス | 横長の六角形 | `#AA00FF`（紫）、HP ゲージを上部に表示 |

- 弾（自機）: 小さな黄色い円（半径 4px、`#FFFF00`）
- 弾（敵）: 小さな赤い円（半径 5px、`#FF4444`）
- ボスの弾: やや大きめの赤い円（半径 7px、`#FF0000`）

### 7.4 ステージクリア演出

- 全敵・全敵弾を即時消去
- 画面中央に `"STAGE CLEAR!"` テキストを 2 秒間表示（白文字、大きめフォント）
- 2 秒後にパワーアップ選択画面（`POWER_UP_SELECT`）へ移行

### 7.5 パワーアップ選択画面

- 半透明黒オーバーレイの上に2つのボックスを横並びで表示
- 左ボックス（青 `#1A4488`）: HP +1 / HP +2
- 右ボックス（橙 `#885500`）: 武器強化 / 連射強化 / 弾速強化
- 選択後に次ステージ開始（自機位置を画面下中央にリセット）

---

## 8. 未決定事項

なし。今後の追加機能は `docs/tasks.md` を参照。
