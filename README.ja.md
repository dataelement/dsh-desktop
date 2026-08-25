<h1 align="center">
  <img src="docs/images/readme-logo-black-v020.png" width="64" alt="DSH Desktop ロゴ" valign="middle" />
  DSH Desktop
</h1>

<p align="center">
  <a href="https://github.com/deepseek-ai/deepseek-harness">DeepSeek Harness</a> のための、ローカルファーストかつクロスプラットフォーム対応のデスクトップシェル。
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README.zh.md">简体中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.ru.md">Русский</a> · <a href="README.es.md">Español</a> · <a href="README.pt.md">Português</a>
</p>

<p align="center">
  <a href="LICENSE"><img alt="ライセンス: MIT" src="https://img.shields.io/badge/License-MIT-171513.svg" /></a>
  <img alt="macOS" src="https://img.shields.io/badge/macOS-Apple%20Silicon%20%7C%20Intel-171513.svg" />
  <img alt="Windows" src="https://img.shields.io/badge/Windows-x64-171513.svg" />
</p>

![ポータブル Preset、モデルプロバイダー、スマートフォン連携を備えた DSH Desktop の概要](docs/images/dsh-desktop-hero-v020.png)

<p align="center"><strong>DeepSeek 公式モデルだけでなく、DSH Desktop は主要なサードパーティー製モデルプロバイダーにも対応しています。DSH を活用した、さらに多彩なデスクトップ体験も近日登場予定です。</strong></p>

DSH Desktop は、ローカルで動作する DeepSeek Harness の Web 体験をデスクトップアプリケーションとして提供します。ローカルの Harness インスタンスを自動的に起動し、ランダムなループバックポートを管理し、Profile、プラグイン、セッションを永続化します。Harness の準備が整うと、すぐに完全なインターフェースを開きます。プロジェクトのワークスペースは、すべて Harness のインターフェース内で追加・管理します。

> [!IMPORTANT]
> DSH Desktop は現在、早期プレビュー段階にあり、急速に進化している `@deepseek-ai/dsh@0.1.1-rc.1` に依存しています。macOS リリースはコード署名済みで、Apple の公証も受けています。現在のインストーラーは公式 Web サイトから配布しています。

## ダウンロード

macOS および Windows 向けの DSH Desktop は、[公式 Web サイト](https://www.dshdesktop.com/#download)からダウンロードできます。

インストール済みの macOS 版と Windows 版は、起動後および 6 時間ごとに更新を自動確認します。更新はバックグラウンドでダウンロードされ、準備が完了すると再起動を促します。アプリケーションメニューから **Check for Updates…** を選択して、手動で確認することもできます。

## コミュニティ

<p align="center">
  下の QR コードを WeChat で読み取り、DSH Desktop コミュニティグループに参加してください。<br />
  <img src="docs/images/wechat-group-20260815.png" width="220" alt="DSH Desktop WeChat コミュニティグループの QR コード" /><br />
  Discord を利用する場合は、<a href="https://discord.gg/he2gAKCpj">DSH Desktop Discord コミュニティ</a>に参加できます。
</p>

## このプロジェクトの目的

DeepSeek Harness は、すでに完全な Agent Runtime と Web UI を提供しています。DSH Desktop は Harness を再実装するのではなく、デスクトップ製品に必要なホスト機能を提供します。

- CLI を手動で起動したり、ローカルポートを管理したりせずに実行
- 起動時にアプリケーション専用の Harness 起動ディレクトリを自動作成
- Harness 内蔵のディレクトリピッカーからプロジェクトワークスペースを追加・管理
- Harness の子プロセス、準備完了チェック、ログ、終了処理を一元管理
- Profile、プラグイン、セッションをアプリケーションのインストール先とは別に保存し、アップグレード時のユーザーデータ消失を防止
- macOS および Windows 向けパッケージングのエントリーポイントを提供

## 機能

- 追加のランディングページを挟まず、Harness を直接表示
- 初回のディレクトリ選択を不要にし、内部起動ディレクトリを自動作成して再利用
- Harness の起動に失敗した場合、再試行、ログ表示、終了操作を提供
- Harness メニューから子プロセスの再起動とログ表示が可能
- デスクトップアプリ終了時に Harness の子プロセスを安全に終了
- 起動ごとにランダムな `127.0.0.1` ポートだけを使用
- Renderer から Node.js 権限を除外し、`contextIsolation`、sandbox、ナビゲーション制限を有効化
- デスクトップウィンドウと Harness サイドバーで DSH ブランドロゴを統一
- カスタム Agent Preset 一式をポータブルな [`.dshpreset` パッケージ](docs/preset-packages.md)としてインポート・エクスポートし、インストール前に競合チェックと信頼に関する警告を表示
- macOS ICNS および Windows ICO 形式の正式な DSH アプリアイコンを同梱

## 関連プロジェクト

[dsh-market](https://github.com/dsh-market/dsh-market) — DeepSeek Harness のプラグインマーケット。900 以上のコミュニティ製プラグインを閲覧・検索し、スクリーンショットを確認できます。プラグインのインストール、更新、有効化・無効化、テーマ切り替えもワンクリックで行え、多くは再起動せずに即時反映されます。

## クイックスタート

### 必要環境

- Node.js 22 以降
- npm
- Apple Silicon または Intel 搭載 macOS、あるいは Windows x64

### ローカル開発

```bash
git clone https://github.com/dataelement/dsh-desktop.git
cd dsh-desktop
npm install
npm run dev
```

`npm install` は `patch-package` を実行し、DSH Desktop によるモデルプロバイダーの初期設定、Preset パッケージ転送、サイドバーブランド表示の変更を再適用します。その後、ブランドアセットと Electron Runtime をインストールします。

### 品質チェック

```bash
npm test
npm run typecheck
npm run build
```

### パッケージング

```bash
# 現在の Mac アーキテクチャ向けに未署名の DMG と ZIP を生成
npm run package:mac

# 対応するアーキテクチャの Mac または CI Runner でそれぞれ実行
npm run package:mac:arm64
npm run package:mac:x64

# Windows x64 マシンまたは Runner で NSIS と Portable を生成
npm run package:win
```

Harness にはアーキテクチャ固有のネイティブモジュールが含まれます。macOS ARM64、macOS Intel、Windows x64 では、それぞれ対応するプラットフォーム上で依存関係を再インストールし、ビルドする必要があります。アーキテクチャ別スクリプトはパッケージング前に現在の `platform/arch` を検証し、ビルド成功に見えてもネイティブ依存関係が欠けている成果物の生成を防ぎます。

## ランタイムアーキテクチャ

```text
DSH Desktop (Electron Main)
├── アプリケーション専用の起動ディレクトリ
├── Harness 子プロセスのライフサイクル
├── ランダムなループバックポートと準備完了チェック
├── ネイティブログと復旧操作
└── 強化された BrowserWindow
     └── http://127.0.0.1:<random>  DeepSeek Harness Web UI

Electron userData
├── launch-root/
├── logs/harness.log
└── harness/
    ├── profiles/
    ├── sessions/
    └── プラグインとユーザーデータ
```

Harness は独立した Electron Node 子プロセスで動作します。Cordis HMR に必要な `--expose-internals` 権限は、この子プロセスだけに付与され、Web Renderer には付与されません。

## プロジェクト構成

```text
src/main/             Electron メインプロセス、ウィンドウ、Harness ライフサイクル
src/shared/           共有ランタイム型
patches/              固定した DSH バージョンに対する再現可能な UI カスタマイズ
scripts/              ブランドアセットのインストールと対象プラットフォームのパッケージング検証
test/                 設定、ランタイム、セキュリティ、プロバイダー対応のテスト
build/                アプリケーションアイコンのアセット
```

## 現在の検証状況

- macOS Apple Silicon：開発ワークフロー、実際の Harness 起動、DMG パッケージング、コード署名、Apple 公証、マウントした成果物を検証済み
- macOS Intel：パッケージング設定とプラットフォーム検証を提供済み。ランタイム検証には Intel Mac または Runner が必要
- Windows x64：NSIS/Portable の設定とプラットフォーム検証を提供済み。ランタイム検証には Windows Runner が必要
- Windows ARM64：現在は未対応
- 自動更新：未統合

## 上流バージョンとパッチ

このプロジェクトは現在 `@deepseek-ai/dsh@0.1.1-rc.1` に固定されています。初期プロバイダー一覧とデスクトップの Preset 転送画面は、`node_modules` 内の未追跡変更に依存せず、[`patches/`](patches/) 以下の [`patch-package`](https://github.com/ds300/patch-package) で管理されています。

DSH をアップグレードする場合：

1. 上流の Settings、Credentials、Provider Directory の契約を確認します。
2. カスタマイズしたオンボーディング画面を再適用または書き直します。
3. パッチを再生成します。
4. 実際の Harness 起動とプロバイダー設定フローで回帰チェックを実行します。

## コントリビューション

Issue と Pull Request を歓迎します。変更を提出する前に、少なくとも次を実行してください。

```bash
npm test
npm run typecheck
npm run build
```

実際の API キーを Issue、ログ、スクリーンショット、テストデータに含めないでください。

## ライセンス

このプロジェクトは [MIT License](LICENSE) の下でオープンソースとして公開されています。

DeepSeek Harness とその依存関係には、それぞれの上流ライセンスおよび商標ポリシーが引き続き適用されます。DSH Desktop は独立したコミュニティ製デスクトップラッパーです。
