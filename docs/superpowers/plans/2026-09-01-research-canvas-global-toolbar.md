# Research Canvas Global Toolbar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在研究画布底部增加长驻“链接 / 容器”功能栏，并实现安全网页节点与五类安全原生智能容器。

**Architecture:** 桌面主进程增加按研究会话和节点绑定的外部子 frame URL 授权，preload 仅暴露有界 authorize/release 接口；画布把 `web-link` 与 `generated-container` 纳入现有 artifact、几何和持久化模型。容器生成扩展现有隔离任务运行时，最终只接收并渲染严格校验的版本化 JSON schema，刷新通过 iframe reload 或保存需求的隔离任务重跑完成。

**Tech Stack:** Electron 43、contextBridge/IPC、React、sandbox iframe、受控 SVG、Node.js ESM、Vitest、TypeScript、patch-package。

**Spec:** `docs/superpowers/specs/2026-09-01-research-canvas-global-toolbar-design.md`

## Global Constraints

- 全局功能栏固定在研究画布底部中央，不随画布缩放、平移或节点选择移动。
- 链接只接受 `http:` 与 `https:`；禁止 `file:`、`javascript:`、`data:`、凭据 URL 与超长 URL。
- 外部网页只在 sandbox iframe 中运行，不获得 Node.js、本地文件或敏感权限；网站禁止嵌入时只降级，不绕过限制。
- 容器只支持 `web`、`chart`、`table`、`kpi`、`markdown` 五类版本 1 schema，不执行任意 HTML 或 JavaScript。
- 容器任务沿用每个父 Research Session 四槽 FIFO，并与右侧对话和输入草稿隔离。
- 定时刷新只在文档可见、研究画布活跃且节点无运行任务时发生；刷新失败保留上次成功内容。
- 运行态随主题变化，成功后移除全部过程；失败态中央展示提示和重试。
- 不运行全量测试；不公证、不发布、不上传、不递增版本，不在用户验收前 promote。
- 每个可独立验证的实现任务创建中文本地提交，不混入其他 session 改动。

## File Map

- Create `src/main/state/research-link-frame.ts`: URL 规范化、会话/节点授权、撤销和 frame 导航判定。
- Create `src/preload/research-link-frame.ts`: preload bridge 的严格请求形状与 IPC 调用。
- Modify `src/main/security.ts`: 非主 frame 只允许已授权研究链接或现有 `sherlock-preview:`。
- Modify `src/main/index.ts`: 初始化 registry，向 `secureWindow` 注入判定并注册 IPC handlers。
- Modify `src/preload/index.ts`: 暴露 `dshDesktop.researchLinkFrame`。
- Create `test/research-link-frame.test.ts`: registry、bridge、IPC 所有权和撤销测试。
- Modify `test/security.test.ts`: 已授权与未授权子 frame 导航测试。
- Modify `packages/dsh-research-task-runtime/index.js`: 新增 container 请求、固定提示词与持久化字段。
- Modify `test/research-task-runtime.test.js`: container contract、prompt、调度复用和恢复测试。
- Modify `node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js`: artifact schema、toolbar、link/container cards、任务生命周期、刷新和 CSS。
- Modify `patches/@deepseek-ai+dsh-client-ui-conversation+0.1.0-rc.7.patch`: 持久化 client bundle 修改。
- Modify `test/research-file-drop.test.ts`: 两种新 artifact 的有界持久化、布局和内容校验。
- Modify `test/sherlock-composer-workspace-ui.test.ts`: 工具栏、链接、五类容器、刷新和隔离的 DOM 行为测试。

---

### Task 1: External Link Frame Authorization Boundary

**Files:**
- Create: `src/main/state/research-link-frame.ts`
- Create: `src/preload/research-link-frame.ts`
- Create: `test/research-link-frame.test.ts`
- Modify: `src/main/security.ts`
- Modify: `src/main/index.ts`
- Modify: `src/preload/index.ts`
- Modify: `test/security.test.ts`

**Interfaces:**
- Produces: `normalizeResearchLinkUrl(value: unknown): string | null`.
- Produces: `ResearchLinkFrameRegistry.authorize({ sessionId, nodeId, url })`, `.release({ sessionId, nodeId })`, `.releaseSession(sessionId)`, `.allows(url)`.
- Produces: `createResearchLinkFrameBridge(invoke)` with `authorize`, `release`, `releaseSession`.
- Changes: `secureWindow(window, { allowsResearchFrameUrl })`.

- [ ] **Step 1: Write failing registry and bridge tests**

```ts
expect(normalizeResearchLinkUrl(' HTTPS://Example.com:443/report#part '))
  .toBe('https://example.com/report#part')
expect(normalizeResearchLinkUrl('javascript:alert(1)')).toBeNull()
expect(normalizeResearchLinkUrl('https://user:pass@example.com')).toBeNull()

const registry = new ResearchLinkFrameRegistry()
registry.authorize({ sessionId: 's1', nodeId: 'n1', url: 'https://example.com/report' })
expect(registry.allows('https://example.com/report')).toBe(true)
registry.release({ sessionId: 's1', nodeId: 'n1' })
expect(registry.allows('https://example.com/report')).toBe(false)
```

- [ ] **Step 2: Run focused tests and verify the expected red state**

Run: `npx vitest run test/research-link-frame.test.ts test/security.test.ts`

Expected: FAIL because the registry, bridge and authorized-frame security option do not exist.

- [ ] **Step 3: Implement bounded authorization and security injection**

```ts
export function normalizeResearchLinkUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > 8192) return null
  try {
    const parsed = new URL(value.trim())
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) return null
    parsed.hostname = parsed.hostname.toLowerCase()
    if ((parsed.protocol === 'https:' && parsed.port === '443') ||
        (parsed.protocol === 'http:' && parsed.port === '80')) parsed.port = ''
    return parsed.href
  } catch {
    return null
  }
}

export class ResearchLinkFrameRegistry {
  private readonly nodes = new Map<string, { sessionId: string; url: string }>()
  authorize(value: unknown): { url: string } {
    const request = researchLinkIdentity(value)
    const url = normalizeResearchLinkUrl(request.url)
    if (url === null) throw new TypeError('Research link URL is invalid.')
    this.nodes.set(`${request.sessionId}\u0000${request.nodeId}`, {
      sessionId: request.sessionId,
      url
    })
    return { url }
  }
  release(value: unknown): boolean {
    const request = researchLinkIdentity(value)
    return this.nodes.delete(`${request.sessionId}\u0000${request.nodeId}`)
  }
  releaseSession(sessionId: unknown): number {
    if (typeof sessionId !== 'string' || sessionId.length === 0 || sessionId.length > 256) {
      throw new TypeError('Research session id is invalid.')
    }
    let removed = 0
    for (const [key, node] of this.nodes) {
      if (node.sessionId === sessionId && this.nodes.delete(key)) removed += 1
    }
    return removed
  }
  allows(rawUrl: string): boolean {
    const url = normalizeResearchLinkUrl(rawUrl)
    if (url === null) return false
    const origin = new URL(url).origin
    return [...this.nodes.values()].some((node) =>
      node.url === url || new URL(node.url).origin === origin
    )
  }
}
```

`researchLinkIdentity` accepts only an exact object with `sessionId` and `nodeId` strings of 1–256 characters; `authorize` additionally accepts the exact `url` key.

`secureWindow` must continue blocking every unapproved child-frame HTTP navigation and must not open blocked frames in the system browser. IPC handlers must call `assertTrustedMainWindowEvent` before the registry.

- [ ] **Step 4: Run focused security tests and typecheck**

Run: `npx vitest run test/research-link-frame.test.ts test/security.test.ts`

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 5: Commit Task 1**

```bash
git add src/main/state/research-link-frame.ts src/preload/research-link-frame.ts src/main/security.ts src/main/index.ts src/preload/index.ts test/research-link-frame.test.ts test/security.test.ts
git commit -m "功能：建立研究网页组件安全边界"
```

### Task 2: Link and Container Artifact Contracts

**Files:**
- Modify: `test/research-file-drop.test.ts`
- Modify: `node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js`

**Interfaces:**
- Produces: artifact kinds `web-link` and `generated-container`.
- Produces: `normalizeResearchWebUrl`, `parseResearchContainerSpec`, `researchCanvasViewportPlacement`.
- Produces: workspace methods `createWebLink`, `createContainerDraft`, `updateWebLink`, `updateContainerDraft`, `setContainerRefresh`.

- [ ] **Step 1: Write failing persistence, URL and schema tests**

```ts
expect(client.normalizeResearchWebUrl('https://Example.com/dashboard')).toBe(
  'https://example.com/dashboard'
)
expect(client.normalizeResearchWebUrl('file:///tmp/a.html')).toBeNull()
expect(client.parseResearchContainerSpec(JSON.stringify({
  version: 1,
  type: 'chart',
  title: '收入趋势',
  variant: 'bar',
  labels: ['一月', '二月'],
  series: [{ name: '收入', values: [10, 12] }]
}))).toMatchObject({ version: 1, type: 'chart', title: '收入趋势' })
expect(client.parseResearchContainerSpec('{"version":1,"type":"script"}')).toBeNull()
```

- [ ] **Step 2: Run contract tests and verify red state**

Run: `npx vitest run test/research-file-drop.test.ts -t "web link|container schema|container artifact|viewport placement"`

Expected: FAIL because the new artifact kinds and helpers do not exist.

- [ ] **Step 3: Implement strict artifact canonicalization and workspace actions**

```js
const RESEARCH_CONTAINER_TYPES = new Set(['web', 'chart', 'table', 'kpi', 'markdown'])
const RESEARCH_REFRESH_MINUTES = new Set([0, 1, 5, 15, 30])

function parseResearchContainerSpec(raw) {
  const value = typeof raw === 'string' ? JSON.parse(stripSingleJsonFence(raw)) : raw
  if (value?.version !== 1 || !RESEARCH_CONTAINER_TYPES.has(value.type)) return null
  if (value.type === 'web') return canonicalResearchContainerWeb(value)
  if (value.type === 'chart') return canonicalResearchContainerChart(value)
  if (value.type === 'table') return canonicalResearchContainerTable(value)
  if (value.type === 'kpi') return canonicalResearchContainerKpi(value)
  return canonicalResearchContainerMarkdown(value)
}
```

The canonicalizers accept exact key sets only: titles and labels are 1–256 characters; Markdown is at most 32,000 characters; charts have at most 24 labels and 6 series with finite values; tables have at most 12 columns and 100 rows; KPI cards have at most 12 items; web URLs use `normalizeResearchWebUrl`.

`web-link` persists normalized `url`; `generated-container` persists `containerPrompt`, optional validated `containerSpec`, `refreshMinutes`, `lastSuccessfulAt`, optional refresh error and existing generation task fields. Draft containers use `generationStatus: 'draft'`; queued/running/failed/completed continue using the existing lifecycle.

- [ ] **Step 4: Run contract tests and commit Task 2**

Run: `npx vitest run test/research-file-drop.test.ts -t "web link|container schema|container artifact|viewport placement"`

Expected: PASS.

```bash
git add test/research-file-drop.test.ts node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js
git commit -m "功能：定义链接与智能容器画布模型"
```

### Task 3: Isolated Container Generation Contract

**Files:**
- Modify: `packages/dsh-research-task-runtime/index.js`
- Modify: `test/research-task-runtime.test.js`
- Modify: `node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js`
- Modify: `test/sherlock-composer-workspace-ui.test.ts`

**Interfaces:**
- Extends: `validateResearchTaskStart` with `{ kind: 'container', prompt }` and no source requirement.
- Extends: `buildResearchTaskPrompt` with the exact version 1 schema instructions.
- Produces: InputHub `generateResearchContainer(session, request)` and canvas `selectionGeneration.generateContainer(request)`.
- Extends: existing inspect/cancel/retry lifecycle for `generated-container`.

- [ ] **Step 1: Write failing runtime contract and prompt tests**

```js
const request = validateResearchTaskStart({
  parentSessionId: 'parent-1',
  canvasNodeId: 'container-1',
  kind: 'container',
  prompt: '制作一个展示月度收入的柱状图'
})
expect(request).toMatchObject({ kind: 'container', prompt: '制作一个展示月度收入的柱状图' })
expect(buildResearchTaskPrompt(request)).toContain('"version": 1')
expect(buildResearchTaskPrompt(request)).toContain('不要输出 HTML 或 JavaScript')
```

- [ ] **Step 2: Run runtime and UI generation tests and verify red state**

Run: `npx vitest run test/research-task-runtime.test.js -t "container"`

Run: `npx vitest run test/sherlock-composer-workspace-ui.test.ts -t "container generation|container retry|container conversation isolation"`

Expected: FAIL because `container` is rejected and no container generation action exists.

- [ ] **Step 3: Implement container request, fixed prompt and client lifecycle**

```js
const CONTAINER_INSTRUCTION = `请把用户需求转换为 Sherlock 安全原生组件。只输出一个 JSON 对象，不要输出 Markdown 围栏、HTML、JavaScript、解释或前言。JSON 必须包含 "version": 1、"type" 和 "title"；type 只能是 web、chart、table、kpi、markdown。所有网页地址必须使用 http 或 https。`
```

The task adapter keeps `toolFilter: { allow: [] }`. Completion is accepted only when `parseResearchContainerSpec(finalOutput)` succeeds; invalid output becomes the visible retry state and preserves `containerPrompt` plus the last successful spec when the operation was a refresh.

- [ ] **Step 4: Run Task 3 tests and commit**

Run: `npx vitest run test/research-task-runtime.test.js -t "container|four tasks|out-of-order|without external tools"`

Run: `npx vitest run test/sherlock-composer-workspace-ui.test.ts -t "container generation|container retry|container conversation isolation"`

Expected: PASS.

```bash
git add packages/dsh-research-task-runtime/index.js test/research-task-runtime.test.js node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js test/sherlock-composer-workspace-ui.test.ts
git commit -m "功能：接入智能容器隔离生成任务"
```

### Task 4: Persistent Bottom Toolbar and Link Node UI

**Files:**
- Modify: `node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js`
- Modify: `test/sherlock-composer-workspace-ui.test.ts`

**Interfaces:**
- Produces: `ResearchCanvasGlobalToolbar` and `ResearchCanvasWebFrame`.
- Consumes: workspace link/container creation from Task 2 and `window.dshDesktop.researchLinkFrame` from Task 1.

- [ ] **Step 1: Write failing toolbar and link behavior tests**

```ts
expect(host.querySelector('[data-research-global-toolbar]')).not.toBeNull()
expect(host.querySelector('[data-research-global-link]')?.textContent).toContain('链接')
expect(host.querySelector('[data-research-global-container]')?.textContent).toContain('容器')

await click('[data-research-global-link]')
await typeAndEnter('[data-research-link-input]', 'https://example.com/dashboard')
expect(workspace.getSnapshot().artifacts.at(-1)).toMatchObject({
  kind: 'web-link', url: 'https://example.com/dashboard'
})
```

- [ ] **Step 2: Run toolbar tests and verify red state**

Run: `npx vitest run test/sherlock-composer-workspace-ui.test.ts -t "global toolbar|creates a web link|link fallback|revokes link frame"`

Expected: FAIL because the toolbar and link card are absent.

- [ ] **Step 3: Implement fixed viewport toolbar, popover and sandbox frame**

```js
function ResearchCanvasWebFrame({ sessionId, node, active }) {
  const [revision, setRevision] = useState(0)
  const [status, setStatus] = useState('authorizing')
  useEffect(() => {
    if (!active) return
    let live = true
    window.dshDesktop?.researchLinkFrame?.authorize({ sessionId, nodeId: node.id, url: node.url })
      .then(() => live && setStatus('loading'))
      .catch(() => live && setStatus('blocked'))
    return () => {
      live = false
      void window.dshDesktop?.researchLinkFrame?.release({ sessionId, nodeId: node.id })
    }
  }, [sessionId, node.id, node.url, revision, active])
  return <div data-research-web-frame={status}>
    {status === 'blocked' ? <p>此网页不允许在组件中显示</p> : <iframe
      key={revision}
      src={node.url}
      sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
      referrerPolicy="no-referrer"
      onLoad={() => setStatus('ready')}
      onError={() => setStatus('blocked')}
    />}
    <button type="button" onClick={() => setRevision((value) => value + 1)}>重新加载</button>
    <a href={node.url} target="_blank" rel="noreferrer">在浏览器打开</a>
  </div>
}
```

The toolbar is an absolute viewport-layer element with `left:50%`, `bottom:20px`, `transform:translateX(-50%)`, and a z-index above canvas nodes but below modal surfaces. Its buttons and popover stop pointer propagation so they never begin marquee or pan operations.

- [ ] **Step 4: Run toolbar tests and commit**

Run: `npx vitest run test/sherlock-composer-workspace-ui.test.ts -t "global toolbar|creates a web link|link fallback|revokes link frame"`

Expected: PASS.

```bash
git add node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js test/sherlock-composer-workspace-ui.test.ts
git commit -m "功能：增加研究画布链接与全局功能栏"
```

### Task 5: Five Native Container Renderers and Refresh

**Files:**
- Modify: `node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js`
- Modify: `test/sherlock-composer-workspace-ui.test.ts`

**Interfaces:**
- Produces: `ResearchCanvasContainerCard`, `ResearchContainerChart`, `ResearchContainerTable`, `ResearchContainerKpis`, `ResearchContainerMarkdown`.
- Produces: active-only refresh effect using `refreshMinutes` and saved prompt.
- Consumes: Task 2 schema and Task 3 generation lifecycle.

- [ ] **Step 1: Write failing renderer and refresh tests**

```ts
expect(renderContainer(chartSpec).querySelector('[data-research-container-chart]')).not.toBeNull()
expect(renderContainer(tableSpec).querySelectorAll('tbody tr')).toHaveLength(2)
expect(renderContainer(kpiSpec).querySelectorAll('[data-research-container-kpi]')).toHaveLength(3)
expect(renderContainer(markdownSpec).textContent).toContain('结论')
expect(renderContainer(webSpec).querySelector('iframe')?.getAttribute('sandbox'))
  .toContain('allow-scripts')
```

- [ ] **Step 2: Run renderer tests and verify red state**

Run: `npx vitest run test/sherlock-composer-workspace-ui.test.ts -t "native container|container draft|container refresh|container timer"`

Expected: FAIL because draft submission, renderers and refresh controls do not exist.

- [ ] **Step 3: Implement draft, five renderers and safe refresh lifecycle**

Use regular React elements and controlled SVG. Bar and line charts derive their scale from finite validated values and render accessible series labels. Tables scroll inside the node, KPI cards wrap responsively, Markdown uses the existing `MarkdownText`, and web specs delegate to `ResearchCanvasWebFrame`.

```tsx
function ResearchCanvasContainerContent({ sessionId, node, spec }) {
  if (spec.type === 'web') {
    return <ResearchCanvasWebFrame sessionId={sessionId} node={{ ...node, url: spec.url }} active />
  }
  if (spec.type === 'chart') return <ResearchContainerChart spec={spec} />
  if (spec.type === 'table') return <ResearchContainerTable spec={spec} />
  if (spec.type === 'kpi') return <ResearchContainerKpis spec={spec} />
  return <MarkdownText text={spec.content} />
}

useEffect(() => {
  if (node.refreshMinutes === 0) return
  const timer = window.setInterval(() => {
    const canvas = rootRef.current
    if (document.visibilityState !== 'visible' || canvas?.closest('[inert]')) return
    if (RESEARCH_ACTIVE_GENERATION_STATUSES.has(node.generationStatus)) return
    void refreshContainer(node)
  }, node.refreshMinutes * 60_000)
  return () => window.clearInterval(timer)
}, [node.id, node.refreshMinutes, node.generationStatus, refreshContainer])
```

The refresh selector persists only `0 | 1 | 5 | 15 | 30`. The timer callback checks `document.visibilityState === 'visible'`, `!root.closest('[inert]')`, and non-active generation status before re-running the saved prompt. Cleanup always calls `clearInterval`.

- [ ] **Step 4: Run Task 5 tests and commit**

Run: `npx vitest run test/sherlock-composer-workspace-ui.test.ts -t "native container|container draft|container refresh|container timer"`

Expected: PASS.

```bash
git add node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js test/sherlock-composer-workspace-ui.test.ts
git commit -m "功能：渲染并刷新安全原生智能容器"
```

### Task 6: Persist the Dependency Patch and Focused Verification

**Files:**
- Modify: `patches/@deepseek-ai+dsh-client-ui-conversation+0.1.0-rc.7.patch`

**Interfaces:**
- Produces: patch-package replay of every Task 2–5 client bundle change.

- [ ] **Step 1: Regenerate the package patch**

Run: `npx patch-package @deepseek-ai/dsh-client-ui-conversation`

Expected: the patch includes the new artifact helpers, workspace actions, toolbar, cards and CSS without unrelated package changes.

- [ ] **Step 2: Run the directly affected tests**

Run: `npx vitest run test/research-link-frame.test.ts test/security.test.ts test/research-task-runtime.test.js test/research-file-drop.test.ts test/sherlock-composer-workspace-ui.test.ts`

Run: `npm run typecheck`

Run: `npm run build`

Expected: all commands exit 0 with no new warnings attributable to this feature.

- [ ] **Step 3: Verify patch replay in a temporary dependency copy**

Run: `npx patch-package --check`

Expected: exit 0 and the patched client bundle exports the new parsing and placement helpers.

- [ ] **Step 4: Commit Task 6**

```bash
git add patches/@deepseek-ai+dsh-client-ui-conversation+0.1.0-rc.7.patch
git commit -m "构建：固化研究画布全局功能栏补丁"
```

## Self-Review

- Spec coverage: Task 1 covers external-frame security; Task 2 covers persistence and layout; Task 3 covers isolated concurrent generation; Task 4 covers the persistent toolbar and link UX; Task 5 covers all five native outputs and active-only refresh; Task 6 covers patch replay and focused verification.
- Placeholder scan: implementation steps name exact contracts, bounds, commands and terminal behavior; no deferred feature requirement remains.
- Type consistency: `web-link`, `generated-container`, `container`, `containerPrompt`, `containerSpec`, `refreshMinutes`, `lastSuccessfulAt`, and `researchLinkFrame` are used consistently across tasks.
