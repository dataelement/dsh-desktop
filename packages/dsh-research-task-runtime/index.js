import { randomUUID } from 'node:crypto'
import { isAbsolute } from 'node:path'

export const MAX_ACTIVE_PER_PARENT = 4
export const MAX_SOURCES = 24
export const MAX_SOURCE_TEXT = 120_000
export const MAX_TOTAL_SOURCE_BYTES = 320_000
export const START_PATH = '/sherlock/research-tasks/start'
export const INSPECT_PATH = '/sherlock/research-tasks/inspect'
export const CANCEL_PATH = '/sherlock/research-tasks/cancel'

const MAX_ID_LENGTH = 256
const MAX_TITLE_LENGTH = 512
const MAX_PATH_LENGTH = 8_192
const MAX_EVENT_TEXT = 8_192
const MAX_PUBLIC_EVENTS = 160
const MAX_FINAL_OUTPUT = 240_000
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
  return state === 'completed' ||
    state === 'failed' ||
    state === 'cancelled' ||
    state === 'interrupted'
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
    try {
      handle = await this.adapter.start({
        taskId: task.taskId,
        parentSessionId: task.parentSessionId,
        prompt: buildResearchTaskPrompt(taskRequest(task)),
        signal: task.controller.signal,
        onSessionEvent: (event) => this.onSessionEvent(task, event)
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
    task.state = state
    task.completedAt = this.now()
    task.events = []
    if (value.finalOutput !== undefined) task.finalOutput = value.finalOutput
    if (value.error !== undefined) task.error = value.error
    await this.persist()
  }
}
