# Research Canvas Downloads Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a download action to every Research canvas component, preserve original files where available, and export mind maps as PPT-ready SVG, PNG, or JPG.

**Architecture:** Introduce a narrow main-process save service that validates format-specific payloads and resolves original files through the existing preview authorization registry. Build deterministic, testable export descriptors in the Research UI patch; generate mind-map vector output from the parsed tree and rasterize that controlled SVG at 2× only when PNG or JPG is selected.

**Tech Stack:** Electron 43 native dialogs, Node.js filesystem APIs, TypeScript 5.9, React bundle patch, browser SVG/Canvas APIs, Vitest, Happy DOM, patch-package.

**Spec:** `docs/superpowers/specs/2026-09-01-research-canvas-title-resize-download-design.md`

## Global Constraints

- Every node context menu contains download; the action targets only the right-clicked node.
- Local file exports resolve through `authorizationId`, `sessionId`, and `nodeId`; the renderer never supplies an arbitrary source path.
- Mind-map SVG, PNG, and JPG contain only the final map content on a white background, exclude component chrome, use safe padding, and preserve the approved blue/cyan palette and company PPT typography.
- PNG and JPG render at exactly 2× logical dimensions; JPG quality is `0.92`.
- Link and web-container exports are `.webloc`; summaries and other text are Markdown; charts are SVG; tables are CSV; KPI is Markdown; unfinished containers are TXT.
- Do not build or replace the shared Sherlock client from the feature worktree. Run only focused tests, type checking, build verification, and patch replay checks.

---

### Task 1: Resolve original files and save validated export payloads

**Files:**
- Modify: `src/main/state/research-file-preview.ts`
- Create: `src/main/state/research-canvas-export.ts`
- Create: `src/preload/research-canvas-export.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/main/index.ts`
- Modify: `test/research-file-preview.test.ts`
- Create: `test/research-canvas-export.test.ts`

**Interfaces:**
- Consumes: persisted preview authorization records from `ResearchFilePreviewRegistry`.
- Produces: `resolveExportSource(value): Promise<{ path: string; name: string } | null>`, `registerResearchCanvasExportHandlers(options): void`, and `window.dshDesktop.researchCanvasExport.save(request)`.

- [ ] **Step 1: Write failing authorization-resolution tests**

Add cases proving only the exact active authorization can be exported:

```ts
await expect(registry.resolveExportSource({
  sessionId: 'session-1', nodeId: 'node-1', authorizationId: descriptor.authorizationId
})).resolves.toEqual({ path: await realpath(filePath), name: 'report.pdf' })

await expect(registry.resolveExportSource({
  sessionId: 'session-1', nodeId: 'other-node', authorizationId: descriptor.authorizationId
})).resolves.toBeNull()
```

Cover revoked authorization, missing file, path moved outside its authorized root, and a directory replacing the file.

- [ ] **Step 2: Write failing save-service tests**

Define exact request variants:

```ts
export type ResearchCanvasExportRequest =
  | { kind: 'original'; sessionId: string; nodeId: string; authorizationId: string; suggestedName: string }
  | { kind: 'text'; format: 'md' | 'csv' | 'txt' | 'svg'; suggestedName: string; content: string }
  | { kind: 'binary'; format: 'png' | 'jpg'; suggestedName: string; base64: string }
  | { kind: 'webloc'; suggestedName: string; url: string }
```

Test exact-key validation, extension enforcement, filename cleaning, URL protocol rejection, text and binary size limits, save cancellation, write failure, original-file copying, and a trusted-main-frame-only IPC handler.

- [ ] **Step 3: Run tests and verify RED**

Run:

```bash
npx vitest run test/research-file-preview.test.ts test/research-canvas-export.test.ts
```

Expected: FAIL because export resolution and the save service do not exist.

- [ ] **Step 4: Implement secure original-file resolution**

Add this public registry method without exposing the record map:

```ts
async resolveExportSource(value: unknown): Promise<{ path: string; name: string } | null> {
  const request = validExportResolution(value)
  if (request === null) return null
  const record = this.authorizations.get(request.authorizationId)
  if (!record || record.sessionId !== request.sessionId || record.nodeId !== request.nodeId) return null
  if (!await this.verifyRecord(record)) return null
  return { path: await this.fileSystem.realpath(record.path), name: record.name }
}
```

Keep validation exact and bounded like the existing restore request.

- [ ] **Step 5: Implement the native save service and preload bridge**

Validate payloads before opening `dialog.showSaveDialog`. Enforce format-to-extension mapping in main, create `.webloc` content in main from the normalized HTTP(S) URL, decode raster base64 only after checking its encoded length, and write with `node:fs/promises`.

Return only:

```ts
type ResearchCanvasExportResult =
  | { status: 'saved' }
  | { status: 'cancelled' }
  | { status: 'error'; message: string }
```

Register `research:canvas-export:save` through `registerTrustedMainWindowHandler`. Expose a frozen `researchCanvasExport.save` preload method; do not expose `dialog`, `writeFile`, `copyFile`, or saved paths.

- [ ] **Step 6: Run focused service tests and commit**

Run:

```bash
npx vitest run test/research-file-preview.test.ts test/research-canvas-export.test.ts test/ipc-trust.test.ts
npm run typecheck
git add src/main/state/research-file-preview.ts src/main/state/research-canvas-export.ts src/preload/research-canvas-export.ts src/preload/index.ts src/main/index.ts test/research-file-preview.test.ts test/research-canvas-export.test.ts
git commit -m '功能：新增研究组件安全下载服务'
```

Expected: focused tests and type checking PASS.

---

### Task 2: Build type-aware export descriptors

**Files:**
- Modify: `node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js`
- Modify: `test/sherlock-composer-workspace-ui.test.ts`

**Interfaces:**
- Consumes: file nodes, artifact nodes, session identity, and Task 1 preload bridge.
- Produces: pure helpers `researchCanvasExportDescriptor(node, sessionId)`, `researchCanvasExportFileName(title, extension)`, and `buildResearchContainerChartSvg(spec)`.

- [ ] **Step 1: Write failing format-mapping tests**

Export the helper from the client bundle and assert exact mappings:

```ts
expect(researchCanvasExportDescriptor(pdfNode, 's1')).toMatchObject({ kind: 'original', authorizationId: 'authorization_1' })
expect(researchCanvasExportDescriptor(webLinkNode, 's1')).toMatchObject({ kind: 'webloc', url: 'https://example.com/' })
expect(researchCanvasExportDescriptor(summaryNode, 's1')).toMatchObject({ kind: 'text', format: 'md' })
expect(researchCanvasExportDescriptor(tableContainer, 's1')).toMatchObject({ kind: 'text', format: 'csv' })
expect(researchCanvasExportDescriptor(failedContainer, 's1')).toMatchObject({ kind: 'text', format: 'txt' })
```

Cover assistant result/excerpt, generated summary, completed and unfinished mind maps, chart, KPI, Markdown, web container, and file nodes without authorization. Assert CSV escaping for commas, quotes, CRLF, and embedded newlines. A completed mind map returns a format-choice descriptor; an unfinished or failed mind map returns TXT with its current state rather than attempting to rasterize nonexistent content.

Add a chart SVG assertion:

```ts
const chartSvg = buildResearchContainerChartSvg({
  version: 1, type: 'chart', title: '收入趋势', variant: 'line',
  labels: ['一月', '二月'], series: [{ name: '收入', values: [10, 12] }]
})
expect(chartSvg).toContain('<svg')
expect(chartSvg).toContain('收入趋势')
expect(chartSvg).toContain('rgb(0,80,150)')
expect(chartSvg).not.toMatch(/script|foreignObject|var\(--/)
```

- [ ] **Step 2: Run the descriptor tests and verify RED**

Run:

```bash
npx vitest run test/sherlock-composer-workspace-ui.test.ts -t 'export descriptor|download format|CSV'
```

Expected: FAIL because the export helpers are absent.

- [ ] **Step 3: Implement deterministic filename and format mapping**

Normalize filenames by decoding safe percent escapes, removing control characters and `/\\:*?"<>|`, trimming trailing spaces/dots, bounding the stem to 120 characters, and using the component type when empty.

Build `.webloc` in main, but pass only normalized URL and title from the renderer. Generate Markdown with a single `# title` heading followed by content. Generate table CSV with RFC-style doubled quotes and CRLF rows. Generate KPI Markdown as a heading and one bullet per label/value/change. Generate failed/draft task TXT with status, saved prompt, and available error text.

Build chart SVG from the validated chart spec rather than serializing browser DOM. Use the same fixed view box, axes, labels, palette, and line/bar geometry as `ResearchContainerChart`; resolve all colors and fonts to literal SVG attributes, add a white background, escape title/labels/series names, and omit scripts, CSS variables, external references, and `foreignObject`.

- [ ] **Step 4: Run descriptor tests and commit**

Run:

```bash
npx vitest run test/sherlock-composer-workspace-ui.test.ts -t 'export descriptor|download format|CSV'
npx patch-package @deepseek-ai/dsh-client-ui-conversation
git add patches/@deepseek-ai+dsh-client-ui-conversation+0.1.0-rc.7.patch test/sherlock-composer-workspace-ui.test.ts
git commit -m '功能：按组件类型生成下载描述'
```

Expected: descriptor and chart SVG tests PASS and the implementation is reproducible through the canonical patch.

---

### Task 3: Generate PPT-ready mind-map SVG, PNG, and JPG

**Files:**
- Modify: `node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js`
- Modify: `test/sherlock-composer-workspace-ui.test.ts`

**Interfaces:**
- Consumes: existing `parseResearchMindMap(text, detail)` tree.
- Produces: `buildResearchMindMapSvg(text, detail, measureText)` and `rasterizeResearchMindMapSvg(svg, width, height, format)`.

- [ ] **Step 1: Write failing vector-layout tests**

Use an injected deterministic `measureText` function and assert:

```ts
const result = buildResearchMindMapSvg('# 中心主题\n- 分支一\n  - 结论一\n- 分支二', 'brief', (text) => text.length * 14)
expect(result).toMatchObject({ width: expect.any(Number), height: expect.any(Number) })
expect(result.svg).toContain('<rect width="100%" height="100%" fill="#ffffff"')
expect(result.svg).toContain('rgb(0,80,150)')
expect(result.svg).toContain('rgb(0,120,180)')
expect(result.svg).toContain('rgb(30,185,225)')
expect(result.svg).toContain('STHeiti_YFD')
expect(result.svg).not.toMatch(/foreignObject|script|shadow|rx=/)
```

Assert connectors terminate on node edges, long Chinese text wraps without a one-character final line where a balanced split is possible, complete sentences are left-aligned, phrases are centered, depth is preserved, and all content remains inside 24 px safe padding.

- [ ] **Step 2: Write failing raster tests**

Inject fake `Image`, canvas, and `toBlob` adapters. Assert PNG uses `image/png`, JPG uses `image/jpeg` and quality `.92`, canvas dimensions equal `logicalWidth * 2` and `logicalHeight * 2`, and a white rectangle is painted before the SVG image.

- [ ] **Step 3: Run mind-map export tests and verify RED**

Run:

```bash
npx vitest run test/sherlock-composer-workspace-ui.test.ts -t 'mind map export|SVG|PNG|JPG'
```

Expected: FAIL because vector generation and rasterization are absent.

- [ ] **Step 4: Implement deterministic tree layout and SVG serialization**

Measure and wrap labels using the existing sentence/phrase classification. Use fixed non-rounded rectangles, no shadows, 1.2 px gray connectors, white text for the first three blue/cyan levels, and dark text on lighter fallback colors. Compute each subtree height bottom-up, then place the parent at the vertical center of its children. Connect each parent right edge to each child left edge with orthogonal paths.

Use the approved primary palette:

```js
const RESEARCH_MIND_MAP_EXPORT_COLORS = [
  'rgb(0,80,150)', 'rgb(0,120,180)', 'rgb(30,185,225)',
  'rgb(179,235,255)', 'rgb(193,198,200)', 'rgb(255,200,25)'
]
```

Escape every text node for XML. Return `{ svg, width, height }`, where the root SVG has explicit `width`, `height`, and `viewBox`, plus a white background rectangle.

- [ ] **Step 5: Implement 2× PNG/JPG rasterization**

Create a Blob URL for the controlled SVG, load it into an image, paint white, scale by 2, draw, then obtain a Blob. Revoke the Blob URL in `finally`. Convert the result to base64 only after checking the output size against the preload service limit.

- [ ] **Step 6: Run export tests and commit**

Run:

```bash
npx vitest run test/sherlock-composer-workspace-ui.test.ts -t 'mind map export|SVG|PNG|JPG'
npx patch-package @deepseek-ai/dsh-client-ui-conversation
git add patches/@deepseek-ai+dsh-client-ui-conversation+0.1.0-rc.7.patch test/sherlock-composer-workspace-ui.test.ts
git commit -m '功能：思维导图支持矢量与图片下载'
```

Expected: SVG and raster export tests PASS and the implementation is reproducible through the canonical patch.

---

### Task 4: Add download to every component context menu

**Files:**
- Modify: `node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js`
- Modify: `test/sherlock-composer-workspace-ui.test.ts`

**Interfaces:**
- Consumes: Task 1 save bridge, Task 2 descriptors, and Task 3 mind-map exporters.
- Produces: right-click download actions, a three-format mind-map submenu, and non-blocking download status/error feedback.

- [ ] **Step 1: Write failing context-menu tests for every node family**

Mount one file and every artifact kind, right-click each node, and assert `[data-research-context-download]` exists. For a completed mind map, hover or click download and assert three menu items:

```ts
expect(host.querySelector('[data-research-download-format="svg"]')).not.toBeNull()
expect(host.querySelector('[data-research-download-format="png"]')).not.toBeNull()
expect(host.querySelector('[data-research-download-format="jpg"]')).not.toBeNull()
```

Assert a non-mind-map calls `researchCanvasExport.save` once with the right-clicked node descriptor even if other nodes remain selected. Assert cancel is silent, save success shows a short status, and an error renders a component-adjacent retryable message without changing workspace content.

- [ ] **Step 2: Run context-menu tests and verify RED**

Run:

```bash
npx vitest run test/sherlock-composer-workspace-ui.test.ts -t 'context download|download menu|download error'
```

Expected: FAIL because download controls and bridge calls are absent.

- [ ] **Step 3: Implement context-node resolution and direct exports**

Replace the assistant-only `contextArtifact` lookup with a `contextNode` lookup across files and artifacts. Insert download between rename/edit and remove. Direct formats build a descriptor and call the save bridge. Keep the clicked `nodeId` captured before closing the menu so selection changes cannot redirect the export.

- [ ] **Step 4: Implement the mind-map format submenu and status feedback**

Open a child menu aligned to the parent download row. SVG calls the vector generator directly; PNG/JPG await rasterization before calling the bridge. While conversion or save is active, disable only that node's download choices. Close menus on Escape or outside click.

Render `role="status"` for success and `role="alert"` for errors near the target component, with 12–13 px text and current theme colors. Remove success automatically after 2.4 seconds; retain errors until retry, another action, or dismissal.

- [ ] **Step 5: Run context-menu tests and commit**

Run:

```bash
npx vitest run test/sherlock-composer-workspace-ui.test.ts -t 'context download|download menu|download error'
npx patch-package @deepseek-ai/dsh-client-ui-conversation
git add patches/@deepseek-ai+dsh-client-ui-conversation+0.1.0-rc.7.patch test/sherlock-composer-workspace-ui.test.ts
git commit -m '功能：所有研究组件增加下载入口'
```

Expected: focused UI tests PASS and the implementation is reproducible through the canonical patch.

---

### Task 5: Replay the canonical patch and verify downloads

**Files:**
- Verify: `patches/@deepseek-ai+dsh-client-ui-conversation+0.1.0-rc.7.patch`
- Verify: all files changed in Tasks 1–4

**Interfaces:**
- Consumes: completed type-aware download implementation.
- Produces: a replayable dependency patch and a clean feature tip for integration.

- [ ] **Step 1: Confirm the canonical patch contains every download change**

Run:

```bash
rg -n 'researchCanvasExportDescriptor|buildResearchContainerChartSvg|buildResearchMindMapSvg|data-research-context-download|data-research-download-format' patches/@deepseek-ai+dsh-client-ui-conversation+0.1.0-rc.7.patch
```

Expected: the canonical patch includes export descriptors, mind-map SVG/raster helpers, download menus, and status CSS together with the previously completed web-link changes.

- [ ] **Step 2: Verify patch replay and focused download gates**

Run the isolated patch replay check:

```bash
patch_replay_dir="$(mktemp -d)"
cp package.json package-lock.json "$patch_replay_dir/"
cp -R patches "$patch_replay_dir/patches"
npm ci --prefix "$patch_replay_dir" --ignore-scripts
(cd "$patch_replay_dir" && npx patch-package --error-on-fail)
```

Then run:

```bash
npx vitest run test/research-canvas-export.test.ts test/research-file-preview.test.ts test/ipc-trust.test.ts test/sherlock-composer-workspace-ui.test.ts
npm run typecheck
npm run build
git diff --check
```

Expected: focused tests, type checking, build, patch replay, and whitespace checks PASS. Do not run the full suite.

- [ ] **Step 3: Confirm the feature tip is clean**

Run:

```bash
git status --short
```

Expected: feature worktree clean. Hand the resulting commit range to a new integration batch, then build and visually verify the real packaged Sherlock client from that integration candidate only.
