# 今後のタスク・マイルストーン

本ドキュメントは、「暇つぶしシューティングゲーム」の開発計画と進捗をまとめたものです。
個々のタスクは [GitHub Issues](https://github.com/inouekoshi/snct-shooter/issues) で管理し、ここでは全体像と方向性を示します。

## 🎯 ビジョン
**「プレイ中の楽しさを追求する」**
単なる暇つぶしにとどまらず、操作の気持ちよさ（Game Feel）、敵を倒した際の爽快感、スコアを稼ぐことへのモチベーションを最大化する。

---

## 🚧 未完了のタスク

### リリース・確認待ち

| Issue | 内容 |
|---|---|
| [#17](https://github.com/inouekoshi/snct-shooter/issues/17) | devの変更（EXTRAモード・不具合修正など）をmainにリリースする |
| [#4](https://github.com/inouekoshi/snct-shooter/issues/4) | 上位100件より下のスコアの順位が正しく表示されない（`count()` で実装済み。dev プレビューでの確認待ち） |
| [#1](https://github.com/inouekoshi/snct-shooter/issues/1) | EXTRAモードの難易度を実機プレイで調整する |

### 改善・要検討

| Issue | 内容 |
|---|---|
| [#20](https://github.com/inouekoshi/snct-shooter/issues/20) | ランキングAPIに連投の制限がない（緊急停止スイッチは実装済み。レート制限は方針の検討中） |
| [#6](https://github.com/inouekoshi/snct-shooter/issues/6) | スキル（必殺技）システムの検討 |

### Phase 4: オンライン化（マルチプレイ・ソーシャル機能）
他プレイヤーとの繋がりを持たせ、ゲームの寿命をさらに延ばす。GitHub のマイルストーン「Phase 4: オンライン化」で管理。

| Issue | 内容 |
|---|---|
| [#8](https://github.com/inouekoshi/snct-shooter/issues/8) | リアルタイム協力プレイ（Co-op） |
| [#9](https://github.com/inouekoshi/snct-shooter/issues/9) | オンライン対戦（スコアアタック）モード |
| [#10](https://github.com/inouekoshi/snct-shooter/issues/10) | ゴーストデータの共有 |

スコアアタックとゴーストの前提だった「ゲーム内の乱数のシード化」は [#21](https://github.com/inouekoshi/snct-shooter/issues/21) で完了。完全な再現には、さらに更新間隔（delta-time）の固定が必要。

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
- ランキング: 投稿した1件だけハイライト・同点は同順位（#3）、取得エラーの表示（#13）、名前の文字チェックの案内（#15）、NG ワードフィルタ（#5）、投稿の緊急停止スイッチ（#20 の一部）
- EASY のハイスコアを NORMAL と分離（#11）、統計の BEST SCORE を累積保存（#12）
- 回復敵に触れたら回収（#2）、狙い撃ちの照準を仕様書に明記（#14）
- スタート画面の hydration mismatch（#16）、Service Worker で `/api/*` をキャッシュしない
- ゲーム内の乱数のシード化（#21）

### 開発基盤
- Vitest によるゲームロジック・API のユニットテスト（`npm test`）
- ESLint（`npm run lint`、#19）と GitHub Actions の CI（テスト・Lint・ビルド、#18）
- `main`（本番）/ `dev`（プレビュー）のブランチ運用と Firestore コレクションの環境分離
- MIT License（#7）

---

## 📝 備考
- オフライン対応（PWA）と Firestore のオンラインランキングが共存。投稿時のみオンライン接続が必要で、PWA キャッシュには `/api/*` を含めない。
- 不適切なプレイヤー名は NG ワードフィルタ（#5）で投稿時に弾く。すり抜けた名前は Firebase コンソールから手動で削除し、必要なら環境変数 `NG_WORDS` に語を追加する。荒らされたときは `SCORES_SUBMISSION_DISABLED=1` で投稿を止められる。
