# Sherlock Research Canvas File Drop Design

## Goal

Let a user place local files onto a session's Research canvas by dragging them
from Finder or from a file-bearing surface in Sherlock's right details column.
Each successful drop creates a durable file card at the pointer's canvas
position without changing the resident conversation composer or triggering its
global image-attachment drop flow.

## Product Behavior

- Accept one or more files dragged from Finder anywhere inside the Research
  canvas.
- Accept Sherlock-internal file drags that carry the shared
  `application/x-sherlock-file` payload.
- Place the first card at the drop point and offset additional cards in a small
  diagonal stack so every dropped file remains visible.
- Display a compact card with a file icon, basename, and file-type or source
  caption. The absolute path stays out of visible UI and is available only as a
  local title for identification.
- Keep cards attached to world coordinates. Canvas pan, wheel pan, and
  Command-wheel zoom move and scale the cards together with the dot grid.
- Persist cards per session in local storage. Switching tabs, changing sessions,
  reloading, or restarting Sherlock restores that session's cards.
- Treat a repeated drop of the same resolved path as a reposition operation,
  not a duplicate card. Files without a resolvable path use a generated
  identity and may appear more than once.
- Keep this increment focused on adding and displaying files. Opening, deleting,
  selecting, connecting, or independently repositioning cards is outside scope.

## Data Model

Each persisted node contains only JSON-safe local metadata:

```ts
type ResearchCanvasFileNode = {
  id: string
  path?: string
  name: string
  mediaType?: string
  source: 'computer' | 'sherlock'
  x: number
  y: number
}
```

The storage key is versioned and session-scoped:
`sherlock.research.canvas.files.v1:<sessionId>`. Invalid, malformed, or older
entries are ignored rather than breaking the canvas. A write failure such as a
full or disabled local-storage area leaves the in-memory canvas usable.

## Coordinate Model

File cards live in the same infinite world as future Research content. The
content layer uses the existing viewport transform:

`screen = world * scale + viewportOffset`

The drop point is converted back to world coordinates before the node is
created. Cards render inside a single transformed content layer, while the dot
grid continues to use its current background size and position. This keeps
wheel pan, Space-drag pan, and Command-wheel zoom consistent without updating
every node on each viewport change.

## Finder Path Bridge

Modern Electron does not expose a stable filesystem `path` property on a DOM
`File`. The preload therefore exposes a narrow
`dshDesktop.getPathForFile(file)` adapter backed by Electron's
`webUtils.getPathForFile`. It returns an empty string when Electron cannot
resolve the path. No file contents cross IPC and no new main-process filesystem
authority is introduced.

The canvas reads `DataTransfer.files`, asks the bridge for each path, and falls
back to the browser-provided filename and media type when a path is unavailable.

## Sherlock Internal Drag Contract

The shared internal MIME value is JSON with a required display name and an
optional resolved local path:

```json
{"path":"/workspace/output/report.pdf","name":"report.pdf"}
```

File-bearing content in the current right details column exposes a small
draggable file chip and writes this payload on `dragstart`. Relative tool paths
are resolved against the active session workspace before being placed in the
payload. The same MIME contract is reusable by a future dedicated right-side
file browser without coupling that browser to the Research component.

Internal drag data is treated as untrusted input: JSON shape, string lengths,
and finite coordinates are validated before a node is created. Plain text is
not accepted as a file, preventing session rows and arbitrary selected text
from becoming cards.

## Drop Ownership and Feedback

Research owns `dragenter`, `dragover`, `dragleave`, and `drop` only on its canvas
root. Accepted drags use a copy cursor and a subtle theme-aware canvas highlight.
The canvas prevents default handling and stops propagation for accepted drops,
so the document-level composer image intake does not also attach those files.
Unrecognized drags continue to bubble normally.

The highlight is removed on drop, drag leave, drag end, component cleanup, and
window blur. It does not use the browser's orange focus outline.

## Files and Persistence Boundaries

- Persist the Research implementation through
  `patches/@deepseek-ai+dsh-client-ui-conversation+0.1.0-rc.7.patch`.
- Persist right-details drag-source changes through the relevant rc.7 package
  patch rather than only editing `node_modules`.
- Add the narrow Electron file-path bridge in `src/preload/index.ts` and extend
  its existing focused contract tests.
- Keep unrelated dirty worktree files untouched.

## Testing and Verification

Use test-driven development and run only focused checks:

- Pure tests for external and internal drop parsing, invalid payload rejection,
  world-coordinate conversion, stacking, same-path repositioning, and storage
  validation.
- Render tests for file cards, the transformed content layer, drop semantics,
  and the right-details draggable file chip.
- Preload contract coverage for `webUtils.getPathForFile`.
- The existing Sherlock composer/workspace UI test, TypeScript check, patch
  integrity check, and `git diff --check`.
- Rebuild and sign `Sherlock Dev`, then verify in the packaged UI that a file
  dragged from the right details column lands at the pointer position, survives
  tab/session switching, follows pan and zoom, and does not become a composer
  attachment.

Do not run the full project test suite.

## Failure Handling

- Missing or malformed internal payload: ignore the drop and do not create a
  card.
- Finder file with no resolvable path: create a name-only card so the visible
  user action still succeeds, but do not claim it can be reopened later.
- Stale persisted path: keep the card visible; existence checks and opening are
  outside this increment.
- Storage read/write failure: keep the current in-memory nodes and avoid a
  canvas crash.
- Multiple global drop consumers: stop propagation only after Research confirms
  that it owns a valid file drop.
