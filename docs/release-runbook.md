# Desktop release runbook

## Manual workflow dispatch

The `Release desktop installers` Run workflow form has five inputs:

| Input | Use |
| --- | --- |
| `mode` | `development` (default), `signed`, `prerelease`, `publish`, or `resign` |
| `target` | `all` (default), `macos`, or `windows`; recovery publication requires `all`, resign requires `windows` |
| `version` | Leave empty for development. Use non-`v` semver for signed/prerelease/resign; use the existing `vX.Y.Z` tag for publish |
| `source_run_id` | Original workflow run ID, required only for publish/resign |
| `checks` | `standard` (default) or `extended` (adds Windows full tests, three-scale recovery UI, packaged desktop smoke and development archive verification) |

- `development`: unsigned Dev packages, no signing or publication; uses the checked-out package version. Leave version and source empty.
- `signed`: production-identity signed test packages, e.g. `version=0.13.0-test.4`. After the selected platforms pass signing/notarization, CI uploads installers and `test-changes.md` to ModelScope `test/<version>/<run_id>/` and sends a Feishu test-build notification. The note groups changes since the nearest reachable version tag, with baseline, build SHA and a comparison link; long lists link to the complete Markdown file. Both `v` and `V` tags are recognized, and a build exactly on a tag compares against the preceding tag. `MODELSCOPE_TOKEN` and `FEISHU_RELEASE_WEBHOOK` are required; generation, upload, verification or notification failure fails the job. GitHub Release and rollout do not run. These builds use the production app id/update feed, so installed copies may later see the live `latest` channel.
- `prerelease`: production-identity signed packages, e.g. `version=2.1.0-rc.1`. Publish to GitHub `--prerelease` and ModelScope `releases/prerelease/` only with `target=all`. Single-platform runs sign that platform without publication.
- `resign`: reuse an existing `windows-x64-unsigned` artifact. Set `target=windows`, `source_run_id` to its original run and `version` to its exact version. Only signing/repackaging runs.
- `publish`: recover official publication after all native builds and signing succeed. For example, from reviewed tooling on `main`:

  ```bash
  gh workflow run release.yml --ref main -f mode=publish -f target=all \
    -f version=v0.13.0 -f source_run_id=40618960397
  ```

  The workflow validates repository, unchanged tag SHA, original workflow, successful native/signing jobs and unexpired artifacts; reuses the three signed artifacts; repeats asset checks and Feishu human confirmation. Approval binds the original release SHA to the new run/attempt, and source identity is rechecked before publication. It never moves tags or changes installers. Do not use it to bypass failed packaging/signing or recover expired artifacts.

Official releases still start by pushing a `v*` tag. The form is not an alternative to creating the official tag. `target` is honored: macOS-only runs do not build Windows and Windows-only runs do not build macOS.

The former `signed_version`, `prerelease_tag` and `release_tag` fields are now `version`; `unsigned_run_id` is now `source_run_id`. Update saved CLI/API dispatch commands accordingly. The four `windows_*` diagnostic booleans are replaced by `checks=extended`; individual diagnostic toggles are no longer exposed.

Popup generation and Chinese-to-English translation use Copilot `--available-tools=` (empty tool list) and `--disable-builtin-mcps`. A bare `--deny-tool '*'` is rejected by Copilot CLI 1.0.105 before model execution.

## Release history

Formal publication and archive backfill share the `desktop-modelscope-release-history` concurrency group. After uploading the versioned archive, both read `releases/versions.json` directly from ModelScope with cache bypass and append the new version to its existing entries. Existing tags, archive URLs and extra metadata are retained; rerunning the same version does not duplicate it. The JSON object is uploaded as a complete document, but the operation preserves history rather than replacing it with the current version alone.

An unavailable or malformed existing index, including a 404, fails the publication job before any index write. Retry after resolving the read failure. For a new ModelScope repository, explicitly initialize `releases/versions.json` with `{"versions": []}` before its first release; CI never assumes a failed read means empty history. This protects existing history from transient errors and stale website redirects. Publication does not reconstruct versions already lost by older runs; use archive backfill for those versions.

## Build layout and timing

Windows signing depends only on dispatch validation and the Windows build, not on macOS packaging or notarization. Once the unsigned Windows artifact is ready, the UKey signer can run while macOS jobs continue. Native builds start after dispatch validation; there is no separate preparation or validation job. The existing `npm run build` prepares Office/PPT assets and compiles the application. Cache-backed generation avoids paying another runner's checkout/install/transfer overhead for a PPT build measured at about eleven seconds.

Common tests and typecheck run once on a platform already being built: Apple Silicon for `target=all`, release tags and macOS-only dispatch; Windows for Windows-only dispatch and PRs. Intel does not repeat common tests. When macOS owns the common suite, Windows uses `vitest.windows.config.ts` for platform regressions. `checks=extended` explicitly permits a second full suite on Windows during all-platform diagnosis. The existing full-suite exclusions for expensive document/PPT fidelity tests and the separate PPT font workflow are unchanged.

Both macOS architectures and Windows retain native packaging, `verify-target` and afterPack gates. Generated Office templates/PPT assets use a cross-OS cache keyed by source/lockfile inputs; only generated portable assets are shared, never node_modules or a target Python/Office runtime. A cold or stale generated cache is rebuilt by the native build; the existing fingerprints remain authoritative. Parallel cold jobs may each generate assets before the first cache is saved. This is preferable to a permanently serialized extra preparation stage for every build.

The redundant source Harness startup probe is removed. Each package still runs the mandatory afterPack gates for Harness/bootstrap, dependency closure, terminal/speech natives, PPT and Office. The additional Windows desktop launch/workspace/session smoke and three-scale recovery UI checks are distinct from those gates; both are enabled by `checks=extended`. Standard validation is the default; extended checks apply only to manual dispatch. These extra checks are not scheduled for PRs or release tags; choose extended validation when qualifying startup/recovery/runtime changes. These gates do not establish model-request or real user UI acceptance.

Office runtime downloads remain cached per native target, separately from generated template/PPT content. Windows checkout disables automatic CRLF conversion before checkout: the Office/PPT fingerprint hashes input bytes, so line-ending conversion would otherwise invalidate shared assets and regenerate previews. Native build jobs restore Electron downloads before `npm ci`; Electron 43's `electron_config_cache` and the builder's `ELECTRON_CACHE` point to the same restored directory. Windows additionally caches electron-builder downloads. Dependency installs keep postinstall enabled, use `--prefer-offline --no-audit --no-fund --timing`, and upload only structured npm timing JSON. The install-time advisory report was informational, not a failing security gate; audit findings should be handled separately from repeated build installs. npm's download cache avoids refetching packages but does not preserve `node_modules` or skip extraction, integrity verification or patch replay. Cache visibility remains scoped by GitHub to the current/default/base branch and platform; an identically named cache on an unrelated feature branch is not reusable. Local `npm test` and `package:*` commands still prepare their own inputs. Already compressed installer artifacts use `compression-level: 0` during upload.

GitHub Actions keeps new development installers for 3 days and other new workflow artifacts and logs for 7 days. The unsigned Windows signing handoff stays at 1 day. Run `resign` while the source artifact is available, and complete publication before handoff artifacts expire. `windows_smoke` checks the current build; there is no separate `smoke` dispatch mode. GitHub Release assets remain the durable distribution copy. Repository retention changes do not shorten existing artifacts.

Concurrency is grouped by ref and target: a Windows-only retry can run while an all-platform run finishes macOS notarization. Runs for the same ref and target remain serialized; publication still requires `target=all` (or a release tag), and the single local UKey runner serializes Windows signing.

The self-hosted signer downloads artifacts in six concurrent 32 MiB ranges through `gh`, retries bounded requests, and checks the complete archive against GitHub's SHA-256 digest before extraction. A real 668,014,109-byte signing artifact downloaded and verified in 149 seconds on the signing host; the previous single stream was still incomplete after ten minutes. Throughput depends on the network. A short response, failed transfer or digest mismatch leaves an existing verified output untouched and removes temporary parts.

PPT packages are generated under `.build/ppt-runtime/packages/` and overlaid into the Electron package. The `afterPack` gate (`scripts/after-pack.cjs`) loads `dsh-ppt` and `dsh-ppt-composer` through `app.asar` on the packaged Electron runtime, including native imports and template previews, and fails when any Mach-O, ELF or PE file is packed inside `app.asar` instead of being matched by `asarUnpack`. A successful source build alone does not verify the packaged paths. The Office afterPack gate also executes the packaged Python and skills, generates/reopens DOCX/PPTX/XLSX, checks OPC slash paths, and converts all three with the packaged LibreOffice CLI. Signed Windows installation smokes repeat this check from both installation directories. Python is carried in `resources/office-runtime`, outside ASAR; the fixed runtime and wheel provenance is documented in [Office runtime](office-runtime.md).

The build rejects external main/preload imports absent from the packaged dependency contract. Before signing, afterPack verifies unpacked resource sizes/hashes, production dependency manifests and required Harness peers, then runs a temporary Safe Mode Harness, authenticated HTML/bootstrap registration, node-pty and speech native loading with the packaged Electron runtime. The signed Windows smoke repeats the runtime probe using installed paths and does not require checkout dependencies. This probe does not establish browser UI activation or a successful model request; perform native UI acceptance separately. The unpacked hashes belong to the pre-sign payload and must not be compared against binaries changed by signing. `node scripts/verify-desktop-navigation.mjs` is an additional interactive-desktop check of splash rendering and window navigation cancellation.

## Windows signing archive

Signed, prerelease and tag builds always archive and validate the unpacked Windows payload. Development builds opt in with `windows_archive_check=true`, using `dist-dev` without signing or publication. `scripts/archive-windows-release.mjs` uses the pinned Node tar implementation with gzip, avoiding the native Windows tar crash reproduced with Unicode paths (0xC0000005). It checks gzip integrity and the nonempty `win-unpacked/` root before replacing the final archive. Packing and validation have bounded timeouts; failures preserve an earlier output and remove the invocation's temporary file.

The packaged smoke runs a separate temporary copy and waits for its process tree to exit. This cleanup is independent of archive input and does not prove the original failure was a file lock. Inspect the reported packing/validation stage and original cause on failure. A successful archive does not establish signing or installer verification success.

## macOS app notarization retries

App notarization runs in `scripts/notarize-macos.mjs`, an `afterSign` hook that finishes before DMG/ZIP creation. The built-in electron-builder notarization is disabled to avoid duplicate submissions. The hook uses the existing `@electron/notarize` API for submission and acceptance, then recovers stapling failures and validation failures 65/68/69 with up to 6 fresh calls, waiting 10/20/30/40/50/60 seconds and limiting each call to 60 seconds. Retry subprocess timeouts are also retried. Rejected notarization and permanent errors fail immediately; successful stapling must pass `stapler validate`. The later DMG stapling and validation in the release workflow use progressive backoff (up to 6 attempts with 15s/10s increments) across both Apple Silicon and Intel to accommodate Apple CloudKit global replication delays. A network error talking to Apple CloudKit during stapling therefore no longer fails the release job prematurely.

## Local Windows UKey signing runner

Windows packaging and signing run as separate jobs. The GitHub-hosted Windows runner builds an unsigned NSIS installer and uploads a short-lived workflow artifact. A local macOS ARM64 runner downloads it, scans every PE by content (excluding Python runtime dependencies), preserves existing vendor signatures, and signs unsigned PEs with Jsign and the SafeNet UKey. It signs the NSIS extraction helper and generated uninstaller during repackaging, then signs the final installer, regenerates the blockmap and `latest.yml`, and uploads the signed release set. Any missing archive, invalid PE, signing failure or repackaging failure stops the run. GitHub publication requires both signing and macOS builds to pass.

The pinned Windows NSIS template stages the application in a sibling directory before closing the old app, then renames the old directory to a backup and promotes the staged directory. A failed extraction or rename restores the previous installation. The signed installer smoke also locks the old executable to verify that a failed upgrade leaves it runnable. A user-selected different directory is an independent installation: the installer does not automatically uninstall the previous directory, which remains available until the user removes it. Keep the user-selected installation directory when changing this template; the build adapter rejects unexpected upstream template changes.

JavaScript dependencies load from `app.asar`: Harness, pnpm and package commands all run on the Electron runtime, which reads the archive. `asarUnpack` keeps only what the OS loads or executes beside it (native addons and libraries, node-pty's `spawn-helper`, ripgrep, the LibreOffice engine and sherpa-onnx platform packages, and the PPT runtime). node-pty and ripgrep map their binaries to `app.asar.unpacked` themselves; `build/office-engine-resolution.mjs` resolves the LibreOffice engine package there. The macOS ARM64 test package unpacks about 1.6k files (235 MB) instead of about 21k (549 MB). Neither platform ships an independent Node: Windows uses the packaged Electron executable in Node mode, and macOS runs package commands through the app's Helper in Node mode. The locked Electron 43.0.0 is a native-loader supported fingerprint; an earlier Electron 43.4.0 attempt failed during Harness boot even though the Koffi probe passed ([Windows CI evidence](https://github.com/dataelement/dsh-desktop/actions/runs/35972303467)). Qualify any Electron or native-loader change with packaged Windows Harness and final signed-installer gates.

Prepare the local runner once:

1. Register it with the `self-hosted`, `macOS`, and `ARM64` labels.
2. Install SafeNet Authentication Client and confirm `/usr/local/lib/libeTPkcs11.dylib` is readable.
3. Connect the UKey before pushing a release tag.
4. In the GitHub repository, open **Settings → Secrets and variables → Actions** and create a repository secret named `DESKTOP_WINDOWS_SIGNING_PIN` containing the UKey PIN. For stronger release controls, use an environment secret and add the matching `environment` to the `sign-windows` job.
5. Restrict release tag creation and workflow changes to trusted maintainers. A self-hosted runner can access any secret injected into its job.

The persistent UKey signing worker uses its local npm download cache. Its `setup-node` step does not restore or upload the Actions npm cache, and Node setup is bounded to five minutes. GitHub-hosted build and publish jobs continue using the Actions cache. Clearing the local npm cache is safe, but the next `npm ci` must download packages again.

The workflow pins Jsign 7.5 by SHA-256 and uses the SafeNet `ETOKEN` store, SHA-256 signing, and a DigiCert RFC 3161 timestamp with 6 progressive backoff retries (`attempt * 10s`) for the final installer and PE binaries, aligning retry resilience across Apple Silicon, Intel and Windows. GitHub injects the PIN only into the signing step. The step copies it to a mode-`600` temporary file, removes it from the shell environment, and deletes the file when the step exits. The workflow never prints the PIN or passes it as a command-line argument.

The configured update publisher is `Beijing Shuju Xiangsu Intelligence Technology Co., Ltd.`, taken from the signed v0.9.2 installer. If the signing certificate changes, update `build.win.signtoolOptions.publisherName` only after checking the new certificate subject and the updater's signature verification on an installed Windows build. After a tag release succeeds, verify that the Windows installer shows the expected publisher and a valid RFC 3161 timestamp in its Digital Signatures properties. Never reuse a published tag; fix the issue and release a new version.

### App notarization network recovery

If Apple accepts the upload but the SDK fails with a transient network timeout while querying `/submissions/<id>`, the app hook resumes `notarytool wait` for that exact submission. It retries up to six times with 10–60 second backoff and a bounded wait per command, then staples and validates the ticket before packaging continues. It never resubmits an upload with an unknown outcome. Missing submission IDs, authentication errors, malformed responses and rejected notarization fail immediately. The separate DMG submit command is unchanged.

### Signed test notifications

Signed test builds use the same `MODELS_TOKEN` secret and `RELEASE_NOTES_MODEL` as release summaries. Copilot summarizes bounded commit and code-diff evidence into Chinese “功能” and “问题修复” sections, following bisheng-work. Item counts follow actual changes, with empty categories explicitly marked; each item is limited to 100 characters. Generation has a 180-second timeout and structural/length validation. Missing credentials, CLI failures or invalid output produce an explicitly unavailable summary with short Chinese test guidance; raw commits are never substituted into the chat. Full commit evidence remains in the uploaded `test-changes.md`. Notification still waits for successful uploads and public download verification.

## Formal release popup notes and Feishu confirmation

Formal `v*` tag releases now require a Feishu confirmation **before** GitHub Release
creation/update, ModelScope latest/archive uploads, and rollout configuration.
Detailed bilingual GitHub Release notes and the post-publication Feishu summary keep
their existing format. A separate short bilingual summary feeds the existing desktop
update popup (not the About dialog). Pre-release and signed-test workflows are unchanged.

Configure these on the GitHub repository before releasing:

- Secrets `FEISHU_APP_ID`, `FEISHU_APP_SECRET`: a Feishu self-built application bot.
- Variable `FEISHU_RELEASE_CHAT_ID`: the existing release notification group's chat ID;
  add the application bot to this group. The webhook URL cannot supply this ID.
- Optional variable `FEISHU_RELEASE_REVIEWER_ID`: an open ID under that same application
  to restrict approval. Leave unset to accept any human member of the release group.
  No individual is mentioned by default.
- `MODELS_TOKEN` remains required for generating the concise summary.

The bot needs permission to send and update its own messages (`im:message:send_as_bot`
and `im:message:update`). In the Feishu Developer Console, enable **Events & Callbacks →
Callback Configuration → long connection** and subscribe to **card.action.trigger**.
The runner uses pinned `lark-oapi` and `websockets` Python packages in an isolated CI venv;
these are not Desktop dependencies and have no installed-app size/platform impact. The
SDK handles the authenticated long connection without exposing a public callback server.
Do not share this application connection with another consumer: Feishu may distribute
callbacks across connections. Formal publishes remain serialized by the existing workflow
concurrency group. Missing credentials, a failed connection, or a 60-minute approval timeout
blocks publication. A successful WebSocket connection does not prove the callback subscription
is enabled; verify that setting in the console before production use. If card buttons report that callbacks are not configured, open **Callback Configuration** (not Event Configuration), save persistent-connection mode, add **Card callback communication (`card.action.trigger`)**, and publish a new bot app version so the setting takes effect. A local SDK test or a ready WebSocket alone cannot validate this console setting.

After packaging, CI generates `zh` and `en` bullet lists (1–12 lines, at most 1000 characters
each, matching the card input limit). Invalid generation blocks release; there is no invented
fallback. The review card initially shows only the bilingual preview and two actions:

- **确认并发布** approves the generated bilingual text and continues CI.
- **重写** replaces the preview with a Chinese input prefilled with the current text. No
  English input is shown. Only the user who opened the editor may submit or cancel it.
- In editing mode, **提交并发布** authorizes publication using that Chinese text. The
  runner disables card actions, translates via Copilot CLI using `MODELS_TOKEN` and the
  configured `RELEASE_NOTES_MODEL`, validates the output, and continues automatically.
  There is **no second confirmation**. Chinese is retained exactly as submitted (outer
  whitespace trimmed); translation cannot overwrite it. Tools are denied to the translation
  subprocess, and Feishu credentials are omitted from its environment.
- **取消** discards edits and restores the original preview; it does not approve release.
- Empty, malformed or unchanged submissions stay in the editor. Translation failure or
  timeout retains Chinese and offers resubmission; it never silently publishes the old text.

If submit/cancel leaves the card unchanged, check who originally opened the editor: another
member's actions are ignored. The original editor must cancel before a different member can
open a new edit. Each Chinese bullet must start with a hyphen followed by a space (`- `).
The editor fills the available card width. Format errors return an immediate error toast
and remain visible above the input with the draft preserved; receipt of a callback is not
reported as successful submission. Translation and publication still run outside the callback.

Callbacks must match the actual chat/message, current revision and optional configured
reviewer. Event IDs are deduplicated, and revisions change on every transition so old buttons
cannot release new text. The listener ACKs quickly; translation and API updates happen outside
the callback. Connection/API failures stop the job. Retrying creates a fresh card and requires
a new action; previous approvals cannot authorize the new run. If a run stops while someone
is editing, use a fresh run instead of the stale card. "CI will continue" is not publication
success: later GitHub/ModelScope operations may fail or require recovery after partial publication.

CI stores the approved text, reviewer/message/event IDs, revision, commit, run and attempt in
`approved-popup.json`, retained with generation evidence as the `release-review-*` workflow
artifact for 30 days. Injection verifies run/version and the text digest before modifying
`latest.yml` and `latest-mac.yml`; installer files and checksums are unchanged. Both metadata
files carry `dshPopupNotes` translations plus readable bilingual `releaseNotes` for older
clients. Updated clients select the current UI language; older clients display both languages.
The release heading date is the publication date in Asia/Shanghai. The same metadata is
uploaded to latest and per-version archives, so rollback uses the corresponding notes.

Acceptance before enabling production: use a test bot/group to exercise sending, button callbacks,
Chinese edits and automatic translation/publication, cancellation, timeout and stale actions; confirm the
approved YAML reaches the authenticated updater and both languages render in a packaged
application. Unit tests do not establish Feishu permissions or installed-app acceptance.
