<h1 align="center">
  <img src="docs/images/readme-logo-black-rounded.svg" width="64" alt="DSH Desktop ロゴ" valign="middle" />
  DSH Desktop
</h1>

<p align="center">
  <strong>DSH Desktop by Dataelem</strong> は、Dataelem チームが DeepSeek Harness フレームワークを基盤に開発したデスクトップ Agent アプリケーションです。オープンソース版と<a href="https://www.dshdesktop.com/ja/enterprise/">エンタープライズ版</a>を提供しています。<br />
  公式サイト：<a href="https://www.dshdesktop.com/">www.dshdesktop.com</a>
</p>

<p align="center">
  <a href="README.md">简体中文</a> · <a href="README.en.md">English</a> · <a href="README.ja.md">日本語</a> · <a href="README.ru.md">Русский</a> · <a href="README.es.md">Español</a> · <a href="README.pt.md">Português</a>
</p>

<p align="center">
  <a href="LICENSE"><img alt="ライセンス: MIT" src="https://img.shields.io/badge/License-MIT-171513.svg" /></a>
  <img alt="macOS" src="https://img.shields.io/badge/macOS-Apple%20Silicon%20%7C%20Intel-171513.svg" />
  <img alt="Windows" src="https://img.shields.io/badge/Windows-x64-171513.svg" />
</p>

![ポータブル Preset、モデルプロバイダー、スマートフォン連携、編集可能な PPTX 生成を備えた DSH Desktop](docs/images/dsh-desktop-hero-v021.png)

DeepSeek Harness を基盤に、主要モデル連携、Word / Excel / PPT テンプレート、起動障害の復旧、ワークベンチを強化したデスクトップアプリです。

## ダウンロード

DSH Desktop は[公式サイト](https://www.dshdesktop.com/ja/)からダウンロードできます。

DSH Desktop は自動的に更新を確認します。新しいバージョンは、まず一部のユーザーを対象に段階的に配信してテストし、安定性を確認してからすべてのユーザーに配信します。

## コミュニティ

<p align="center">
  下の QR コードを WeChat で読み取り、DSH Desktop コミュニティグループに参加してください。<br />
  <img src="docs/images/wechat-group-20260815.png" width="220" alt="DSH Desktop WeChat グループの QR コード" /><br />
  Discord を利用する場合は、<a href="https://discord.gg/7Xgf3qe3Qp">DSH Desktop Discord コミュニティ</a>にも参加できます。
</p>

## DSH Desktop が追加する機能

DeepSeek Harness が提供する Agent Runtime、Web UI、基本的なモデル接続を活用し、次の体験を強化します。

- **モデル連携**：初回接続、モデル検索、画像入力・推論能力の設定、サードパーティーモデルとの互換性を改善。
- **Office テンプレート**：Word の原生テンプレート編集、Excel のサンプルブック、編集可能な PPT テンプレートを業務スキルと組み合わせ、DOCX・XLSX・PPTX を作成。Python と Office 処理用依存関係を同梱。
- **障害復旧**：起動・フロントエンド診断、ガイド付き復旧、セーフモード、修復 Agent の入口を提供し、セッションと設定の保持を重視。
- **ワークベンチ**：マーケット経由の導入やローカルインポートでアプリを閲覧・インストール・起動し、Harness の会話を再利用。
- **Preset の移行**：[`.dshpreset` パッケージ](docs/preset-packages.md)でインポート・エクスポートし、競合チェックと信頼性の警告を提供。
- **スマートフォン接続**：QR コードでペアリングし、LAN または任意の公開トンネルでセッションを継続。
- **ネイティブ体験**：Harness の起動・終了管理、OS 標準のディレクトリ選択、メニューとウィンドウ、更新時のデータ保持、自動更新確認。

## PPT 作成

**PPT** ボタンを有効にし、テンプレートを選んで作成したい内容を入力します。**16 種類のテンプレート、192 種類のレイアウト**から、編集可能な PPTX を生成できます。プレビューは英語ですが、出力は英語・中国語に対応し、それぞれのフォント設定を備えています。プレビューの言語が出力言語を決めることはありません。

PPT はプリインストールされており、自動指示は PPT ボタンを有効にしたセッションだけに適用されます。詳細と出典は [PPT ガイド](packages/ppt-runtime/README.md)を参照してください。

## スマートフォン接続

`Harness` メニューから **Connect Phone…** を選び、ペアリングコードを読み取ります。スマートフォンがセッションへアクセスする前に、デスクトップ側の明示的な承認が必要です。

Harness 自体はランダムな `127.0.0.1` ポートだけで動作します。スマートフォン接続には別のペアリング Bridge を使い、LAN 内に限定するか、遠隔利用時だけ一時的な Cloudflare Quick Tunnel を有効にできます。

Cloudflare の起動に失敗すると Pinggy を試します。Cloudflare のペアリングリンクが表示されてもスマートフォンで開けない場合は、**Can’t open? Try another link** を選んで Pinggy に切り替えられます。

## セーフモードと復旧

サードパーティープラグインが起動や画面表示を妨げた場合、DSH Desktop は Runtime とフロントエンドの証拠から関連プラグインを特定し、ガイド付き復旧画面を開きます。

`Harness` メニューの **Restart as Safe Mode…** を選ぶと、公式コア Bundle だけを含む隔離 Profile で起動します。通常 Profile のサードパーティープラグインは停止しますが、Agent、セッション、モデル設定、ワークスペースは引き続き利用できます。

復旧画面では互換性のあるプラグイン更新を確認し、利用可能な場合は個別に更新できます。セーフモードでは一括更新も可能です。相談したい場合は **WeChat group** にマウスを合わせて QR コードを表示するか、**Discord** をクリックしてコミュニティを開いてください。

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

## エンタープライズ版について

エンタープライズ版は、BISHENG デスクトップクライアントと BISHENG 企業プラットフォームのサーバーで構成されます。DSH Desktop を基盤とするクライアントでは、企業アカウントでローカルファイルと利用を許可されたモデル、ナレッジ、ツール、スキルを組み合わせて作業できます。サーバーはリソースと権限を一元設定し、クレジットと利用量を管理します。 エンタープライズ版の BISHENG クライアントとサーバーはいずれもオープンソースで、以下のリポジトリからソースコードを取得できます。

[エンタープライズ版サイト](https://www.dshdesktop.com/ja/enterprise/) · [クライアントのリポジトリ](https://github.com/dataelement/bisheng-desktop) · [サーバーのリポジトリ](https://github.com/dataelement/bisheng)
