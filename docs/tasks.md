# 今後のタスク・マイルストーン

本ドキュメントは、「暇つぶしシューティングゲーム」の開発計画と進捗をまとめたものです。
個々のタスクは [GitHub Issues](https://github.com/inouekoshi/snct-shooter/issues) で管理し、ここでは全体像と方向性を示します。

## 🎯 ビジョン
**「プレイ中の楽しさを追求する」**
単なる暇つぶしにとどまらず、操作の気持ちよさ（Game Feel）、敵を倒した際の爽快感、スコアを稼ぐことへのモチベーションを最大化する。

---

## 🚧 未完了のタスク

### リリース準備（dev → main）
`dev` にたまった変更を本番に出すまでの作業。実装は終わっていて、残りは実機での確認と判断。GitHub のマイルストーン「リリース準備（dev → main）」で管理。

| Issue | 内容 |
|---|---|
| [#17](https://github.com/inouekoshi/snct-shooter/issues/17) | devの変更（EXTRAモード・不具合修正など）をmainにリリースする。確認項目のチェックリストはこの Issue にある（Node.js 22 でのビルドとランキング API の CDN キャッシュは確認済み） |
| [#4](https://github.com/inouekoshi/snct-shooter/issues/4) | 上位100件より下のスコアの順位が正しく表示されない（`count()` で実装済み。dev プレビューでの確認待ち。`scores_dev` が空なので、100位より下まで見るにはテストデータが要る） |
| [#1](https://github.com/inouekoshi/snct-shooter/issues/1) | EXTRAモードの難易度を実機プレイで調整する。リリース前に済ませるか後に回すかは未定 |

### Phase 4: オンライン化（マルチプレイ・ソーシャル機能）
他プレイヤーとの繋がりを持たせ、ゲームの寿命をさらに延ばす。GitHub のマイルストーン「Phase 4: オンライン化」で管理。

| Issue | 内容 |
|---|---|
| [#27](https://github.com/inouekoshi/snct-shooter/issues/27) | ゲームの更新間隔（delta-time）を固定する。#9 と #10 に共通する前提なので、Phase 4 はここから着手する |
| [#9](https://github.com/inouekoshi/snct-shooter/issues/9) | オンライン対戦（スコアアタック）モード |
| [#10](https://github.com/inouekoshi/snct-shooter/issues/10) | ゴーストデータの共有 |
| [#8](https://github.com/inouekoshi/snct-shooter/issues/8) | リアルタイム協力プレイ（Co-op） |

スコアアタックとゴーストのもう1つの前提だった「ゲーム内の乱数のシード化」は [#21](https://github.com/inouekoshi/snct-shooter/issues/21) で完了している。

### 開発基盤

| Issue | 内容 |
|---|---|
| [#28](https://github.com/inouekoshi/snct-shooter/issues/28) | 開発用の依存（eslint-config-next 経由の braces）に脆弱性が残っている。本番の依存は0件で、CI も本番の依存だけを見ている |

---

## ✅ 完了したマイルストーン

### Phase 1: プレイフィールの向上
- **難易度選択（EASY / NORMAL）**: 初心者向けに敵の速度・弾速・出現頻度を抑えた EASY を追加。EASY はランキング対象外
- **エフェクト**: 敵撃破時の破片パーティクル、被弾時・ボス撃破時の画面揺れ（`effects.ts`）

### Phase 2: 競技性とリプレイ性の強化
- **オンラインランキング**: Firestore をバックエンドに、API Routes（`/api/scores`）経由でトップ20を表示。ステージ別スコア上限で簡易チート対策。詳細は [architecture.md §4](architecture.md#4-オンラインリーダーボード)
- **プレイ履歴と統計**: スコア履歴・最大到達ステージ・敵種別の撃破数をローカルに記録

### Phase 3: エンドコンテンツ
- **EXTRA モード**: NORMAL クリアで解禁される全3ステージの高難度モード。専用の最終ボス、武器 Lv.4（5-Way）・Lv.5（貫通レーザー）、EXTRA 専用ランキング。詳細は [spec.md §2.12](spec.md#212-extra-モード)

### 不具合修正・改善（2026-10 / `dev` に反映済み、本番は #17 で反映）
- ランキング: 投稿した1件だけハイライト・同点は同順位（#3）、取得エラーの表示（#13）、名前の文字チェックの案内（#15）、NG ワードフィルタ（#5）、投稿の緊急停止スイッチと IP ごとの投稿回数制限（#20）
- EASY のハイスコアを NORMAL と分離（#11）、統計の BEST SCORE を累積保存（#12）
- オートガード（#6）: 敵を倒してゲージを溜め、満タンで被弾すると残機の代わりに使って敵弾を消す
- 回復敵に触れたら回収（#2）、狙い撃ちの照準を仕様書に明記（#14）
- スタート画面の hydration mismatch（#16）、Service Worker で `/api/*` をキャッシュしない
- ゲーム内の乱数のシード化（#21）
- ランキング取得 API を CDN で10秒キャッシュ（#22）、一時停止中に HOME へ戻れる（#23）、`@types/react` を React 本体にそろえる（#24）
- 同じフレームで敵弾と敵に触れると残機が2つ減る不具合、再開のカウントダウン中にバックグラウンドへ移っても止まらない不具合を修正
- 一時停止中とカウントダウン中に HUD のステージ表示が 1 に戻る不具合を修正

### 開発基盤
- Vitest によるゲームロジック・API・ゲームエンジンのユニットテスト（`npm test`）
- ESLint（`npm run lint`、#19）と GitHub Actions の CI（脆弱性チェック・テスト・Lint・ビルド、#18・#26）
- 依存パッケージの脆弱性を解消（#25）: Next.js 14 → 15.5、React 19、firebase-admin 14、Vitest 5。Node.js 22 を指定
- CI で本番の依存の脆弱性をチェックし、Dependabot で依存の更新 PR を自動作成（#26）
- リファクタリング（2026-10-14）: `engine.ts` の更新処理を状態ごとの関数に分割し、画面サイズの直書きと重複した処理を共通化。未使用の SVG アイコン・autoprefixer を削除
- `main`（本番）/ `dev`（プレビュー）のブランチ運用と Firestore コレクションの環境分離
- MIT License（#7）

---

## 📝 備考
- オフライン対応（PWA）と Firestore のオンラインランキングが共存。投稿時のみオンライン接続が必要で、PWA キャッシュには `/api/*` を含めない。
- 不適切なプレイヤー名は NG ワードフィルタ（#5）で投稿時に弾く。すり抜けた名前は Firebase コンソールから手動で削除し、必要なら環境変数 `NG_WORDS` に語を追加する。スクリプトによる大量投稿は IP ごとの回数制限（1分20件、`SCORES_RATE_LIMIT_PER_MINUTE`）で止め、荒らされたときは `SCORES_SUBMISSION_DISABLED=1` で投稿そのものを止められる。
