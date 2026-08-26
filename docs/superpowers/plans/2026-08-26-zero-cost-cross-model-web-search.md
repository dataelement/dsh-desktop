# Zero-Cost Cross-Model Web Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Sherlock web search work for any configured session model by using verified native search when available and an isolated, free local Electron browser fallback otherwise.

**Architecture:** Refactor `dsh-web-search-session-model` into a native-first router with a loopback fallback client. Start an authenticated 127.0.0.1 service in Electron main, backed by a locked-down, non-persistent BrowserWindow that extracts Bing or DuckDuckGo result pages. Pass only the random endpoint and token to the child Harness and expose an `auto`/`native-only`/`off` setting.

**Tech Stack:** Electron 43 BrowserWindow/session, Node HTTP and crypto, JavaScript ESM Harness plugin, TypeScript 5.9, Vitest 4, patch-package 8, Electron Builder.

**Spec:** `docs/superpowers/specs/2026-08-26-zero-cost-cross-model-web-search-design.md`

## Global Constraints

- Never call Cloudflare or a paid third-party search API.
- Never send model credentials, browser cookies, or complete search HTML across the local bridge.
- Never infer OpenAI Responses support from generic OpenAI/Anthropic compatibility.
- Bind the bridge only to `127.0.0.1`, authenticate every request, and keep its token out of logs.
- Use a non-persistent, sandboxed browser session with permissions, downloads, popups, and audio disabled.
- Stop on abort; do not convert cancellation into fallback.
- Preserve unrelated worktree files and stage only task-owned paths.
- Run focused tests and the packaged Dev smoke only; do not run the full suite or release formally.

---

### Task 1: Search Engine Extraction Primitives

**Files:**
- Create: `src/main/search/search-engines.ts`
- Create: `test/search-engines.test.ts`

- [ ] Write failing tests for query URL construction, allowed hosts, safe HTTP(S) result normalization, URL deduplication, result limits, and CAPTCHA/challenge markers.
- [ ] Run `npm test -- --run test/search-engines.test.ts` and confirm RED.
- [ ] Implement Bing and DuckDuckGo descriptors plus pure normalization and challenge detection.
- [ ] Re-run the focused test and confirm GREEN.

### Task 2: Isolated Browser Search Controller

**Files:**
- Create: `src/main/search/browser-search-controller.ts`
- Create: `test/browser-search-controller.test.ts`

- [ ] Write failing tests with injected BrowserWindow/session fakes for secure web preferences, non-persistent partitioning, permission denial, popup/download blocking, engine fallback, serialized searches, abort, and challenge show/hide behavior.
- [ ] Run `npm test -- --run test/browser-search-controller.test.ts` and confirm RED.
- [ ] Implement the smallest controller that navigates only to engine allowlists, executes extraction JavaScript, shows only for verification, and disposes cleanly.
- [ ] Re-run the focused controller and engine tests and confirm GREEN.

### Task 3: Authenticated Local Search Bridge

**Files:**
- Create: `src/main/search/local-search-bridge.ts`
- Create: `test/local-search-bridge.test.ts`

- [ ] Write failing tests for random loopback binding, bearer authentication, POST/content-type enforcement, bounded bodies and queries, max-results clamping, abort propagation, normalized JSON, and stop behavior.
- [ ] Run `npm test -- --run test/local-search-bridge.test.ts` and confirm RED.
- [ ] Implement the bridge with Node HTTP, `randomBytes`, constant-time token comparison, a single `/search` endpoint, and injected search callback.
- [ ] Re-run the bridge test and confirm GREEN.

### Task 4: Harness Runtime Wiring

**Files:**
- Modify: `src/main/runtime/harness-runtime.ts`
- Modify: `src/main/index.ts`
- Modify: `test/runtime.test.ts`
- Create or Modify: `test/local-search-main-wiring.test.ts`

- [ ] Add failing runtime tests proving the child receives `SHERLOCK_LOCAL_SEARCH_URL` and `SHERLOCK_LOCAL_SEARCH_TOKEN`, while startup diagnostics omit the token.
- [ ] Add failing source/wiring tests proving the bridge starts before Harness, survives a Harness restart, and stops on quit/update install.
- [ ] Run the focused runtime tests and confirm RED.
- [ ] Start `BrowserSearchController` and `LocalSearchBridge` in `bootstrap()`, pass their endpoint through `HarnessRuntimeOptions`, and add orderly cleanup.
- [ ] Re-run the focused runtime/wiring tests and confirm GREEN.

### Task 5: Native-First Provider Router and Modes

**Files:**
- Modify: `packages/dsh-web-search-session-model/index.js`
- Modify: `packages/dsh-web-search-session-model/package.json`
- Modify: `test/session-model-web-search.test.js`
- Modify: `build/dsh-desktop.patch.yml` if a base mode must be declared

- [ ] Replace the existing expected-behavior tests with failing cases for explicit OpenAI Responses native search, Kimi Coding/Anthropic/unknown local fallback, missing profile fallback, recoverable native errors, no-source fallback, abort, `native-only`, and `off`.
- [ ] Run `npm test -- --run test/session-model-web-search.test.js` and confirm RED.
- [ ] Register a `web-search-session-model` settings schema using `installSettingsSection`; read it per request.
- [ ] Separate route discovery from credential resolution so unsupported providers never require a model API key before local fallback.
- [ ] Keep the Responses request/parser as an allowlisted native adapter and add a token-authenticated local client that sends only query/maxResults.
- [ ] Implement recoverable-error classification and stable terminal errors without exposing keys or the local token.
- [ ] Re-run the focused provider tests and confirm GREEN.

### Task 6: Search Mode Settings UI

**Files:**
- Modify: `node_modules/@deepseek-ai/dsh-client-ui-settings-plugins/lib/client.js`
- Modify: `patches/@deepseek-ai+dsh-client-ui-settings-plugins+0.1.0-rc.7.patch`
- Modify: `test/model-provider-policy.test.ts`
- Modify: `test/brand-migration.test.ts`
- Create or Modify: `test/web-search-settings-ui.test.ts`

- [ ] Write failing source/render tests for the `web-search-session-model` namespace, three localized mode choices, and default `auto` selection.
- [ ] Run only the listed settings tests and confirm RED.
- [ ] Repurpose the disabled legacy DeepSeek search card as a compact mode selector bound to the new namespace; remove key/endpoint/max-use fields from this card.
- [ ] Regenerate the patch-package diff so the UI change survives installation.
- [ ] Re-run the focused settings and policy tests and confirm GREEN.

### Task 7: Focused Integration Verification

**Files:**
- Modify as needed only files already owned by Tasks 1-6.

- [ ] Run the focused test set:

  `npm test -- --run test/search-engines.test.ts test/browser-search-controller.test.ts test/local-search-bridge.test.ts test/runtime.test.ts test/local-search-main-wiring.test.ts test/session-model-web-search.test.js test/model-provider-policy.test.ts test/brand-migration.test.ts test/web-search-settings-ui.test.ts test/harness-bundled-package-resolution.test.ts`

- [ ] Run `npm run typecheck`.
- [ ] Run the repository's patch-package integrity command or focused install/patch verification.
- [ ] Run `git diff --check` and inspect `git status --short` for unrelated changes.
- [ ] Run the superpowers:verification-before-completion skill before making completion claims.

### Task 8: Packaged Sherlock Dev Smoke

**Files:**
- Build output only: `dist-dev/mac-arm64/Sherlock Dev.app`

- [ ] Build the packaged Dev app with `npm run package:dev:dir`.
- [ ] Launch the packaged app with its isolated Dev profile and wait for Harness readiness.
- [ ] Exercise a Kimi Coding search and verify it returns local browser sources without a `/responses` error.
- [ ] Exercise an explicit OpenAI Responses fixture/route to verify native behavior remains intact.
- [ ] Verify cancellation stops browser/native work and a challenge fixture shows `完成搜索验证` before resuming.
- [ ] Inspect the runtime log and captured request hosts: no bearer token/API key leakage and no Cloudflare, Brave, Tavily, Exa, or other paid search request.
- [ ] Leave the packaged Dev app available for the user to test; do not publish a formal release.

