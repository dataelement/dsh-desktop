# Research Canvas File Drop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users drop local files from Finder or Sherlock's right details column onto a session-persistent Research canvas at the pointer's world position.

**Architecture:** Keep file metadata and placement logic inside the conversation package's Research canvas, with a versioned local-storage record per session and one transformed world-content layer. Add a narrow preload adapter around Electron `webUtils.getPathForFile`, and make file-bearing right-details output publish a validated `application/x-sherlock-file` drag payload through the Tool package.

**Tech Stack:** Electron 43 preload/contextBridge, React 18, HTML Drag and Drop/DataTransfer, browser localStorage, patch-package 8, Vitest 4, Happy DOM, Electron Builder.

**Spec:** `docs/superpowers/specs/2026-08-25-research-canvas-file-drop-design.md`

## Global Constraints

- The internal MIME type is exactly `application/x-sherlock-file`.
- Persistence uses `sherlock.research.canvas.files.v1:<sessionId>` and stores only JSON-safe metadata.
- Finder path resolution uses `webUtils.getPathForFile`; do not add main-process filesystem IPC or read file contents.
- Accepted canvas drops stop propagation so the document-level composer image intake does not also attach them.
- File cards share the current viewport transform and remain aligned with the dotted grid during wheel pan, Space-drag pan, and Command-wheel zoom.
- The first increment adds and displays file cards only. Do not add opening, deletion, selection, linking, or independent card dragging.
- Persist dependency edits in patch-package files, not only in `node_modules`.
- Preserve unrelated working-tree changes and generated directories. Stage only the files named by each task.
- Run focused tests and packaged UI checks only; do not run the full project test suite.

---

## File Structure

- `src/preload/research-file-path.ts`: pure exception-safe adapter for Electron's DOM File path resolver.
- `src/preload/index.ts`: exposes `dshDesktop.getPathForFile(file)` through the existing frozen desktop bridge.
- `test/research-file-drop.test.ts`: focused bridge and pure canvas/drop-model contract tests.
- `test/sherlock-composer-workspace-ui.test.ts`: Research rendering, theme, composer isolation, and right-details drag-source integration coverage.
- `node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js`: installed Research canvas implementation used to regenerate its existing rc.7 patch.
- `patches/@deepseek-ai+dsh-client-ui-conversation+0.1.0-rc.7.patch`: durable Research canvas implementation.
- `node_modules/@deepseek-ai/dsh-client-ui-tool/lib/client.js`: installed right-details draggable file chip implementation.
- `patches/@deepseek-ai+dsh-client-ui-tool+0.1.0-rc.7.patch`: durable right-details drag-source implementation.

---

### Task 1: Safe Finder File Path Bridge

**Files:**
- Create: `src/preload/research-file-path.ts`
- Create: `test/research-file-drop.test.ts`
- Modify: `src/preload/index.ts:1-5,136-148`

**Interfaces:**
- Consumes: Electron `webUtils.getPathForFile(file: File): string`.
- Produces: `safePathForFile(file: File, resolve: (file: File) => unknown): string` and `window.dshDesktop.getPathForFile(file: File): string`.

- [ ] **Step 1: Write the failing preload contract test**

```ts
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'

type ClientBundle = Record<string, any>
type BundleDescriptor = {
  factory(require: (id: string) => unknown): ClientBundle
}

const requireModule = createRequire(import.meta.url)

function fakeModule(): unknown {
  let fake: unknown
  const target = function () {}
  fake = new Proxy(target, {
    get: () => fake,
    apply: () => fake,
    construct: () => ({})
  })
  return fake
}

async function loadClientBundle(
  packageName: string,
  modules: Record<string, unknown> = {}
): Promise<ClientBundle> {
  const source = await readFile(
    `node_modules/@deepseek-ai/${packageName}/lib/client.js`,
    'utf8'
  )
  const react = requireModule('react')
  const jsxRuntime = requireModule('react/jsx-runtime')
  let descriptor: BundleDescriptor | undefined

  runInNewContext(source, {
    window: {
      __ModuleLoader__: {
        load(value: BundleDescriptor) {
          descriptor = value
        }
      }
    },
    document: undefined
  })
  if (descriptor === undefined) throw new Error(`${packageName} did not register`)

  return descriptor.factory((id) => {
    if (modules[id] !== undefined) return modules[id]
    if (id === 'react') return react
    if (id === 'react/jsx-runtime') return jsxRuntime
    return fakeModule()
  })
}

const loadConversationClient = () =>
  loadClientBundle('dsh-client-ui-conversation')

describe('Research canvas file drops', () => {
  it('exposes Electron webUtils.getPathForFile through the existing desktop bridge', async () => {
    const preload = await readFile('src/preload/index.ts', 'utf8')

    expect(preload).toContain("import { contextBridge, ipcRenderer, webUtils } from 'electron'")
    expect(preload).toContain('getPathForFile: (file: File): string =>')
    expect(preload).toContain('safePathForFile(file, webUtils.getPathForFile)')
  })
})
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- --run test/research-file-drop.test.ts`

Expected: FAIL on the first missing `webUtils`/`getPathForFile` source contract.

- [ ] **Step 3: Add the smallest bridge implementation that satisfies the contract**

```ts
export type ElectronFilePathResolver = (file: File) => unknown

export function safePathForFile(file: File, resolve: ElectronFilePathResolver): string {
  return resolve(file) as string
}
```

Update the Electron import and existing `dshDesktop` object without adding IPC:

```ts
import { contextBridge, ipcRenderer, webUtils } from 'electron'
import { safePathForFile } from './research-file-path'

contextBridge.exposeInMainWorld(
  'dshDesktop',
  Object.freeze({
    restartHarness: (): Promise<{ ok: boolean }> => ipcRenderer.invoke('harness:restart'),
    showItemInFolder: (path: string): Promise<{ ok: boolean }> =>
      ipcRenderer.invoke('filesystem:show-item-in-folder', path),
    getPathForFile: (file: File): string => safePathForFile(file, webUtils.getPathForFile)
  })
)
```

- [ ] **Step 4: Run the contract test and verify GREEN**

Run: `npm test -- --run test/research-file-drop.test.ts`

Expected: the preload contract test PASS.

- [ ] **Step 5: Add the failing exception-safe behavior test**

Add the static import and behavior case:

```ts
import { safePathForFile } from '../src/preload/research-file-path'

it('returns a resolved Electron file path and safely absorbs resolver failures', () => {
  const file = { name: 'report.pdf' } as File

  expect(safePathForFile(file, () => '/tmp/report.pdf')).toBe('/tmp/report.pdf')
  expect(safePathForFile(file, () => undefined)).toBe('')
  expect(safePathForFile(file, () => { throw new Error('unavailable') })).toBe('')
})
```

- [ ] **Step 6: Run the behavior test and verify RED**

Run: `npm test -- --run test/research-file-drop.test.ts`

Expected: FAIL because the minimal adapter returns `undefined` and propagates a
resolver exception.

- [ ] **Step 7: Harden the adapter**

```ts
export function safePathForFile(file: File, resolve: ElectronFilePathResolver): string {
  try {
    const value = resolve(file)
    return typeof value === 'string' ? value : ''
  } catch {
    return ''
  }
}
```

- [ ] **Step 8: Verify GREEN and type safety**

Run: `npm test -- --run test/research-file-drop.test.ts && npm run typecheck`

Expected: all Research file-drop tests PASS and TypeScript exits 0.

- [ ] **Step 9: Commit only the bridge unit**

```bash
git add src/preload/research-file-path.ts src/preload/index.ts test/research-file-drop.test.ts
git commit -m "feat: expose safe research file paths"
```

---

### Task 2: Pure Drop Parsing, Placement, and Persistence Model

**Files:**
- Modify: `test/research-file-drop.test.ts`
- Modify: `node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js:7450-7560`
- Modify: `patches/@deepseek-ai+dsh-client-ui-conversation+0.1.0-rc.7.patch`

**Interfaces:**
- Consumes: file descriptors `{ path?: string; name: string; mediaType?: string; source: 'computer' | 'sherlock' }`, current `{ scale, x, y }` viewport, and drop-local pointer coordinates.
- Produces: `parseSherlockFileDrag(raw)`, `researchCanvasOwnsFileDrag(types)`, `researchCanvasDropFiles(transfer, getPathForFile)`, `researchCanvasWorldPoint(viewport, pointer)`, `placeResearchCanvasFiles(nodes, files, point, createId)`, `parseResearchCanvasFileNodes(raw)`, and `researchCanvasStorageKey(sessionId)`.

- [ ] **Step 1: Add failing tests for trusted parsing and invalid internal data**

```ts
it('parses only bounded Sherlock file drag payloads', async () => {
  const client = await loadConversationClient()
  expect(client.parseSherlockFileDrag).toBeTypeOf('function')
  if (typeof client.parseSherlockFileDrag !== 'function') return

  expect(client.parseSherlockFileDrag(
    '{"path":"/w/report.pdf","name":"report.pdf"}'
  )).toEqual({ path: '/w/report.pdf', name: 'report.pdf', source: 'sherlock' })
  expect(client.parseSherlockFileDrag('not-json')).toBeNull()
  expect(client.parseSherlockFileDrag('{"path":42,"name":"x"}')).toBeNull()
  expect(client.parseSherlockFileDrag(JSON.stringify({ name: 'x'.repeat(513) }))).toBeNull()
})
```

- [ ] **Step 2: Add failing tests for Finder and internal transfer precedence**

```ts
it('reads Finder files and gives the Sherlock MIME payload precedence', async () => {
  const client = await loadConversationClient()
  expect(client.researchCanvasDropFiles).toBeTypeOf('function')
  if (typeof client.researchCanvasDropFiles !== 'function') return
  const transfer = {
    files: [{ name: 'finder.pdf', type: 'application/pdf' }],
    getData: (type: string) => type === 'application/x-sherlock-file'
      ? '{"path":"/w/internal.md","name":"internal.md"}'
      : '',
    types: ['Files', 'application/x-sherlock-file']
  }

  expect(client.researchCanvasDropFiles(transfer, () => '/tmp/finder.pdf')).toEqual([
    { path: '/w/internal.md', name: 'internal.md', source: 'sherlock' }
  ])

  const finderTransfer = {
    files: [
      { name: 'local.pdf', type: 'application/pdf' },
      { name: 'README', type: '' }
    ],
    getData: () => '',
    types: ['Files']
  }
  const paths = ['/tmp/local.pdf', '']
  expect(client.researchCanvasDropFiles(
    finderTransfer,
    () => paths.shift() ?? ''
  )).toEqual([
    {
      path: '/tmp/local.pdf', name: 'local.pdf',
      mediaType: 'application/pdf', source: 'computer'
    },
    { name: 'README', source: 'computer' }
  ])
})
```

The same step adds ownership coverage so arbitrary selected text remains outside
the canvas contract:

```ts
it('owns only Finder files and the exact Sherlock MIME type', async () => {
  const client = await loadConversationClient()
  expect(client.researchCanvasOwnsFileDrag).toBeTypeOf('function')
  if (typeof client.researchCanvasOwnsFileDrag !== 'function') return

  expect(client.researchCanvasOwnsFileDrag(['Files'])).toBe(true)
  expect(client.researchCanvasOwnsFileDrag([
    'application/x-sherlock-file'
  ])).toBe(true)
  expect(client.researchCanvasOwnsFileDrag(['text/plain'])).toBe(false)
})
```

- [ ] **Step 3: Add failing tests for world placement, stacking, and same-path repositioning**

```ts
it('places dropped files in world coordinates and repositions a repeated path', async () => {
  const client = await loadConversationClient()
  expect(client.researchCanvasWorldPoint).toBeTypeOf('function')
  expect(client.placeResearchCanvasFiles).toBeTypeOf('function')
  if (typeof client.researchCanvasWorldPoint !== 'function' ||
      typeof client.placeResearchCanvasFiles !== 'function') return
  const point = client.researchCanvasWorldPoint(
    { scale: 2, x: 40, y: -20 },
    { x: 240, y: 180 }
  )
  expect(point).toEqual({ x: 100, y: 100 })

  const nodes = client.placeResearchCanvasFiles(
    [{ id: 'old', path: '/w/a.pdf', name: 'a.pdf', source: 'computer', x: 1, y: 2 }],
    [
      { path: '/w/a.pdf', name: 'a.pdf', source: 'computer' },
      { path: '/w/b.md', name: 'b.md', source: 'computer' }
    ],
    point,
    (() => { let n = 0; return () => `new-${++n}` })()
  )

  expect(nodes).toEqual([
    { id: 'old', path: '/w/a.pdf', name: 'a.pdf', source: 'computer', x: 100, y: 100 },
    { id: 'new-1', path: '/w/b.md', name: 'b.md', source: 'computer', x: 118, y: 118 }
  ])
})
```

- [ ] **Step 4: Add failing tests for versioned storage validation**

```ts
it('loads only finite, well-shaped persisted file nodes', async () => {
  const client = await loadConversationClient()
  expect(client.researchCanvasStorageKey).toBeTypeOf('function')
  expect(client.parseResearchCanvasFileNodes).toBeTypeOf('function')
  if (typeof client.researchCanvasStorageKey !== 'function' ||
      typeof client.parseResearchCanvasFileNodes !== 'function') return
  const valid = [{ id: '1', name: 'a.pdf', source: 'computer', x: 12, y: 24 }]

  expect(client.researchCanvasStorageKey('session-7')).toBe(
    'sherlock.research.canvas.files.v1:session-7'
  )
  expect(client.parseResearchCanvasFileNodes(JSON.stringify(valid))).toEqual(valid)
  expect(client.parseResearchCanvasFileNodes('[{"id":"1","name":"a","source":"computer","x":null,"y":2}]')).toEqual([])
  expect(client.parseResearchCanvasFileNodes('bad-json')).toEqual([])
})
```

- [ ] **Step 5: Run the model tests and verify RED**

Run: `npm test -- --run test/research-file-drop.test.ts`

Expected: FAIL on the first missing exported conversation helper.

- [ ] **Step 6: Implement constants, validation, parsing, and placement as pure functions**

Add near the existing Research viewport helpers:

```js
const SHERLOCK_FILE_DRAG_TYPE = "application/x-sherlock-file";
const RESEARCH_CANVAS_STORAGE_PREFIX = "sherlock.research.canvas.files.v1:";
const RESEARCH_CANVAS_FILE_STACK_OFFSET = 18;
const RESEARCH_CANVAS_TEXT_LIMIT = 512;
let researchCanvasFileSequence = 0;

function createResearchCanvasFileId() {
  researchCanvasFileSequence += 1;
  return globalThis.crypto?.randomUUID?.() ??
    `research-file-${Date.now()}-${researchCanvasFileSequence}`;
}

function boundedString(value, optional = false) {
  if (value === void 0 && optional) return void 0;
  return typeof value === "string" && value.length > 0 && value.length <= RESEARCH_CANVAS_TEXT_LIMIT ? value : null;
}

function parseSherlockFileDrag(raw) {
  try {
    const value = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return null;
    const name = boundedString(value.name);
    const path = boundedString(value.path, true);
    if (name === null || path === null) return null;
    return { ...(path === void 0 ? {} : { path }), name, source: "sherlock" };
  } catch {
    return null;
  }
}

function researchCanvasWorldPoint(viewport, pointer) {
  return {
    x: (pointer.x - viewport.x) / viewport.scale,
    y: (pointer.y - viewport.y) / viewport.scale
  };
}

function researchCanvasOwnsFileDrag(types) {
  return Array.from(types ?? []).includes("Files") ||
    Array.from(types ?? []).includes(SHERLOCK_FILE_DRAG_TYPE);
}

function researchCanvasDropFiles(transfer, getPathForFile) {
  const internal = parseSherlockFileDrag(transfer.getData?.(SHERLOCK_FILE_DRAG_TYPE) ?? "");
  if (internal !== null) return [internal];
  return Array.from(transfer.files ?? []).flatMap((file) => {
    const name = boundedString(file.name);
    if (name === null) return [];
    let resolved = "";
    try {
      resolved = getPathForFile(file);
    } catch {}
    const path = resolved === "" ? void 0 : boundedString(resolved, true);
    if (path === null) return [];
    const mediaType = file.type === "" ? void 0 : boundedString(file.type, true);
    if (mediaType === null) return [];
    return [{
      ...(path === void 0 ? {} : { path }),
      ...(mediaType === void 0 ? {} : { mediaType }),
      name,
      source: "computer"
    }];
  });
}

function placeResearchCanvasFiles(nodes, files, point, createId) {
  const next = nodes.slice();
  for (const [index, file] of files.entries()) {
    const position = {
      x: point.x + index * RESEARCH_CANVAS_FILE_STACK_OFFSET,
      y: point.y + index * RESEARCH_CANVAS_FILE_STACK_OFFSET
    };
    const found = file.path === void 0 ? -1 : next.findIndex((node) => node.path === file.path);
    if (found >= 0) next[found] = { ...next[found], ...file, ...position };
    else next.push({ id: createId(), ...file, ...position });
  }
  return next;
}

function researchCanvasStorageKey(sessionId) {
  return `${RESEARCH_CANVAS_STORAGE_PREFIX}${sessionId}`;
}

function validResearchCanvasFileNode(value) {
  if (typeof value !== "object" || value === null) return false;
  const source = value.source === "computer" || value.source === "sherlock";
  const optionalPath = value.path === void 0 || boundedString(value.path, true) !== null;
  const optionalMedia = value.mediaType === void 0 || boundedString(value.mediaType, true) !== null;
  return boundedString(value.id) !== null && boundedString(value.name) !== null &&
    source && optionalPath && optionalMedia && Number.isFinite(value.x) && Number.isFinite(value.y);
}

function parseResearchCanvasFileNodes(raw) {
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) && value.every(validResearchCanvasFileNode) ? value : [];
  } catch {
    return [];
  }
}
```

Export `createResearchCanvasFileId` alongside the other pure helpers so tests
can provide their own deterministic id factory while the component uses the
production factory.

- [ ] **Step 7: Export the pure helpers and verify GREEN**

Add the helpers to the bundle's existing exports, then run:

`npm test -- --run test/research-file-drop.test.ts test/sherlock-composer-workspace-ui.test.ts`

Expected: both focused files PASS.

- [ ] **Step 8: Persist the installed dependency change and commit**

```bash
npx patch-package @deepseek-ai/dsh-client-ui-conversation
git add test/research-file-drop.test.ts \
  patches/@deepseek-ai+dsh-client-ui-conversation+0.1.0-rc.7.patch
git commit -m "feat: model research canvas file drops"
```

---

### Task 3: Canvas Drop Surface, File Cards, and Session Persistence

**Files:**
- Modify: `test/sherlock-composer-workspace-ui.test.ts`
- Modify: `test/research-file-drop.test.ts`
- Modify: `node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js:7460-7650`
- Modify: `patches/@deepseek-ai+dsh-client-ui-conversation+0.1.0-rc.7.patch`

**Interfaces:**
- Consumes: Task 1 `window.dshDesktop.getPathForFile`, Task 2 drop/model helpers, standard session-scoped `sessionId`, and current Research viewport state.
- Produces: `ResearchCanvasFileCard`, one transformed `[data-research-content-layer]`, `[data-research-file-card]` nodes, and root-local accepted file drop handlers.

- [ ] **Step 1: Add a failing render test for the file card and content transform**

```ts
it('renders a compact file card inside the transformed Research world layer', async () => {
  const client = await loadClientBundle('dsh-client-ui-conversation')
  expect(client.ResearchCanvasFileCard).toBeTypeOf('function')
  expect(client.researchCanvasContentTransform).toBeTypeOf('function')
  if (typeof client.ResearchCanvasFileCard !== 'function' ||
      typeof client.researchCanvasContentTransform !== 'function') return
  const FileCard = client.ResearchCanvasFileCard as ComponentType<{
    node: { id: string; path: string; name: string; mediaType: string; source: string; x: number; y: number }
  }>

  const html = renderToStaticMarkup(createElement(FileCard, {
    node: {
      id: 'file-1', path: '/w/report.pdf', name: 'report.pdf',
      mediaType: 'application/pdf', source: 'computer', x: 120, y: 80
    }
  }))

  expect(html).toContain('data-research-file-card="file-1"')
  expect(html).toContain('report.pdf')
  expect(html).not.toContain('/w/report.pdf</')
  expect(client.researchCanvasContentTransform({ scale: 1.5, x: 30, y: -10 }))
    .toBe('translate(30px, -10px) scale(1.5)')
})
```

- [ ] **Step 2: Add a failing storage round-trip test with an exception-throwing storage stub**

```ts
it('round-trips nodes and keeps them usable when Research storage is unavailable', async () => {
  const client = await loadConversationClient()
  expect(client.loadResearchCanvasFiles).toBeTypeOf('function')
  expect(client.saveResearchCanvasFiles).toBeTypeOf('function')
  if (typeof client.loadResearchCanvasFiles !== 'function' ||
      typeof client.saveResearchCanvasFiles !== 'function') return
  const values = new Map<string, string>()
  const memoryStorage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) }
  }
  const nodes = [{
    id: '1', name: 'a.pdf', source: 'computer', x: 1, y: 2
  }]

  client.saveResearchCanvasFiles(memoryStorage, 's1', nodes)
  expect(client.loadResearchCanvasFiles(memoryStorage, 's1')).toEqual(nodes)

  const storage = {
    getItem: () => { throw new Error('denied') },
    setItem: () => { throw new Error('full') }
  }

  expect(client.loadResearchCanvasFiles(storage, 's1')).toEqual([])
  expect(() => client.saveResearchCanvasFiles(storage, 's1', [
    { id: '1', name: 'a.pdf', source: 'computer', x: 1, y: 2 }
  ])).not.toThrow()
})
```

- [ ] **Step 3: Add failing CSS assertions for theme-aware cards and drop feedback**

Extend the injected Research CSS test:

```ts
expect(researchCss).toContain('[data-file-drop-active=true]')
expect(researchCss).toContain('.rScV5Q_fileCard')
expect(researchCss).toContain('body[data-ds-dark-theme] .rScV5Q_fileCard')
```

- [ ] **Step 4: Run focused UI/model tests and verify RED**

Run: `npm test -- --run test/research-file-drop.test.ts test/sherlock-composer-workspace-ui.test.ts`

Expected: FAIL because the file-card component, content transform, safe storage
helpers, and drop-card CSS are absent.

- [ ] **Step 5: Implement safe storage and the static file card**

```js
function researchCanvasContentTransform(viewport) {
  return `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`;
}

function loadResearchCanvasFiles(storage, sessionId) {
  if (storage === null) return [];
  try {
    return parseResearchCanvasFileNodes(storage.getItem(researchCanvasStorageKey(sessionId)) ?? "[]");
  } catch {
    return [];
  }
}

function saveResearchCanvasFiles(storage, sessionId, nodes) {
  if (storage === null) return;
  try {
    storage.setItem(researchCanvasStorageKey(sessionId), JSON.stringify(nodes));
  } catch {}
}

function researchCanvasStorage() {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

function researchCanvasFileCaption(node) {
  const extension = /\.([^.]+)$/.exec(node.name)?.[1];
  if (extension !== void 0) return extension.slice(0, 12).toUpperCase();
  const media = node.mediaType?.split("/").at(-1);
  if (media !== void 0 && media !== "") return media.slice(0, 12).toUpperCase();
  return node.source === "sherlock" ? "SHERLOCK" : "FILE";
}

function ResearchCanvasFileCard({ node }) {
  return (0, react_jsx_runtime.jsxs)("div", {
    className: "rScV5Q_fileCard",
    "data-research-file-card": node.id,
    title: node.path ?? node.name,
    style: {
      left: `${node.x}px`,
      top: `${node.y}px`,
      transform: "translate(-50%, -50%)"
    },
    children: [
      (0, react_jsx_runtime.jsx)("svg", {
        className: "rScV5Q_fileIcon",
        viewBox: "0 0 20 20",
        "aria-hidden": true,
        children: (0, react_jsx_runtime.jsx)("path", {
          d: "M4.5 2.5h6l5 5v10h-11zM10.5 2.5v5h5",
          fill: "none",
          stroke: "currentColor",
          strokeWidth: "1.4",
          strokeLinejoin: "round"
        })
      }),
      (0, react_jsx_runtime.jsxs)("span", {
        className: "rScV5Q_fileText",
        children: [
          (0, react_jsx_runtime.jsx)("span", {
            className: "rScV5Q_fileName",
            children: node.name
          }),
          (0, react_jsx_runtime.jsx)("span", {
            className: "rScV5Q_fileCaption",
            children: researchCanvasFileCaption(node)
          })
        ]
      })
    ]
  });
}
```

Append these exact responsibilities to the Research CSS string (keep current
grid, theme, composer, divider, pan, and focus rules intact):

```css
.rScV5Q_contentLayer{pointer-events:none;transform-origin:0 0;position:absolute;inset:0}
.rScV5Q_fileCard{box-sizing:border-box;pointer-events:auto;width:220px;min-height:64px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:10px;align-items:center;gap:10px;padding:11px 12px;display:flex;position:absolute;box-shadow:var(--dsw-shadow-lv1)}
.rScV5Q_fileIcon{color:var(--dsw-alias-state-business-primary);flex:none;width:20px;height:20px}
.rScV5Q_fileText{min-width:0;display:flex;flex-direction:column;gap:2px}
.rScV5Q_fileName{text-overflow:ellipsis;white-space:nowrap;overflow:hidden;font:var(--dsw-font-xs-strong-13)}
.rScV5Q_fileCaption{color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxs-12)}
.rScV5Q_root[data-file-drop-active=true]{box-shadow:inset 0 0 0 2px color-mix(in srgb,var(--dsw-alias-state-business-primary) 55%,transparent)}
body[data-ds-dark-theme] .rScV5Q_fileCard{background:var(--dsw-alias-bg-layer-2)}
```

- [ ] **Step 6: Add the content layer and session-scoped state**

Change `ResearchCanvas` to accept the session-scoped `sessionId`, lazily load
nodes, and persist after state changes. The `conversation.view` seat is already
session-scoped, so switching sessions remounts this view and runs the lazy load
against the new key; switching away from and back to Research restores from the
same key:

```js
function ResearchCanvas({ sessionId, t }) {
  const storageRef = react.useRef(researchCanvasStorage());
  const [files, setFiles] = react.useState(() =>
    loadResearchCanvasFiles(storageRef.current, sessionId)
  );

  react.useEffect(() => {
    saveResearchCanvasFiles(storageRef.current, sessionId, files);
  }, [files, sessionId]);
```

Render a child `[data-research-content-layer]` with
`transform: researchCanvasContentTransform(viewport)` and map file nodes to
`ResearchCanvasFileCard`. Set `transform-origin: 0 0` and keep the layer
absolute over the infinite canvas.

```js
children: (0, react_jsx_runtime.jsx)("div", {
  className: "rScV5Q_contentLayer",
  "data-research-content-layer": "",
  style: { transform: researchCanvasContentTransform(viewport) },
  children: files.map((node) => (0, react_jsx_runtime.jsx)(
    ResearchCanvasFileCard,
    { node },
    node.id
  ))
})
```

- [ ] **Step 7: Add root-local accepted drop listeners**

Inside the existing Research effect, add drag-depth tracking and these rules:

```js
const ownsFileDrag = (event) =>
  researchCanvasOwnsFileDrag(event.dataTransfer?.types);

const onDrop = (event) => {
  if (!ownsFileDrag(event) || event.dataTransfer === null) return;
  const dropped = researchCanvasDropFiles(
    event.dataTransfer,
    (file) => window.dshDesktop?.getPathForFile?.(file) ?? ""
  );
  if (dropped.length === 0) return;
  event.preventDefault();
  event.stopPropagation();
  const bounds = root.getBoundingClientRect();
  const point = researchCanvasWorldPoint(viewportRef.current, {
    x: event.clientX - bounds.left,
    y: event.clientY - bounds.top
  });
  setFiles((current) => placeResearchCanvasFiles(
    current, dropped, point, createResearchCanvasFileId
  ));
  resetFileDrag();
};
```

Use a `viewportRef` synchronized during render so the native listener reads the
latest pan/zoom without re-registering. Add/remove `dragenter`, `dragover`,
`dragleave`, and `drop` listeners on the root, reset the highlight on window
blur/dragend and cleanup, and only call `stopPropagation` after a valid parsed
drop is owned. For accepted `dragenter` and `dragover`, call both
`preventDefault()` and `stopPropagation()`, set `dropEffect = "copy"`, and add
`data-file-drop-active="true"`; this prevents the document-level composer from
showing its attachment overlay while the pointer remains over Research.
Accepted `dragleave` also stops propagation and removes the attribute only when
the root-local drag depth returns to zero. Unrecognized drags do not prevent or
stop anything and continue bubbling normally.

- [ ] **Step 8: Verify GREEN and composer isolation contracts**

Run:

`npm test -- --run test/research-file-drop.test.ts test/sherlock-composer-workspace-ui.test.ts`

Expected: all focused tests PASS, including existing composer-background,
theme, zoom, Space-pan, and wheel-pan cases.

- [ ] **Step 9: Regenerate the conversation patch and commit**

```bash
npx patch-package @deepseek-ai/dsh-client-ui-conversation
git add test/research-file-drop.test.ts test/sherlock-composer-workspace-ui.test.ts \
  patches/@deepseek-ai+dsh-client-ui-conversation+0.1.0-rc.7.patch
git commit -m "feat: render persistent research file cards"
```

---

### Task 4: Draggable File Source in the Right Details Column

**Files:**
- Modify: `test/research-file-drop.test.ts`
- Modify: `node_modules/@deepseek-ai/dsh-client-ui-tool/lib/client.js:930-1030`
- Create: `patches/@deepseek-ai+dsh-client-ui-tool+0.1.0-rc.7.patch`

**Interfaces:**
- Consumes: file-specific `toolRowModel(...).filePath`, details `cwd`, and `resolveWorkspacePath(cwd, path)` already imported by the Tool bundle.
- Produces: `writeSherlockFileDrag(dataTransfer, descriptor)`, `sherlockDetailsFileDescriptor(filePath, cwd)`, and one `[data-sherlock-file-drag-source]` chip in file-bearing Tool details.

- [ ] **Step 1: Add failing tests for the internal drag payload writer**

```ts
it('writes the exact Sherlock file MIME payload with copy semantics', async () => {
  const client = await loadClientBundle('dsh-client-ui-tool')
  expect(client.writeSherlockFileDrag).toBeTypeOf('function')
  if (typeof client.writeSherlockFileDrag !== 'function') return
  const writes: Array<[string, string]> = []
  const transfer = {
    effectAllowed: 'none',
    setData(type: string, value: string) { writes.push([type, value]) }
  }

  client.writeSherlockFileDrag(transfer, {
    path: '/w/report.pdf',
    name: 'report.pdf'
  })

  expect(transfer.effectAllowed).toBe('copy')
  expect(writes).toEqual([[
    'application/x-sherlock-file',
    '{"path":"/w/report.pdf","name":"report.pdf"}'
  ]])
})
```

- [ ] **Step 2: Add a failing descriptor test for relative workspace paths**

```ts
it('resolves right-details relative paths before dragging', async () => {
  const client = await loadClientBundle('dsh-client-ui-tool', {
    '@deepseek-ai/dsh-client-runtime/client': {
      resolveWorkspacePath: (cwd: string, path: string) => `${cwd}/${path}`,
      shallowEqual: Object.is
    }
  })
  expect(client.sherlockDetailsFileDescriptor).toBeTypeOf('function')
  if (typeof client.sherlockDetailsFileDescriptor !== 'function') return

  expect(client.sherlockDetailsFileDescriptor('outputs/report.pdf', '/w')).toEqual({
    path: '/w/outputs/report.pdf',
    name: 'report.pdf'
  })
})
```

- [ ] **Step 3: Add a failing render test for the right-details drag chip**

```ts
it('renders a draggable file chip for a file-bearing details block', async () => {
  const client = await loadClientBundle('dsh-client-ui-tool', {
    '@deepseek-ai/dsh-client-runtime/client': {
      resolveWorkspacePath: (cwd: string, path: string) => `${cwd}/${path}`,
      shallowEqual: Object.is
    }
  })
  expect(client.ToolDetails).toBeTypeOf('function')
  if (typeof client.ToolDetails !== 'function') return
  const react = requireModule('react') as typeof import('react')
  const { renderToStaticMarkup } = requireModule('react-dom/server') as {
    renderToStaticMarkup(node: unknown): string
  }

  const html = renderToStaticMarkup(react.createElement(client.ToolDetails, {
    block: {
      callId: 'call-read',
      name: 'read',
      argsRaw: '{"path":"outputs/report.pdf"}'
    },
    cwd: '/w',
    t: (key: string) => key
  }))

  expect(html).toContain('draggable="true"')
  expect(html).toContain('data-sherlock-file-drag-source="/w/outputs/report.pdf"')
  expect(html).toContain('>report.pdf</span>')
})
```

- [ ] **Step 4: Run the focused test and verify RED**

Run: `npm test -- --run test/research-file-drop.test.ts`

Expected: FAIL because the Tool drag descriptor, writer, and details component
are not exported and the draggable chip does not exist.

- [ ] **Step 5: Implement the descriptor, writer, CSS, and details chip**

Add:

```js
const SHERLOCK_FILE_DRAG_TYPE = "application/x-sherlock-file";

function sherlockDetailsFileDescriptor(filePath, cwd) {
  const resolved = cwd === void 0 || cwd === "" || /^(?:[/\\]|[A-Za-z]:[/\\])/.test(filePath)
    ? filePath
    : (0, _deepseek_ai_dsh_client_runtime_client.resolveWorkspacePath)(cwd, filePath);
  return {
    path: resolved,
    name: filePath.split(/[/\\]/).filter(Boolean).at(-1) ?? filePath
  };
}

function writeSherlockFileDrag(dataTransfer, descriptor) {
  dataTransfer.effectAllowed = "copy";
  dataTransfer.setData(SHERLOCK_FILE_DRAG_TYPE, JSON.stringify(descriptor));
}
```

Rename the current early-return implementation to `ToolDetailsOutput`. Add a
new `ToolDetails` wrapper that derives `filePath` once with
`toolRowModel(callName(block), block, cwd)`, renders the optional chip, and then
renders `ToolDetailsOutput` with the original props. This keeps every existing
terminal/read/diff/search/web/generic output branch unchanged.

When `filePath` is present, render this compact draggable chip before the
structured output. Keep `ToolDetails` exported with the two helper functions so
the focused bundle test exercises the same component registered into
`conversation.details.tool`:

```js
const descriptor = filePath === void 0 ? null : sherlockDetailsFileDescriptor(filePath, cwd);

const fileDragChip = descriptor === null ? null : (0, react_jsx_runtime.jsxs)("div", {
  className: ToolDetails_module_css_default.fileDrag,
  draggable: true,
  "data-sherlock-file-drag-source": descriptor.path,
  title: descriptor.path,
  onDragStart: (event) => writeSherlockFileDrag(event.dataTransfer, descriptor),
  children: [
    (0, react_jsx_runtime.jsx)("svg", {
      viewBox: "0 0 16 16",
      width: "14",
      height: "14",
      "aria-hidden": true,
      children: (0, react_jsx_runtime.jsx)("path", {
        d: "M3.5 1.5h5l4 4v9h-9zM8.5 1.5v4h4",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "1.2",
        strokeLinejoin: "round"
      })
    }),
    (0, react_jsx_runtime.jsx)("span", { children: descriptor.name })
  ]
});
```

The wrapper body is:

```js
return (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, {
  children: [
    fileDragChip,
    (0, react_jsx_runtime.jsx)(ToolDetailsOutput, { block, cwd, t })
  ]
});
```

Add `fileDrag: "xDAfVq_fileDrag"` to the Tool details CSS-module map and append:

```css
.xDAfVq_fileDrag{box-sizing:border-box;width:100%;min-width:0;height:32px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:7px;align-items:center;gap:7px;margin:0 0 10px;padding:0 9px;display:flex;cursor:grab}
.xDAfVq_fileDrag:active{cursor:grabbing}
.xDAfVq_fileDrag:focus{outline:none}
.xDAfVq_fileDrag span{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}
```

- [ ] **Step 6: Export the helpers and `ToolDetails`, then verify GREEN**

Run:

`npm test -- --run test/research-file-drop.test.ts test/sherlock-composer-workspace-ui.test.ts`

Expected: both focused files PASS.

- [ ] **Step 7: Create the Tool patch and commit only this unit**

```bash
npx patch-package @deepseek-ai/dsh-client-ui-tool
git add test/research-file-drop.test.ts \
  patches/@deepseek-ai+dsh-client-ui-tool+0.1.0-rc.7.patch
git commit -m "feat: drag files from Sherlock details"
```

---

### Task 5: Patch Integrity, Signed Package, and Real Interaction Verification

**Files:**
- Verify: `patches/@deepseek-ai+dsh-client-ui-conversation+0.1.0-rc.7.patch`
- Verify: `patches/@deepseek-ai+dsh-client-ui-tool+0.1.0-rc.7.patch`
- Verify: `dist-dev/mac-arm64/Sherlock Dev.app`

**Interfaces:**
- Consumes: all previous task outputs.
- Produces: a replayable dependency install, passing focused gates, a signed running Dev app, and user-visible evidence for internal and Finder file drops.

- [ ] **Step 1: Verify both patches contain the required production contracts**

Run:

```bash
rg -n "application/x-sherlock-file|researchCanvasDropFiles|data-research-file-card|getPathForFile|data-sherlock-file-drag-source" \
  patches/@deepseek-ai+dsh-client-ui-conversation+0.1.0-rc.7.patch \
  patches/@deepseek-ai+dsh-client-ui-tool+0.1.0-rc.7.patch \
  src/preload/index.ts
```

Expected: every named contract appears in its durable source/patch.

- [ ] **Step 2: Run the complete focused verification set**

Run:

```bash
npm test -- --run test/research-file-drop.test.ts test/sherlock-composer-workspace-ui.test.ts
npm run typecheck
git diff --check
```

Expected: focused tests PASS, typecheck exits 0, and diff check prints nothing.

- [ ] **Step 3: Verify the installed bundles exactly carry both durable patches**

Use Git's reverse-check against the currently patched dependency files. This
does not rewrite the shared `node_modules` tree:

```bash
git apply --check --reverse patches/@deepseek-ai+dsh-client-ui-conversation+0.1.0-rc.7.patch
git apply --check --reverse patches/@deepseek-ai+dsh-client-ui-tool+0.1.0-rc.7.patch
```

Expected: both reverse checks exit 0, proving the installed rc.7 bundles match
the patched state represented by the durable files. Rerun the focused tests
after these checks.

- [ ] **Step 4: Build, sign, launch, and verify the Dev application**

Run: `./script/build_and_run.sh --verify`

Expected: exit 0 and `Sherlock Dev is running.` Verify the running child uses
the newly packaged `dist-dev/mac-arm64/Sherlock Dev.app` resources.

- [ ] **Step 5: Verify the right-details drag path in the isolated browser**

Using the newest loopback port from the running packaged app:

1. Open a disposable session containing a read/write/edit tool result.
2. Open that tool's right details column and confirm the draggable file chip is
   present with `data-sherlock-file-drag-source`.
3. Switch to Research and drag the chip to an empty canvas position.
4. Confirm one `[data-research-file-card]` appears at that position.
5. Switch to Chat and back to Research; confirm the same card remains.
6. Wheel-pan and Command-wheel zoom; confirm the card and grid move together.
7. Confirm the composer attachment count and draft are unchanged.

- [ ] **Step 6: Verify a Finder drop in the packaged Electron window**

Create a disposable small text fixture outside the repository's tracked files,
drag it from Finder into the Research canvas, and verify a second card appears
at the drop position. Confirm no composer attachment appears. Remove only the
disposable fixture after verification; do not delete any user file or canvas
record.

- [ ] **Step 7: Verify persistence and theme visuals**

Reload or restart the Dev app and confirm both cards restore for the same
session. Inspect light and dark themes for readable card border, icon, basename,
caption, drop feedback, no top divider gap, no composer gradient obstruction,
and no orange canvas outline.

- [ ] **Step 8: Capture final repository evidence without staging unrelated work**

Run:

```bash
git status --short
git diff --stat -- \
  src/preload/index.ts src/preload/research-file-path.ts \
  test/research-file-drop.test.ts test/sherlock-composer-workspace-ui.test.ts \
  patches/@deepseek-ai+dsh-client-ui-conversation+0.1.0-rc.7.patch \
  patches/@deepseek-ai+dsh-client-ui-tool+0.1.0-rc.7.patch
git diff --check
```

Expected: only requested implementation files are included in the feature
evidence; existing unrelated modifications and generated directories remain
untouched.

- [ ] **Step 9: Commit any remaining verification-only tracked changes**

If no tracked implementation changes remain, skip this commit. Otherwise stage
only the exact feature files listed above and run:

```bash
git commit -m "test: verify research canvas file drops"
```
