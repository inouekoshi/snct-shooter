# 暇つぶしシューティングゲーム 仕様書

> バージョン: v0.3.0  
> 最終更新: 2026-05-05

---

## 1. プロジェクト概要

スマートフォンのブラウザで動作する縦スクロール型シューティングゲーム。  
オフラインでも遊べ、1セッション約15分の暇つぶしを目的とする。  
Chromeの恐竜ゲームのように、軽量・シンプルで誰でも即プレイ可能。

---

## 2. ゲーム仕様

### 2.1 ゲーム進行（ステージ制）

- ステージ制を採用。ボスを倒すと次のステージへ進む
- ステージが進むほど雑魚敵・ボスが強化される（ステージ5以降は難易度キャップ）
- ゲームオーバー後はスタート画面（IDLE）へ戻る（ステージリセット）
- ステージ数に上限なし

### 2.2 ボス出現条件

- 各ステージで「ステージ内スコア」が閾値に達するとボス出現
  - ステージ内スコアはステージ開始時にリセットされる（累計スコアとは別管理）
- ボス出現中は雑魚敵の出現を停止
- ボスを倒すとステージクリア → 次のステージへ

| ステージ | ボス出現ステージ内スコア |
|---|---|
| 1 | 300 |
| 2 | 500 |
| 3〜 | 700（固定） |

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

| パラメータ | 値 |
|---|---|
| 残機 | 3 |
| 移動 | 指の位置に即時追従（ゲームループ内で同期） |
| 移動可能範囲 | Canvas端から上下左右 20px のパディング内 |
| 自動連射間隔 | 200ms ごとに1発 |
| 弾のダメージ | 10 |
| 弾速 | 600px/秒 |
| 当たり判定 | 自機中心から半径 12px の円 |
| 無敵時間 | 被弾後 2 秒間（点滅でフィードバック） |

- 敵または敵弾に接触すると残機 -1、2秒間無敵
- 残機 0 でゲームオーバー

### 2.5 敵の種類

| 種類 | 当たり判定 | 備考 |
|---|---|---|
| 雑魚敵（通常） | 半径 15px | 直進のみ |
| 攻撃敵 | 半径 15px | 自機への狙い撃ち弾あり |
| ボス | 半径 40px | HP ゲージ・2段階弾幕 |

#### 雑魚敵（通常）パラメータ

| パラメータ | ステージ1 | ステージ5以降（上限） |
|---|---|---|
| HP | 1 | 1 |
| 移動速度 | 80px/秒 | 200px/秒 |
| 出現間隔 | 1200ms | 400ms |
| 撃破スコア | +10 | +10 |

#### 攻撃敵パラメータ（ステージ2から出現）

| パラメータ | ステージ2 | ステージ5以降（上限） |
|---|---|---|
| HP | 30 | 30 |
| 移動速度 | 60px/秒 | 140px/秒 |
| 弾速 | 200px/秒 | 350px/秒 |
| 射撃間隔 | 2000ms | 800ms |
| 撃破スコア | +30 | +30 |

- 攻撃敵の HP は 30（自機弾ダメージ 10 × 3 発で撃破）
- ステージ1は雑魚敵（通常）のみ

#### 難易度スケーリング（ステージ毎）

- ステージ2〜5 にかけて敵速度・出現間隔・弾速を線形増加
- ステージ5以降は上限値にキャップ

### 2.6 ボス仕様

| パラメータ | ステージ1 | ステージ毎の増加 | 上限 |
|---|---|---|---|
| HP | 100 | +50 | 上限なし |
| 移動速度 | 40px/秒 | +10px/秒 | 100px/秒 |
| 当たり判定 | 半径 40px | 固定 | — |
| BOSS_APPEARING 演出時間 | 1.5秒 | 固定 | — |

- 自機弾ダメージ 10 × 10 発 = 最短 2 秒で撃破可能（理想）
- 実際には命中率を考慮し 20〜30 秒程度の戦闘時間を想定

#### 弾幕パターン

**パターン1（HP 100〜51%）**
- 自機へ向けて 1 発ずつ狙い撃ち
- 射撃間隔: 800ms
- 弾速: 250px/秒

**パターン2（HP 50% 以下）**
- 前方 5 方向に扇形同時発射（中央±20°、±40°）
- 射撃間隔: 1200ms
- 弾速: 300px/秒

- パターンは一方向のみ（HP50%以下で固定切替、パターン1に戻らない）
- 将来的な第3フェーズ追加の拡張ポイントとして留保

### 2.7 スコア

| イベント | スコア |
|---|---|
| 雑魚敵（通常）撃破 | +10 |
| 攻撃敵撃破 | +30 |
| ボス撃破 | +500 |
| ステージクリアボーナス | ステージ番号 × 100 |

- **累計スコア**: ゲーム全体通算（ハイスコアの比較対象）
- **ステージ内スコア**: ステージ開始時にリセット（ボス出現トリガー用）
- ハイスコアは `localStorage` に保存（使用不可時はセッション内のみ表示）

### 2.8 状態遷移（State Machine）

#### 状態一覧

| 状態 | 説明 |
|---|---|
| `IDLE` | スタート画面。ゲーム未開始 |
| `PLAYING` | ゲームプレイ中（雑魚敵フェーズ） |
| `BOSS_APPEARING` | ボス出現演出中（1.5秒）。敵・弾の更新停止、自機無敵 |
| `BOSS_FIGHT` | ボス戦中 |
| `STAGE_CLEAR` | ステージクリア演出中（2秒）。全敵・全弾を即時消去、自機無敵 |
| `PAUSED` | バックグラウンド移行による自動一時停止 |
| `COUNTDOWN` | 復帰後カウントダウン（2秒）。操作不可 |
| `GAME_OVER` | ゲームオーバー画面 |

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
  ─[演出 2 秒経過]→ PLAYING（次ステージ、自機位置リセット）
  ─[visibilitychange: hidden]→ PAUSED

PAUSED
  ─[visibilitychange: visible]→ COUNTDOWN

COUNTDOWN
  ─[カウントダウン 2 秒完了]→ 一時停止前の状態へ復帰
  ─[visibilitychange: hidden]→ PAUSED（カウントダウンをリセットして再度待機）

GAME_OVER
  ─[リトライボタンタップ]→ IDLE
```

### 2.9 画面構成

| 画面 | 内容 |
|---|---|
| スタート画面（IDLE） | タイトル、ハイスコア表示、スタートボタン |
| ゲーム画面 | Canvas描画 + HUD（スコア・残機・ステージ番号） |
| ゲームオーバー画面 | 累計スコア、ハイスコア、到達ステージ、リトライボタン |

---

## 3. 非機能要件

| 項目 | 要件 |
|---|---|
| 動作環境 | スマートフォンブラウザ（iOS Safari / Android Chrome） |
| 画面向き | Portrait（縦）固定。横向き時は回転促進メッセージを表示 |
| フレームレート | delta-time ベース（上限クランプ: 100ms）。目標 60fps |
| オフライン | PWA（Serwist）によりオフラインプレイ可能 |
| サウンド | なし |
| パワーアップ | なし |
| データベース | 不要（ローカルのみ） |
| Canvas解像度 | `devicePixelRatio` スケーリング（Retina対応） |
| バックグラウンド | `visibilitychange` イベントで自動一時停止・2秒カウントダウン後再開 |
| localStorage 不可時 | スコアはセッション内のみ表示（エラーにしない） |
| タッチイベント | `passive: false` で `addEventListener` に直接登録し `preventDefault()` でスクロール抑制 |
| セーフエリア | `env(safe-area-inset-*)` を適用。ゲームプレイ領域はセーフエリアを除いた範囲 |

### Canvas 解像度戦略

- 論理解像度: 390 × 844 を基準（iPhone 14 相当）
- `canvas.width/height = 論理サイズ × devicePixelRatio` で描画バッファを確保
- CSS サイズは `width: 100%`、`max-width: 390px` に設定
- 実際のプレイ領域は上下セーフエリアを除いた高さを基準に調整
- 全ての座標・速度・当たり判定は論理ピクセル（390×844）基準で計算

---

## 4. 技術スタック

| 役割 | 技術 |
|---|---|
| フレームワーク | Next.js 14 (App Router) |
| 言語 | TypeScript |
| ゲーム描画 | Canvas API + requestAnimationFrame（delta-time ベース） |
| 操作 | Touch Events API（`addEventListener` で `passive: false` 登録） |
| スコア保存 | localStorage（使用不可時はフォールバック） |
| オフライン対応 | PWA（Serwist） ※ next-pwa は App Router 非互換のため不採用 |
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
  components/
    GameCanvas.tsx        # 'use client' Canvas コンポーネント
    HUD.tsx               # pointer-events: none のHTML要素でCanvas上に重ねる
    RotatePrompt.tsx      # 横向き時の回転促進メッセージ
  lib/
    game/
      engine.ts           # ゲームループ（requestAnimationFrame + delta-time）
      state.ts            # State Machine（型定義と遷移ロジック）
      player.ts           # 自機クラス
      enemy.ts            # 敵クラス（通常・攻撃・ボス）
      bullet.ts           # 弾クラス（自機弾・敵弾）
      collision.ts        # 衝突判定（円同士）
      score.ts            # スコア管理・localStorage
      difficulty.ts       # ステージ別難易度パラメータ管理
      touch.ts            # タッチ入力バッファ管理
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
  | { type: 'PAUSED'; resumeTo: GameState }
  | { type: 'COUNTDOWN'; resumeTo: GameState; remaining: number }
  | { type: 'GAME_OVER'; score: number; stage: number }
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
- `main` ブランチ = 本番環境
- iOS Safari では `beforeinstallprompt` が非対応のため、インストール誘導は「Safari の共有ボタンからホーム画面に追加」の案内テキストで対応

---

## 7. 未決定事項（TODO）

- [ ] 背景のビジュアル（シンプル単色＋星のパーティクル案が有力）
- [ ] 自機・敵のビジュアル（シンプル図形で実装、画像なしの方向で検討）
- [ ] ステージクリア演出の具体的な表現（テキスト表示のみ？フラッシュ？）
