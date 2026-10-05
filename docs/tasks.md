# 今後のタスク・マイルストーン

本ドキュメントは、「暇つぶしシューティングゲーム」の開発計画と進捗をまとめたものです。
個々のタスクは [GitHub Issues](https://github.com/inouekoshi/snct-shooter/issues) で管理し、ここでは全体像と方向性を示します。

## 🎯 ビジョン
**「プレイ中の楽しさを追求する」**
単なる暇つぶしにとどまらず、操作の気持ちよさ（Game Feel）、敵を倒した際の爽快感、スコアを稼ぐことへのモチベーションを最大化する。

---

## 🚧 未完了のタスク

### 改善・不具合

| Issue | 内容 | 種別 |
|---|---|---|
| [#1](https://github.com/inouekoshi/snct-shooter/issues/1) | EXTRAモードの難易度を実機プレイで調整する | 改善 |
| [#2](https://github.com/inouekoshi/snct-shooter/issues/2) | 回復敵に体当たりすると被弾扱いになる（仕様の決定待ち） | 要検討 |
| [#3](https://github.com/inouekoshi/snct-shooter/issues/3) | ランキングで同点のスコアがすべてハイライトされる | 不具合 |
| [#4](https://github.com/inouekoshi/snct-shooter/issues/4) | 上位100件より下のスコアの順位が正しく表示されない | 不具合 |
| [#5](https://github.com/inouekoshi/snct-shooter/issues/5) | ランキングの不適切な名前を自動で弾く（NGワードフィルタ） | 改善 |
| [#6](https://github.com/inouekoshi/snct-shooter/issues/6) | スキル（必殺技）システムの検討 | 要検討 |
| [#7](https://github.com/inouekoshi/snct-shooter/issues/7) | ライセンスを確定する | ドキュメント |

### Phase 4: オンライン化（マルチプレイ・ソーシャル機能）
他プレイヤーとの繋がりを持たせ、ゲームの寿命をさらに延ばす。GitHub のマイルストーン「Phase 4: オンライン化」で管理。

| Issue | 内容 |
|---|---|
| [#8](https://github.com/inouekoshi/snct-shooter/issues/8) | リアルタイム協力プレイ（Co-op） |
| [#9](https://github.com/inouekoshi/snct-shooter/issues/9) | オンライン対戦（スコアアタック）モード |
| [#10](https://github.com/inouekoshi/snct-shooter/issues/10) | ゴーストデータの共有 |

スコアアタックとゴーストは、どちらも「ゲーム内の乱数をシード付きにする」作業が前提になる。

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

### 開発基盤
- Vitest によるゲームロジック・API のユニットテスト（`npm test`）
- `main`（本番）/ `dev`（プレビュー）のブランチ運用と Firestore コレクションの環境分離

---

## 📝 備考
- オフライン対応（PWA）と Firestore のオンラインランキングが共存。投稿時のみオンライン接続が必要で、PWA キャッシュには `/api/*` を含めない。
- 不適切なプレイヤー名は、#5 が完了するまで Firebase コンソールから手動で削除する。
