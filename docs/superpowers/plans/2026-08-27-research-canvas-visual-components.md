# Sherlock Research Canvas Visual Components Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development to implement this plan task-by-task.
> Every production behavior follows strict RED-GREEN-REFACTOR.

**Goal:** Increase the shared composer height by eight pixels and turn Research
canvas message, image, PDF, and HTML nodes into persistent, resizable, directly
readable visual components.

**Architecture:** Extend the existing session-scoped `ResearchWorkspaceRegistry`
with normalized node geometry and keep it as the sole renderer-side owner of
canvas state. Add a main-process-owned preview authorization registry and a
read-only `sherlock-preview://` capability protocol for local bytes. Harden
preload and IPC frame boundaries before allowing sandboxed HTML scripts. Render
all rich nodes through a shared titled frame, with PDF.js providing controlled
single-page PDF rendering.

**Tech Stack:** Electron 43, React, TypeScript 5.9, Vitest 4, Happy DOM,
patch-package, pdfjs-dist.

**Spec:**
`docs/superpowers/specs/2026-08-27-research-canvas-visual-components-design.md`

## Global Constraints

- Chat and Research continue to move one resident composer between portal
  hosts; never mount a second composer.
- Increase only shared vertical composer geometry: 8 px bottom padding and
  hero mirror 52 px to 60 px. Do not change composer width, max-width,
  horizontal padding, anchoring, or right-panel layout.
- Keep `ResearchWorkspaceRegistry` as the sole renderer source of canvas files,
  artifacts, selection, positions, and sizes.
- Old persisted file and artifact nodes without size fields must continue to
  load with safe defaults.
- Canvas node `x`/`y` remain center-based world coordinates. All screen deltas
  are divided by canvas scale.
- Assistant artifacts remain explicitly added and message-id deduplicated.
  Preserve complete bounded Markdown text and line breaks.
- Image and PDF content resizes proportionally. Assistant and HTML components
  resize freely.
- `sherlock-preview://` is read-only and capability-token based. Its URLs never
  contain absolute paths and it is never accepted as a top-level application
  URL.
- Do not add any IPC that reads an arbitrary renderer-supplied absolute path.
  Finder authorization starts from a real `File`; sidebar authorization is
  fenced to the active session workspace.
- Persist preview authorization only in a main-process-owned registry, not in
  renderer-writable canvas JSON. Removing a node or session revokes it.
- Resolve roots and targets with `realpath`; reject traversal, symlink escape,
  directories, unsupported MIME, and invalid ranges.
- Preload application bridges run only in the main frame. Privileged IPC checks
  a trusted main-frame sender. Embedded HTML cannot navigate the top frame,
  open windows, submit forms, or reach the network.
- HTML scripts are enabled only after the frame/IPC hardening tests pass. If the
  gate cannot be demonstrated, ship static HTML with scripts disabled.
- The canvas owns wheel pan/Command-wheel zoom only outside preview-scroll
  regions. PDF and HTML interaction must not move the canvas.
- Rich media mounts only in or near the viewport and releases work on unmount,
  node deletion, or session change.
- Persist dependency edits with patch-package. Do not rely on ignored
  `node_modules` as the committed source of truth.
- Do not run the full project suite. Run only the focused tests listed by each
  task, typecheck, patch checks, packaging, and real-app checks.
- Do not change version 0.7.3, notarize, publish, update public feeds, push
  commits, or push tags.
- Each implementation task ends in a local Chinese Git commit containing only
  that task's files.

## Task 1: Shared composer height without horizontal regression

**Files:**

- Modify: `test/sherlock-composer-workspace-ui.test.ts`
- Modify: `node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js`
- Modify: `patches/@deepseek-ai+dsh-client-ui-conversation+0.1.0-rc.7.patch`

**Produces:** The textarea, mirror, and backdrop share 8 px bottom padding; the
hero mirror has a 60 px minimum height; portal identity and horizontal geometry
remain unchanged.

- [ ] Add a rendered regression test that mounts the resident composer, records
  its textarea identity and computed width/max-width/horizontal padding, switches
  between Chat and Research, and asserts the same textarea has
  `paddingBottom === '8px'` in both hosts. Add a tagged multiline case whose
  decoration is not clipped.
- [ ] Run
  `npm test -- --run test/sherlock-composer-workspace-ui.test.ts` and confirm the
  new assertions fail because bottom padding is 0 and hero height is 52 px.
- [ ] Apply the minimal shared InputBar CSS change. Keep the three layers in
  sync and do not add a Research-only override.
- [ ] Regenerate the conversation patch with
  `npx patch-package @deepseek-ai/dsh-client-ui-conversation`.
- [ ] Re-run the focused test and confirm green. Run `git diff --check` and
  reverse patch validation.
- [ ] Commit with `修复输入框标签底部遮挡`.

## Task 2: Main-frame and embedded-content security boundary

**Files:**

- Modify: `src/preload/index.ts`
- Modify: `src/main/security.ts`
- Modify: `src/main/ipc-trust.ts`
- Modify: `src/main/index.ts`
- Modify: `src/main/update/update-manager.ts`
- Modify: focused tests under `test/` for preload exposure, IPC sender trust,
  and frame navigation.

**Produces:** No application bridge or sidebar update controller runs in a child
frame; every affected privileged IPC rejects child/untrusted frames; embedded
frame navigation is constrained without expanding trusted top-level URLs.

- [ ] Add behavior tests using fake main/child frames and fake web contents.
  A child frame must receive no exposed bridge and must be unable to invoke
  update, show-log, directory, filesystem, or Research handlers. A preview frame
  navigation to `file:`, `http:`, or top-level app routes must be cancelled.
- [ ] Run the focused security/runtime tests and confirm RED against the current
  unguarded preload and update handlers.
- [ ] Gate all preload exposure and DOM mounting behind `process.isMainFrame`.
  Centralize trusted-main-frame IPC validation and apply it to all touched
  privileged handlers. Add `will-frame-navigate` handling while preserving
  existing trusted main navigation.
- [ ] Run the same tests and `npm run typecheck`; confirm green.
- [ ] Commit with `加固画布预览的框架权限边界`.

## Task 3: Capability preview registry and protocol

**Files:**

- Create: `src/main/state/research-file-preview.ts`
- Modify: `src/main/index.ts`
- Modify: `src/preload/index.ts`
- Create: `test/research-file-preview.test.ts`
- Modify: `test/research-file-drop.test.ts`

**Produces:** A main-owned durable authorization registry, ephemeral capability
tokens, protocol responses for image/PDF/HTML bytes, narrow Finder/sidebar
admission APIs, and explicit revocation.

- [ ] Write pure service tests first. Cover successful Finder admission;
  rejection of empty/synthetic paths and arbitrary renderer paths; workspace
  fenced sidebar admission; durable authorization reload; opaque token URLs;
  unknown/expired/revoked tokens; node deletion; GET/HEAD; 200/206/416 ranges;
  MIME and magic-byte mismatch; missing files; directories; `..` and symlink
  escape; HTML relative CSS/image/script lookup; and CSP/nosniff/no-store
  headers.
- [ ] Run
  `npm test -- --run test/research-file-preview.test.ts test/research-file-drop.test.ts`
  and confirm RED because the service and bridge contracts do not exist.
- [ ] Implement the registry with injected filesystem/random/storage
  dependencies so tests exercise real normalization and response logic without
  mocking its behavior. Persist authorizations under app user data with bounded
  JSON and restrictive file permissions.
- [ ] Register `sherlock-preview` privileges before ready and install its
  `protocol.handle` handler after ready. Never add it to `isTrustedAppUrl`.
- [ ] Expose narrow preload methods that derive Finder paths through
  `webUtils.getPathForFile` and request sidebar authorization by active-session
  file identity. Return preview descriptors, not raw bytes or permanent tokens.
- [ ] Re-run focused tests and typecheck; confirm green and clean output.
- [ ] Commit with `支持研究文件安全预览协议`.

## Task 4: Persistent node geometry and corner resize

**Files:**

- Modify: `test/research-file-drop.test.ts`
- Modify: `test/sherlock-composer-workspace-ui.test.ts`
- Modify: `node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js`
- Modify: relevant conversation `.d.ts` files when runtime exports/contracts
  change.
- Modify: `patches/@deepseek-ai+dsh-client-ui-conversation+0.1.0-rc.7.patch`

**Produces:** Normalized width/height/size mode/aspect ratio, real-size marquee
geometry, four-corner resizing, type-specific constraints, and persisted size.

- [ ] Add pure RED tests for legacy defaults, invalid size repair, real-size
  viewport rectangles at 0.5x/2x zoom, opposite-corner anchoring, delta/scale
  conversion, min/max clamps, free resize, aspect-locked resize, and JSON
  persistence/reload.
- [ ] Add rendered RED tests for four handles on a selected rich node; resize
  precedence over move; live geometry; persist-on-pointer-up/cancel/blur;
  iframe shield activation; and existing group move/delete/marquee behavior.
- [ ] Run
  `npm test -- --run test/research-file-drop.test.ts test/sherlock-composer-workspace-ui.test.ts`
  and confirm the expected missing-size/resize failures.
- [ ] Implement pure normalization and resize helpers, extend workspace actions,
  replace fixed 220 x 64 hit geometry, and render a shared titled node frame.
  Keep generic unsupported files compact.
- [ ] Regenerate the conversation patch, rerun focused tests, and validate the
  reverse patch.
- [ ] Commit with `支持研究画布组件拖角缩放`.

## Task 5: Complete assistant cards and proportional image previews

**Files:**

- Modify: `test/research-file-drop.test.ts`
- Modify: `test/sherlock-composer-workspace-ui.test.ts`
- Modify: `node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js`
- Modify: relevant conversation `.d.ts` files.
- Modify: `patches/@deepseek-ai+dsh-client-ui-conversation+0.1.0-rc.7.patch`

**Produces:** Full structured assistant content with auto height and manual
scrolling, plus titled image previews with natural-ratio sizing and fallback
states.

- [ ] Add RED tests proving line breaks, lists, and code fences survive artifact
  creation/storage/reload; the initial width is 360 px; `ResizeObserver`
  publishes full auto height; first manual resize locks size; and a smaller
  manual body scrolls without truncating source text.
- [ ] Add RED tests for supported image/SVG detection, preview descriptor use,
  filename title, natural ratio capture, proportional total-frame sizing,
  offscreen placeholder, and missing/unreadable fallback.
- [ ] Run the two focused files and confirm the failures are caused by the
  current collapsed excerpt and generic file card.
- [ ] Render assistant text with the existing Markdown component, retain the
  bounded original string, and use `ResizeObserver` only while in auto mode.
- [ ] Render image previews through the capability URL, persist normalized
  natural ratio, and revoke/unmount resources with the node lifecycle.
- [ ] Regenerate the conversation patch, rerun focused tests, and validate the
  reverse patch.
- [ ] Commit with `完善研究画布消息与图片组件`.

## Task 6: Single-page PDF and sandboxed HTML components

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `test/research-file-drop.test.ts`
- Modify: `test/sherlock-composer-workspace-ui.test.ts`
- Modify: `test/research-file-preview.test.ts`
- Modify: `node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js`
- Modify: relevant conversation `.d.ts` files.
- Modify: `patches/@deepseek-ai+dsh-client-ui-conversation+0.1.0-rc.7.patch`

**Produces:** A pinned PDF.js runtime, one-page PDF rendering with component-owned
wheel navigation, and a strict capability-scoped sandbox iframe for HTML.

- [ ] Install a fixed compatible `pdfjs-dist` version and record both manifest
  and lockfile changes. Do not install any browser or unrelated dependency.
- [ ] Add RED tests for PDF page viewport ratio, `current / total` indicator,
  accumulated wheel threshold, one-step throttled navigation, old render task
  cancellation, component resize, offscreen suspension, and no canvas pan/zoom
  from PDF wheel input.
- [ ] Add RED tests for HTML title, initial 480 x 360 geometry, internal scroll,
  iframe sandbox/referrer/allow policy, local relative assets, CSP network and
  frame blocking, script execution only after Task 2 guards, and iframe shield
  during node move/resize.
- [ ] Run the three focused tests and confirm RED.
- [ ] Implement lazy PDF.js loading and a cancel-safe page renderer. Avoid a
  global worker that survives unmount; package the worker URL through the
  existing Electron/Vite build.
- [ ] Implement the HTML iframe using only capability URLs. Do not use `srcdoc`,
  `file://`, `allow-same-origin`, popups, forms, downloads, or top navigation.
- [ ] Regenerate the conversation patch, rerun focused tests and typecheck, and
  validate the reverse patch.
- [ ] Commit with `支持画布PDF与HTML内容预览`.

## Task 7: Integration regression, patch durability, and real-app QA

**Files:**

- Modify: `design-qa.md`
- Modify only if a focused failure requires it: the implementation and focused
  test files named above.

**Produces:** Dependency patches that reinstall cleanly, a local packaged app
left open for the user, and recorded evidence for the exact requested flows.

- [ ] Re-read the spec and check every requirement against the committed diff.
  Confirm no width/right-panel/sidebar/loading/version/public-update changes.
- [ ] Run the focused tests only:

  ```bash
  npm test -- --run \
    test/research-file-preview.test.ts \
    test/research-file-drop.test.ts \
    test/sherlock-composer-workspace-ui.test.ts \
    test/runtime.test.ts
  npm run typecheck
  git diff --check
  ```

- [ ] Verify dependency durability with reverse patch checks and a clean
  patch-package replay in an isolated temporary copy/cache-safe environment.
- [ ] Follow `docs/sherlock-local-test-runbook.md` exactly using
  `./script/build_and_run.sh --verify`. Skip notarization and publishing.
- [ ] Use the Browser plugin first when it can inspect the renderer; otherwise
  record why the Electron window requires Computer Use. Verify page identity,
  no blank/error overlay, console health, screenshots, and these interactions:
  tagged and multiline composer in Chat and Research; full assistant card add
  and resize; Finder and sidebar image drops; multi-page PDF wheel navigation;
  HTML internal scroll/interaction; marquee/group move; keyboard/context delete;
  session switch and app restart persistence; narrow right-panel layout.
- [ ] Record the source-versus-app mismatch ledger and screenshot paths in
  `design-qa.md`; keep temporary screenshots outside the repository.
- [ ] Leave the verified local Sherlock app open for user testing.
- [ ] Commit with `验证研究画布可视组件本地测试版`.

## Completion Evidence

Completion requires all seven task commits, clean task reviews, one clean final
whole-branch review, focused tests with zero failures, typecheck exit 0, valid
replayable patches, `build_and_run.sh --verify` exit 0, and real Sherlock window
evidence for the target flows. A compile, running process, or source grep alone
is not completion.
