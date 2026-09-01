import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, isAbsolute, join } from 'node:path'

export const name = 'sherlock-research-task-runtime'
export const inject = ['agents', 'subagents', 'typert', 'webServer']

export const MAX_ACTIVE_PER_PARENT = 4
export const MAX_SOURCES = 24
export const MAX_SOURCE_TEXT = 120_000
export const MAX_TOTAL_SOURCE_BYTES = 320_000
export const START_PATH = '/sherlock/research-tasks/start'
export const INSPECT_PATH = '/sherlock/research-tasks/inspect'
export const CANCEL_PATH = '/sherlock/research-tasks/cancel'
export const MAX_BODY_BYTES = 384 * 1024

const MAX_ID_LENGTH = 256
const MAX_TITLE_LENGTH = 512
const MAX_PATH_LENGTH = 8_192
const MAX_EVENT_TEXT = 8_192
const MAX_PUBLIC_EVENTS = 160
const MAX_FINAL_OUTPUT = 240_000
const MAX_TERMINAL_TASKS = 200
const TERMINAL_STATES = new Set(['completed', 'failed', 'cancelled', 'interrupted'])
const RESEARCH_TASK_PERSONA = '你是 Sherlock 研究画布的内容生成助手。只处理给定的画布任务和资料，不与用户展开对话，不泄露私有推理、工具参数或内部错误；最终只输出产品提示词要求的内容。'
const DETAILS = new Set(['brief', 'standard', 'detailed'])
const REQUEST_KEYS = new Set([
  'parentSessionId',
  'canvasNodeId',
  'kind',
  'detail',
  'sources'
])
const FILE_SOURCE_KEYS = new Set(['id', 'type', 'title', 'path'])
const ARTIFACT_SOURCE_KEYS = new Set(['id', 'type', 'title', 'text'])
const TOOL_LABELS = new Map([
  ['read', '读取资料'],
  ['grep', '检索资料'],
  ['glob', '查找文件'],
  ['web_search', '搜索资料'],
  ['web_fetch', '读取网页']
])

export class ResearchTaskError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'ResearchTaskError'
    this.code = code
  }
}

function record(value, code = 'INVALID_REQUEST', message = '任务参数无效') {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ResearchTaskError(code, message)
  }
  return value
}

function exactKeys(value, expected, message = '任务包含未知参数') {
  if (Object.keys(value).some((key) => !expected.has(key))) {
    throw new ResearchTaskError('INVALID_REQUEST', message)
  }
}

function requiredString(value, limit, message) {
  if (typeof value !== 'string') throw new ResearchTaskError('INVALID_REQUEST', message)
  const result = value.trim()
  if (result.length === 0 || result.length > limit) {
    throw new ResearchTaskError('INVALID_REQUEST', message)
  }
  return result
}

function validateSource(value) {
  const source = record(value)
  if (source.type === 'file') {
    exactKeys(source, FILE_SOURCE_KEYS, '文件来源包含未知参数')
    const path = requiredString(source.path, MAX_PATH_LENGTH, '文件路径无效')
    if (!isAbsolute(path)) throw new ResearchTaskError('INVALID_REQUEST', '文件路径必须是绝对路径')
    return Object.freeze({
      id: requiredString(source.id, MAX_ID_LENGTH, '来源标识无效'),
      type: 'file',
      title: requiredString(source.title, MAX_TITLE_LENGTH, '来源标题无效'),
      path
    })
  }
  if (source.type === 'artifact') {
    exactKeys(source, ARTIFACT_SOURCE_KEYS, '组件来源包含未知参数')
    return Object.freeze({
      id: requiredString(source.id, MAX_ID_LENGTH, '来源标识无效'),
      type: 'artifact',
      title: requiredString(source.title, MAX_TITLE_LENGTH, '来源标题无效'),
      text: requiredString(source.text, MAX_SOURCE_TEXT, '组件内容无效')
    })
  }
  throw new ResearchTaskError('INVALID_REQUEST', '不支持的来源类型')
}

export function validateResearchTaskStart(value) {
  const request = record(value)
  exactKeys(request, REQUEST_KEYS)
  const parentSessionId = requiredString(
    request.parentSessionId,
    MAX_ID_LENGTH,
    '研究会话标识无效'
  )
  const canvasNodeId = requiredString(
    request.canvasNodeId,
    MAX_ID_LENGTH,
    '组件标识无效'
  )
  if (request.kind !== 'mind-map' && request.kind !== 'summary') {
    throw new ResearchTaskError('INVALID_REQUEST', '不支持的任务类型')
  }
  let detail
  if (request.kind === 'mind-map') {
    if (!DETAILS.has(request.detail)) {
      throw new ResearchTaskError('INVALID_REQUEST', '思维导图详细度无效')
    }
    detail = request.detail
  } else if (request.detail !== undefined) {
    throw new ResearchTaskError('INVALID_REQUEST', '总结任务不接受详细度参数')
  }
  if (
    !Array.isArray(request.sources) ||
    request.sources.length === 0 ||
    request.sources.length > MAX_SOURCES
  ) {
    throw new ResearchTaskError('INVALID_REQUEST', '选中内容数量无效')
  }
  const sources = Object.freeze(request.sources.map(validateSource))
  if (Buffer.byteLength(JSON.stringify(sources), 'utf8') > MAX_TOTAL_SOURCE_BYTES) {
    throw new ResearchTaskError('INVALID_REQUEST', '选中内容过长')
  }
  return Object.freeze({
    parentSessionId,
    canvasNodeId,
    kind: request.kind,
    ...(detail === undefined ? {} : { detail }),
    sources
  })
}

function sourceSection(source, index) {
  if (source.type === 'file') {
    return `来源 ${index + 1}（文件）\n标题：${source.title}\n路径：${source.path}`
  }
  return `来源 ${index + 1}（画布组件）\n标题：${source.title}\n内容：\n${source.text}`
}

function mindMapDetailInstruction(detail) {
  if (detail === 'brief') {
    return '这是简要模式：内容必须高度概括，总层级不得超过 3 层（中心主题计为第 1 层）；只保留 2–3 个一级主题，每个一级主题保留 1–2 个二级要点，节点总数不超过 10 个，只保留最关键的主题、结论与关系。'
  }
  if (detail === 'detailed') {
    return '这是详细模式：不设置固定层级上限，根据材料充分展开因果、并列、从属和递进关系，使用户能够详细理解内容关系细节。'
  }
  return '这是常规模式：不设置固定层级上限，根据材料保留理解主题所需的关系层次，在阅读时间与内容理解之间取得平衡。'
}

export function buildResearchTaskPrompt(request) {
  const validated = validateResearchTaskStart(request)
  const sources = validated.sources.map(sourceSection).join('\n\n')
  const instruction = validated.kind === 'mind-map'
    ? `请基于下方选中的研究材料生成思维导图。${mindMapDetailInstruction(validated.detail)}请用 Markdown 层级列表输出：第一行以“# ”开头写中心主题，后续使用“- ”和两个空格缩进表达分支；每个节点使用简洁中文短语并尽量控制在 18 个中文字符以内，避免末行仅剩单个汉字；完整句子左对齐，短语或词语居中。不要输出说明、前言或代码围栏。结构应采用横向展开、适合直接截图粘贴到公司 PPT。`
    : '请基于下方选中的研究材料进行总结提炼。请输出一段结构紧凑、信息密度高的中文总结，保留关键结论、依据、风险和待验证事项，不要复述任务说明。'
  return `${instruction}\n\n${sources}`
}

function eventText(value) {
  if (typeof value !== 'string' || value.length === 0) return undefined
  return value.slice(0, MAX_EVENT_TEXT)
}

export function publicEventFromSessionEvent(event) {
  if (event?.type === 'assistant/chunk' && event.data?.chunk?.type === 'text-delta') {
    const text = eventText(event.data.chunk.text)
    return text === undefined ? null : { type: 'assistant-delta', text }
  }
  if (event?.type === 'tool/call') {
    const tool = TOOL_LABELS.get(event.data?.name) ?? '处理资料'
    return { type: 'tool-started', tool }
  }
  if (event?.type === 'tool/result') {
    return { type: 'tool-finished', failed: event.data?.error !== undefined }
  }
  return null
}

function terminalState(state) {
  return TERMINAL_STATES.has(state)
}

function taskDocument(task) {
  return {
    taskId: task.taskId,
    parentSessionId: task.parentSessionId,
    canvasNodeId: task.canvasNodeId,
    kind: task.kind,
    ...(task.detail === undefined ? {} : { detail: task.detail }),
    sources: task.sources,
    state: task.state,
    ...(task.childSessionId === undefined ? {} : { childSessionId: task.childSessionId }),
    ...(task.finalOutput === undefined ? {} : { finalOutput: task.finalOutput }),
    ...(task.error === undefined ? {} : { error: task.error }),
    lastSeq: task.lastSeq,
    createdAt: task.createdAt,
    ...(task.startedAt === undefined ? {} : { startedAt: task.startedAt }),
    ...(task.completedAt === undefined ? {} : { completedAt: task.completedAt })
  }
}

function finalText(output) {
  if (!Array.isArray(output)) return undefined
  const text = output
    .filter((block) => block?.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join('\n')
    .trim()
  return text.length === 0 ? undefined : text.slice(0, MAX_FINAL_OUTPUT)
}

function taskRequest(task) {
  return {
    parentSessionId: task.parentSessionId,
    canvasNodeId: task.canvasNodeId,
    kind: task.kind,
    ...(task.detail === undefined ? {} : { detail: task.detail }),
    sources: task.sources
  }
}

function publicTask(task, afterSeq = 0) {
  return {
    taskId: task.taskId,
    canvasNodeId: task.canvasNodeId,
    state: task.state,
    ...(task.childSessionId === undefined ? {} : { childSessionId: task.childSessionId }),
    ...(task.finalOutput === undefined ? {} : { finalOutput: task.finalOutput }),
    ...(task.error === undefined ? {} : { error: task.error }),
    createdAt: task.createdAt,
    ...(task.startedAt === undefined ? {} : { startedAt: task.startedAt }),
    ...(task.completedAt === undefined ? {} : { completedAt: task.completedAt }),
    lastSeq: task.lastSeq,
    events: task.events
      .filter((event) => event.seq > afterSeq)
      .map((event) => ({ ...event }))
  }
}

function timestamp(value, fallback) {
  return Number.isFinite(value) && value >= 0 ? value : fallback
}

function restoredTask(raw, now) {
  const stored = record(raw, 'INVALID_STORAGE', '任务存储无效')
  const request = validateResearchTaskStart({
    parentSessionId: stored.parentSessionId,
    canvasNodeId: stored.canvasNodeId,
    kind: stored.kind,
    ...(stored.detail === undefined ? {} : { detail: stored.detail }),
    sources: stored.sources
  })
  const originalState = stored.state
  if (!TERMINAL_STATES.has(originalState) && originalState !== 'queued' && originalState !== 'running') {
    throw new ResearchTaskError('INVALID_STORAGE', '任务状态无效')
  }
  const interrupted = originalState === 'queued' || originalState === 'running'
  const task = {
    taskId: requiredString(stored.taskId, MAX_ID_LENGTH, '任务标识无效'),
    ...request,
    state: interrupted ? 'interrupted' : originalState,
    createdAt: timestamp(stored.createdAt, now),
    lastSeq: interrupted
      ? Number.MAX_SAFE_INTEGER
      : Number.isSafeInteger(stored.lastSeq) && stored.lastSeq >= 0
        ? stored.lastSeq
        : 0,
    events: [],
    cancelRequested: false,
    controller: undefined,
    runPromise: undefined
  }
  if (typeof stored.finalOutput === 'string' && stored.finalOutput.trim().length > 0) {
    task.finalOutput = stored.finalOutput.slice(0, MAX_FINAL_OUTPUT)
  }
  if (interrupted) {
    task.error = '任务因应用重启而中断，请重试。'
    task.completedAt = now
  } else {
    if (typeof stored.error === 'string' && stored.error.trim().length > 0) {
      task.error = stored.error.slice(0, MAX_EVENT_TEXT)
    }
    if (typeof stored.childSessionId === 'string' && stored.childSessionId.trim().length > 0) {
      task.childSessionId = stored.childSessionId.slice(0, MAX_ID_LENGTH)
    }
    if (Number.isFinite(stored.startedAt)) task.startedAt = stored.startedAt
    if (Number.isFinite(stored.completedAt)) task.completedAt = stored.completedAt
  }
  return { task, interrupted }
}

export class ResearchTaskRuntime {
  constructor({ adapter, storage, now = Date.now, createId = randomUUID }) {
    if (typeof adapter?.start !== 'function') {
      throw new TypeError('ResearchTaskRuntime requires an adapter.')
    }
    if (typeof storage?.save !== 'function') {
      throw new TypeError('ResearchTaskRuntime requires storage.')
    }
    this.adapter = adapter
    this.storage = storage
    this.now = now
    this.createId = createId
    this.tasks = new Map()
    this.parents = new Map()
    this.persistChain = Promise.resolve()
    this.disposed = false
    this.restored = false
  }

  async restore() {
    if (this.restored) return
    if (this.tasks.size > 0) {
      throw new ResearchTaskError('RUNTIME_ACTIVE', '任务服务已开始运行')
    }
    const document = await this.storage.load()
    if (document === undefined) {
      this.restored = true
      return
    }
    if (document?.version !== 1 || !Array.isArray(document.tasks)) {
      throw new ResearchTaskError('INVALID_STORAGE', '任务存储无效')
    }
    let changed = false
    for (const raw of document.tasks) {
      const restored = restoredTask(raw, this.now())
      if (this.tasks.has(restored.task.taskId)) {
        throw new ResearchTaskError('INVALID_STORAGE', '任务标识重复')
      }
      this.tasks.set(restored.task.taskId, restored.task)
      changed ||= restored.interrupted
    }
    this.restored = true
    if (changed) await this.persist()
  }

  parentQueue(parentSessionId) {
    let queue = this.parents.get(parentSessionId)
    if (queue === undefined) {
      queue = { active: new Set(), pending: [] }
      this.parents.set(parentSessionId, queue)
    }
    return queue
  }

  appendEvent(task, value) {
    if (terminalState(task.state)) return
    task.lastSeq += 1
    task.events.push({
      taskId: task.taskId,
      canvasNodeId: task.canvasNodeId,
      seq: task.lastSeq,
      time: this.now(),
      ...value
    })
    if (task.events.length > MAX_PUBLIC_EVENTS) {
      task.events.splice(0, task.events.length - MAX_PUBLIC_EVENTS)
    }
  }

  persistedDocument() {
    return {
      version: 1,
      tasks: [...this.tasks.values()].map(taskDocument)
    }
  }

  persist() {
    const document = this.persistedDocument()
    this.persistChain = this.persistChain
      .catch(() => undefined)
      .then(() => this.storage.save(document))
    return this.persistChain
  }

  ownedTask(parentSessionId, taskId) {
    const task = this.tasks.get(taskId)
    if (task === undefined || task.parentSessionId !== parentSessionId) {
      throw new ResearchTaskError('TASK_NOT_FOUND', '任务不存在')
    }
    return task
  }

  async start(raw) {
    if (this.disposed) throw new ResearchTaskError('RUNTIME_DISPOSED', '任务服务已停止')
    const request = validateResearchTaskStart(raw)
    const taskId = requiredString(this.createId(), MAX_ID_LENGTH, '任务标识无效')
    if (this.tasks.has(taskId)) throw new ResearchTaskError('TASK_EXISTS', '任务标识重复')
    const createdAt = this.now()
    const task = {
      taskId,
      parentSessionId: request.parentSessionId,
      canvasNodeId: request.canvasNodeId,
      kind: request.kind,
      detail: request.detail,
      sources: request.sources,
      state: 'queued',
      createdAt,
      lastSeq: 0,
      events: [],
      cancelRequested: false,
      controller: new AbortController(),
      runPromise: undefined
    }
    this.appendEvent(task, { type: 'queued' })
    this.tasks.set(taskId, task)
    this.parentQueue(task.parentSessionId).pending.push(taskId)
    await this.persist()
    this.pump(task.parentSessionId)
    return publicTask(task, 0)
  }

  inspect({ parentSessionId, taskId, afterSeq = 0 }) {
    const parent = requiredString(parentSessionId, MAX_ID_LENGTH, '研究会话标识无效')
    const id = requiredString(taskId, MAX_ID_LENGTH, '任务标识无效')
    if (!Number.isSafeInteger(afterSeq) || afterSeq < 0) {
      throw new ResearchTaskError('INVALID_REQUEST', '任务游标无效')
    }
    return publicTask(this.ownedTask(parent, id), afterSeq)
  }

  async cancel({ parentSessionId, taskId }) {
    const parent = requiredString(parentSessionId, MAX_ID_LENGTH, '研究会话标识无效')
    const id = requiredString(taskId, MAX_ID_LENGTH, '任务标识无效')
    const task = this.ownedTask(parent, id)
    if (terminalState(task.state)) return publicTask(task, 0)
    if (task.cancelRequested) return publicTask(task, 0)
    task.cancelRequested = true
    const queue = this.parentQueue(task.parentSessionId)
    const pendingIndex = queue.pending.indexOf(task.taskId)
    if (pendingIndex !== -1) queue.pending.splice(pendingIndex, 1)
    task.controller.abort('canvas-task-cancelled')
    await this.finish(task, 'cancelled', { error: '任务已取消，可重试。' })
    if (!queue.active.has(task.taskId)) this.pump(task.parentSessionId)
    return publicTask(task, 0)
  }

  pump(parentSessionId) {
    if (this.disposed) return
    const queue = this.parentQueue(parentSessionId)
    while (queue.active.size < MAX_ACTIVE_PER_PARENT && queue.pending.length > 0) {
      const taskId = queue.pending.shift()
      const task = this.tasks.get(taskId)
      if (task === undefined || task.state !== 'queued' || task.cancelRequested) continue
      queue.active.add(taskId)
      task.runPromise = this.run(task)
    }
  }

  onSessionEvent(task, sessionEvent) {
    if (task.state !== 'running') return
    const value = publicEventFromSessionEvent(sessionEvent)
    if (value === null) return
    this.appendEvent(task, value)
  }

  async run(task) {
    let handle
    const startingEvents = []
    try {
      handle = await this.adapter.start({
        taskId: task.taskId,
        parentSessionId: task.parentSessionId,
        prompt: buildResearchTaskPrompt(taskRequest(task)),
        signal: task.controller.signal,
        onSessionEvent: (event) => {
          if (task.state === 'running') this.onSessionEvent(task, event)
          else if (!terminalState(task.state)) startingEvents.push(event)
        }
      })
      if (task.cancelRequested || terminalState(task.state)) return
      task.childSessionId = requiredString(
        handle.childSessionId,
        MAX_ID_LENGTH,
        '子会话标识无效'
      )
      task.state = 'running'
      task.startedAt = this.now()
      this.appendEvent(task, { type: 'started' })
      for (const event of startingEvents) this.onSessionEvent(task, event)
      await this.persist()
      const result = await handle.result
      if (task.cancelRequested || terminalState(task.state)) return
      const output = finalText(result?.output)
      if (result?.stopReason === 'completed' && output !== undefined) {
        await this.finish(task, 'completed', { finalOutput: output })
      } else {
        const message = result?.stopReason === 'max-tokens'
          ? '生成内容达到长度上限，请重试。'
          : result?.stopReason === 'refusal'
            ? '任务未能生成内容，请重试。'
            : result?.stopReason === 'aborted'
              ? '任务已取消，可重试。'
              : '生成失败，请重试。'
        await this.finish(
          task,
          result?.stopReason === 'aborted' ? 'cancelled' : 'failed',
          { error: message }
        )
      }
    } catch {
      if (!terminalState(task.state)) {
        await this.finish(
          task,
          task.cancelRequested ? 'cancelled' : 'failed',
          { error: task.cancelRequested ? '任务已取消，可重试。' : '生成失败，请重试。' }
        )
      }
    } finally {
      if (handle !== undefined) await handle.dispose().catch(() => undefined)
      const queue = this.parentQueue(task.parentSessionId)
      queue.active.delete(task.taskId)
      task.controller = undefined
      task.runPromise = undefined
      this.pump(task.parentSessionId)
    }
  }

  async finish(task, state, value) {
    if (terminalState(task.state)) return
    task.lastSeq = Math.min(Number.MAX_SAFE_INTEGER, task.lastSeq + 1)
    task.state = state
    task.completedAt = this.now()
    task.events = []
    if (value.finalOutput !== undefined) task.finalOutput = value.finalOutput
    if (value.error !== undefined) task.error = value.error
    await this.persist()
  }

  async dispose() {
    if (this.disposed) return
    this.disposed = true
    const running = []
    for (const task of this.tasks.values()) {
      if (terminalState(task.state)) continue
      task.controller?.abort('research-task-runtime-disposed')
      await this.finish(task, 'interrupted', {
        error: '任务因应用关闭而中断，请重试。'
      })
      if (task.runPromise !== undefined) running.push(task.runPromise)
    }
    await Promise.allSettled(running)
    await this.persistChain.catch(() => undefined)
    if (typeof this.adapter.dispose === 'function') {
      await this.adapter.dispose()
    }
  }
}

export function createSubagentAdapter(ctx) {
  let disposed = false

  const resolveParent = async (parentSessionId) => {
    const live = ctx.agents.get(parentSessionId)
    if (live?.id === parentSessionId) return live
    const provider = ctx.typert?.lookups?.get('agent')
    if (disposed || typeof provider?.resolve !== 'function') {
      throw new ResearchTaskError('PARENT_NOT_LIVE', '研究会话当前不可用')
    }
    try {
      const parent = await provider.resolve(parentSessionId)
      if (parent?.id === parentSessionId && ctx.agents.get(parentSessionId) === parent) {
        return parent
      }
    } catch {
      const racedParent = ctx.agents.get(parentSessionId)
      if (racedParent?.id === parentSessionId) return racedParent
    }
    throw new ResearchTaskError('PARENT_NOT_LIVE', '研究会话当前不可用')
  }

  return {
    async start({ parentSessionId, prompt, signal, onSessionEvent }) {
      const parent = await resolveParent(parentSessionId)
      const run = await ctx.subagents.start('spawn', {
        label: '画布生成任务',
        parent,
        signal,
        prompt: [{ type: 'text', text: prompt }],
        maxDepth: 1,
        toolFilter: { allow: [] },
        persona: RESEARCH_TASK_PERSONA
      })
      const child = run.localAgent
      if (child === undefined || child.id !== run.id) {
        await run.dispose().catch(() => undefined)
        throw new ResearchTaskError('LOCAL_CHILD_REQUIRED', '画布任务无法在本地运行')
      }

      const seen = new Set()
      const deliver = (event) => {
        const seq = event?.seq
        if (Number.isSafeInteger(seq)) {
          if (seen.has(seq)) return
          seen.add(seq)
        }
        onSessionEvent(event)
      }
      const off = ctx.on('session/event', (session, event) => {
        if (session?.id === child.id) deliver(event)
      })
      try {
        for (const event of [...child.session.events]) deliver(event)
      } catch (error) {
        off()
        await run.dispose().catch(() => undefined)
        throw error
      }

      let disposed = false
      return {
        childSessionId: child.id,
        result: run.result,
        async dispose() {
          if (disposed) return
          disposed = true
          off()
          await run.dispose()
        }
      }
    },
    async dispose() {
      if (disposed) return
      disposed = true
    }
  }
}

function dshHome() {
  return process.env.DSH_HOME || join(homedir(), '.dsh')
}

function boundedTaskDocument(document) {
  const source = record(document, 'INVALID_STORAGE', '任务存储无效')
  if (source.version !== 1 || !Array.isArray(source.tasks)) {
    throw new ResearchTaskError('INVALID_STORAGE', '任务存储无效')
  }
  const terminal = source.tasks
    .map((task, index) => ({ task, index }))
    .filter(({ task }) => terminalState(task?.state))
    .sort((a, b) => {
      const aTime = timestamp(a.task.completedAt, timestamp(a.task.createdAt, 0))
      const bTime = timestamp(b.task.completedAt, timestamp(b.task.createdAt, 0))
      return bTime - aTime || b.index - a.index
    })
    .slice(0, MAX_TERMINAL_TASKS)
  const retainedTerminal = new Set(terminal.map(({ index }) => index))
  return {
    version: 1,
    tasks: source.tasks.filter((task, index) => (
      !terminalState(task?.state) || retainedTerminal.has(index)
    ))
  }
}

export class JsonResearchTaskStorage {
  constructor(filePath = join(dshHome(), 'sherlock-research-tasks.json')) {
    this.filePath = filePath
  }

  async load() {
    try {
      const document = JSON.parse(await readFile(this.filePath, 'utf8'))
      return boundedTaskDocument(document)
    } catch (error) {
      if (error?.code === 'ENOENT') return { version: 1, tasks: [] }
      if (error instanceof SyntaxError) {
        throw new ResearchTaskError('INVALID_STORAGE', '任务存储无效')
      }
      throw error
    }
  }

  async save(document) {
    const bounded = boundedTaskDocument(document)
    await mkdir(dirname(this.filePath), { recursive: true })
    const temporary = `${this.filePath}.${process.pid}.${randomUUID()}.tmp`
    try {
      await writeFile(temporary, `${JSON.stringify(bounded)}\n`, 'utf8')
      await rename(temporary, this.filePath)
    } catch (error) {
      await unlink(temporary).catch(() => undefined)
      throw error
    }
  }
}

function isLoopback(address) {
  return address === '127.0.0.1' ||
    address === '::1' ||
    address === '[::1]' ||
    address === '::ffff:127.0.0.1'
}

function hasForwardedAddress(req) {
  return Boolean(
    req.headers?.forwarded ||
    req.headers?.['x-forwarded-for'] ||
    req.headers?.['x-real-ip'] ||
    req.headers?.['x-forwarded-host']
  )
}

export function isTrustedRequest(req, mutation = false) {
  if (!isLoopback(req.socket?.remoteAddress) || hasForwardedAddress(req)) return false
  if (!mutation) return true
  const origin = req.headers?.origin
  const host = req.headers?.host
  if (typeof origin !== 'string' || typeof host !== 'string') return false
  try {
    const parsed = new URL(origin)
    return parsed.protocol === 'http:' && parsed.host === host && isLoopback(parsed.hostname)
  } catch {
    return false
  }
}

export async function readJsonBody(req) {
  const declared = Number(req.headers?.['content-length'])
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    throw new ResearchTaskError('BODY_TOO_LARGE', '请求内容过长')
  }
  const chunks = []
  let bytes = 0
  for await (const chunk of req) {
    const buffer = Buffer.from(chunk)
    bytes += buffer.length
    if (bytes > MAX_BODY_BYTES) {
      throw new ResearchTaskError('BODY_TOO_LARGE', '请求内容过长')
    }
    chunks.push(buffer)
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw new ResearchTaskError('INVALID_REQUEST', '请求内容无效')
  }
}

const ROUTE_METHODS = new Map([
  [START_PATH, 'POST'],
  [INSPECT_PATH, 'POST'],
  [CANCEL_PATH, 'POST']
])

export function routeMethodStatus(path, method) {
  const expected = ROUTE_METHODS.get(path)
  if (expected === undefined) return 404
  return method === expected ? 200 : 405
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body)
  })
  res.end(body)
}

function errorResponse(error) {
  if (error instanceof ResearchTaskError) {
    if (error.code === 'TASK_NOT_FOUND') return [404, { error: '任务不存在。' }]
    if (error.code === 'PARENT_NOT_LIVE' || error.code === 'LOCAL_CHILD_REQUIRED') {
      return [409, { error: error.message }]
    }
    if (error.code === 'RUNTIME_DISPOSED') return [409, { error: '任务服务已停止。' }]
    if (error.code === 'BODY_TOO_LARGE' || error.code === 'INVALID_REQUEST') {
      return [400, { error: error.message }]
    }
  }
  return [500, { error: '画布任务服务暂时不可用。' }]
}

function researchTaskHandler(path, runtime) {
  return async (req, res) => {
    if (routeMethodStatus(path, req.method) !== 200) {
      sendJson(res, 405, { error: 'Method not allowed.' })
      return
    }
    const mutation = path === START_PATH || path === CANCEL_PATH
    if (!isTrustedRequest(req, mutation)) {
      sendJson(res, 403, { error: 'Request rejected.' })
      return
    }
    try {
      const body = await readJsonBody(req)
      const result = path === START_PATH
        ? await runtime.start(body)
        : path === INSPECT_PATH
          ? await runtime.inspect(body)
          : await runtime.cancel(body)
      sendJson(res, path === START_PATH ? 202 : 200, result)
    } catch (error) {
      const [status, payload] = errorResponse(error)
      sendJson(res, status, payload)
    }
  }
}

export function registerResearchTaskRoutes(webServer, runtime) {
  const disposers = [...ROUTE_METHODS.keys()].map((path) => webServer.register({
    kind: 'exact',
    path,
    handler: researchTaskHandler(path, runtime)
  }))
  let disposed = false
  return () => {
    if (disposed) return
    disposed = true
    for (const dispose of disposers.reverse()) dispose()
  }
}

export async function apply(ctx) {
  const runtime = new ResearchTaskRuntime({
    adapter: createSubagentAdapter(ctx),
    storage: new JsonResearchTaskStorage()
  })
  await runtime.restore()
  ctx.effect(() => {
    const disposeRoutes = registerResearchTaskRoutes(ctx.webServer, runtime)
    return async () => {
      disposeRoutes()
      await runtime.dispose()
    }
  })
}
