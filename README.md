<h1 align="center">
  <img src="docs/images/readme-logo-black-v020.png" width="64" alt="DSH Desktop logo" valign="middle" />
  DSH Desktop
</h1>

<p align="center">
  A local-first, cross-platform desktop app for
  <a href="https://github.com/deepseek-ai/deepseek-harness">DeepSeek Harness</a>.
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README.zh.md">简体中文</a> · <a href="README.ja.md">日本語</a> · <a href="README.ru.md">Русский</a> · <a href="README.es.md">Español</a> · <a href="README.pt.md">Português</a>
</p>

<p align="center">
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-171513.svg" /></a>
  <img alt="macOS" src="https://img.shields.io/badge/macOS-Apple%20Silicon%20%7C%20Intel-171513.svg" />
  <img alt="Windows" src="https://img.shields.io/badge/Windows-x64-171513.svg" />
</p>

![DSH Desktop overview with portable presets, model providers, and phone control](docs/images/dsh-desktop-hero-v020.png)

<p align="center"><strong>Use official DeepSeek models or mainstream third-party model providers, manage portable Agent presets, and continue your Harness sessions from your phone.</strong></p>

DSH Desktop packages the local DeepSeek Harness experience as an installed desktop application. It starts Harness automatically, keeps profiles, plugins, workspaces, model settings, and sessions outside the application directory, and opens the full Harness interface as soon as the local runtime is ready.

> [!IMPORTANT]
> DSH Desktop is an early preview built on the rapidly evolving `@deepseek-ai/dsh@0.1.2-rc.1`. macOS releases are code-signed and notarized by Apple. Windows x64 installers are code-signed; Windows security warnings may still decrease gradually as the publisher builds download and installation reputation.

## Download

Download DSH Desktop for macOS and Windows from the [official website](https://www.dshdesktop.com/#download).

Installed builds check for updates shortly after startup and every six hours. When a new version is available, DSH Desktop asks before downloading it; installation begins only after you choose **Restart and install**. You can also check manually from the application menu or skip one version without hiding future releases.

## Community

<p align="center">
  Scan the QR code below with WeChat to join the DSH Desktop community group.<br />
  <img src="docs/images/wechat-group-20260815.png" width="220" alt="DSH Desktop WeChat group QR code" /><br />
  Prefer Discord? <a href="https://discord.gg/he2gAKCpj">Join the DSH Desktop Discord community</a>.
</p>

## What DSH Desktop adds

DeepSeek Harness already provides the Agent runtime and Web UI. DSH Desktop adds the native host capabilities needed for a practical desktop product:

- Starts and stops Harness without requiring a separate CLI or browser tab
- Uses the native system directory picker to add and manage project workspaces
- Supports official DeepSeek models and mainstream third-party model providers
- Imports and exports complete custom Agent presets as portable [`.dshpreset` packages](docs/preset-packages.md), with conflict checks and a trust warning before installation
- Preserves profiles, plugins, workspaces, sessions, and model settings across app upgrades
- Detects startup and frontend plugin failures, keeps diagnostics in `harness.log`, and offers guided recovery actions
- Provides a non-destructive Safe Mode that temporarily blocks third-party plugins
- Lets a paired phone continue sessions over the local network or an optional temporary public tunnel
- Checks for desktop updates and keeps download and installation under user control
- Adapts native menus, titlebar behavior, window focus, theme, and application branding for macOS and Windows

## Phone access

Choose **Connect Phone…** from the `Harness` menu and scan the pairing code. The desktop asks you to approve the connection before the phone can access sessions.

Harness itself remains on a random `127.0.0.1` port. Phone access uses a separate paired bridge. It can stay on the local network or, when you choose remote access, use a temporary Cloudflare Quick Tunnel. Disconnecting the phone from the desktop invalidates the mobile session.

## Safe Mode and recovery

If a third-party plugin interferes with startup or rendering, DSH Desktop can identify the implicated plugin from runtime and frontend evidence and open a guided recovery surface.

Choose **Restart as Safe Mode…** from the `Harness` menu to start an isolated profile containing only official core bundles. The Agent, sessions, model settings, and workspaces remain available while third-party plugins from the normal profile stay blocked. You can remove selected plugins or return to a normal launch from the Safe Mode banner.

If the normal interface cannot be reached, start DSH Desktop with `--safe-mode`. On macOS:

```sh
open -a "DSH Desktop" --args --safe-mode
```

## Local data and security

- The Harness Web UI is served only on a random loopback port.
- The renderer has no Node.js privileges and uses context isolation and sandboxing.
- Webviews, untrusted in-app navigation, and unexpected permission requests are blocked.
- External web links open in the system browser.
- User profiles and sessions live under Electron's per-user application data directory, not inside the installed app.
- Phone access requires a short-lived pairing token and explicit desktop approval.

## Platform support

| Platform | Distribution | Status |
| --- | --- | --- |
| macOS Apple Silicon | Signed and notarized DMG/ZIP | Supported |
| macOS Intel | Signed and notarized DMG/ZIP | Supported |
| Windows x64 | Code-signed NSIS installer | Supported |
| Windows ARM64 | — | Not currently supported |
| Linux | — | Not currently supported |

Harness includes target-native dependencies, so every release artifact is built on the matching operating system and architecture.

## Development and architecture

Contributions are welcome. Start with the public engineering documentation:

- [Development guide](docs/development.md) — setup, validation, patch maintenance, and target-native packaging
- [Architecture](docs/architecture.md) — runtime flow, persistent data, security boundaries, recovery, mobile access, and updates
- [Release runbook](docs/release-runbook.md) — signing and publication controls
- [Preset package format](docs/preset-packages.md) — portable Agent preset contract

Before submitting a change, run `npm test`, `npm run typecheck`, and `npm run build`, then exercise the affected real application flow. Never include real API keys in issues, logs, screenshots, or test data.

## Friends

[dsh-market](https://github.com/dsh-market/dsh-market) is the community plugin market for DeepSeek Harness. Browse and search plugins, preview screenshots, install or update packages, enable or disable plugins, and switch themes from the Harness interface.

## License

DSH Desktop is open source under the [MIT License](LICENSE).

DeepSeek Harness and its dependencies remain subject to their respective upstream licenses and trademark policies. DSH Desktop is an independent community desktop application.
