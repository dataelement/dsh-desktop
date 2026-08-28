# Sherlock Research Canvas Preview Expansion Implementation Plan

> **Execution:** strict RED-GREEN-REFACTOR, focused tests only, one local Chinese
> commit per completed task.

**Goal:** Expand Research canvas file previews, add component rename, and make
conversation model choices survive client restart without regressing the shared
composer or surrounding shell.

**Spec:**
`docs/superpowers/specs/2026-08-28-research-canvas-preview-expansion-design.md`

## Global constraints

- Preserve the current 0.7.3 composer width, placement, height, shared DOM,
  loading indicator, sidebar, right-panel geometry, and source-file safety.
- Keep all local bytes behind the existing capability protocol and realpath
  fence. Embedded previews never gain Electron/Node/preload privileges.
- Dependency edits are reproducible through tracked source or patch-package;
  ignored `node_modules` changes are not deliverables.
- Do not run the full test suite, publish, notarize, bump the version, push, or
  alter public updates.

## Task 1: Durable per-conversation model choice

**Files:** focused host/model tests; API proxy/default-model package sources;
tracked package patches or reproducible build inputs.

- [ ] Add failing restart-matrix tests for blank, previously-requested, and
  selected-without-send sessions, plus unavailable providers and invalid base
  defaults.
- [ ] Add a bounded durable session-selection store and apply the approved
  resolution order.
- [ ] Persist before `selectModel` succeeds; keep sessions isolated and never
  silently substitute an unavailable provider.
- [ ] Run focused model/provider tests, typecheck and patch replay checks.
- [ ] Commit `持久保存每个对话的模型选择`.

## Task 2: Browser-capable HTML authorization

**Files:** `src/main/state/research-file-preview.ts`, main protocol/security
integration, preview tests, conversation client patch.

- [ ] Add failing protocol tests for capability origins, local module/JSON/font
  resources, network CSP, traversal, symlink escape, and MIME handling.
- [ ] Add failing rendered-contract tests for iframe sandbox, interaction,
  external navigation, and no application preload in child frames.
- [ ] Extend the capability response/CSP and iframe policy minimally; preserve
  main-frame IPC and filesystem fences.
- [ ] Run preview, security, runtime and composer-focused tests; regenerate and
  replay the conversation patch.
- [ ] Commit `完善画布网页组件交互与资源加载`.

## Task 3: Continuous PDF viewer

**Files:** Research canvas UI tests; conversation client runtime and patch.

- [ ] Replace wheel-step assertions with failing continuous-scroll and
  visible-page lifecycle tests.
- [ ] Render a page stream with placeholders, viewport-near canvases,
  cancellation and cleanup; remove threshold paging.
- [ ] Verify scroll ownership, resize, page progress, offscreen suspension and
  existing canvas zoom/pan behavior.
- [ ] Commit `改为连续滚动画布PDF预览`.

## Task 4: Native image, Markdown, text and code previews

**Files:** preview registry and tests; Research canvas UI and patch.

- [ ] Add failing kind/MIME/magic/UTF-8/binary fallback tests for the approved
  image set, Markdown and text/code.
- [ ] Authorize bounded content and add viewport-aware read-only renderers.
- [ ] Verify title, resize, scrolling, missing-source fallback and lifecycle.
- [ ] Commit `扩展研究画布常用文件预览`.

## Task 5: Shared Office preview adapter

**Files:** bundled Office plugin reproducible preparation/patch source; focused
plugin and canvas routing tests; Research canvas adapter integration.

- [ ] Add failing adapter tests for DOCX/XLSX/PPTX capability URLs, OOXML
  validation/limits, abort/dispose, offscreen mount and unavailable fallback.
- [ ] Extract/reuse the existing Office viewer engines behind a narrow shared
  adapter without duplicating their dependency bundle.
- [ ] Connect Research nodes to the adapter and verify sidebar preview remains
  unchanged.
- [ ] Commit `复用侧栏引擎预览画布Office文件`.

## Task 6: Rename component and reconcile composer tag

**Files:** Research workspace model/UI tests; conversation runtime/types/patch.

- [ ] Add failing tests for normalized `displayName`, persistence, inline edit
  keyboard behavior, and source-name immutability.
- [ ] Add failing tests proving an existing selected tag updates in place while
  retaining order, selection, and surrounding text.
- [ ] Implement title-bar context action and reference reconciliation for the
  same canvas node id.
- [ ] Verify keyboard/context deletion and drag/resize behavior remain intact.
- [ ] Commit `支持画布组件改名并同步附件标签`.

## Task 7: Repair canvas zoom and transient viewport frame

**Files:** Research canvas runtime, CSS and rendered interaction tests.

- [ ] Add failing regressions proving Command-wheel over an interactive HTML,
  PDF, or Office component still performs pointer-anchored canvas zoom while a
  plain wheel remains owned by that component. Cover the HTML iframe's own
  document rather than assuming its wheel event bubbles into the parent.
- [ ] Show the canvas blue viewport frame only while Space is held for canvas
  panning; ordinary focus/click must not paint it.
- [ ] Render that transient frame above canvas nodes and clip node content at
  the viewport boundary so an offscreen component cannot cover the frame.
- [ ] Recheck Space-pan, node interaction, resize, marquee, and drop behavior.
- [ ] Commit `修复画布组件上的缩放与边框层级`.

## Task 8: Keep composer menus above messages without an outer backdrop

**Files:** Research composer rendered tests; conversation runtime and patch;
input-trigger/model menu tests only if their existing contract needs coverage.

- [ ] Add a failing rendered regression proving the slash-command menu and at
  least one selector popup occupy a stacking layer above message cards at
  normal and narrow right-panel widths.
- [ ] Correct the Research composer seat/overlay stacking and clipping boundary;
  do not change menu dimensions, copy, composer geometry, or scroll ownership.
- [ ] Remove the opaque/gradient background from the outer Chat and Research
  composer seats so only the task panel, composer card, and popup surfaces are
  painted; the message page must remain visible through the surrounding gaps.
- [ ] Verify open/close, keyboard selection, scrolling, Chat composer behavior,
  transparent outer seats, and no-menu message interaction in both themes.
- [ ] Commit `修复输入菜单层级并移除外围遮罩`.

## Task 9: Integration and real-client acceptance

- [ ] Review the spec against the complete diff and run only affected tests,
  typecheck, `git diff --check`, patch replay, and package verification.
- [ ] Build and launch through `./script/build_and_run.sh --verify` without
  publishing or notarizing.
- [ ] In the real Sherlock window verify HTML resource/network interaction,
  continuous PDF scroll, every supported file family, rename/tag sync, and
  model restoration after restart/session switching. Open slash-command and
  selector menus over a dense right-panel message flow and verify they remain
  fully visible and interactive.
- [ ] Explicitly recheck composer width/position, loading, sidebar, selection,
  deletion, resize and persistence regressions.
- [ ] Record QA evidence outside the repository, leave Sherlock open, and
  commit `验证研究画布预览扩展本地测试版` only if tracked QA notes change.
