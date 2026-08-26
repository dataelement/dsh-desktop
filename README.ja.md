<h1 align="center">
  <img src="docs/images/readme-logo-black-v020.png" width="64" alt="DSH Desktop ロゴ" valign="middle" />
  DSH Desktop
</h1>

<p align="center">
  <a href="https://github.com/deepseek-ai/deepseek-harness">DeepSeek Harness</a> のための、ローカルファーストかつクロスプラットフォーム対応のデスクトップアプリ。
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README.zh.md">简体中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.ru.md">Русский</a> · <a href="README.es.md">Español</a> · <a href="README.pt.md">Português</a>
</p>

<p align="center">
  <a href="LICENSE"><img alt="ライセンス: MIT" src="https://img.shields.io/badge/License-MIT-171513.svg" /></a>
  <img alt="macOS" src="https://img.shields.io/badge/macOS-Apple%20Silicon%20%7C%20Intel-171513.svg" />
  <img alt="Windows" src="https://img.shields.io/badge/Windows-x64-171513.svg" />
</p>

![ポータブル Preset、モデルプロバイダー、スマートフォン連携を備えた DSH Desktop](docs/images/dsh-desktop-hero-v020.png)

<p align="center"><strong>DeepSeek 公式モデルや主要なサードパーティーモデルを利用し、ポータブルな Agent Preset を管理し、スマートフォンから Harness セッションを続けられます。</strong></p>

DSH Desktop は、ローカルの DeepSeek Harness をインストール可能なデスクトップアプリとして提供します。Harness を自動起動し、Profile、プラグイン、ワークスペース、モデル設定、セッションをアプリ本体とは別の場所に保存し、ローカル Runtime の準備が整うと完全な Harness 画面を開きます。

> [!IMPORTANT]
> DSH Desktop は、急速に進化している `@deepseek-ai/dsh@0.1.1-rc.2` を基盤とする早期プレビューです。macOS 版はコード署名と Apple 公証済みです。Windows x64 インストーラーもコード署名済みですが、発行元のダウンロード・インストール実績が蓄積されるまでは Windows のセキュリティ警告が表示される場合があります。

## ダウンロード

macOS および Windows 向けの DSH Desktop は、[公式 Web サイト](https://www.dshdesktop.com/#download)からダウンロードできます。

インストール版は起動直後と 6 時間ごとに更新を確認します。新しいバージョンが見つかっても、同意するまでダウンロードは始まりません。ダウンロード後に **Restart and install** を選ぶとインストールします。アプリケーションメニューから手動確認したり、今のバージョンだけをスキップしたりすることもできます。

## コミュニティ

<p align="center">
  下の QR コードを WeChat で読み取り、DSH Desktop コミュニティグループに参加してください。<br />
  <img src="docs/images/wechat-group-20260815.png" width="220" alt="DSH Desktop WeChat グループの QR コード" /><br />
  Discord を利用する場合は、<a href="https://discord.gg/he2gAKCpj">DSH Desktop Discord コミュニティ</a>にも参加できます。
</p>

## DSH Desktop が追加する機能

DeepSeek Harness は Agent Runtime と Web UI を提供します。DSH Desktop は、その上にデスクトップ製品として必要なホスト機能を追加します。

- 別の CLI やブラウザータブを必要とせず Harness を起動・終了
- OS 標準のディレクトリ選択画面でプロジェクトワークスペースを追加・管理
- DeepSeek 公式モデルと主要なサードパーティーモデルプロバイダーに対応
- カスタム Agent Preset 一式をポータブルな [`.dshpreset` パッケージ](docs/preset-packages.md)としてインポート・エクスポート
- アプリ更新後も Profile、プラグイン、ワークスペース、セッション、モデル設定を保持
- Harness 起動時やフロントエンドのプラグイン障害を検出し、診断ログとガイド付き復旧を提供
- サードパーティープラグインだけを一時停止する非破壊的なセーフモード
- ペアリングしたスマートフォンから LAN または任意の一時公開トンネル経由でセッションを継続
- デスクトップ更新の確認、ダウンロード、インストールをユーザーが管理
- macOS と Windows 向けのメニュー、タイトルバー、フォーカス、テーマ、ブランド表示

## スマートフォン接続

`Harness` メニューから **Connect Phone…** を選び、ペアリングコードを読み取ります。スマートフォンがセッションへアクセスする前に、デスクトップ側の明示的な承認が必要です。

Harness 自体はランダムな `127.0.0.1` ポートだけで動作します。スマートフォン接続には別のペアリング Bridge を使い、LAN 内に限定するか、遠隔利用時だけ一時的な Cloudflare Quick Tunnel を有効にできます。

## セーフモードと復旧

サードパーティープラグインが起動や画面表示を妨げた場合、DSH Desktop は Runtime とフロントエンドの証拠から関連プラグインを特定し、ガイド付き復旧画面を開きます。

`Harness` メニューの **Restart as Safe Mode…** を選ぶと、公式コア Bundle だけを含む隔離 Profile で起動します。通常 Profile のサードパーティープラグインは停止しますが、Agent、セッション、モデル設定、ワークスペースは引き続き利用できます。

通常画面を開けない場合は `--safe-mode` を指定できます。macOS の例：

```sh
open -a "DSH Desktop" --args --safe-mode
```

## ローカルデータとセキュリティ

- Harness Web UI はランダムな loopback ポートだけで提供されます。
- Renderer には Node.js 権限がなく、Context Isolation と sandbox を使用します。
- WebView、信頼されていないアプリ内ナビゲーション、予期しない権限要求をブロックします。
- Profile とセッションはインストール先ではなく、ユーザー別のアプリデータに保存されます。
- スマートフォン接続には短時間だけ有効な Token とデスクトップ側の承認が必要です。

## 対応プラットフォーム

| プラットフォーム | 配布形式 | 状態 |
| --- | --- | --- |
| macOS Apple Silicon | 署名・公証済み DMG/ZIP | 対応 |
| macOS Intel | 署名・公証済み DMG/ZIP | 対応 |
| Windows x64 | コード署名済み NSIS インストーラー | 対応 |
| Windows ARM64 | — | 未対応 |
| Linux | — | 未対応 |

Harness にはターゲット固有のネイティブ依存関係が含まれるため、各リリースは対応する OS とアーキテクチャ上でビルドされます。

## 開発とアーキテクチャ

- [開発ガイド](docs/development.md) — セットアップ、検証、パッチ保守、ネイティブパッケージング
- [アーキテクチャ](docs/architecture.md) — Runtime、データ、セキュリティ、復旧、スマートフォン接続、更新
- [リリース手順](docs/release-runbook.md) — 署名と公開の管理
- [Preset パッケージ形式](docs/preset-packages.md) — ポータブル Agent Preset の仕様

変更を提出する前に `npm test`、`npm run typecheck`、`npm run build` を実行し、影響する実際のアプリ操作も確認してください。Issue、ログ、スクリーンショット、テストデータに本物の API キーを含めないでください。

## 関連プロジェクト

[dsh-market](https://github.com/dsh-market/dsh-market) は DeepSeek Harness のコミュニティプラグインマーケットです。Harness 画面からプラグインの検索、プレビュー、インストール、更新、有効化・無効化、テーマ変更を行えます。

## ライセンス

DSH Desktop は [MIT License](LICENSE) のもとで公開されています。

DeepSeek Harness とその依存関係には、それぞれの上流ライセンスと商標ポリシーが適用されます。DSH Desktop は独立したコミュニティデスクトップアプリです。
