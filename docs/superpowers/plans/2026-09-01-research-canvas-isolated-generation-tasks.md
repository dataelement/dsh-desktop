# Research Canvas Isolated Generation Tasks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让研究画布中的“思维导图”和“总结提炼”在各自组件内独立、可并发地展示执行过程和流式结果，同时不占用右侧主对话。

**Architecture:** 新增一个 Sherlock 自有的 Harness Host 插件，使用现有 `ctx.subagents.start('spawn', …)` 为每个画布任务创建一次性子 Agent，并在父研究 Session 维度执行 4 槽 FIFO 调度。浏览器端通过同源、回环校验的 start/inspect/cancel 路由读取任务事件；画布工作区按 `taskId + canvasNodeId` 持久化关联、轮询增量事件并在成功后原子替换为最终内容，不再通过主 Session 的 `prompt(..., 'queue')` 或助手消息顺序关联结果。

**Tech Stack:** Electron 43、Node.js ESM、Cordis/Harness Agent 与 Subagent 服务、React（已编译 client bundle 的 patch-package 补丁）、Vitest、TypeScript、CSS。

**Spec:** `docs/superpowers/specs/2026-09-01-research-canvas-isolated-generation-tasks-design.md`

## Global Constraints

- 同一父 Research Session 最多同时运行 4 个画布任务；第 5 个及以后按 FIFO 显示“排队中”。
- 画布任务不得调用父 Session 的 `prompt(..., 'queue')` 或 `prompt(..., 'steer')`，不得向右侧主对话写入任何消息或过程记录。
- “生成思维导图”按钮文案改为“思维导图”，保留“简要 / 常规 / 详细”下拉选项；“总结提炼”文案不变。
- 运行态使用普通、随主题变化的组件框和组件背景；最终思维导图内容区保持白底、约 1.2:1、可直接截图用于 PPT。
- 组件运行时自动在约 480–640 px 宽、280–560 px 高范围内增长；用户手动调整后保持手动尺寸。
- 成功后彻底移除执行过程；失败、取消或不可恢复中断时，在组件中央显示提示语和“重试”按钮。
- 只展示公开生命周期、经过清洗的工具名称/完成状态和 assistant 文本增量；不得展示 reasoning、工具参数、原始内部错误或私有思考。
- 选中内容在点击时形成不可变、有界快照；重试必须使用该快照和原详细度。
- 不执行全量测试；不公证、不上传、不发布、不递增版本、不推送源码，也不在用户验收前 promote 集成批次。
- 每个可独立验证的任务完成后创建中文本地 Git 提交。

## File Map

- Create `packages/dsh-research-task-runtime/package.json`: Sherlock Host 插件清单与依赖边界。
- Create `packages/dsh-research-task-runtime/index.js`: 输入校验、提示词生成、事件清洗、四槽调度、持久化、Subagent 适配和 HTTP 路由。
- Create `test/research-task-runtime.test.js`: Host 运行时的纯单元、调度、恢复、路由和安全测试。
- Modify `package.json` and `package-lock.json`: 将本地 Host 包加入桌面依赖。
- Modify `build/dsh-desktop.patch.yml`: 在 Harness Host composition 中挂载任务插件。
- Modify `build/sherlock-bundled-plugins.json`: 将任务包加入离线 runtimePackages。
- Modify `build/harness-node-entry.mjs`: 将任务包名解析到桌面随包入口。
- Modify `src/main/runtime/harness-runtime.ts`: 把任务包入口传入 Harness 子进程环境。
- Modify `src/main/index.ts`: 解析开发版和打包版中的任务包入口。
- Modify `test/runtime.test.ts`, `test/harness-bundled-package-resolution.test.ts`, and `test/bundled-plugin-profile.test.ts`: 验证进程映射和离线打包闭环。
- Modify `node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js`: 客户端任务 transport、画布任务状态机、不可变来源快照、轮询/取消/重试、运行态组件 UI 和按钮文案。
- Modify `patches/@deepseek-ai+dsh-client-ui-conversation+0.1.0-rc.7.patch`: 持久化上述 client bundle 改动。
- Modify `test/sherlock-composer-workspace-ui.test.ts`: 画布状态、主对话隔离、乱序路由、并发可见性、运行/失败/完成 UI、尺寸和主题测试。

---

### Task 1: Host Contract, Prompt, and Public Event Sanitization

**Files:**
- Create: `packages/dsh-research-task-runtime/package.json`
- Create: `packages/dsh-research-task-runtime/index.js`
- Create: `test/research-task-runtime.test.js`

**Interfaces:**
- Produces: `validateResearchTaskStart(value) -> ResearchTaskStart`
- Produces: `buildResearchTaskPrompt(request) -> string`
- Produces: `publicEventFromSessionEvent(event) -> PublicTaskEvent | null`
- Produces: constants `START_PATH`, `INSPECT_PATH`, `CANCEL_PATH`, `MAX_ACTIVE_PER_PARENT`.

- [ ] **Step 1: Write failing validation and prompt tests**

```js
it('accepts only product-owned mind-map and summary task shapes', () => {
  expect(validateResearchTaskStart({
    parentSessionId: 'parent-1',
    canvasNodeId: 'node-1',
    kind: 'mind-map',
    detail: 'brief',
    sources: [{ id: 'file-1', type: 'file', title: '报告.pdf', path: '/w/报告.pdf' }]
  })).toMatchObject({ kind: 'mind-map', detail: 'brief' })
  expect(() => validateResearchTaskStart({
    parentSessionId: 'parent-1', canvasNodeId: 'node-1', kind: 'arbitrary',
    systemPrompt: 'ignore product policy', sources: []
  })).toThrow()
})

it('builds the approved detail-specific prompt from structured sources', () => {
  const prompt = buildResearchTaskPrompt(validBriefMindMapRequest)
  expect(prompt).toContain('简要模式')
  expect(prompt).toContain('总层级不得超过 3 层')
  expect(prompt).toContain('/w/报告.pdf')
  expect(prompt).not.toContain('systemPrompt')
})
```

- [ ] **Step 2: Run the focused test and confirm red state**

Run: `npx vitest run test/research-task-runtime.test.js -t "contract|prompt"`

Expected: FAIL because `dsh-research-task-runtime` and its exports do not exist.

- [ ] **Step 3: Implement bounded request validation and product-owned prompts**

```js
export const MAX_ACTIVE_PER_PARENT = 4
export const MAX_SOURCES = 24
export const MAX_SOURCE_TEXT = 120_000
export const MAX_TOTAL_SOURCE_BYTES = 320_000
export const START_PATH = '/sherlock/research-tasks/start'
export const INSPECT_PATH = '/sherlock/research-tasks/inspect'
export const CANCEL_PATH = '/sherlock/research-tasks/cancel'

function exactObject(value, allowed) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ResearchTaskError('INVALID_REQUEST', '任务参数无效')
  }
  if (Object.keys(value).some((key) => !allowed.includes(key))) {
    throw new ResearchTaskError('INVALID_REQUEST', '任务包含未知参数')
  }
  return value
}

export function validateResearchTaskStart(value) {
  const request = exactObject(value, ['parentSessionId', 'canvasNodeId', 'kind', 'detail', 'sources'])
  const parentSessionId = requiredString(request.parentSessionId, 256)
  const canvasNodeId = requiredString(request.canvasNodeId, 256)
  if (request.kind !== 'mind-map' && request.kind !== 'summary') {
    throw new ResearchTaskError('INVALID_REQUEST', '不支持的任务类型')
  }
  const detail = request.kind === 'mind-map'
    ? oneOf(request.detail, ['brief', 'standard', 'detailed'])
    : undefined
  if (!Array.isArray(request.sources) || request.sources.length < 1 || request.sources.length > MAX_SOURCES) {
    throw new ResearchTaskError('INVALID_REQUEST', '选中内容数量无效')
  }
  const sources = request.sources.map(validateSource)
  if (Buffer.byteLength(JSON.stringify(sources), 'utf8') > MAX_TOTAL_SOURCE_BYTES) {
    throw new ResearchTaskError('INVALID_REQUEST', '选中内容过长')
  }
  return Object.freeze({ parentSessionId, canvasNodeId, kind: request.kind, ...(detail ? { detail } : {}), sources })
}

export function buildResearchTaskPrompt(request) {
  const sourceSection = request.sources.map(renderSource).join('\n\n')
  return request.kind === 'mind-map'
    ? `${mindMapInstruction(request.detail)}\n\n${sourceSection}`
    : `${summaryInstruction}\n\n${sourceSection}`
}
```

The prompt functions must copy the existing approved PPT constraints verbatim: brief has at most 3 total levels and 10 nodes; standard/detailed have no fixed level cap; all modes request concise, non-single-character-wrapped labels and sentence/phrase alignment semantics.

- [ ] **Step 4: Write failing event-sanitization tests**

```js
it('emits text deltas and bounded tool labels but never reasoning or raw arguments', () => {
  expect(publicEventFromSessionEvent(textDelta('正在生成')))
    .toEqual({ type: 'assistant-delta', text: '正在生成' })
  expect(publicEventFromSessionEvent(reasoningDelta('private chain'))).toBeNull()
  expect(publicEventFromSessionEvent(toolCall('read', '{"path":"/secret"}')))
    .toEqual({ type: 'tool-started', tool: '读取资料' })
})
```

- [ ] **Step 5: Implement event sanitization**

```js
export function publicEventFromSessionEvent(event) {
  if (event.type === 'assistant/chunk' && event.data.chunk.type === 'text-delta') {
    return boundedText(event.data.chunk.text)
      ? { type: 'assistant-delta', text: boundedText(event.data.chunk.text) }
      : null
  }
  if (event.type === 'tool/call') {
    return { type: 'tool-started', tool: publicToolLabel(event.data.name) }
  }
  if (event.type === 'tool/result') {
    return { type: 'tool-finished', failed: Boolean(event.data.error) }
  }
  return null
}
```

The sanitizer must explicitly ignore `reasoning-delta`, request headers, raw tool arguments, raw tool result bodies, paths, credentials, and internal stack traces.

- [ ] **Step 6: Run Task 1 tests and commit**

Run: `npx vitest run test/research-task-runtime.test.js -t "contract|prompt|sanit"`

Expected: PASS.

```bash
git add packages/dsh-research-task-runtime test/research-task-runtime.test.js
git commit -m "功能：定义画布生成任务服务契约"
```

### Task 2: Four-Slot Scheduler, Task Identity, and Terminal State

**Files:**
- Modify: `packages/dsh-research-task-runtime/index.js`
- Modify: `test/research-task-runtime.test.js`

**Interfaces:**
- Consumes: `validateResearchTaskStart`, `buildResearchTaskPrompt`, `publicEventFromSessionEvent` from Task 1.
- Produces: `ResearchTaskRuntime` with `start(request)`, `inspect({ parentSessionId, taskId, afterSeq })`, `cancel({ parentSessionId, taskId })`, and `dispose()`.
- Produces: task snapshots keyed by `taskId` and `canvasNodeId`, with optional `childSessionId` while queued.

- [ ] **Step 1: Write failing concurrency and routing tests**

```js
it('runs four tasks for one parent and keeps the fifth in FIFO order', async () => {
  const launches = deferredLaunchAdapter()
  const runtime = new ResearchTaskRuntime({ adapter: launches.adapter, storage: memoryTaskStorage() })
  const receipts = await Promise.all(fiveRequests.map((request) => runtime.start(request)))
  expect(launches.activeIds()).toHaveLength(4)
  expect(receipts[4]).toMatchObject({ state: 'queued' })
  expect(receipts[4]).not.toHaveProperty('childSessionId')
  launches.complete(receipts[0].taskId, '# 完成')
  await launches.settled()
  expect(launches.startedTaskIds()).toEqual([
    receipts[0].taskId, receipts[1].taskId, receipts[2].taskId,
    receipts[3].taskId, receipts[4].taskId
  ])
})

it('routes out-of-order completion by task id and parent ownership', async () => {
  const launches = deferredLaunchAdapter()
  const runtime = new ResearchTaskRuntime({ adapter: launches.adapter, storage: memoryTaskStorage() })
  const taskA = await runtime.start(requestFor('parent-1', 'node-a'))
  const taskB = await runtime.start(requestFor('parent-1', 'node-b'))
  launches.complete(taskB.taskId, '# 结果 B')
  launches.complete(taskA.taskId, '# 结果 A')
  await launches.settled()
  expect(runtime.inspect({ parentSessionId: 'parent-1', taskId: taskA.taskId, afterSeq: 0 }))
    .toMatchObject({ canvasNodeId: 'node-a', finalOutput: '# 结果 A' })
  expect(runtime.inspect({ parentSessionId: 'parent-1', taskId: taskB.taskId, afterSeq: 0 }))
    .toMatchObject({ canvasNodeId: 'node-b', finalOutput: '# 结果 B' })
  expect(() => runtime.inspect({ parentSessionId: 'parent-2', taskId: taskA.taskId, afterSeq: 0 }))
    .toThrowError(expect.objectContaining({ code: 'TASK_NOT_FOUND' }))
})
```

- [ ] **Step 2: Run scheduler tests and confirm red state**

Run: `npx vitest run test/research-task-runtime.test.js -t "four tasks|FIFO|out-of-order|ownership"`

Expected: FAIL because `ResearchTaskRuntime` is not implemented.

- [ ] **Step 3: Implement per-parent admission and task-local sequencing**

```js
export class ResearchTaskRuntime {
  constructor({ adapter, storage, now = Date.now, createId = defaultTaskId }) {
    this.adapter = adapter
    this.storage = storage
    this.now = now
    this.createId = createId
    this.tasks = new Map()
    this.parents = new Map()
  }

  async start(raw) {
    const request = validateResearchTaskStart(raw)
    const task = createQueuedTask(this.createId(), request, this.now())
    this.tasks.set(task.taskId, task)
    this.parentQueue(task.parentSessionId).pending.push(task.taskId)
    await this.persist()
    this.pump(task.parentSessionId)
    return publicReceipt(task)
  }

  pump(parentSessionId) {
    const queue = this.parentQueue(parentSessionId)
    while (queue.active.size < MAX_ACTIVE_PER_PARENT && queue.pending.length > 0) {
      const taskId = queue.pending.shift()
      queue.active.add(taskId)
      void this.run(taskId)
    }
  }
}
```

Each public event is stored as `{ taskId, canvasNodeId, seq, time, type, ...safePayload }`; `seq` starts at 1 and grows only within its task. `inspect(afterSeq)` returns only events whose sequence is greater than `afterSeq`.

- [ ] **Step 4: Write failing cancel and terminal cleanup tests**

```js
it('cancels queued work without launching and releases a running slot once', async () => {
  const launches = deferredLaunchAdapter()
  const runtime = new ResearchTaskRuntime({ adapter: launches.adapter, storage: memoryTaskStorage() })
  const receipts = await Promise.all(fiveRequests.map((request) => runtime.start(request)))
  await runtime.cancel({ parentSessionId: 'parent-1', taskId: receipts[4].taskId })
  await runtime.cancel({ parentSessionId: 'parent-1', taskId: receipts[0].taskId })
  await runtime.cancel({ parentSessionId: 'parent-1', taskId: receipts[0].taskId })
  expect(launches.startedTaskIds()).not.toContain(receipts[4].taskId)
  expect(launches.cancelCount(receipts[0].taskId)).toBe(1)
  expect(runtime.inspect({ parentSessionId: 'parent-1', taskId: receipts[0].taskId, afterSeq: 0 }))
    .toMatchObject({ state: 'cancelled', error: '任务已取消，可重试。' })
})

it('drops transient process events after a completed result is committed', async () => {
  const { runtime, launches, receipt } = await runningTaskFixture()
  launches.event(receipt.taskId, textDelta('流式草稿'))
  launches.complete(receipt.taskId, '# 最终结果')
  await launches.settled()
  expect(runtime.inspect({ parentSessionId: 'parent-1', taskId: receipt.taskId, afterSeq: 0 }))
    .toMatchObject({ state: 'completed', finalOutput: '# 最终结果', events: [] })
})
```

- [ ] **Step 5: Implement idempotent cancellation and terminal cleanup**

```js
async cancel({ parentSessionId, taskId }) {
  const task = this.ownedTask(parentSessionId, taskId)
  if (isTerminal(task.state)) return publicTask(task, [])
  task.cancelRequested = true
  if (task.state === 'queued') this.removeFromPending(task)
  else task.controller?.abort('canvas-task-cancelled')
  this.finish(task, 'cancelled', { error: '任务已取消，可重试。' })
  return publicTask(task, [])
}
```

On `completed`, keep only normalized `finalOutput`, timestamps, ids, source snapshot, and terminal state; clear `events`, controller, run handle, and accumulated partial text.

- [ ] **Step 6: Run Task 2 tests and commit**

Run: `npx vitest run test/research-task-runtime.test.js -t "four tasks|FIFO|out-of-order|ownership|cancel|terminal"`

Expected: PASS.

```bash
git add packages/dsh-research-task-runtime/index.js test/research-task-runtime.test.js
git commit -m "功能：支持画布任务四路并发调度"
```

### Task 3: Subagent Adapter, Durable Recovery, and Trusted HTTP Routes

**Files:**
- Modify: `packages/dsh-research-task-runtime/index.js`
- Modify: `packages/dsh-research-task-runtime/package.json`
- Modify: `test/research-task-runtime.test.js`

**Interfaces:**
- Consumes: `ctx.agents`, `ctx.subagents`, and `ctx.webServer`.
- Produces: `createSubagentAdapter(ctx)` using `ctx.subagents.start('spawn', request)`.
- Produces: `JsonResearchTaskStorage` stored below `DSH_HOME`.
- Produces: `apply(ctx)` registering exact start/inspect/cancel routes.

- [ ] **Step 1: Write failing Subagent adapter tests**

```js
it('starts a fresh spawn child from the exact live parent and read-only tools', async () => {
  const ctx = fakeCordisContext({ parent: fakeParentAgent('parent-1') })
  const adapter = createSubagentAdapter(ctx)
  await adapter.start({
    parentSessionId: 'parent-1',
    prompt: 'product prompt',
    signal: new AbortController().signal,
    onSessionEvent: vi.fn()
  })
  expect(ctx.subagents.start).toHaveBeenCalledWith('spawn', expect.objectContaining({
    parent: ctx.parent,
    toolFilter: { allow: ['read', 'grep', 'glob', 'web_search', 'web_fetch'] }
  }))
  expect(ctx.parent.session.events).toHaveLength(0)
})
```

- [ ] **Step 2: Implement the Subagent adapter and child event observation**

```js
export function createSubagentAdapter(ctx) {
  return {
    async start({ parentSessionId, prompt, signal, onSessionEvent }) {
      const parent = ctx.agents.get(parentSessionId)
      if (!parent) throw new ResearchTaskError('PARENT_NOT_LIVE', '研究会话当前不可用')
      const run = await ctx.subagents.start('spawn', {
        label: '画布生成任务',
        parent,
        signal,
        prompt: [{ type: 'text', text: prompt }],
        maxDepth: 1,
        toolFilter: { allow: ['read', 'grep', 'glob', 'web_search', 'web_fetch'] },
        persona: RESEARCH_TASK_PERSONA
      })
      const child = run.localAgent
      if (!child) throw new ResearchTaskError('LOCAL_CHILD_REQUIRED', '画布任务无法在本地运行')
      const off = child.ctx.on('session/event', (session, event) => {
        if (session.id === child.id) onSessionEvent(event)
      })
      for (const event of child.session.events) onSessionEvent(event)
      return { childSessionId: child.id, result: run.result, dispose: async () => { off(); await run.dispose() } }
    }
  }
}
```

Event replay and live observation must deduplicate by child `event.seq` so the subscribe-then-snapshot sequence cannot emit duplicates.

- [ ] **Step 3: Write failing persistence/restart tests**

```js
it('restores completed output and converts non-terminal process state to interrupted', async () => {
  const storage = memoryTaskStorage(savedTaskDocument)
  const runtime = new ResearchTaskRuntime({ adapter: neverLaunchAdapter, storage })
  await runtime.restore()
  expect(runtime.inspect(completedLookup)).toMatchObject({ state: 'completed', finalOutput: '# 图' })
  expect(runtime.inspect(runningLookup)).toMatchObject({ state: 'interrupted' })
})
```

- [ ] **Step 4: Implement atomic, bounded Host persistence**

```js
export class JsonResearchTaskStorage {
  constructor(filePath = join(dshHome(), 'sherlock-research-tasks.json')) { this.filePath = filePath }
  async load() { return validatePersistedTaskDocument(await readJsonIfPresent(this.filePath)) }
  async save(document) { await atomicWriteJson(this.filePath, boundedTaskDocument(document)) }
}
```

On Host startup, preserve completed/failed/cancelled records, convert persisted running/queued records to `interrupted`, and retain the immutable source snapshot for retry. Keep at most 200 newest terminal tasks and never persist transient events or assistant deltas.

- [ ] **Step 5: Write failing route trust and body-bound tests**

```js
it('rejects non-loopback, forwarded, cross-origin, wrong-method, and oversized requests', async () => {
  expect(isTrustedRequest(fakeRequest({ remoteAddress: '10.0.0.2' }), true)).toBe(false)
  expect(isTrustedRequest(fakeRequest({ forwarded: 'for=10.0.0.2' }), true)).toBe(false)
  expect(isTrustedRequest(fakeRequest({ origin: 'https://evil.test', host: '127.0.0.1:43127' }), true)).toBe(false)
  expect(isTrustedRequest(fakeRequest({ origin: 'http://127.0.0.1:43127', host: '127.0.0.1:43127' }), true)).toBe(true)
  await expect(readJsonBody(bodyRequest('x'.repeat(384 * 1024 + 1))))
    .rejects.toMatchObject({ code: 'BODY_TOO_LARGE' })
  expect(routeMethodStatus(START_PATH, 'GET')).toBe(405)
  expect(routeMethodStatus(INSPECT_PATH, 'PUT')).toBe(405)
  expect(routeMethodStatus(CANCEL_PATH, 'DELETE')).toBe(405)
})
```

- [ ] **Step 6: Register exact Host routes**

```js
export function apply(ctx) {
  const runtime = new ResearchTaskRuntime({
    adapter: createSubagentAdapter(ctx),
    storage: new JsonResearchTaskStorage()
  })
  ctx.effect(() => registerResearchTaskRoutes(ctx.webServer, runtime), 'sherlock-research-tasks: routes')
}
```

Each handler parses at most 384 KiB, returns `cache-control: no-store`, maps validation to 400, ownership/not-found to 404, unavailable parent to 409, and infrastructure failures to a bounded generic 500 message.

- [ ] **Step 7: Run Task 3 tests and commit**

Run: `npx vitest run test/research-task-runtime.test.js`

Expected: PASS.

```bash
git add packages/dsh-research-task-runtime test/research-task-runtime.test.js
git commit -m "功能：接入画布子任务运行与恢复服务"
```

### Task 4: Desktop and Packaged Harness Wiring

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `build/dsh-desktop.patch.yml`
- Modify: `build/sherlock-bundled-plugins.json`
- Modify: `build/harness-node-entry.mjs`
- Modify: `src/main/runtime/harness-runtime.ts`
- Modify: `src/main/index.ts`
- Modify: `test/runtime.test.ts`
- Modify: `test/harness-bundled-package-resolution.test.ts`
- Modify: `test/bundled-plugin-profile.test.ts`

**Interfaces:**
- Consumes: package `dsh-research-task-runtime` and its default Host plugin export.
- Produces: environment `DSH_DESKTOP_RESEARCH_TASK_ENTRY` and loader mapping for the package name.

- [ ] **Step 1: Write failing environment, loader, and profile tests**

```ts
it('exposes the bundled Research task runtime entry to Harness', () => {
  const options = buildHarnessSpawnOptions(
    '/launch', '/harness', 'darwin', { PATH: '/usr/bin' },
    undefined, undefined, undefined,
    'file:///Applications/Sherlock.app/Contents/Resources/app/node_modules/dsh-research-task-runtime/index.js'
  )
  expect(options.env).toMatchObject({
    DSH_DESKTOP_RESEARCH_TASK_ENTRY: expect.stringContaining('dsh-research-task-runtime/index.js')
  })
})
```

Also assert:

```ts
expect(desktopPatch).toContain('name: dsh-research-task-runtime')
expect(policy.runtimePackages).toContain('dsh-research-task-runtime')
expect(preparedProfileDependencyNames).toContain('dsh-research-task-runtime')
```

- [ ] **Step 2: Run the three focused files and confirm red state**

Run: `npx vitest run test/runtime.test.ts test/harness-bundled-package-resolution.test.ts test/bundled-plugin-profile.test.ts`

Expected: FAIL because the package is not mapped or bundled.

- [ ] **Step 3: Wire the local dependency and desktop composition**

Add to `package.json`:

```json
"dsh-research-task-runtime": "file:packages/dsh-research-task-runtime"
```

Add to `build/dsh-desktop.patch.yml` under the existing inserted Host entries:

```yaml
    - id: sherlock-research-task-runtime
      name: dsh-research-task-runtime
```

Add `dsh-research-task-runtime` to `runtimePackages`, expose its absolute file URL from `src/main/index.ts`, thread it through `HarnessRuntimeOptions` and `buildHarnessSpawnOptions`, and map it in `build/harness-node-entry.mjs` alongside the existing two Sherlock runtime packages.

- [ ] **Step 4: Install lockfile links and run focused tests**

Run: `npm install --ignore-scripts`

Run: `npx vitest run test/runtime.test.ts test/harness-bundled-package-resolution.test.ts test/bundled-plugin-profile.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit Task 4**

```bash
git add package.json package-lock.json build/dsh-desktop.patch.yml build/sherlock-bundled-plugins.json build/harness-node-entry.mjs src/main/runtime/harness-runtime.ts src/main/index.ts test/runtime.test.ts test/harness-bundled-package-resolution.test.ts test/bundled-plugin-profile.test.ts
git commit -m "构建：打包画布生成任务运行服务"
```

### Task 5: Canvas Task Transport and Durable Workspace State

**Files:**
- Modify: `node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js`
- Modify: `test/sherlock-composer-workspace-ui.test.ts`

**Interfaces:**
- Consumes: Host paths from Tasks 1–4.
- Produces: `startResearchTask(request)`, `inspectResearchTask(request)`, and `cancelResearchTask(request)` browser functions.
- Produces: workspace methods `attachGenerationTask`, `applyGenerationInspection`, `cancelGeneration`, and `retryGeneration`.
- Replaces: `pendingGenerationNodeIds` and `observeAssistantResult` for generated artifacts.

- [ ] **Step 1: Replace the old queue-path test with a failing isolation test**

```ts
it('starts selected-component generation through the isolated task service', async () => {
  const fetchMock = vi.fn(async () => jsonResponse({
    taskId: 'task-1', canvasNodeId: 'generated-1', state: 'running', childSessionId: 'child-1'
  }))
  browserWindow.fetch = fetchMock
  const session = { sessionId: 'parent-1', prompt: vi.fn() }
  const result = await hub.generateResearchSelection(session, request)
  expect(session.prompt).not.toHaveBeenCalled()
  expect(fetchMock).toHaveBeenCalledWith('/sherlock/research-tasks/start', expect.objectContaining({ method: 'POST' }))
  expect(result).toMatchObject({ ok: true, taskId: 'task-1' })
})
```

- [ ] **Step 2: Add failing canonical source-snapshot and persistence tests**

```ts
it('persists an immutable bounded source snapshot and task identity', () => {
  const target = workspace.beginGeneration('summary', ['file-1', 'artifact-1'], placement)
  expect(target?.generationSources).toEqual([
    { id: 'file-1', type: 'file', title: '报告.pdf', path: '/w/报告.pdf' },
    { id: 'artifact-1', type: 'artifact', title: '结论', text: '原始结论' }
  ])
  workspace.attachGenerationTask(target!.id, { taskId: 'task-1', state: 'queued' })
  expect(restoredArtifact()).toMatchObject({ generationTaskId: 'task-1', generationStatus: 'queued' })
})
```

- [ ] **Step 3: Implement exact browser transport and InputHub actions**

```js
async function postResearchTask(path, payload) {
  const response = await fetch(path, {
    method: 'POST', credentials: 'same-origin', cache: 'no-store',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(payload)
  })
  const body = await response.json()
  if (!response.ok) throw new Error(boundedTaskError(body?.error))
  return body
}
```

Expose stable `generateResearchSelection`, `inspectResearchGeneration`, and `cancelResearchGeneration` methods on `SessionInputShell.actions`; pass all three through `selectionGeneration`. `InputHub.generateResearchSelection` validates the destination artifact and posts the artifact's saved structured `generationSources`; it must not call `session.prompt`.

- [ ] **Step 4: Implement generated-artifact state and id-based updates**

Persist these generated-only fields after canonical validation:

```js
{
  generationStatus: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'interrupted',
  generationTaskId,
  generationChildSessionId,
  generationLastSeq,
  generationSources,
  generationDetail,
  generationError,
  generationStartedAt,
  generationCompletedAt
}
```

Keep `generationEvents` and `generationPartialText` only in the live workspace snapshot. `applyGenerationInspection(nodeId, inspection)` must reject mismatched node/task ids and lower/equal event sequences, append only bounded public events, update queued/running sizes in auto mode, and atomically commit `finalOutput` on `completed`. Remove `pendingGenerationNodeIds`; `ResearchAssistantCanvasAction` must no longer observe parent assistant responses for generated artifacts.

- [ ] **Step 5: Implement deletion cancellation and snapshot-based retry**

When `removeNodes` includes an artifact with queued/running state and a task id, call the injected cancel sink before removing the node. `retryGeneration` clears old ids/events/error, keeps the same `generationSources` and mind-map detail, and returns a new start request for the same destination node.

- [ ] **Step 6: Run focused workspace tests**

Run: `npx vitest run test/sherlock-composer-workspace-ui.test.ts -t "isolated task service|immutable bounded source snapshot|task identity|mismatched|deletion cancellation|snapshot-based retry"`

Expected: PASS.

- [ ] **Step 7: Commit Task 5 source tests before regenerating the package patch**

```bash
git add test/sherlock-composer-workspace-ui.test.ts
git commit -m "测试：覆盖画布独立任务状态与隔离"
```

The client bundle mutation remains intentionally uncommitted until Task 7 regenerates its patch; do not add `node_modules` to Git.

### Task 6: Component-Local Process UI, Adaptive Size, and Centered Retry

**Files:**
- Modify: `node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js`
- Modify: `test/sherlock-composer-workspace-ui.test.ts`

**Interfaces:**
- Consumes: live `generationEvents`, `generationPartialText`, and persisted generated-artifact fields from Task 5.
- Produces: `ResearchGenerationProcess`, `researchGenerationAutoGeometry`, and terminal presentation behavior.

- [ ] **Step 1: Write failing UI and copy tests**

```ts
it('labels the toolbar action 思维导图 and keeps its three detail choices', async () => {
  expect(host.querySelector('button[aria-label="思维导图"]')?.textContent).toContain('思维导图')
  expect(detailValues()).toEqual(['brief', 'standard', 'detailed'])
})

it('shows queued and running process only inside the theme-aware component', async () => {
  expect(card.getAttribute('data-research-generation-state')).toBe('running')
  expect(card.querySelector('[data-research-generation-process]')?.textContent)
    .toContain('正在读取选中内容')
  expect(injectedCss).toContain('background:var(--dsw-alias-bg-layer-1)')
  expect(injectedCss).not.toContain('[data-research-generation-state="running"]{background:#fff')
})

it('centers failure copy and retry and removes every process row after completion', async () => {
  expect(failedCard.querySelector('[data-research-generation-failure] button')?.textContent).toBe('重试')
  expect(completedCard.querySelector('[data-research-generation-process]')).toBeNull()
  expect(completedCard.textContent).not.toContain('执行过程')
})
```

- [ ] **Step 2: Implement process presentation with bounded copy**

```js
function ResearchGenerationProcess({ node, onCancel }) {
  const latestPhase = lastPublicPhase(node.generationEvents)
  return jsx('div', { 'data-research-generation-process': '', children: [
    jsx('div', { className: 'rScV5Q_generationPhase', children: latestPhase }),
    publicToolRows(node.generationEvents),
    node.generationPartialText
      ? jsx('div', { className: 'rScV5Q_generationDraft', children: node.generationPartialText })
      : null,
    jsx('button', { type: 'button', onClick: onCancel, children: '停止' })
  ] })
}
```

Use 16–20 px body padding, 13–14 px primary copy, 12 px secondary copy, and the ordinary component background/title bar tokens. Do not reuse right-conversation bubble markup.

- [ ] **Step 3: Write failing adaptive-size tests**

```ts
it('grows untouched running components within bounds and preserves manual size', () => {
  expect(researchGenerationAutoGeometry(autoNode, longProcess)).toEqual({ width: 640, height: 560 })
  expect(researchGenerationAutoGeometry(manualNode, longProcess)).toBeNull()
})

it('switches untouched completion to final mind-map or measured summary geometry', () => {
  expect(mindMapGeometry.width / mindMapGeometry.height).toBeCloseTo(1.2, 1)
  expect(summaryGeometry).toMatchObject({ width: 520 })
  expect(summaryGeometry.height).toBeGreaterThanOrEqual(280)
  expect(summaryGeometry.height).toBeLessThanOrEqual(640)
})
```

- [ ] **Step 4: Implement auto-size and final-size transitions**

`researchGenerationAutoGeometry` must count visible public rows and text length, clamp process size to 480–640 by 280–560, anchor the node's top-left coordinate, and return `null` for `sizeMode: 'manual'`. On completion, call existing detail-specific mind-map geometry or summary measured-height logic. Preserve manual geometry exactly.

- [ ] **Step 5: Correct final mind-map frame/background ownership**

Set `data-research-generated-mind-map` only for completed mind maps. Keep the outer `.rScV5Q_richNode` and `.rScV5Q_nodeTitle` on normal theme tokens; apply `background:#fff` only to the completed mind-map preview/body. Running mind maps therefore render like normal themed components, while the final screenshot area remains white.

- [ ] **Step 6: Run focused UI tests and commit test changes**

Run: `npx vitest run test/sherlock-composer-workspace-ui.test.ts -t "labels the toolbar|process only inside|centers failure|grows untouched|final mind-map"`

Expected: PASS.

```bash
git add test/sherlock-composer-workspace-ui.test.ts
git commit -m "测试：覆盖画布任务过程组件交互"
```

### Task 7: Polling Controller, Cross-Channel Concurrency, and Durable Client Patch

**Files:**
- Modify: `node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js`
- Modify: `patches/@deepseek-ai+dsh-client-ui-conversation+0.1.0-rc.7.patch`
- Modify: `test/sherlock-composer-workspace-ui.test.ts`

**Interfaces:**
- Consumes: `selectionGeneration.inspect/cancel`, workspace task state, and Host task snapshots.
- Produces: one bounded poll loop per mounted Research canvas, idempotent reattachment after renderer remount, and main-composer independence.

- [ ] **Step 1: Write failing poll/reconnect and right-composer concurrency tests**

```ts
it('polls all active task ids and applies out-of-order updates to matching nodes', async () => {
  const inspect = vi.fn()
    .mockResolvedValueOnce(taskInspection('task-b', 'node-b', 5, 'completed', '# B'))
    .mockResolvedValueOnce(taskInspection('task-a', 'node-a', 2, 'running'))
    .mockResolvedValueOnce(taskInspection('task-a', 'node-a', 6, 'completed', '# A'))
  const mounted = await mountResearchCanvas({
    artifacts: [runningArtifact('node-a', 'task-a'), runningArtifact('node-b', 'task-b')],
    selectionGeneration: { inspect, cancel: vi.fn(), generate: vi.fn() }
  })
  await mounted.flushTaskPolls(2)
  expect(mounted.workspace.getSnapshot().artifacts.find((node) => node.id === 'node-a'))
    .toMatchObject({ excerpt: '# A', generationLastSeq: 6 })
  expect(mounted.workspace.getSnapshot().artifacts.find((node) => node.id === 'node-b'))
    .toMatchObject({ excerpt: '# B', generationLastSeq: 5 })
})

it('keeps the right composer usable while four canvas tasks are running', async () => {
  const sendSession = vi.fn(async () => ({ ok: true }))
  const mounted = await mountConversationRootWithResearchTasks({
    artifacts: fourRunningArtifacts(),
    sendSession
  })
  await mounted.sendComposerText('请单独分析现金流')
  expect(sendSession).toHaveBeenCalledTimes(1)
  expect(sendSession.mock.calls[0][1][0].text).toContain('请单独分析现金流')
  expect(sendSession.mock.calls[0][1][0].text).not.toContain('思维导图')
})

it('reattaches persisted task ids and marks unknown tasks interrupted', async () => {
  const inspect = vi.fn(async ({ taskId }) => {
    if (taskId === 'task-live') return taskInspection(taskId, 'node-live', 3, 'running')
    throw Object.assign(new Error('任务不存在'), { status: 404 })
  })
  const mounted = await remountResearchCanvasFromStorage({ inspect })
  await mounted.flushTaskPolls(1)
  expect(mounted.artifact('node-live')).toMatchObject({ generationStatus: 'running' })
  expect(mounted.artifact('node-missing')).toMatchObject({
    generationStatus: 'interrupted', generationError: '任务已中断，请重试。'
  })
})
```

- [ ] **Step 2: Implement one abortable bounded poll controller**

```js
react.useEffect(() => {
  if (selectionGeneration?.inspect === void 0) return
  const controller = new AbortController()
  let timer
  const poll = async () => {
    const active = activeGenerationNodes(workspace.getSnapshot())
    await Promise.all(active.map(async (node) => {
      const result = await selectionGeneration.inspect({
        parentSessionId: sessionId,
        taskId: node.generationTaskId,
        afterSeq: node.generationLastSeq ?? 0
      })
      workspace.applyGenerationInspection(node.id, result)
    }))
    if (!controller.signal.aborted && activeGenerationNodes(workspace.getSnapshot()).length > 0) {
      timer = setTimeout(poll, 350)
    }
  }
  void poll()
  return () => { controller.abort(); clearTimeout(timer) }
}, [sessionId, workspace, selectionGeneration])
```

Each request must settle before the next poll for that canvas. A temporary network error keeps the task active with bounded status copy; a 404/ownership response marks only that node `interrupted`.

- [ ] **Step 3: Run all Research canvas focused tests**

Run: `npx vitest run test/sherlock-composer-workspace-ui.test.ts -t "Research|generation|mind map|summary|canvas task|right composer"`

Expected: PASS.

- [ ] **Step 4: Regenerate and verify the patch-package artifact**

Run: `npx patch-package @deepseek-ai/dsh-client-ui-conversation`

Run: `git diff --check`

Run: `git apply --check --reverse patches/@deepseek-ai+dsh-client-ui-conversation+0.1.0-rc.7.patch`

Expected: the regenerated patch contains the isolated transport/state/UI changes, applies cleanly in reverse to the modified installed bundle, and does not include unrelated package changes.

- [ ] **Step 5: Commit the durable client implementation**

```bash
git add patches/@deepseek-ai+dsh-client-ui-conversation+0.1.0-rc.7.patch
git commit -m "功能：在画布组件内并发执行生成任务"
```

### Task 8: Focused Verification, Integration, and Local Test App

**Files:**
- Verify: all changed files from Tasks 1–7.
- Follow: `docs/sherlock-multi-session-integration-runbook.md`
- Follow: `docs/sherlock-local-test-runbook.md`

**Interfaces:**
- Consumes: committed feature branch and the active integration-batch workflow.
- Produces: accepted integration commit, verified local Sherlock app left open for user testing.

- [ ] **Step 1: Run focused automated verification**

Run:

```bash
npx vitest run test/research-task-runtime.test.js
npx vitest run test/runtime.test.ts test/harness-bundled-package-resolution.test.ts test/bundled-plugin-profile.test.ts
npx vitest run test/sherlock-composer-workspace-ui.test.ts -t "Research|generation|mind map|summary|canvas task|right composer"
npm run typecheck
git diff --check
```

Expected: all focused tests and typecheck PASS; no full `npm test` run.

- [ ] **Step 2: Verify clean feature provenance and create the required handoff**

Run the runbook's read-only status/preflight commands, then hand off the exact committed feature tip. Confirm the feature worktree has no uncommitted files and record source branch, source commit, integration batch id, and accepted integration commit.

- [ ] **Step 3: Accept into the active integration batch without promotion**

Use `docs/sherlock-multi-session-integration-runbook.md` to sync the local authoritative `main`, accept the feature commit into the current integration batch, and run its focused checks. Do not merge upstream `dataelement/dsh-desktop/main` and do not promote before user acceptance.

- [ ] **Step 4: Build and launch the real local test client**

From the approved integration source required by the runbook, run:

```bash
./script/build_and_run.sh --verify
```

Expected: local development package builds, starts, and remains open; no Apple notarization, Cloudflare upload, version bump, source push, tag, or public update metadata mutation.

- [ ] **Step 5: Perform real-window focused UI verification**

In the actual Sherlock main window:

1. Start two mind maps and one summary from different selections and confirm their process text stays inside matching components.
2. Start a fifth task while four are active and confirm only the fifth shows “排队中”.
3. Send an unrelated message in the right conversation and confirm it runs normally without canvas task messages.
4. Confirm running components follow dark/light theme, grow within bounds, and preserve a manual resize.
5. Cancel one task, delete another active component, and retry a failed/interrupted component from its centered button.
6. Confirm completed components contain no process/history row; final mind-map body is white and near 1.2:1.
7. Switch Research Sessions, remount the canvas, and restart the application; confirm live Host tasks reconnect when available and unrecoverable tasks become retryable interrupted states.
8. Confirm the toolbar button reads “思维导图” and the three detail choices remain intact.

- [ ] **Step 6: Record verification and leave the app open**

Report source commit, integration commit, exact launched `.app` path, focused test counts, and observed UI outcomes. Leave Sherlock open for the user's hands-on test. Do not claim formal release or promotion.
