# Sherlock Research Canvas Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved Research workspace in which the center is a persistent selectable canvas, the right panel owns the live conversation, selected files become ordered composer tags, and assistant results reach the canvas only through explicit user actions.

**Architecture:** Keep the existing patched `@deepseek-ai/dsh-client-ui-conversation` bundle as the integration boundary and add one per-session `ResearchWorkspaceRegistry` as the sole owner of canvas files, artifacts, selection, tag order, and transient viewport state. Reuse the existing Chat view, input machine, queue, approvals, and composer by moving their single mounted presentation into a portal hosted by the layout details column while Research is active. Extend `@deepseek-ai/dsh-client-ui-layout` with reversible Research panel transitions, then persist both dependency changes through `patch-package`.

**Tech Stack:** Electron 43, React, TypeScript 5.9, Vitest 4, Happy DOM, Cordis slot stores, patch-package.

**Spec:** `docs/superpowers/specs/2026-08-26-research-canvas-workspace-design.md`

## Global Constraints

- The existing `对话` page remains the normal full-width conversation surface; Research reuses the same session and input state rather than creating a second conversation.
- Only one composer is mounted at a time.
- Ordinary user and assistant messages never appear on the canvas automatically.
- Selected file nodes and composer file tags are two views of one ordered per-session selection.
- File and artifact positions survive view switching, session switching, reload, and application restart.
- Right-panel width remains clamped to 300–520 px and defaults to 420 px on first Research use.
- The pinned right-panel label is exactly `对话`; it is leftmost, not closable, and not reorderable.
- Persist files at `sherlock.research.canvas.files.v1:<sessionId>`, selection at `sherlock.research.canvas.selection.v1:<sessionId>`, artifacts at `sherlock.research.canvas.artifacts.v1:<sessionId>`, and the global Research panel width at `sherlock.research.panel.width.v1`.
- Continue to accept Finder files only through `window.dshDesktop.getPathForFile` and Sherlock file drags only through `application/x-sherlock-file`.
- The internal artifact drag MIME type is exactly `application/x-sherlock-research-artifact`; accept only validated, bounded JSON and never HTML.
- File tags display the basename and availability only; absolute paths never appear in visible composer or message chrome.
- A name-only or send-time-unavailable file blocks submission without clearing text, images, selection, or tag order.
- Sending files without text is valid; sending no text, files, or images remains disabled.
- Prompt success clears the sent file selection but preserves canvas nodes; prompt failure restores the exact text, image ids, file selection, and tag order without duplicates.
- Wheel pans, Command-wheel zooms around the pointer, and Space-drag pans with higher priority than selection or movement.
- Do not run the full project test suite. Run only tests directly affected by this feature plus type, patch, package, and real-app checks named below.
- Do not publish, notarize, increment the version, modify public update metadata, push commits, or push tags.
- Each implementation task ends in a local Git commit whose subject is Chinese and stages only files named by that task.

## File Structure

- `node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js`: runtime implementation for workspace state, canvas interaction, right-side conversation portal, composer tags, prompt serialization, user-message projection, and assistant artifacts.
- `node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/types/client/contract/views.d.ts`: persisted chat-store additions for the Research right-tab selection and unread state.
- `node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/types/client/contract/slots.d.ts`: assistant-action owner text and injected Research workspace contracts.
- `node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/types/client/stores.d.ts`: chat-store action declarations added by the right-panel tab host.
- `node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/types/client/input/facade.d.ts`: external attachment eligibility added to `SessionInputShell`.
- `node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/types/client/input/hub.d.ts`: Research registry dependency on the submit sink.
- `node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/types/client/skeleton/ConversationRoot.d.ts`: portal-capable root injection surface.
- `node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/types/client/skeleton/DetailsPanel.d.ts`: Research-aware details body surface.
- `node_modules/@deepseek-ai/dsh-client-ui-layout/lib/client.js`: details-column portal host and reversible Research-width controller.
- `node_modules/@deepseek-ai/dsh-client-ui-layout/lib/types/client/AppFrame.d.ts`: panel-observation injection.
- `node_modules/@deepseek-ai/dsh-client-ui-layout/lib/types/client/service.d.ts`: `enterResearch`, `leaveResearch`, and panel observation contracts.
- `node_modules/@deepseek-ai/dsh-client-ui-layout/lib/types/client/stores.d.ts`: explicit details-width restore action.
- `src/main/index.ts`: bounded file-availability IPC handler used immediately before a Research send.
- `src/preload/index.ts`: narrow `researchFilesAvailable(paths)` bridge.
- `test/research-file-drop.test.ts`: pure selection, geometry, movement, persistence, serialization, and artifact payload contracts.
- `test/sherlock-composer-workspace-ui.test.ts`: rendered canvas, tag, one-composer, right-tab, message-chip, and artifact interaction contracts.
- `test/desktop-shell-controls.test.ts`: layout Research transition and details portal-host contracts.
- `patches/@deepseek-ai+dsh-client-ui-conversation+0.1.0-rc.7.patch`: durable conversation-package patch.
- `patches/@deepseek-ai+dsh-client-ui-layout+0.1.0-rc.7.patch`: durable layout-package patch.
- `design-qa.md`: source-vs-packaged-app comparison and manual interaction evidence.

---

### Task 1: Per-session Research workspace model

**Files:**
- Modify: `test/research-file-drop.test.ts`
- Modify: `node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js`

**Interfaces:**
- Consumes: existing `ResearchCanvasFileNode` runtime shape, `parseResearchCanvasFileNodes(raw)`, `researchCanvasStorageKey(sessionId)`, and `researchCanvasWorldPoint(viewport, point)`.
- Produces: `normalizeResearchRect(a, b)`, `researchNodeViewportRect(node, viewport)`, `researchNodesInMarquee(nodes, viewport, rect)`, `updateResearchSelection(selection, nodeIds, mode, files)`, `moveResearchCanvasNodes(files, artifacts, selectedIds, delta, scale)`, `parseResearchCanvasSelection(raw, files, artifacts)`, `researchCanvasSelectionStorageKey(sessionId)`, `parseResearchCanvasArtifactNodes(raw)`, `researchCanvasArtifactsStorageKey(sessionId)`, `parseResearchArtifactDrag(raw)`, and `ResearchWorkspaceRegistry`.

- [ ] **Step 1: Add failing geometry, selection, persistence, and bounded-payload tests**

Add tests that independently calculate these concrete outcomes:

```ts
it('normalizes marquee geometry and intersects cards in viewport coordinates', async () => {
  const client = await loadConversationClient()
  expect(client.normalizeResearchRect({ x: 180, y: 160 }, { x: 80, y: 60 }))
    .toEqual({ left: 80, top: 60, right: 180, bottom: 160, width: 100, height: 100 })
  const nodes = [
    { id: 'a', name: 'a.pdf', source: 'computer', x: 50, y: 50 },
    { id: 'b', name: 'b.pdf', source: 'computer', x: 220, y: 220 }
  ]
  expect(client.researchNodesInMarquee(
    nodes,
    { scale: 2, x: 10, y: 20 },
    { left: 0, top: 0, right: 130, bottom: 140, width: 130, height: 140 }
  )).toEqual(['a'])
})

it('keeps stable selection order and derives ordered files only', async () => {
  const client = await loadConversationClient()
  const files = [
    { id: 'f1', name: 'one.pdf', path: '/w/one.pdf', source: 'computer', x: 80, y: 20 },
    { id: 'f2', name: 'two.pdf', path: '/w/two.pdf', source: 'computer', x: 20, y: 20 }
  ]
  const first = client.updateResearchSelection(
    { selectedNodeIds: [], orderedFileIds: [] },
    ['f2', 'f1'],
    'replace',
    files
  )
  expect(first).toEqual({ selectedNodeIds: ['f2', 'f1'], orderedFileIds: ['f2', 'f1'] })
  expect(client.updateResearchSelection(first, ['f2'], 'toggle', files))
    .toEqual({ selectedNodeIds: ['f1'], orderedFileIds: ['f1'] })
})

it('moves selected files and artifacts by screen delta divided by zoom', async () => {
  const client = await loadConversationClient()
  const moved = client.moveResearchCanvasNodes(
    [{ id: 'f1', name: 'a', source: 'computer', x: 10, y: 20 }],
    [{ id: 'a1', kind: 'assistant-result', messageId: 'm1', title: 'Answer', excerpt: 'Text', x: 30, y: 40 }],
    ['f1', 'a1'],
    { x: 20, y: -10 },
    2
  )
  expect(moved.files[0]).toMatchObject({ x: 20, y: 15 })
  expect(moved.artifacts[0]).toMatchObject({ x: 40, y: 35 })
})
```

Also assert exact storage keys, malformed/oversized JSON rejection, a 256-node cap, a 16,384-character excerpt cap, a 256-character title cap, duplicate artifact canonicalization, and exact acceptance of `application/x-sherlock-research-artifact` payload fields `{ sessionId, messageId, kind, title, excerpt }`.

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `npm test -- --run test/research-file-drop.test.ts`

Expected: FAIL because `normalizeResearchRect`, `updateResearchSelection`, `moveResearchCanvasNodes`, and the artifact/selection parsers are not exported.

- [ ] **Step 3: Implement bounded pure functions and the registry**

Add these exact runtime constants and state shapes beside the existing Research constants:

```js
const RESEARCH_ARTIFACT_DRAG_TYPE = "application/x-sherlock-research-artifact";
const RESEARCH_CANVAS_SELECTION_PREFIX = "sherlock.research.canvas.selection.v1:";
const RESEARCH_CANVAS_ARTIFACTS_PREFIX = "sherlock.research.canvas.artifacts.v1:";
const RESEARCH_CANVAS_MAX_ARTIFACTS_PER_SESSION = 256;
const RESEARCH_ARTIFACT_MAX_TITLE = 256;
const RESEARCH_ARTIFACT_MAX_EXCERPT = 16384;
const EMPTY_RESEARCH_SELECTION = Object.freeze({ selectedNodeIds: [], orderedFileIds: [] });
```

Use one registry instance created in `apply(ctx)` and one resident store per session:

```js
class ResearchWorkspaceRegistry {
  constructor(storage = researchCanvasStorage()) {
    this.storage = storage;
    this.sessions = new Map();
  }
  for(sessionId) {
    let workspace = this.sessions.get(sessionId);
    if (workspace === undefined) {
      workspace = createResearchWorkspaceSession(this.storage, sessionId);
      this.sessions.set(sessionId, workspace);
    }
    return workspace;
  }
  release(sessionId) {
    this.sessions.get(sessionId)?.cancelTransient();
  }
}
```

The per-session snapshot is exactly:

```js
{
  files: ResearchCanvasFileNode[],
  artifacts: ResearchCanvasArtifactNode[],
  selection: { selectedNodeIds: string[], orderedFileIds: string[] },
  viewport: { scale: number, x: number, y: number },
  canvasSize: { width: number, height: number },
  pendingMessageJump: null | string
}
```

All registry actions publish immutable snapshots. Load files, artifacts, and selection once; canonicalize selection against live node ids; persist only files, artifacts, and selection; absorb storage failures and keep in-memory state.

- [ ] **Step 4: Run the focused test and confirm GREEN**

Run: `npm test -- --run test/research-file-drop.test.ts`

Expected: all Research file-drop and new model tests PASS with pristine output.

- [ ] **Step 5: Commit the model**

```bash
git add test/research-file-drop.test.ts \
  node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js
git commit -m "功能：建立研究画布会话状态模型"
```

---

### Task 2: Canvas selection, marquee, and group movement

**Files:**
- Modify: `test/research-file-drop.test.ts`
- Modify: `test/sherlock-composer-workspace-ui.test.ts`
- Modify: `node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js`

**Interfaces:**
- Consumes: Task 1 `ResearchWorkspaceRegistry`, `updateResearchSelection`, `researchNodesInMarquee`, and `moveResearchCanvasNodes`.
- Produces: accessible `ResearchCanvasFileCard`, `ResearchCanvasArtifactCard`, `[data-research-marquee]`, selected/group-drag pointer behavior, Escape and Command-A keyboard behavior, and unified file/artifact drop placement.

- [ ] **Step 1: Add failing rendered interaction tests**

Extend the Happy DOM mount test with two persisted cards and assert:

```ts
expect(cardA.getAttribute('aria-selected')).toBe('false')
cardA.dispatchEvent(pointer(browserWindow, 'pointerdown', { pointerId: 1, x: 100, y: 100 }))
expect(cardA.getAttribute('aria-selected')).toBe('true')

canvas.dispatchEvent(pointer(browserWindow, 'pointerdown', { pointerId: 2, x: 20, y: 20 }))
canvas.dispatchEvent(pointer(browserWindow, 'pointermove', { pointerId: 2, x: 360, y: 180 }))
expect(canvas.querySelector('[data-research-marquee]')).not.toBeNull()
canvas.dispatchEvent(pointer(browserWindow, 'pointerup', { pointerId: 2, x: 360, y: 180 }))
expect(canvas.querySelectorAll('[aria-selected="true"]')).toHaveLength(2)
```

Add focused tests for Command-click toggle, Shift-click add, plain blank click clear, Escape clear, Command-A selecting files plus artifacts only while canvas owns focus, Space-drag taking priority, unselected-node drag selecting only that node, selected-node drag moving the group, and 2× zoom converting a 20 px screen drag to 10 world units.

- [ ] **Step 2: Run the two focused files and confirm RED**

Run: `npm test -- --run test/research-file-drop.test.ts test/sherlock-composer-workspace-ui.test.ts`

Expected: FAIL because cards are not selectable/focusable, no marquee is rendered, and node drags do not update persisted positions.

- [ ] **Step 3: Move `ResearchCanvas` to the shared store and add pointer arbitration**

Replace local `files` state with `useSyncExternalStore(workspace.subscribe, workspace.getSnapshot)`. Keep a single pointer operation ref with these concrete modes:

```js
{ kind: "pan", pointerId, lastX, lastY }
{ kind: "move", pointerId, lastX, lastY, selectedNodeIds }
{ kind: "marquee", pointerId, startX, startY, currentX, currentY, mode }
```

Resolve pointer priority in `onPointerDown` in this order: Space pan; node move; blank marquee. For node hits, use `closest('[data-research-node-id]')`; for a selected node preserve the group; for an unselected node replace selection before movement. On each move call the pure Task 1 helper, and on pointer end/cancel/blur persist the latest snapshot and clear drag visuals.

Render file and artifact cards with:

```js
{
  tabIndex: 0,
  role: "option",
  "data-research-node-id": node.id,
  "aria-selected": selected,
  "data-selected": selected || void 0
}
```

Render the marquee as an absolutely positioned, dashed, non-color-only rectangle in viewport coordinates. Sort batch marquee hits by `y`, then `x`, then `id` before calling `updateResearchSelection`.

- [ ] **Step 4: Add selected, unavailable, marquee, artifact, and dragging styles**

Extend `cssResearchCanvas` with selectors for `[data-selected=true]`, `[data-path-unavailable=true]`, `.rScV5Q_marquee`, `.rScV5Q_artifactCard`, `[data-node-dragging=true]`, visible `:focus-visible`, and dark theme surfaces. Preserve the current 220 px file card and dotted background; do not add decorative imagery or custom SVG artwork beyond the existing file icon.

- [ ] **Step 5: Run focused tests and confirm GREEN**

Run: `npm test -- --run test/research-file-drop.test.ts test/sherlock-composer-workspace-ui.test.ts`

Expected: both files PASS, including non-1× selection geometry and group movement.

- [ ] **Step 6: Commit canvas interaction**

```bash
git add test/research-file-drop.test.ts test/sherlock-composer-workspace-ui.test.ts \
  node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js
git commit -m "功能：支持研究画布框选与成组拖动"
```

---

### Task 3: Research right-panel Conversation and reversible layout

**Files:**
- Modify: `test/desktop-shell-controls.test.ts`
- Modify: `test/sherlock-composer-workspace-ui.test.ts`
- Modify: `node_modules/@deepseek-ai/dsh-client-ui-layout/lib/client.js`
- Modify: `node_modules/@deepseek-ai/dsh-client-ui-layout/lib/types/client/AppFrame.d.ts`
- Modify: `node_modules/@deepseek-ai/dsh-client-ui-layout/lib/types/client/service.d.ts`
- Modify: `node_modules/@deepseek-ai/dsh-client-ui-layout/lib/types/client/stores.d.ts`
- Modify: `node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js`
- Modify: `node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/types/client/contract/views.d.ts`
- Modify: `node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/types/client/stores.d.ts`
- Modify: `node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/types/client/skeleton/ConversationRoot.d.ts`
- Modify: `node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/types/client/skeleton/DetailsPanel.d.ts`

**Interfaces:**
- Consumes: existing `chatStore`, `ChatView`, `ConversationRoot` composer assembly, `DetailsPanel`, and layout `setDetails` clamp.
- Produces: `LayoutController.observePanels(state)`, `enterResearch()`, `leaveResearch()`, `[data-details-portal-host]`, chat-store `researchRightTab`, `researchFilesTabOpen`, `researchConversationUnread`, `setResearchRightTab(tab)`, `setResearchFilesTabOpen(open)`, `setResearchConversationUnread(unread)`, and a single-mounted `ResearchConversationPanel` portal.

- [ ] **Step 1: Add failing layout service tests**

Load the layout bundle with a fake action set and assert this exact sequence:

```ts
layout.attachPanels(actions)
layout.observePanels({ sidebar: 280, details: 0, narrow: false, narrowExpanded: false })
layout.enterResearch()
expect(writes).toEqual([['setDetails', 420]])
layout.observePanels({ sidebar: 280, details: 472, narrow: false, narrowExpanded: false })
layout.leaveResearch()
expect(writes.at(-1)).toEqual(['closeDetails'])
layout.observePanels({ sidebar: 280, details: 360, narrow: false, narrowExpanded: false })
layout.enterResearch()
layout.leaveResearch()
expect(writes.at(-1)).toEqual(['setDetails', 360])
```

Also render `AppFrame` and assert the details column contains `data-details-portal-host`, and that its panel snapshot is reported through the injected callback.

- [ ] **Step 2: Add failing one-composer and pinned-tab UI tests**

Add source/runtime assertions that Research:

- renders exactly one `[data-composer-seat]`, inside `[data-research-conversation-panel]`;
- renders no center composer, queue strip, task dock, or stats footer;
- renders `[role="tablist"]` with leftmost `[data-research-right-tab="conversation"]` whose text is `对话` and which has no close button;
- renders Conversation → Files → temporary Details → add-tab control order, lets Files and Details close without removing Conversation, and restores Files through the add control;
- preserves `[data-conversation-scroll]` and the same input snapshot when Chat → Research → Chat is switched;
- preserves the same textarea DOM node, focus, selection range, and IME-safe draft when the composer host moves between center and right;
- shows `data-unread="true"` when `session.chat.order.length` or `session.running` changes while the details tab is active, without selecting Conversation.

- [ ] **Step 3: Extend the layout controller**

Add a `setDetails(px)` store action that accepts `0` as closed and otherwise clamps 300–520. Add guarded local-storage helpers for `sherlock.research.panel.width.v1`. `enterResearch()` snapshots the observed pre-Research `details`, restores saved width or 420, and is idempotent. While Research is active, observing a non-zero changed width persists it. `leaveResearch()` restores the exact pre-Research width/open state and is idempotent.

Add `reportPanels` to the `AppFrame` injected props and call it from an effect when `panels.sidebar`, `panels.details`, `panels.narrow`, or `panels.narrowExpanded` changes. Add `data-details-portal-host` to `DetailsColumn`.

- [ ] **Step 4: Extract one composer surface and portal it in Research**

Give the root conversation registration `store: chatStore`, inject `{ enterResearch: layout.enterResearch, leaveResearch: layout.leaveResearch }`, and read `view` from the same store as `ConversationSession`.

Extract the existing composer construction into a local `ComposerSurface` that receives the existing `zone`, `hero`, `inputBar`, `pending`, and `session`. Create one stable `composerPortalHost` DOM element for the lifetime of `ConversationRoot`, render `ComposerSurface` into it once, and move that host between center and right placeholders without remounting the textarea:

```js
const research = activeView === "research";
const composerPortalHost = composerPortalHostRef.current;
useLayoutEffect(() => {
  const destination = research ? researchComposerHostRef.current : centerComposerHostRef.current;
  if (destination === null || composerPortalHost.parentElement === destination) return;
  const active = document.activeElement;
  const selection = active instanceof HTMLTextAreaElement
    ? { node: active, start: active.selectionStart, end: active.selectionEnd }
    : null;
  destination.appendChild(composerPortalHost);
  selection?.node.focus({ preventScroll: true });
  selection?.node.setSelectionRange(selection.start, selection.end);
}, [research]);
const composerPortal = createPortal(composerSurface, composerPortalHost);
```

The right portal panel renders Chat with `renderSlot('conversation.view', { inspect, onInspectDone }, { only: 'chat' })` and provides the right composer placeholder that receives the stable host. It retains the existing queue/input docks, composer bar, permissions, model, stop/send, and stats. It omits the session title and top-level view tabs. Use the same `chatScroll` map so only one presentation owns a session's saved reading position.

The pinned tab strip order is Conversation, Files when open, selected tool Details when present, then an add control. `ResearchFilesPanel` lists the current workspace files by basename, availability, and source; each resolved row writes the existing `application/x-sherlock-file` payload so it can be repositioned on the canvas. Closing Files sets `researchFilesTabOpen=false`; the add control restores and selects Files. `DetailsPanel` stays mounted below the portal. In Research, hide its own header and reveal its body only while `researchRightTab === 'details'`; the portal tab strip stays visible above both bodies. Tool `openDetails` selects the existing target and switches `researchRightTab` to `details`; outside Research it keeps the prior behavior.

- [ ] **Step 5: Add responsive right-panel styling and unread/running indicators**

Add a compact right-panel header, leftmost pinned tab, unread dot, running pulse, independently scrolling message body, and bottom-anchored composer. Set right-panel composer CSS variables so the 300 px minimum still fits: side clearance 8 px, card max width 100%, compact tool gaps, and no horizontal overflow. Preserve existing token colors, radii, and type scale.

- [ ] **Step 6: Run focused tests and typecheck**

Run:

```bash
npm test -- --run test/desktop-shell-controls.test.ts test/sherlock-composer-workspace-ui.test.ts
npm run typecheck
```

Expected: focused tests PASS and typecheck exits 0.

- [ ] **Step 7: Commit the layout and right conversation**

```bash
git add test/desktop-shell-controls.test.ts test/sherlock-composer-workspace-ui.test.ts \
  node_modules/@deepseek-ai/dsh-client-ui-layout/lib/client.js \
  node_modules/@deepseek-ai/dsh-client-ui-layout/lib/types/client/AppFrame.d.ts \
  node_modules/@deepseek-ai/dsh-client-ui-layout/lib/types/client/service.d.ts \
  node_modules/@deepseek-ai/dsh-client-ui-layout/lib/types/client/stores.d.ts \
  node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js \
  node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/types/client/contract/views.d.ts \
  node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/types/client/stores.d.ts \
  node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/types/client/skeleton/ConversationRoot.d.ts \
  node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/types/client/skeleton/DetailsPanel.d.ts
git commit -m "功能：将研究对话固定到右侧栏"
```

---

### Task 4: Ordered file tags and atomic Research submission

**Files:**
- Modify: `test/research-file-drop.test.ts`
- Modify: `test/sherlock-composer-workspace-ui.test.ts`
- Modify: `src/main/index.ts`
- Modify: `src/preload/index.ts`
- Modify: `node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js`
- Modify: `node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/types/client/input/facade.d.ts`
- Modify: `node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/types/client/input/hub.d.ts`
- Modify: `node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/types/client/contract/slots.d.ts`

**Interfaces:**
- Consumes: Task 1 workspace selection/tag order and Task 3 single right-side composer.
- Produces: `serializeResearchPrompt(files, text)`, `parseResearchPrompt(text)`, `ResearchFileTags`, `window.dshDesktop.researchFilesAvailable(paths)`, and a Research-aware immutable submit attempt.

- [ ] **Step 1: Add failing serialization, message rendering, and tag tests**

Use this exact owned prefix contract:

```text
␞SHERLOCK_RESEARCH_FILES_V1 {"files":[{"id":"f1","name":"report.pdf","path":"/w/report.pdf"}]}␟
```

Assert `serializeResearchPrompt` prepends the prefix immediately before visible text, while `parseResearchPrompt` accepts it only at byte zero, validates/caps every descriptor, returns `{ text, files }`, and leaves line-like user prose unchanged. Render a sent user message and assert it contains `data-research-message-file="f1"`, `report.pdf`, and not `/w/report.pdf`.

Mount `ResearchFileTags` and assert tag order follows `orderedFileIds`, drag/drop and keyboard Move Left/Move Right reorder only tags, Delete/Backspace removes the tag and deselects the file, and a pathless tag has `aria-invalid="true"`.

- [ ] **Step 2: Add failing send success/failure tests**

Create a shell with text `compare these`, image ids `['i1']`, and ordered files `['f2', 'f1']`. Assert one prompt attempt receives images followed by one text block whose parsed file order is `['f2', 'f1']`. Before promise settlement, assert draft, image ids, and file selection are cleared. On rejection, assert exact restoration without duplicate ids. Add file-only success and pathless/unavailable blocking cases.

- [ ] **Step 3: Run focused tests and confirm RED**

Run: `npm test -- --run test/research-file-drop.test.ts test/sherlock-composer-workspace-ui.test.ts`

Expected: FAIL because the serialization helpers, file tags, path bridge, and Research submit transaction do not exist.

- [ ] **Step 4: Add the narrow send-time availability bridge**

In preload expose:

```ts
researchFilesAvailable: (paths: string[]): Promise<boolean[]> =>
  ipcRenderer.invoke('research:files-available', paths)
```

In main, accept only arrays of at most 64 non-empty strings of at most 512 characters, reject malformed input with an all-false result, and use `Promise.all(paths.map(path => stat(path).then(value => value.isFile()).catch(() => false)))`. Do not reveal directory contents or file bytes.

- [ ] **Step 5: Render and mutate tags from the workspace source of truth**

Pass `ResearchFileTags` as the existing InputBar `accessory` only when the active top-level view is Research. The component reads the session workspace through `useSyncExternalStore`; it never owns a second array. Its remove and reorder handlers call registry actions, and accessibility buttons expose exactly `左移`, `右移`, and `删除附件` labels.

Update InputBar emptiness to include Research selected files. Extend `SessionInputShell.submit()` with `hasExternalAttachments()` so an empty text/image draft can still call the default sink when ordered Research files exist.

- [ ] **Step 6: Implement one immutable submit attempt**

At the start of `InputHub.sink`, snapshot:

```js
const attempt = {
  text,
  imageIds: [...imageIds],
  files: workspace.selectedFiles().map(file => ({ ...file })),
  selection: workspace.selectionSnapshot(),
  mode
};
```

Block before optimistic clearing if any file lacks `path` or the availability bridge returns false. Otherwise serialize the ordered descriptors, clear the admitted text/images/selection, call the existing `conversation.sendSession`, and on failure restore text only if untouched plus the exact image and Research selection snapshots. On success release only admitted images and leave file/artifact nodes in place.

- [ ] **Step 7: Parse owned prefixes in user-message projection**

Call `parseResearchPrompt(content.text)` before `projectUserText`. Render the returned descriptors as compact file chips above the clean text. A malformed prefix remains ordinary visible text so data is never silently discarded.

- [ ] **Step 8: Run focused tests and typecheck**

Run:

```bash
npm test -- --run test/research-file-drop.test.ts test/sherlock-composer-workspace-ui.test.ts
npm run typecheck
```

Expected: all focused submission, tag, and projection tests PASS; typecheck exits 0.

- [ ] **Step 9: Commit the Research attachment flow**

```bash
git add test/research-file-drop.test.ts test/sherlock-composer-workspace-ui.test.ts \
  src/main/index.ts src/preload/index.ts \
  node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js \
  node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/types/client/input/facade.d.ts \
  node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/types/client/input/hub.d.ts \
  node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/types/client/contract/slots.d.ts
git commit -m "功能：发送研究画布所选文件附件"
```

---

### Task 5: Explicit assistant-result and excerpt artifacts

**Files:**
- Modify: `test/research-file-drop.test.ts`
- Modify: `test/sherlock-composer-workspace-ui.test.ts`
- Modify: `node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js`
- Modify: `node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/types/client/contract/slots.d.ts`
- Modify: `node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/types/client/chat/AssistantNodeView.d.ts`
- Modify: `node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/types/client/chat/TurnTailNodeView.d.ts`

**Interfaces:**
- Consumes: Task 1 artifact storage/deduplication and Task 3 right Conversation portal.
- Produces: complete-response action `添加到画布`, excerpt action `加入画布`, bounded artifact drag/drop, persisted artifact cards, and source-message navigation.

- [ ] **Step 1: Add failing artifact action and deduplication tests**

Render a finalized assistant turn with `{ messageId: 'm1', text: 'Revenue improved.' }` and assert the action strip contains a button labeled `添加到画布`. Clicking it must create one `assistant-result` artifact centered in the current visible canvas. Clicking it again after panning must keep one artifact and move it to the new center.

Assert `addExcerpt('m1', '  Margin   expanded. ')` normalizes whitespace for identity but preserves bounded readable text. The same normalized excerpt repositions; a different excerpt from `m1` creates a second artifact.

- [ ] **Step 2: Add failing selection-action, drag/drop, and source-jump tests**

Mount the right Conversation with one finalized assistant message. Select `Margin expanded` inside its `[data-assistant-message-id="m1"]` wrapper and dispatch `mouseup`; assert a visible `加入画布` control. Click it and assert an excerpt card appears.

Dispatch `dragstart` from the selected passage and assert `application/x-sherlock-research-artifact` contains only `{ sessionId, messageId, kind: 'assistant-excerpt', title, excerpt }`. Drop it at canvas viewport `(250, 180)` under a non-1× transform and assert the artifact world position equals `researchCanvasWorldPoint(viewport, { x: 250, y: 180 })`.

Activate an artifact and assert the right tab changes to Conversation, the source row receives focus/scroll, and `pendingMessageJump` clears. For a missing source, assert the card remains and reports `来源消息不可用` without throwing.

- [ ] **Step 3: Run focused tests and confirm RED**

Run: `npm test -- --run test/research-file-drop.test.ts test/sherlock-composer-workspace-ui.test.ts`

Expected: FAIL because assistant owner text, selection action, artifact card/drop, and source navigation are absent.

- [ ] **Step 4: Add complete-response actions**

Extend `AssistantActionOwnerProps` to `{ messageId: MessageId; text: string }` and pass `assistantText(closing.blocks)` from `TurnTailNodeView`. Register one `conversation.chat.assistant-actions` entry that calls `workspace.addAssistantResult({ messageId, text, at: workspace.visibleCenter() })`. Use the existing action-button visual language and the exact accessible label `添加到画布`.

- [ ] **Step 5: Add excerpt selection and bounded internal drag**

Add `data-assistant-message-id` and `data-assistant-message-settled` to the Assistant node wrapper when `node.data.finalNode.messageId` exists. In `ResearchConversationPanel`, a `mouseup` handler accepts a selection only when both range endpoints are within the same settled assistant wrapper, normalizes/caps its plain text, and positions the `加入画布` control beside the selection rectangle.

The panel's capturing `dragstart` handler serializes the same validated selection to `application/x-sherlock-research-artifact` with `effectAllowed = 'copy'`. The canvas handles this MIME only after `parseResearchArtifactDrag` succeeds; it stops propagation only for a valid owned payload.

- [ ] **Step 6: Render artifact cards and source navigation**

Render title, excerpt, kind, and source availability. Artifacts use the same `data-research-node-id`, selection, focus, and group-drag handlers as file cards. Enter/double-click sets `researchRightTab = 'conversation'`, stores `pendingMessageJump`, and after the Chat subtree mounts finds the matching wrapper without interpolating raw selector text, calls `scrollIntoView({ block: 'center' })`, focuses it, and clears the pending request.

- [ ] **Step 7: Run focused tests and typecheck**

Run:

```bash
npm test -- --run test/research-file-drop.test.ts test/sherlock-composer-workspace-ui.test.ts
npm run typecheck
```

Expected: artifact creation, excerpt drag/drop, deduplication, persistence, movement, and source navigation tests PASS; typecheck exits 0.

- [ ] **Step 8: Commit explicit canvas artifacts**

```bash
git add test/research-file-drop.test.ts test/sherlock-composer-workspace-ui.test.ts \
  node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js \
  node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/types/client/contract/slots.d.ts \
  node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/types/client/chat/AssistantNodeView.d.ts \
  node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/types/client/chat/TurnTailNodeView.d.ts
git commit -m "功能：将助手结果按需加入研究画布"
```

---

### Task 6: Durable patches, focused integration, packaged-app and visual QA

**Files:**
- Modify: `test/research-file-drop.test.ts`
- Modify: `test/sherlock-composer-workspace-ui.test.ts`
- Modify: `test/desktop-shell-controls.test.ts`
- Modify: `patches/@deepseek-ai+dsh-client-ui-conversation+0.1.0-rc.7.patch`
- Modify: `patches/@deepseek-ai+dsh-client-ui-layout+0.1.0-rc.7.patch`
- Create: `design-qa.md`

**Interfaces:**
- Consumes: all Task 1–5 runtime and declaration surfaces.
- Produces: installed-package parity, end-to-end focused regression evidence, real packaged Sherlock evidence, and `design-qa.md` with exact `final result: passed` or `final result: blocked`.

- [ ] **Step 1: Add final cross-feature regression assertions**

Add one mounted lifecycle test that switches Chat → Research → Details tab → Research Conversation → Trajectory → Research and asserts: one composer, unchanged draft and image ids, selected file-tag order retained, no implicit message/artifact nodes, and pre-Research details width/tab restored on exit. Add one isolation test proving valid Research file/artifact drops never reach the global composer drop listener, while unrelated text drags still bubble.

- [ ] **Step 2: Run the three focused test files and confirm any missing integration is RED**

Run:

```bash
npm test -- --run test/research-file-drop.test.ts test/sherlock-composer-workspace-ui.test.ts test/desktop-shell-controls.test.ts
```

Expected before final integration fixes: any missing lifecycle or drag-ownership contract FAILS with a behavior-specific assertion.

- [ ] **Step 3: Make only the minimal integration fixes required by Step 2**

Keep one `ResearchWorkspaceRegistry` instance per plugin fiber, release transient pointer/jump state on session disposal, preserve persisted files/artifacts/selection, and ensure all Research drag handlers call `preventDefault`/`stopPropagation` only after exact MIME validation succeeds. Do not add automatic layout, connectors, cloud sync, or message-to-canvas behavior.

Use this guard shape at both canvas drop sites:

```js
const payload = parseResearchArtifactDrag(event.dataTransfer?.getData(RESEARCH_ARTIFACT_DRAG_TYPE) ?? "");
if (payload === null || payload.sessionId !== sessionId) return;
event.preventDefault();
event.stopPropagation();
workspace.placeArtifact(payload, researchCanvasWorldPoint(viewport, pointer));
```

- [ ] **Step 4: Regenerate both durable dependency patches**

Run:

```bash
npx patch-package @deepseek-ai/dsh-client-ui-conversation
npx patch-package @deepseek-ai/dsh-client-ui-layout
```

Expected: both rc.7 patch files update and include every changed `client.js` and `.d.ts` hunk.

- [ ] **Step 5: Verify focused tests, typecheck, diff hygiene, and patch parity**

Run:

```bash
npm test -- --run test/research-file-drop.test.ts test/sherlock-composer-workspace-ui.test.ts test/desktop-shell-controls.test.ts
npm run typecheck
git diff --check
git apply --check --reverse patches/@deepseek-ai+dsh-client-ui-conversation+0.1.0-rc.7.patch
git apply --check --reverse patches/@deepseek-ai+dsh-client-ui-layout+0.1.0-rc.7.patch
```

Expected: all focused tests PASS, typecheck exits 0, diff check is silent, and both reverse patch checks exit 0.

- [ ] **Step 6: Build, sign, open, and package-verify the local app**

Run:

```bash
./script/build_and_run.sh --verify
npm run verify:package:mac -- --app "dist-notarized/mac-arm64/Sherlock.app"
```

Expected: `Sherlock is running.`, package verification passes, no notarization or upload command runs, and the application remains open.

- [ ] **Step 7: Exercise the real packaged interface and capture evidence**

In the open Sherlock window, use a disposable Research session and small disposable files to verify the nine manual cases in the spec: automatic right Conversation, bottom-reaching canvas, Finder/internal drops, marquee/group movement at two zoom levels, tag reorder/removal, send/stream/failure restoration/unread, Chat shared state, explicit-only artifacts, and persistence across session switch plus restart. Capture the packaged Research view at the same 1380 × 900 viewport/state as the supplied dark reference when the host window permits it.

- [ ] **Step 8: Compare the source and implementation together and write `design-qa.md`**

Use source visual truth:

`/var/folders/rm/jy4dz49s171fl1dxd9qr3hh80000gp/T/codex-clipboard-f2975acf-dece-4160-8f9c-00d26c0524c3.png`

Record source and implementation pixel sizes, viewport, density, state, full-view comparison, focused right-panel/composer comparison, fonts, spacing, colors, assets/icons, copy, interactions, console/runtime errors, and every P0/P1/P2 fix iteration. The last line must be exactly `final result: passed` when no actionable P0/P1/P2 remains; otherwise it must be `final result: blocked` with the blocker named above it.

- [ ] **Step 9: Commit the durable patches and verification record**

```bash
git add test/research-file-drop.test.ts test/sherlock-composer-workspace-ui.test.ts \
  test/desktop-shell-controls.test.ts \
  patches/@deepseek-ai+dsh-client-ui-conversation+0.1.0-rc.7.patch \
  patches/@deepseek-ai+dsh-client-ui-layout+0.1.0-rc.7.patch \
  design-qa.md
git commit -m "验证：完成研究工作区本地构建检查"
```

- [ ] **Step 10: Capture final branch evidence**

Run:

```bash
git status --short --branch
git log --oneline --decorate -8
git diff --stat "$(git merge-base main HEAD)"..HEAD
```

Expected: the branch is clean, all six task commits are present, and the diff contains only the approved Research workspace work plus its prior file-drop/spec commits.
