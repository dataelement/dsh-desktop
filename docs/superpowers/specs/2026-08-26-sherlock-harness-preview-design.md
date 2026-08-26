# Sherlock Harness Preview Design

**Date:** 2026-08-26

**Status:** Approved in chat; pending written-spec review

## Objective

Create a side-by-side macOS application named `Sherlock Harness Preview.app` that runs the latest official DeepSeek Harness release, `0.1.1-rc.2`, without changing the installed Sherlock application, the existing `Sherlock Dev.app`, their data, or Sherlock's formal update channel. The preview should make upstream Harness changes visible while retaining the minimum Sherlock desktop integration required for a usable packaged app.

## Success Criteria

- `Sherlock Harness Preview.app` can be installed and launched alongside `Sherlock.app` and `Sherlock Dev.app`.
- The preview bundle uses Harness `0.1.1-rc.2`, matching the official npm release and Git tag `dsh-v0.1.1-rc.2`.
- The preview has its own bundle identifier, process name, logs, Electron user-data directory, Harness home, sessions, settings, and plugin profile.
- Existing Sherlock, Sherlock Dev, and their user-owned credentials, settings, sessions, workspaces, plugins, and caches are neither read for migration nor modified.
- The packaged preview reaches the real Harness Web UI and exposes the visible upstream changes rather than masking them with every rc.7-era Sherlock UI patch.
- Essential Sherlock desktop behavior remains usable: application launch, child-process lifecycle, native directory selection, local loopback loading, window controls, recovery/log access, bundled runtime entries, and packaged resource resolution.
- Focused tests, type checking/building required by the changed surfaces, packaged process verification, and a user-visible UI inspection pass.
- No formal signing, notarization, Cloudflare upload, updater publication, Git tag, or upstream-main merge is performed.

## Upstream Baseline

The current Sherlock checkout declares `@deepseek-ai/dsh` and its directly pinned Harness packages at `0.1.0-rc.7`. The official `deepseek-ai/deepseek-harness` repository's `master` branch, tag `dsh-v0.1.1-rc.2`, and npm `latest` distribution tag currently resolve to `0.1.1-rc.2` at commit `b150a551b8d465e31e418e1b2eaf5e79bbb7d28e`.

The rc.7-to-rc.2 range contains 743 commits and changes thousands of files, including the conversation UI, model settings, plugin settings, workspace browser, credentials, API proxy, session projection, subagents, image handling, and client bootstrap. Sherlock also carries 20 `patch-package` patches against rc.7. The upgrade is therefore treated as a compatibility migration, not a dependency-only bump.

## Isolation Architecture

Implementation work happens in an isolated Git worktree and branch derived from the current Sherlock `HEAD`. The working branch is named `codex/sherlock-harness-preview` unless that name already exists, in which case the existing branch is inspected and reused only if it belongs to this task.

The preview receives a dedicated electron-builder configuration:

- Product name: `Sherlock Harness Preview`
- macOS bundle identifier: `io.dsh.desktop.harness-preview`
- Build output: `dist-harness-preview`
- Desktop channel metadata: `harness-preview`
- Update publishing: disabled
- Default user-data directory: `dsh-desktop-harness-preview`

The `DesktopChannel` and identity resolver gain the preview channel so the process name and data directory are derived from packaged metadata, rather than depending on an ad hoc launch argument. Explicit absolute `--sherlock-user-data-dir` remains supported for disposable smoke tests.

No current Sherlock profile is copied automatically. This avoids leaking credentials into an experimental build and ensures the observed behavior comes from the latest Harness defaults. The preview initializes its own Harness home and profile on first launch.

## Harness Upgrade Strategy

All top-level `@deepseek-ai/dsh*` dependencies explicitly pinned by Sherlock are upgraded as a coherent family to `0.1.1-rc.2`, and the npm lockfile is regenerated from those declarations. The build continues to use published Harness packages rather than embedding a Git checkout because the desktop host expects the built CLI, package manifests, native dependency closure, and compiled web frontend shipped by the release.

The existing rc.7 patches are classified before migration:

1. **Required desktop bridges.** Native directory picking, Electron IPC hooks, packaged resource resolution, desktop recovery, and other capabilities without which the preview cannot run correctly are ported to rc.2.
2. **Required Sherlock runtime integrations.** Bundled skills, plugin profile bootstrap, market installer resolution, and the session-model web-search entry are retained when their current contracts remain compatible. If an upstream contract changed, the smallest compatible adapter is implemented and covered by a focused test.
3. **Brand-only changes.** Product name, logo, and clearly user-visible host wording are reapplied where doing so does not hide upstream behavior.
4. **Product overlays that obscure the preview.** Large rc.7 UI modifications such as research canvas additions, customized model onboarding, preset-editor redesigns, or other overlapping feature surfaces are not automatically reapplied. They are omitted from the preview unless required for boot or basic navigation, and every omission is reported.
5. **Obsolete fixes.** A patch whose behavior is demonstrably present upstream or whose target no longer exists is retired for the preview instead of force-applying stale generated JavaScript.

Patch migration is evidence-based. Each old patch is mapped to its intended behavior, checked against rc.2 source/build output, and then marked ported, upstreamed, omitted for preview visibility, or incompatible. Silent patch loss is not acceptable.

## Build and Launch Flow

A preview packaging script or an explicit preview mode in `script/build_and_run.sh` owns the repeatable flow:

1. Stop only the `Sherlock Harness Preview` process.
2. Build the Electron application.
3. Package the preview with its dedicated builder configuration.
4. Confirm the expected executable and bundle metadata.
5. Launch the packaged app with `open -n`.
6. Verify that the preview process stays alive and that its Harness child reaches the ready state.

The script must not stop Sherlock or Sherlock Dev. The existing default development and formal release modes retain their current behavior.

## Compatibility and Failure Handling

Dependency installation is first attempted with the rc.7 patch files disabled from automatic application so the new package tree can be inspected. Patches are regenerated only after their compatible changes exist in rc.2. If a native module is incompatible with the current architecture or Electron ABI, the failure is classified separately from patch conflicts.

The preview fails loudly on these conditions:

- Harness package versions are mixed across the explicitly pinned family.
- An essential desktop bridge cannot be located in the rc.2 package layout.
- The packaged Harness entry or web frontend cannot resolve from the app bundle.
- The runtime accidentally resolves the Sherlock or Sherlock Dev user-data directory.
- The preview bundle contains a live formal update feed.

Runtime errors remain in the preview's own `harness.log`, with recovery and log-opening actions available from the desktop shell.

## Verification

Verification is deliberately focused rather than a full test-suite run:

- Identity tests for the new channel, process name, bundle identifier, and isolated user-data directory.
- Configuration tests asserting that preview packaging disables publishing and uses its own output directory.
- Harness runtime and bundled-package-resolution tests affected by rc.2 package changes.
- Focused tests for every essential bridge or integration that must be ported.
- `npm run typecheck` and the build step required by preview packaging.
- Package inspection of `Info.plist`, packaged `package.json`, Harness package version, executable name, and absence of a formal publish configuration.
- Process and readiness verification after launching the packaged app.
- Real UI inspection of startup, sidebar, conversation composer, model/settings entry, workspace selection, and at least one visible rc.2 behavior. Visual evidence is captured when practical.

No full functional unit-test suite, notarization, Gatekeeper assessment, updater test, or public-distribution check is part of this preview.

## Deliverables

- An isolated `codex/sherlock-harness-preview` implementation branch/worktree.
- A runnable `Sherlock Harness Preview.app` under `dist-harness-preview`.
- Repeatable preview build/run tooling.
- Focused tests for identity, packaging, and migrated essential integrations.
- A patch-migration inventory showing what was ported, already upstream, intentionally omitted, or incompatible.
- A final report with the app path, exact Harness version/commit, build and launch evidence, visible differences, and known preview limitations.

## Non-Goals

- Replacing or upgrading the installed formal Sherlock application.
- Publishing a new Sherlock release.
- Copying live credentials or session data into the preview.
- Preserving every current Sherlock UI customization in the first preview.
- Merging `dataelement/dsh-desktop` upstream `main`.
- Editing the DeepSeek Harness upstream repository or publishing Harness packages.
