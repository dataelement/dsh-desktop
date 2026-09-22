## Enterprise account label — 2026-09-22

- The identity label now reads “当前账号 / Current account”, matching the existing display-name, username, and ID fallback order.
- PR #527 review follow-up; account selection and authentication behavior stay as implemented. Full regression: 149 files / 1,249 tests PASS; diff-check PASS. New package: NOT_RUN.

## Enterprise account layout — 2026-09-22

- Based on `V0.9.2@dfeb83b31b9755aeccd119cc3c813d67ecd2f7dc`, with installed Harness `0.1.5-rc.2`.
- The account row groups a fixed account icon, identity and sign-out action. The enterprise website link sits beside the page title; refresh stays beside the model section heading.
- Model rows use spacing to separate entries. Provider and vision metadata sit below model names; green indicators identify models with available routing and quota. Provider extraction preserves model paths such as `kimi/kimi-k3`. Existing quota values and hover percentages remain available.
- Verification on the updated baseline: offline `npm ci` and root postinstall, typecheck, production build, 149 test files / 1,249 tests and diff-check passed. Actual React component checks with fixture APIs covered light/dark themes, narrow layouts, refresh, website and sign-out actions.
- The r4 macOS ARM64 development package was built and signature/archive-verified on the earlier `294e9290` baseline. A new package and authenticated enterprise end-to-end acceptance on `dfeb83b3`: `NOT_RUN`.

# Model switch display names

## 2026-09-22 — Signed test-build compatibility

- PR #519 acceptance plugin fixture now declares `desktop_min: "0.9.1"`. Catalog and installation regression checks use Desktop `0.9.2-test.1`, and the physical isolated Profile Loader smoke uses that same prerelease version for installation and failed-update rollback.
- Standard SemVer comparison remains in effect: `0.9.2-test.1` satisfies `0.9.1` and falls below `0.9.2`. Packaging guidance records the minimum for this feature's acceptance plugins. This change updates repository fixtures and guidance; deployed enterprise catalog artifacts are unchanged.
- Verification: full `npm test` PASS (149 files / 1,247 tests, 30.67s), `npm run typecheck`, `npm run build`, `git diff --check` PASS. Existing real-enterprise/native acceptance limitations remain.

## 2026-09-22 — PR #519 review corrections

- Market compatibility now receives Electron `app.getVersion()` through the authenticated enterprise Broker; catalog UI and install enforce the same SemVer verdict. Missing/invalid versions fail compatibility checks.
- Signing keys are persisted on first use and held across sync/restart; a changed advertised key blocks online installation. Administrator-provided `DSH_DESKTOP_MARKET_PUBLIC_KEY` supplies an independent pin. Default TOFU trust starts at the confirmed enterprise service; see the documented trust boundary.
- Stop and expiry invalidate in-flight/queued operations immediately and serialize document/Loader cleanup with installation. Catalog traversal is bounded to 100 pages and validates totals. Enterprise runtime dependencies are explicitly declared.
- Baseline remains `upstream/V0.9.2@294e9290262dd68f402fa526cfb6aeacd571f627`; Harness `0.1.5-rc.2`. Fresh `npm ci` / repository postinstall, `npm run typecheck`, `npm run build`, and `git diff --check`: PASS. Full `npm test`: 149 files / 1,247 tests PASS (30.83s). npm reports skipped dependency lifecycle scripts under the local npm policy; repository postinstall completed.
- A physical dependency closure outside the repository passes child-process import, real Loader installation, disable/enable, failed-update rollback and stop tests. This uses locally signed test fixtures, not a production enterprise service.
- Real Harness startup using bundled Node `24.9.0`, fresh DSH_HOME, fresh launch directory and the production patch configuration: PASS on `darwin-arm64`; authenticated `/api/enterprise.market.state` responds successfully. Electron Broker is absent in this headless probe, so desktop version is empty and enterprise is disconnected.
- Real enterprise login/install, current distributable/native UI, Windows native path/file-lock/generation acceptance: `NOT_RUN` (no acceptance environment). Windows invalid-path validation tests ran on macOS. PR remains pending these acceptance gates. Old generation-directory reclamation is follow-up work.

## 2026-09-22 — Enterprise plugin market on V0.9.2

- Baseline: remote `upstream/V0.9.2@294e9290262dd68f402fa526cfb6aeacd571f627`; worktree `.worktrees/dsh-desktop-v092-enterprise-market`, branch `codex/v092-enterprise-plugin-market`; installed Harness `0.1.5-rc.2`.
- Added the authenticated “From enterprise / 来自企业” plugins tab with catalog pagination, install/update, enable/disable and uninstall actions. Locale registration follows the current product language.
- Added the main-process market Broker boundary with restricted endpoints, account binding, bounded downloads and one 401 refresh retry. Enterprise credentials remain in Electron main.
- Ported signed policy enforcement, offline artifact validation, generation isolation, real Cordis Loader activation, update rollback and the offline bundle packaging tool from the local enterprise trial.
- Verification: `npm ci` and postinstall completed; `npm run typecheck`, `npm run build`, `git diff --check` passed; full `npm test`: 149 files / 1,240 tests passed. Behavioral coverage includes account changes, late UI responses, per-plugin actions, English localization, Broker requests, signed leases, real Loader and rollback.
- Current-branch native UI, real enterprise backend login/plugin installation, new distributable package and Windows native acceptance: `NOT_RUN`. The previously demonstrated r2 trial package remains a separate artifact.
- Feature and backend requirements: [enterprise-plugin-market.zh.md](enterprise-plugin-market.zh.md).


2026-09-20: implemented and verified with focused automated checks.

- Baseline: `dataelement/dsh-desktop:V0.9.1` at `9b2d2cf17e8f25f3c3cc1af297a25760cb0731f0`, Harness `0.1.5-rc.2`. The remote `v0.9.0` branch was absent when verified.
- The model-switch producer resolves adapter model names and commits them into the notice content and summary. Request configuration continues to use provider/model IDs. Saved notices retain the names recorded at the switch.
- The conversation row shows “已切换模型” / “Model changed” and the saved name transition. Its expanded explanation uses the selected UI language. Other context producers retain their existing rendering.
- Cross-provider switches use provider display names. Equal labels include route IDs for disambiguation. Missing metadata falls back to stable route IDs so an unavailable old catalog entry can still lead to a usable new model. Existing notices retain their saved summaries.
- The runtime correction is shipped through the repository's pinned Harness dependency distribution in `patches/`, updating both the package entry and standalone module. The chat bundle contains the corresponding localized renderer.

Verification:

- `npm ci --ignore-scripts --offline --no-audit --no-fund` followed by `npx --no-install patch-package`: PASS from a fresh dependency tree.
- `npx vitest run test/model-switch-display.test.ts test/model-selection-search-patch.test.ts test/model-reasoning-efforts-patch.test.ts test/local-path-links.test.ts`: 29 tests passed, including 8 new runtime/browser-bundle cases.
- `npm run typecheck`: PASS.
- `npm run build`: PASS.
- Native Desktop login, real provider calls, and installed-app UI acceptance: `NOT_RUN`.
