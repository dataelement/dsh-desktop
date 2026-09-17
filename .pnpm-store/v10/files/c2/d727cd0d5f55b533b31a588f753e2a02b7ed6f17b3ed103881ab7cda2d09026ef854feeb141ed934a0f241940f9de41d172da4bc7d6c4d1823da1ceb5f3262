<p align="center">
  <img src="assets/logo.svg" width="96" alt="dsh-market logo">
</p>

# dsh-market

English | [中文](README.zh.md)

[![npm](https://img.shields.io/npm/v/dshmarket)](https://www.npmjs.com/package/dshmarket)
[![stars](https://img.shields.io/github/stars/dsh-market/dsh-market?style=flat)](https://github.com/dsh-market/dsh-market)

The plugin market inside DeepSeek Harness. Open Settings → **Plugin Market** → browse, search, one-click install.

![dsh-market](assets/demo-en.png)

One-click themes: install, switch live, no restart.

## Install

```sh
dsh plugin --profile web add dshmarket
```

Restart `dsh web`, then open **Settings → Plugin Market**.

**Requires dsh web 0.1.0-rc.6 or newer.** On an older host the market
disables itself and says so in the browser console rather than rendering
against primitives that are not there — if the Plugin Market entry never
appears, that is usually why. Worth checking when a desktop build bundles
its own dsh: it may be older than the one `npm` would give you (#139).

## What you get

- **Browse & search** the full community catalog (2300+ plugins, growing daily) — category filters, star counts, top/new sorting, bilingual descriptions that follow your UI language
- **Host-aware discovery** — cards show the DSH requirement declared by `engines.dsh` or lockstep `@deepseek-ai/dsh-*` peers; an opt-in filter hides only confirmed mismatches with the running host. Undeclared, malformed, unavailable, and GitHub-only entries remain visible rather than being guessed incompatible
- **Screenshots** — AppStore-style screenshots, auto-carousel when there's more than one, click to preview full-size: author-curated shots show right on the card (zero extra requests); plugins without curated shots fall back to automatic README extraction once you open the install dialog. Images load from GitHub hosting only
- **Comments** — every card opens the plugin's discussion thread in place. It is the same thread its pages on [dshmarket.com](https://dshmarket.com) and the [catalog](https://awesome-dsh-plugin.com) show, so a plugin has one conversation rather than three. Backed by GitHub Discussions through giscus: it loads when you open it, needs a GitHub account only to post, and the note above it says plainly that opening it contacts giscus.app and GitHub. On local dsh web, reading stays embedded while a dedicated GitHub action opens the exact discussion in a new tab for sign-in and posting, so the cross-site return never carries or depends on the host session
- **Favorites** — bookmark plugins and themes from Discover or the Themes tab; a dedicated Favorites tab lists them with search, sort, and install actions. Bookmarks persist in the profile's market state (`state.json`); entries that leave the catalog can be cleared in one click
- **Themes** — a dedicated tab for community themes and skins: install → active immediately, switch with one click (themes are mutually exclusive, your choice survives restarts), uninstall to revert
- **One-click install** — confirm the source, watch live progress; most plugins go live after a page refresh, no restart
- **Backup & restore** — export your profile's plugin list and configuration as readable JSON, import it on another machine, store it on WebDAV with daily auto-backup, or sync through a private GitHub Gist; restores **merge** (plugins installed after the backup are kept), validate before writing, and roll back on failure
- **Updates** — per-plugin update checks (npm version or pinned commit vs HEAD), one-click update, or update everything at once; the market updates itself the same way
- **Resilient GitHub routes** — in the China download region, Git refs, README content, and avatars each keep their own fallback order. The market remembers the last working route, switches only after transport/HTTP/payload validation fails, and rejects proxy error pages disguised as HTTP 200. If every built-in route fails, **Settings → Plugins → Plugin configuration → GitHub acceleration** accepts one persistent custom HTTPS prefix; `DSHM_GITHUB_PROXY` remains the operator-owned override
- **Public update API** — plugin-owned settings pages can use the versioned, capability-gated [update API v1](UPDATE-API-V1.md) (beta) instead of copying package-manager logic or depending on private Market UI responses
- **Uninstall** — two-step confirm; plugins installed this session are removed live
- **Hot disable / enable** — toggles write `- id: …` + `disabled: true|false` into the profile's `cordis.patch.yml` (the official patch layer, mechanism ported from [dsh-plugin-hub](https://github.com/Noob-stupid/dsh-plugin-hub)): DSH's HMR re-composes within ~1s, no restart, and the loader re-applies the choice on every boot; hand-edited patch rows show as badges, host-infrastructure plugins are protected from toggling, and a malformed patch file is never made worse
- **Restart when needed** — changes that cannot hot-load show a one-click restart beside the pending-change banner; the action is restricted to same-origin loopback requests
- **Zero jargon** — if a component is missing (pnpm), the market detects it and offers a one-click automatic setup
- **Log export** — one click produces a sanitized plain-text log for bug reports (home paths and credential shapes are masked; nothing is ever sent anywhere). The market's version sits next to the page heading, so a screenshot of a problem already carries it
- **Settings card** — on dsh 0.1.0-rc.7 and newer the market manages *itself* from **Settings → Plugins → Plugin configuration**, next to every other plugin: see the running version, pick a **release channel** (stable, or beta to try builds still being verified — the market only, never your other plugins; a third *dev* channel appears once developer mode is switched on, and carries builds published straight off a branch), update, or remove the market — with an opt-in cleanup that also drops the disable rows it wrote, so plugins it switched off start running again rather than staying off with no UI left to switch them back on
- **Diagnostics** — the plugin load order and conflict surface, one page: bundle stack with official/community badges, duplicate loader entries, dependency version mismatches, multi-version core packages, overrides and invalid config entries. Plain-language terms, problem blocks highlighted, everything collapsible

- **Load order** — drag community bundles into the order you want, or take the suggested one derived from the plugins' own before/after rules. Nothing is written until a trial composition passes, and the panel tells you what the new order would change (overrides, invalid or duplicate entries) before you apply it
- **AI fix** — one click copies a diagnostics-driven fix prompt (errors/warnings/order conflicts + conservative scope instructions) to the clipboard; you paste it into a new conversation and decide whether to send. The prompt first asks the agent to detect whether it is itself the harness running this profile — if so it hard-forbids mutating the live composition, upgrading/restarting the harness or core packages, or reinstalling deps, and instead has it write an idempotent `apply` script plus a `rollback` script, have you run them in an external terminal, and paste the output back

## Speed

Installs prefer repo-verified npm packages, then author-supplied prebuilt GitHub Release tarballs, before falling back to full-repo GitHub source downloads. Prebuilt installs are typically seconds and do not need local build scripts; source-only plugins depend on your connection to GitHub.

## Security

- Installs are restricted to sources listed in the curated [awesome-dsh-plugin](https://awesome-dsh-plugin.com) registry — anything else is rejected
- Build scripts stay blocked by default (pnpm ≥10); allowing one is your explicit per-package choice
- Terminal/CLI-surface plugins are flagged before you install them into the web profile
- The install endpoint accepts same-origin POST only; the market never phones home
- Backups can contain credentials from your profile config — the UI warns before export and upload; WebDAV sync is https-only, refuses private-network targets, and never stores your password in the browser
- Authenticated Gist requests always go directly to `api.github.com`; bearer tokens are never sent to a public GitHub acceleration service. GitHub source archives also stay on canonical codeload URLs so pnpm's integrity policy remains in force
- The restart endpoint additionally requires a direct loopback client (forwarded requests are rejected) and relaunches the exact DSH entry, arguments, environment, and working directory
- One-click restart launches a detached replacement. **When this host is systemd's own service process the button is hidden automatically** — the market would otherwise kill the takeover process along with the unit's cgroup and the service would not come back. The pending-change notice stays visible and says so. Detection requires both a systemd marker AND being the unit's main process, because `INVOCATION_ID` is inherited by every descendant of a unit (an ordinary terminal included) and hiding the button for those would be the worse bug. pm2 and launchd are not detected, so those deployments need the explicit setting below. Either flip **Allow restart** off in **Settings → Plugins → Plugin configuration**, or write it into the profile patch — where it has to sit under `config:`, because the loader passes only that sub-object to a plugin and a top-level `allowRestart:` is silently ignored (#227 by @Fantasymax):

  ```yaml
  - id: dsh-market
    name: dshmarket
    config:
      allowRestart: false   # NOT at the top level beside `name:`
  ```

  `GET /dsh-market/status` reports `"restart": false` once it has taken effect.
- For terminal-attached launches, the detached replacement keeps running after the original terminal closes
- Listing ≠ endorsement: plugins are third-party code, install sources you trust

## Submit your plugin

**This repo is the market app, not the catalog.** The plugin list comes from the curated [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) registry — to get your plugin listed in the market, open a PR **there** (one entry in the list; the site and this market pick it up automatically, usually within a day). Please don't PR plugin entries against this repo.

## Roadmap & feedback

- **Bugs** go in [issues](https://github.com/dsh-market/dsh-market/issues) — attaching the market's "Export log" makes diagnosis roughly ten times faster
- **Feature ideas** go on the [Roadmap](https://github.com/orgs/dsh-market/projects/1). Issues are kept for things that are broken, so a proposal filed as an issue gets moved there and closed; the discussion stays where you wrote it either way
- Every roadmap item welcomes community PRs — say so on the item before starting, so two people don't build it twice

## Data source

Fetched live on every open from [awesome-dsh-plugin.com/plugins.json](https://awesome-dsh-plugin.com/plugins.json) — curated entries, npm mapping, and star counts refreshed daily by CI, with no stale cache behind it. A failure reports the actual reason and elapsed time, with a Retry button.

There is deliberately no bundled snapshot to fall back on: for a catalog that grows daily, a stale answer is not a degraded one but a wrong one — a plugin published this morning would read as "does not exist".

**If that host is unreachable from your network**, point the market at a mirror instead. Set `DSHM_REGISTRY_URL` in the environment dsh runs in, to anything serving the same `plugins.json` shape:

```sh
DSHM_REGISTRY_URL=https://your-mirror.example/plugins.json dsh web
```

## Friends

### DSH Desktop (dataelement)

[dsh-desktop](https://github.com/dataelement/dsh-desktop) — a desktop app for DeepSeek Harness: run and manage a local Harness without installing Node.js yourself. Ships with this plugin market preset as the default. [dshdesktop.com](https://dshdesktop.com)

### DeepSeek Harness Desktop (hairyf)

[deepseek-harness-desktop](https://github.com/hairyf/deepseek-harness-desktop) — a native desktop app for DeepSeek Harness built with **Tauri** (Rust + Web): one-click local install and launch with no Node.js setup required. On first run it offers to install this plugin market as a recommended preset.

### DeepSeek Harness Desktop (anywhere-labs)

[deepseek-harness-desktop](https://github.com/anywhere-labs/deepseek-harness-desktop) — an Electron desktop app for DeepSeek Harness built around the idea that everything is a plugin, including the desktop itself: profile switching, a bundled Node and pnpm, and a recoverable install path that snapshots the profile before a change. [dshdesktop.cn](https://dshdesktop.cn)

### DSH App

[dsh-app](https://github.com/RyensX/dsh-app) — a DeepSeek Harness desktop client built on Tauri 2 rather than Electron, so it ships a much smaller binary and uses the system webview. AGPL-3.0.

### Local DSH

[local-dsh](https://github.com/liangchen-harold/local-dsh) — a DeepSeek Harness desktop client that can run the model on your own machine: it bundles llama.cpp next to Node, pnpm and DSH, so a downloaded GGUF model answers without any external API. Built on Tauri; Apple Silicon Macs for now. [localdsh.com](https://localdsh.com)

### DSH Get

[DSH Get](https://www.dshget.com/) — a searchable web directory for discovering DeepSeek Harness plugins: category filters, bilingual descriptions, install commands and per-plugin detail pages. Its normalized catalog snapshot is public at [bobby-sheng/dshget-data](https://github.com/bobby-sheng/dshget-data).

### modlens

[modlens](https://github.com/liustack/modlens) — the first vision plugin for DeepSeek Harness: bolts visual understanding onto text-only models like DeepSeek and GLM. Paste an image, get structured JSON evidence back — OCR, layout, semantics. Available right in this market:

```sh
dsh plugin --profile web add @liustack/modlens
```

## License

MIT · [dshmarket.com](https://dshmarket.com)
