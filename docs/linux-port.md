# DSH Desktop on Linux

DSH Desktop was published for macOS and Windows only. This guide covers the
Linux port that is tracked in this tree: which parts of the desktop shell are
platform-specific, how to build and install the Linux packages, and which
capabilities intentionally stay unavailable.

The port keeps the existing architecture. Electron Main still hosts the
Harness runtime, the renderer is still the upstream Harness Web UI served on a
random loopback port, and the desktop customizations still arrive through the
tracked patch layer.

## What the port adds

| Area | Change |
| --- | --- |
| Packaging | `linux` (`deb` + `AppImage`), `deb`, and `appImage` sections in `package.json`; `package:linux`, `package:linux:dir`, and `package:dev:linux` scripts |
| Harness runtime | Linux uses the bundled target-native Node.js runtime; macOS keeps its Electron `UtilityProcess`. Upstream `edb4398` later moved Windows to the packaged Electron binary in Node mode, so Linux is now the only platform that ships the standalone runtime |
| Debian dependencies | The default `libgtk-3-0` / `libatspi2.0-0` names no longer exist after the Ubuntu 24.04 `t64` transition, so the Linux package declares alternatives that resolve on both older and newer releases |
| Chromium sandbox | Debian `postinst` restores the SUID `chrome-sandbox` helper and installs an AppArmor `userns` profile; `postrm` removes the profile; the AppImage launcher falls back to `--no-sandbox` |
| Target verification | `scripts/verify-target.mjs` already validates `linux/x64` and the bundled Node.js runtime; no change was needed |

## Keeping the platform layer reviewable

The port adds packaging and platform fixes on top of the upstream tree; it does
not fork the shared code. The reference implementation is the macOS and Windows
build, so shared behaviour follows upstream and a change here should stay inside
the platform seams this guide lists.

| Seam | Where |
| --- | --- |
| Packaging | `package.json` (`linux`, `deb`, `appImage`), `build/linux-*.sh`, `build/dsh-desktop.apparmor`, `build/icons/` |
| Window frame, controls, and drag bands | `src/preload/linux-window-chrome.ts`, the Linux branch in `src/preload/index.ts` |
| Tray and platform announcement | `src/main/close-to-tray.ts`, `src/main/index.ts` |
| Bundled frontend plugin behaviour | `patches/@deepseek-ai+*` |

`patches/` also has to stay replayable: edit the installed package, regenerate
the patch with `npx patch-package <package>`, then confirm that a clean `npm ci`
applies every patch without errors. Every seam above has a regression test in
`test/linux-*.test.ts` plus the measurements in
[Verifying a Linux build](#verifying-a-linux-build).

## Prerequisites

- Ubuntu 24.04 or newer (Debian 13+) on x64, or another distribution with the
  same libraries
- Node.js 22 or later and npm
- No additional build toolchain: Electron, the Harness runtime, and the PPT
  runtime are downloaded as prebuilt or JavaScript packages

## Build

```bash
npm ci                 # postinstall applies patches, brand assets, Electron
npm run build          # PPT runtime + main/preload bundles
npm run package:linux  # deb + AppImage into dist/
```

Individual targets:

```bash
npm run package:linux:dir   # unpacked dist/linux-unpacked, fastest to test
npm run package:dev:linux   # development channel (name/appId suffix "dev")
npx electron-builder --linux deb --x64 --publish never
```

Only build each artifact on the operating system and architecture that will run
it. The packaged app contains architecture-specific native modules and a 129 MB
target-native Node.js runtime, so cross-building a Linux package from macOS or
Windows is not supported.

### Builds without a writable `$HOME`

electron-builder and `@electron/get` cache downloads in `$HOME` by default.
When `$HOME` is read-only (containers, sandboxes), point the caches at a
writable directory:

```bash
export XDG_CACHE_HOME="$PWD/.cache/xdg"
export ELECTRON_BUILDER_CACHE="$PWD/.cache/electron-builder"
export electron_config_cache="$PWD/.cache/electron"
npm run package:linux
```

## Install and run

The Debian package is the recommended artifact: it keeps the Chromium sandbox,
installs a desktop entry, and installs the AppArmor profile described below.

```bash
sudo apt install ./dist/dsh-desktop-linux-amd64.deb
```

The application lands in `/opt/DSH Desktop` and can be started from the
application grid or with `dsh-desktop`.

### Rebuilding and reinstalling

`npm run package:linux` builds the version `package.json` currently declares, so
two local rebuilds of it are indistinguishable to apt: reinstalling the second
one answers **"dsh-desktop is already the newest version"** and changes nothing.
Two ways around that, depending on what you want to know afterwards:

```bash
# Same version, replaced in place. The app still reports the plain version.
sudo apt install --reinstall ./dist/dsh-desktop-linux-amd64.deb

# A build stamp in the version, so apt upgrades normally and About shows which
# build is installed (0.1.1+local.202609281705 and later).
npm run package:linux:local
sudo apt install ./dist/dsh-desktop-linux-amd64.deb
```

`package:linux:local` only adds a build stamp to the package it produces, so a
release build, which calls `package:linux` with the tag version, stays unaffected.

The AppImage is portable but unsigned and runs without the Chromium sandbox:

```bash
chmod +x dist/dsh-desktop-linux-x86_64.AppImage
./dist/dsh-desktop-linux-x86_64.AppImage
```

## The Chromium sandbox on Ubuntu 23.10 and newer

Chromium starts its renderer inside a sandbox. It prefers the SUID helper
`chrome-sandbox`, which must be owned by root with mode 4755. When that helper
is missing it falls back to an unprivileged user namespace, and when it is
present but unusable it aborts with `The SUID sandbox helper binary was found,
but is not configured correctly`.

Both paths are blocked out of the box for a locally built package:

- The build runs as an unprivileged user, so `chrome-sandbox` ships as mode
  0755 owned by that user — present, but not usable.
- Ubuntu 23.10 and newer ship
  `kernel.apparmor_restrict_unprivileged_userns=1`, which denies user namespace
  creation to programs that have no AppArmor profile, so the namespace fallback
  aborts with `No usable sandbox!`.

This affects every unsigned Electron build on those releases, not only DSH
Desktop. The port handles it the same way `google-chrome-stable` does, with both
mechanisms:

- `build/linux-after-install.sh` (Debian `postinst`, run as root) chowns
  `chrome-sandbox` to `root:root` and restores mode 4755, then writes
  `/etc/apparmor.d/dsh-desktop` from `build/dsh-desktop.apparmor` with the
  installed executable path substituted, and loads it with `apparmor_parser`.
  The profile is `flags=(unconfined)` plus `userns,` — the exact shape Ubuntu
  ships for Chrome and Chromium — so it only lifts the namespace restriction and
  grants no extra access. `build/linux-after-remove.sh` (`postrm`) unloads and
  removes it again.
- The AppImage can do neither without root: its squashfs image cannot carry a
  root-owned SUID helper, and it cannot install a profile. `appImage.executableArgs`
  therefore launches it with `--no-sandbox`.

Run `ls -l '/opt/DSH Desktop/chrome-sandbox'` after installing the deb to confirm
the helper shows `-rwsr-xr-x root root`; if a later copy of the tree loses that,
the AppArmor profile keeps the namespace sandbox working as long as
`chrome-sandbox` is removed or made usable again.

To keep the sandbox with an AppImage instead:

```bash
./dist/dsh-desktop-linux-x86_64.AppImage --appimage-extract
sudo tee /etc/apparmor.d/dsh-desktop >/dev/null <<EOF
abi <abi/4.0>,
include <tunables/global>

profile dsh-desktop "$PWD/squashfs-root/dsh-desktop" flags=(unconfined) {
  userns,
}
EOF
sudo apparmor_parser -r /etc/apparmor.d/dsh-desktop
./squashfs-root/dsh-desktop
```

## Local data

| Path | Contents |
| --- | --- |
| `/opt/DSH Desktop` | Installed application and bundled Harness runtime |
| `~/.config/dsh-desktop` | Production user data (or `$XDG_CONFIG_HOME/dsh-desktop`) |
| `~/.config/dsh-desktop/harness` | `DSH_HOME`: profiles, sessions, settings, credentials |
| `~/.config/dsh-desktop/logs/harness.log` | Desktop and Harness startup diagnostics |
| `~/.config/dsh-desktop-dev` | Development-channel data, kept separate from production |
| `~/.config/dsh-desktop/bin` | Cached helper binaries such as `cloudflared` |

The first launch offers to import an existing `~/.dsh` Harness home. The import
copies sessions, settings, credentials, presets, and workspaces into the
desktop profile and records the decision in
`.web-import-decision.json`; the original `~/.dsh` tree is never moved or
modified.

## Platform differences that remain

- **In-app updates** stay disabled. `supportsAutoUpdates()` covers packaged
  macOS and Windows builds, so the update surfaces report `unsupported` on
  Linux. This is enforced by the service, not only by that local gate: the
  update endpoint rejects the platform the desktop would send, and no Linux
  artifact is published to the feed.

  ```console
  $ curl -sS 'https://dshdesktop.com/crash/v1/updates/check?installationId=…&currentVersion=0.1.0&platform=linux'
  {"error":"Invalid request","issues":[{"code":"invalid_value","values":["mac","mac-intel","windows"],
   "path":["platform"],"message":"Invalid option: expected one of \"mac\"|\"mac-intel\"|\"windows\""}]}
  $ curl -sSL -o /dev/null -w '%{http_code}\n' https://dshdesktop.com/updates/latest/latest-linux.yml
  404
  ```

  A Linux value in `desktopPlatform()` would therefore change nothing by itself;
  enabling updates needs the service to accept the platform and to publish
  `latest-linux.yml` beside `latest.yml`. Reinstall the new package to upgrade.
- **Crash reporting** is disabled for the same reason. `desktopPlatform()` in
  `src/main/desktop-service/service.ts` has no Linux value, so
  `initializeDesktopService()` logs one warning and the app continues without
  diagnostics. The service knows the macOS and Windows platforms only, so a
  report Linux sent would be rejected exactly like the update check above.
- **No menu bar; the desktop commands live in the settings header.** A GTK
  window draws the application menu as a row of top-level menus across its
  top-left, and Electron has no way to keep the menu while hiding that row the
  way Windows does with `autoHideMenuBar`. Linux therefore installs no menu at
  all, and the commands that only a menu offered — the Harness group, plus
  Export Session Log and About, which Windows and macOS reach from their own
  chromes — are registered in the settings panel header (`settings.action`) by
  `packages/dsh-desktop-client-ui`. Dropping the bar also drops its
  accelerators; see the keyboard note below for why that costs Linux little.
- **Tray icon and close-to-tray work on Linux** (`ensureTray()` and
  `shouldKeepRunningInBackground()`), so closing the window hides it and the
  Harness keeps running; the tray menu offers Show DSH Desktop and Exit. The
  icon comes from the packaged `resources/icon.png`. Ubuntu provides the
  StatusNotifier host through its AppIndicator extension and ships
  `libayatana-appindicator3`, so the icon lands in the top bar without extra
  packages; check the host with
  `gdbus call --session --dest org.kde.StatusNotifierWatcher --object-path /StatusNotifierWatcher --method org.freedesktop.DBus.Properties.Get org.kde.StatusNotifierWatcher IsStatusNotifierHostRegistered`.
  If the icon cannot be created at all, the window keeps its native close
  behavior — hiding into a tray that never appears would strand the user with no
  way back to the window, so `shouldKeepRunningInBackground()` also requires a
  live icon. Note that a *page* calling `window.close()` is not the close button:
  Electron 43 destroys such a window without emitting the window's `close` event,
  so that path still ends the app.
- **Keyboard shortcuts start unbound.** Harness declares browser defaults for
  macOS and Windows but none for Linux, so every command resolves an empty
  `web:linux` profile. This cannot be fixed by borrowing another profile:
  `register()` validates all six runtime/platform pairs and throws
  `Unsupported Web shortcut` for any browser-on-Linux binding outside its allow
  list, which takes `dsh-client-ui-layout` down with it. Binding them needs the
  native keyboard bridge described below.
- **macOS-only recovery** — LaunchAgent auditing and quarantine — stays inert:
  both entry points return early on non-macOS platforms.
- **Directory picker, phone pairing, safe mode, plugin recovery, PPT mode, and
  workbenches** are platform-agnostic and work unchanged. `cloudflared` already
  has Linux x64/arm64 download entries for the optional public tunnel.

## The frontend on Linux

The shell contributes only window chrome; the interface itself is the upstream
Harness Web UI, so "porting the frontend" means telling that UI which platform it
is running on. Harness reads `data-platform` from `<html>` before its client
modules mount, and the desktop patches key their geometry off it.

macOS announces `darwin` (`src/preload/macos-window-chrome.ts`). Windows
deliberately announces nothing, so the patches express "the host that reserves a
native caption strip" as the absence of the attribute. Linux announced nothing
either and therefore inherited the Windows geometry: the sidebar carried a
`padding-top:32px` meant to clear a caption strip. Linux draws its caption inside
the header bands instead (see "The window frame on Linux"), so it still has no
reason to reserve that strip. Measured in a running window, the sidebar's own
padding was `32px` before and `6px` after, with the conversation header unchanged
at `10px`.

`src/preload/linux-window-chrome.ts` now announces `linux`, and the two geometry
patches scope the Windows rules as
`html:not([data-platform=darwin]):not([data-platform=linux])` — explicit rather
than "no attribute", so a future platform that announces itself cannot silently
inherit the caption strip.

Announcing the platform alone is not enough. Harness throws
`Desktop keyboard bridge unavailable` when it resolves `runtime: desktop`
without `window.dshDesktop.keyboard`, and this host exposes no such bridge, so
the new module also sets `dshDesktopWebShortcuts` exactly as the macOS chrome
does. `runtime` therefore stays `web` and only the platform becomes explicit.

Sharing the Windows defaults is not an option for the keyboard layer. Ten of the
eleven commands that register shortcut defaults declare `desktop:linux`,
`web:macos` and `web:windows`, but only `shortcuts.open` declares `web:linux`,
because a browser on Linux can be trusted with almost no key combinations.
`register()` enforces that when a command registers, across every profile:

```js
if (runtime === "web" && !isWebBindingAllowed(binding, platform))
  throw new Error(`Unsupported Web shortcut: ${command.id}`);
```

Falling back from `web:linux` to `web:windows` therefore throws during
registration, and because `dsh-client-ui-layout` registers `sidebar.left.toggle`
the whole client module graph fails with `required client modules failed to
activate` and the app drops into plugin recovery. Closing this gap means
implementing the native keyboard bridge and letting Linux resolve
`runtime: desktop` against the `desktop:linux` defaults upstream already ships —
a deliberate piece of work, not a one-line patch.

One interaction in this graph was repaired rather than re-scoped. The strip that
resizes the conversation column reveals a 2px `::after` line whose gradient is
placed by `--dsh-width-handle-pointer-y`, and upstream's `onPointerMove` writes
that variable only once a drag is live — the `if (!dragging.current) return;`
guard sits above the write. A hover therefore keeps the CSS fallback value, and
because hovering only flips the line's `opacity`, nothing reaches the screen until
another event forces a repaint; the first drag does, and it also raises
`z-index` from `0` to `8`. Measured in a running window: with upstream code,
hovering the strip reports `opacity: 1` and a valid
`linear-gradient(... calc(50% - 36px) ...)`, yet no line appears — the pixel diff
between hovering and moving away is `0`, and the same capture shows a bare
background. Writing the variable on every pointermove, hover included, fixes both
halves: the same measurement then finds the line under the cursor (`2083` changed
pixels, unchanged after 1.5s, 3 of 3 runs), and a 60px drag still moved the column
from `924px` to `764px`.

That change lives in
`patches/@deepseek-ai+dsh-client-ui-conversation+0.1.7-rc.2.patch` beside the Linux
header geometry, because the defect is upstream rather than Linux-specific — the
Windows build has it too — and `npm ci` replays it.
`test/conversation-width-handle-hover.test.ts` runs the pointermove handler that
ships in the installed package, so the regression returns if the patch stops being
applied.

## The desktop menu

Windows keeps its menu in a custom caption strip and hides the native menu bar
(`autoHideMenuBar`, plus `setMenuBarVisibility(false)`); macOS uses the
application menu. Linux had neither, so `installMenu` built a native menu — which
GTK draws as a row of top-level menus across the window's top-left. Electron
cannot keep that menu while hiding the row, so Linux now installs none.

The commands the bar carried moved into the settings panel header, beside
upstream's 打开配置文件:

| | |
| --- | --- |
| Where | `packages/dsh-desktop-client-ui/client.js`, a `settings.action` occupant |
| What | 连接手机…, 重启 Harness, 以安全模式重启…, 显示 Harness 日志, 检查更新…, 导出 Session 日志…, 关于 DSH Desktop |
| How | the `Menu` and `Button` primitives, then `window.dshDesktop.runMenuCommand(id)` |

The bridge method is one named capability over the shared command list
(`src/shared/desktop-menu.ts`); main validates the command and authorizes the
sender (`assertTrustedDesktopMenuEvent` trusts only the app window). Quit stays
out of this list because the tray menu owns Exit, and closing the window only
hides it. Dropping the bar also drops its accelerators — `Ctrl+U`,
`Ctrl+Shift+M`, `Ctrl+Shift+R`, `Ctrl+R`, F11 and the zoom keys — which costs
Linux little, because its in-app shortcuts were never bound anyway.

Two parts of this are easy to get wrong, and both are pinned. The preload must
import the shared list as a *type*: a runtime import shared with
`windows-menu.ts` makes Rollup emit a chunk that **both** preloads `require`, and
a sandboxed preload cannot load files — the renderer silently loses its entire
bridge and the Windows caption menu dies with it. And the settings occupant stays
a source contract, because no unit test can open the dialog and click it.

## The window frame on Linux

Windows and macOS keep a native frame and borrow the OS for the caption controls
(`titleBarOverlay` on Windows, the traffic lights on macOS). A GTK window draws
its own titlebar above whatever the app adds, so Linux runs frameless — `frame:
false` for that platform only — and draws the controls itself:

| | |
| --- | --- |
| Controls | minimize, maximize/restore and close, fixed at the window's top-right and aligned with the conversation header's title row. 32px square — the tallest that still fits a 30px title row — with 14px glyphs |
| Source | `src/preload/linux-window-chrome.ts`, mounted on every page of the window — including recovery and Safe Mode, where no Harness slot exists to host them |
| IPC | `desktop-window:minimize`, `:toggle-maximize`, `:close`, `:get-state`, plus a pushed `:state-changed` so the icon follows a double-click or the window manager |
| Drag | the bands upstream marks `data-window-drag` (the conversation header, the sidebar's logo row and the plugin-manager headers); their interactive elements are switched back to `no-drag` |
| Room | only the bands the controls can reach reserve `BAND_CLEARANCE` on their right, so a page's own header actions cannot end up under the controls. Two bands are excluded: the sidebar's logo row, which sits at the opposite edge and whose padding squeezed the brand lockup and pulled its collapse button across the column, and the right sidebar's own band, which leaves the caption row entirely (below) |

The session actions that used to share the title row — open in file manager, the
⋯ menu and the right-sidebar toggle — move down to the tab row, which is the one
change this makes to upstream's own layout: the conversation patch adds Linux-only
rules pinning `.wSkVaW_headerUtilities` and `.wSkVaW_headerCorner` beside the
Conversation/Trajectory tabs.

The right sidebar's own band is the second one that leaves the caption. Upstream
draws its tabs and its split/fullscreen/collapse actions on the caption row — one
row above the toggle that opens the sidebar — so those three actions sat against
the window controls and read as part of them. That band now starts below the
caption and keeps the controls' own right inset, which puts its collapse button in
the exact box upstream's collapsed toggle uses: `1340,50 → 1368,78` in a 1380×900
window, `1880,50 → 1908,78` maximized, identical in both sidebar states. It keeps
its box over the caption it vacated, because that strip still has to be a drag
region.

Two consequences are worth knowing before touching this.
 Dropping the titlebar
also drops the window manager's own dragging (hence the drag bands) and its
double-click-to-maximize (hence the `dblclick` handler, which the Windows overlay
gets from the OS). And `frame: false` is scoped to Linux: Windows and macOS keep
their options and the caption widths they had.

## App icons

`build/icon.png` is not an app icon. `scripts/install-brand-assets.mjs` turns it
into the Web favicon (`dsh-desktop-logo.png`) and the page's `<link rel="icon">`;
it is light artwork, 1254px wide, and has no alpha channel. Pointing `linux.icon`
at it was wrong twice over:

- A single PNG makes electron-builder name the icon-theme directory after the
  image's pixel width, so the deb and the AppImage installed exactly one entry,
  `/usr/share/icons/hicolor/1254x1254/apps/dsh-desktop.png`. No icon loader reads
  that directory, so `Icon=dsh-desktop` resolved to nothing and the dock,
  launcher and app switcher fell back to a generic placeholder.
- The artwork itself differed from Windows and macOS, which build `icon.ico` and
  `icon.icns` from `build/app-icon.png`.

`linux.icon` is now `build/icons`, filled with the freedesktop size ladder (16,
22, 24, 32, 36, 48, 64, 72, 96, 128, 192, 256, 512) rendered from
`build/app-icon.png` — the same source as the Windows and macOS icons, and the
file `resources/icon.png` already used for the window icon. Both targets install
all thirteen sizes, and the AppImage points `.DirIcon` at the 512px entry.

`npm run icons:generate` produces all three formats from `build/app-icon.png`.
It used to shell out to the macOS-only `sips`/`iconutil` for the Windows and
macOS containers, which meant a Linux contributor could not refresh the committed
icons at all; the containers are written in Node now, so one command produces the
same set on any host. The ICNS carries the PNG chunk types `iconutil` emits
(`ic07`–`ic14`); the long-obsolete raw `ic04`/`ic05` frames are not reproduced.
`test/app-icon-set.test.ts` reads every ICO frame and ICNS chunk back out,
checks the container length macOS trusts, checks each frame against its declared
size, and fails if the committed ladder drifts from `build/app-icon.png`.

## The brand mark

DSH Desktop shipped its own mark — a whale drawn as a window with a tail
(`BRAND_MARK_PATH`) — and registered it over both of Harness's brand seats, so
the sidebar, the onboarding header and the splash loader all showed it while the
conversation hero showed the official whale. Three copies of that path existed
and the rasters were hand-drawn, which is how the icon theme ended up with a
light artwork file that matched none of the other icons.

The mark is now Harness's own whale, taken from
`@deepseek-ai/dsh-client-ui-primitives` — `FISH_LOGO_PATH` with its native
23.16×17.04 viewBox. There is one authoritative copy in the repository,
`build/brand-mark.svg`, and the UI seats render the shared `FishLogo` primitive
rather than a private path. Both seats size that primitive by *width*, matching
the footprint the retired mark occupied (`898/564 × 17` in the sidebar,
`898/564 × 18` in the onboarding header): this silhouette is narrower than the
one it replaced, so keeping the height left the brand lockup visibly smaller
than it had been.

Regenerating anything downstream of the mark:

```bash
npm run brand:generate    # build/brand-mark.svg -> app-icon.png, icon.png, logo-*.png
npm run icons:generate    # app-icon.png -> icon.ico, icon.icns, build/icons/*
npm run loader:generate   # build/brand-mark.svg -> the two splash loaders
```

`brand:generate` also reruns `scripts/install-brand-assets.mjs`, which is the
postinstall step that propagates `icon.png` and the two logo files into
`node_modules/@deepseek-ai/dsh-web-frontend/dist`. Packaging copies those, not
the `build/` originals, so regenerating the artwork without that step ships the
previous favicon — the mistake is silent until the deb is opened.

`scripts/generate-brand-assets.mjs` keeps the composition the hand-drawn files
had, so only the mark changed: the app icon is still the same dark rounded tile
(`#0d1616`, 824px inside a 1024px canvas, 185px radius), the favicon is still a
blue mark on a light plate, and the logo companions are still the mark in black
and white. Both plates size the mark to 80% of their width. Matching the *height*
of the outline it replaced was the first attempt and it read as mush: this
silhouette is about a fifth narrower at the same height, and the eye and fin
notches that identify it collapse below 24px. The logo canvas has no such slack —
the previous mark was 176px tall in a 192px frame — so there the height is what
fits and the width follows the aspect ratio. The splash loader
quantises the same silhouette onto its grid and now spouts its bubbles from the
whale's back instead of the window's traffic lights. That grid is 2px on a
392×220 canvas rather than 4px on 640×360, because `splash.html` draws the mark at
a fixed 196 CSS px with `image-rendering: pixelated`: the 640px canvas was being
nearest-neighbour resampled to 30.6%, which put every cell edge between device
pixels and visibly eroded the silhouette. Twice the display width lands every
cell on whole device pixels at 2x scaling and on exactly one at 1x.

`test/brand-mark.test.ts` compares `build/brand-mark.svg` against the primitive's
geometry and fails if either UI seat carries a private copy of the retired path.

## Verifying a Linux build

```bash
npm run typecheck
npm test
npm run package:linux:dir
XDG_CONFIG_HOME=/tmp/dsh-linux-check ./dist/linux-unpacked/dsh-desktop
```

The development-channel run writes to `$XDG_CONFIG_HOME/dsh-desktop-dev`; a
packaged run writes to `$XDG_CONFIG_HOME/dsh-desktop`. A healthy launch ends with
`Harness is ready` in `<userData>/logs/harness.log`, and the Harness Web UI loads
in the window. On a machine without a usable GPU the shell may relaunch itself
once or twice while its GPU fallback ladder settles; that state is stored in
`gpu-fallback.json`.

Run `npm test` with a writable `$HOME` (or a writable `XDG_DATA_HOME`). The
generation installer tests drive a real `pnpm` process, which needs to create its
store under `$XDG_DATA_HOME/pnpm`; a read-only home fails those two cases with
`ENOENT`/`EROFS` even though the port is fine.

The port was verified on Ubuntu 26.04 x64 (kernel 7.0, NVIDIA RTX 4070 Ti):

- `npm run package:linux` produces `dsh-desktop-linux-amd64.deb` and
  `dsh-desktop-linux-x86_64.AppImage`.
- Both the unpacked build and the AppImage start the bundled Node.js 24.9.0
  Harness runtime from `resources/app.asar.unpacked`, reach `Harness is ready` on
  the loopback endpoint, and render the full Harness UI — sidebar, sessions,
  composer, PPT mode, and the desktop plugins injected by the patch layer.
- `apparmor_parser -Q --skip-cache` accepts `build/dsh-desktop.apparmor` with the
  installed path substituted, including the space in `/opt/DSH Desktop`.

`npm run typecheck`, `npm run build`, and `npm test` are re-run on the same host
with the tray change in place (1337 passed, 2 skipped, 0 failures). The platform
seams were also read back from the unpacked build and from a running development
instance:

- Linux announces itself (`data-platform=linux`), injects the three window
  controls and three drag bands, and the caption CSS moves the session actions
  to `absolute`/`50px` beside the Conversation/Trajectory tabs.
- Hovering a width handle without pressing a button writes
  `--dsh-width-handle-pointer-y` at the cursor (412px for a cursor 412px below
  the handle's top edge) — it stayed unset before the fix — and paints the 2px
  reveal line at `x=418..419`, centred on the cursor's row (`y=488`). The whole
  frame differs from the idle capture by 262 pixels.
- The settings panel's About entry returns `{ ok: true }` from the
  `desktop-menu:execute` channel and opens the overlay (`display: none` to
  `flex`, 900px tall).
- Closing the main window hides it instead of destroying it (`isVisible()` goes
  `true` to `false`, `isDestroyed()` stays `false`) and the process keeps
  running with the tray icon it created.

Three things the test suite cannot reach need a running app, and they were read
back from a development instance started with:

```bash
XDG_CONFIG_HOME=/tmp/dsh-linux-check \
  node_modules/electron/dist/electron --inspect=9333 . \
  --remote-debugging-port=9334 --no-sandbox --password-store=basic
```

- **The preload layer.** `http://127.0.0.1:9334/json` exposes the renderer, where
  the preload-injected roots `dsh-desktop-about-root`, `dsh-desktop-update-root`
  and `dsh-desktop-mobile-button` appear once `initializeUi()` has run. Copying
  the built `out/preload/index.cjs`, re-adding the duplicate `dshWebImport`
  exposure, and reloading the page removes all three — that is the failure an
  early Linux build hit. The phone button is injected from the DOM observer, so it
  follows an animation frame and stays absent while the window is hidden.
- **The menu and its replacement.** `http://127.0.0.1:9333/json` exposes the main
  process. The main bundle is ESM, so `Menu` is reached through
  `process.getBuiltinModule('module').createRequire(…)( 'electron')` rather than
  `require`. On Linux `Menu.getApplicationMenu()` is then `null` and the window
  reports `isMenuBarVisible() === false`, so the row is gone. The commands moved
  to the settings panel header, where a screenshot of the dialog shows 应用菜单
  beside 打开配置文件, opening 连接手机…, 重启 Harness, 以安全模式重启…,
  显示 Harness 日志, 检查更新…, 导出 Session 日志… and 关于 DSH Desktop.
  Running one over the bridge returns its result
  (`runMenuCommand('zoom-reset')` → `{ ok: true, zoomFactor: 1 }`) and an
  unknown command is rejected by main, which is what keeps the capability closed.
- **The tray and close-to-tray.** Closing the window the way the ✕ does —
  `process.mainModule.require('electron').BrowserWindow.getAllWindows()[0].close()`
  over `http://127.0.0.1:9333/json` — leaves it hidden instead of closed
  (`isVisible() === false`, `isDestroyed() === false`) while the app process, its
  Harness child and the StatusNotifier item all stay up; `win.show()` brings the
  window back, and `app.quit()` (what the tray's Exit item runs) stops the
  Harness, drops the item and exits cleanly. The item is identified by resolving
  each entry of `RegisteredStatusNotifierItems` to its PID and matching the app
  process. Checked separately: a *page-side* `window.close()` still ends the app,
  because Electron 43 destroys that window without emitting its `close` event —
  hence the close button, not a script, is the path this behavior covers.
- **The caption's own layout.** Read back from the renderer: the controls are a
  fixed 100×32 box at `top: 8px, right: 12px`, and the right sidebar's band now
  starts below them — its split/fullscreen/collapse actions measured
  `1268,50 → 1368,78` against controls at `1268,8 → 1368,40` in a 1380×900 window,
  and `1880,50 → 1908,78` against `1808,8 → 1908,40` when maximized. With the
  sidebar closed, upstream's own toggle occupies exactly the collapse button's box
  in both geometries, so opening and closing the sidebar is one button position.
  Real input (`Input.dispatchMouseEvent`, not `element.click()`, which skips
  hit-testing) on the maximize button still maximizes and restores the window with
  the sidebar open — the band's drag box behind the controls does not swallow them.

`test/linux-desktop-menu.test.ts` keeps the Linux side of that arrangement from
being dropped again, as a source contract over `installMenu` and the settings
occupant; `test/preload-sandbox-imports.test.ts` guards the build constraint that
made the first attempt at it fail — a preload that shares a runtime import with
another preload entry is split into a chunk a sandboxed preload cannot load, so
the whole bridge disappears (both here and in the Windows menu view);
`test/preload-bridge-uniqueness.test.ts` (from upstream) is the behavioural guard
for the bridge itself.

Frontend geometry is measured the same way, on the renderer that
`http://127.0.0.1:<debug port>/json` exposes:

```js
const root = document.documentElement
const sidebar = document.querySelector('[data-dsh-sidebar-root]')
JSON.stringify({
  platform: root.dataset.platform,                         // 'linux'
  webShortcuts: root.dataset.dshDesktopWebShortcuts,       // 'true'
  sidebarPaddingTop: getComputedStyle(sidebar).paddingTop   // '6px', was '32px'
})
```

`test/linux-window-chrome.test.ts` covers the same ground without a window: it
mounts the module in jsdom, evaluates the patched `detectEnvironment` and
`resolveShortcutDefault` out of the Harness client bundle, and reads the two
geometry patches. Both halves fail if the escape hatch is dropped or the Linux
scope is removed from a patch.

The window chrome needs both halves of the debug surface, and the frame itself
comes from the main process:

```js
// main process: a frameless window reports no frame at all
win.getBounds()        // { width: 1380, height: 900 }
win.getContentBounds() // { width: 1380, height: 900 }  — equal, and equal to
                                                       // the page's innerWidth/Height
// renderer: the controls sit in the title band, the session actions in the tab band
document.getElementById('dsh-desktop-linux-window-controls').getBoundingClientRect()
document.querySelector('[class*=wSkVaW_headerUtilities]').getBoundingClientRect()
```

Measured that way in a session: the controls at y8–40 (the title row) and both
`headerUtilities` and `headerCorner` at y50 (the tab row, beside 对话/轨迹); on the
plugins page 刷新 and 添加插件 sit left of the controls rather than under them.
Keep the window shown and settled before trusting these numbers — a hidden or
just-resized Wayland window reports its content bounds out of step for a moment,
which is easy to misread as a leftover titlebar.

Packaged icons are read back out of the artifacts, because that is where both
failures lived — a source image that was not an app icon, and a directory name
no icon loader understands:

```bash
dpkg-deb -c dist/dsh-desktop-linux-amd64.deb | grep hicolor
```

Expect one `apps/dsh-desktop.png` under each standard size directory and no
`hicolor/<nonstandard width>/`. Every packaged file's pixel dimensions must match
the directory it sits in; `test/app-icon-set.test.ts` asserts that for the
source ladder and pins it to `build/app-icon.png`.

The SUID helper and AppArmor profile can only be exercised by a real install,
because dpkg runs the `postinst` as root:

```bash
sudo apt install ./dist/dsh-desktop-linux-amd64.deb
ls -l '/opt/DSH Desktop/chrome-sandbox'      # expect -rwsr-xr-x root root
sudo aa-status | grep dsh-desktop            # expect the loaded profile
```
