<h1 align="center">
  <img src="docs/images/readme-logo-black-rounded.svg" width="64" alt="DSH Desktop logo" valign="middle" />
  DSH Desktop
</h1>

<p align="center">
  <strong>DSH Desktop by Dataelem</strong> is a desktop Agent application built by the Dataelem team on the DeepSeek Harness framework, available in open-source and <a href="https://www.dshdesktop.com/en/enterprise/">enterprise editions</a>.<br />
  Website: <a href="https://www.dshdesktop.com/">www.dshdesktop.com</a>
</p>

<p align="center">
  <a href="README.md">简体中文</a> · <a href="README.en.md">English</a> · <a href="README.ja.md">日本語</a> · <a href="README.ru.md">Русский</a> · <a href="README.es.md">Español</a> · <a href="README.pt.md">Português</a>
</p>

<p align="center">
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-171513.svg" /></a>
  <img alt="macOS" src="https://img.shields.io/badge/macOS-Apple%20Silicon%20%7C%20Intel-171513.svg" />
  <img alt="Windows" src="https://img.shields.io/badge/Windows-x64-171513.svg" />
</p>

![DSH Desktop overview with portable presets, model providers, phone control, and editable PPT generation](docs/images/dsh-desktop-hero-v021.png)

Built on DeepSeek Harness, with enhanced model-provider integration, Word / Excel / PPT templates, startup recovery, and workbenches in a ready-to-use desktop app.

## Download

Download DSH Desktop from the [official website](https://www.dshdesktop.com/en/).

DSH Desktop automatically checks for updates. New versions undergo a staged rollout for testing before being released to all users once confirmed stable.

## Community

<p align="center">
  Scan the QR code below with WeChat to join the DSH Desktop community group.<br />
  <img src="docs/images/wechat-group-20260815.png" width="220" alt="DSH Desktop WeChat group QR code" /><br />
  Prefer Discord? <a href="https://discord.gg/7Xgf3qe3Qp">Join the DSH Desktop Discord community</a>.
</p>

## What DSH Desktop adds

DeepSeek Harness provides the Agent runtime, Web UI, and basic model-provider integration. DSH Desktop builds on these foundations with:

- **Model-provider integration**: improved provider setup and onboarding, model search, image-input and reasoning-capability configuration, and third-party model compatibility.
- **Office templates**: native Word template editing, Excel example workbooks, and editable PPT templates, paired with business skills to create DOCX, XLSX, and PPTX; Python and Office processing dependencies ship with the desktop app.
- **Startup and plugin recovery**: startup and frontend diagnostics, guided recovery, Safe Mode, and a repair Agent entry point, designed to preserve user sessions and settings.
- **Workbenches**: browse, install, and open workbench apps through market installation or local import, reusing Harness conversations.
- **Portable Agent presets**: import and export custom presets as [`.dshpreset` packages](docs/preset-packages.md), with conflict checks and trust warnings before installation.
- **Phone access**: pair by QR code and continue sessions over the local network or an optional public tunnel.
- **Native desktop experience**: managed Harness startup and shutdown, system directory pickers, native menus and windows, user-data preservation across upgrades, and automatic update checks.

## PPT generation

Enable the **PPT** button, choose a template, and describe the deck you need. The built-in catalog includes **16 templates and 192 layouts** with editable PPTX output. Previews use English; decks can use English or Chinese, with corresponding font settings. Preview language does not determine output language.

PPT is preinstalled, and its automatic instructions apply only to sessions where the PPT button is enabled. See the [PPT runtime guide](packages/ppt-runtime/README.md) for templates, validation, and source acknowledgments.

## Phone access

Choose **Connect Phone…** from the `Harness` menu and scan the pairing code.

- On Wi-Fi, scanning connects immediately.
- Over the internet tunnel, the phone enters a 6-digit pairing password shown only on the computer. By default the password is temporary (5 minutes, memory only). A durable password is created only after you opt in on the Connect Phone window.

Harness itself remains on a random `127.0.0.1` port. Phone access uses a separate paired bridge. Cloudflare Quick Tunnel is the usual long-lived remote path. Free Pinggy is the fallback when Cloudflare is unavailable (for example in mainland China) and expires after about 60 minutes. Disconnecting the phone from the desktop invalidates the mobile session.

If Cloudflare fails to start, the app tries Pinggy. If a Cloudflare pairing link appears but your phone cannot open it, choose **Can’t open? Try another link** to switch to Pinggy.

## Safe Mode and recovery

If a third-party plugin interferes with startup or rendering, DSH Desktop can identify the implicated plugin from runtime and frontend evidence and open a guided recovery surface.

Choose **Restart as Safe Mode…** from the `Harness` menu to start an isolated profile containing only official core bundles. The Agent, sessions, model settings, and workspaces remain available while third-party plugins from the normal profile stay blocked. You can remove selected plugins or return to a normal launch from the Safe Mode banner.

Recovery screens check for compatible plugin updates. When available, you can upgrade an affected plugin; Safe Mode also offers batch upgrades. For help, hover over **WeChat group** to display its QR code, or click **Discord** to open the community.

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
- Phone access requires a short-lived pairing token. Wi-Fi connects on scan; the internet tunnel also requires the pairing password shown on the computer.

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

## Learn about the enterprise edition

The enterprise edition combines the BISHENG desktop client with the BISHENG enterprise platform server. Built on DSH Desktop, the client works with local files and enterprise-authorized models, knowledge, tools and skills through an enterprise account. The server centrally configures resources and permissions and manages credits and usage. Both the BISHENG client and server for the enterprise edition are open source; their source code is available in the repositories below.

[Enterprise website](https://www.dshdesktop.com/en/enterprise/) · [Client repository](https://github.com/dataelement/bisheng-desktop) · [Server repository](https://github.com/dataelement/bisheng)
