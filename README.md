# SNCT Shooter - 暇つぶしシューティングゲーム

スマートフォンブラウザでサクッと遊べる、軽量・シンプルな縦スクロールシューティングゲームです。Chromeの恐竜ゲームのように、隙間時間にすぐプレイできることを目的としています。

高専祭などのイベントで多人数が遊ぶことを想定し、オンラインリーダーボードを備えています。

> **🌐 動作確認用URL（Vercel）**
> - **本番環境 (`main` ブランチ):** https://snct-shooter-koshiinoues-projects.vercel.app
> - **開発環境 (`dev` ブランチ):** https://snct-shooter-git-dev-koshiinoues-projects.vercel.app
>   ※ 開発環境のURLは固定です。`dev` ブランチに変更がプッシュされると自動で最新状態に更新されます。ブックマークにはこちらをご利用ください。

## 🎮 プロジェクト概要

- **プラットフォーム**: スマートフォンブラウザ (iOS Safari / Android Chrome)
- **特徴**:
  - 全8ステージ構成のやり応えのあるステージ制
  - 片手で操作可能なシンプル設計（ドラッグ・スワイプのみで移動、弾は自動連射）
  - ツイン弾や3-Wayに進化する「武器強化」システム
  - PWA（Progressive Web App）対応でオフラインでもプレイ可能
  - オンラインリーダーボード（プレイヤー名を入れてスコア投稿、トップ20表示）
- **画面表示**: Portrait（縦向き）固定。デバイスのセーフエリアも考慮した設計。

詳細は仕様書 [docs/spec.md](docs/spec.md) を参照してください。

## 🛠 技術スタック

- **フレームワーク**: Next.js 14 (App Router)
- **言語**: TypeScript
- **描画エンジン**: Canvas API + requestAnimationFrame (delta-time ベース制御)
- **操作制御**: Touch Events API
- **データ保存（ローカル）**: localStorage（ハイスコア・プレイヤー名）
- **データ保存（オンライン）**: Firebase Firestore（リーダーボード）+ Firebase Admin SDK（API Routes 経由のみアクセス）
- **PWA**: Serwist
- **ホスティング**: Vercel（main ブランチ自動デプロイ）

さらに詳しい設計やディレクトリ構成については、アーキテクチャドキュメント [docs/architecture.md](docs/architecture.md) をご覧ください。

## 📖 遊び方・使い方

### インストール（PWAとしての利用）
- **iOS Safari**: ブラウザの下部メニューから「共有（Share）」アイコンをタップし、「ホーム画面に追加」を選択します。
- **Android Chrome**: 画面に表示されるインストールプロンプトに従うか、メニューから「ホーム画面に追加」を選択します。

### 操作方法
- 画面上の任意の場所に指を置き、ドラッグすることで自機を移動させます。
- 弾は自動的に連射されます。タップ等の操作は不要です。
- 敵の弾や敵本体に当たらないように避けながら、敵を倒してステージを進めましょう。

### ランキング機能
- スタート画面の `RANKING` ボタンからトップ20を表示できます。
- ゲームオーバー / クリア時に「スコアを投稿」→ 名前を入力すると、ランキングに登録されます。
- 入力した名前は次回プレイ時に自動で復元されます。

## 🚀 ローカルでの開発と起動

開発環境をセットアップする手順です。

1. **リポジトリのクローン**
   ```bash
   git clone https://github.com/inouekoshi/snct-shooter.git
   cd snct-shooter
   ```

2. **依存関係のインストール**
   ```bash
   npm install
   ```

3. **Firebase の環境変数を設定**

   `.env.local` を作成し、Firebase Admin SDK のサービスアカウントキーを1行 JSON で設定します。
   ```
   FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"...",...}
   ```
   ※ ランキング機能を使わない場合は省略可能（ローカルプレイのみで動作）。

4. **開発サーバーの起動**
   ```bash
   npm run dev
   ```
   ブラウザで `http://localhost:3000` にアクセスして動作を確認します。スマートフォンからの確認は、同一ネットワーク上のローカルIPアドレスからアクセスしてテストしてください。

## 📦 デプロイとブランチ戦略について

本プロジェクトは **Vercel** へのデプロイを前提としており、GitHubとの連携による自動デプロイ機能を利用して、本番環境と開発環境を分離しています。

### ブランチと環境の対応
- **`main` ブランチ (本番環境 / Production)**
  - `main` ブランチへのプッシュ、またはプルリクエストのマージによって自動デプロイされます。
  - 本番URL: https://snct-shooter-koshiinoues-projects.vercel.app
- **`dev` ブランチ (プレビュー・開発環境 / Preview)**
  - 日々の開発作業は `dev` ブランチ（または派生ブランチ）で行います。
  - `dev` ブランチにプッシュすると、Vercelが自動的にプレビュー環境としてビルドし、ブランチ専用のURL（例: `https://snct-shooter-git-dev-koshiinoues-projects.vercel.app`）を生成します。
  - ローカル開発サーバー（`localhost`）は極力使用せず、このVercelのプレビュー環境にて実際の動作確認やテストを行います。

### データベースの環境分離
テストデータが本番のランキングに混入するのを防ぐため、Firestoreの参照先コレクションを自動で切り替えています。
- Production環境: `scores` コレクションを使用
- Preview/Development環境: `scores_dev` コレクションを使用

※ 環境変数 `FIREBASE_SERVICE_ACCOUNT_KEY` は Vercel ダッシュボードで Production / Preview / Development の3環境すべてに共通で設定されています。

## 🤝 コミュニティとコントリビューション

このプロジェクトへの参加や貢献を歓迎しています！
バグ報告や機能提案はGitHub Issuesへ、プルリクエストによるコードの貢献も募集しております。

開発への参加に関するガイドラインは [CONTRIBUTING.md](CONTRIBUTING.md) をご一読ください。

## 📄 ライセンス

このプロジェクトは MIT License のもとで公開されています。（必要に応じて調整してください）
