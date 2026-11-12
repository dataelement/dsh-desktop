import { spawn, type ChildProcess } from 'node:child_process'
import { join } from 'node:path'
import type { PlatformSession } from '@deepseek-ai/dsh-deepseek-account'
import { parsePluginOperationRecord, type PluginOperationRecord } from '@deepseek-ai/dsh-plugin-manager/diagnostic'
import { desktopNodeEnvironment } from './node-environment'

interface ReadyEvent {
  readonly type: 'ready'
  readonly url: string
  readonly injections?: readonly unknown[]
}

interface FatalEvent {
  readonly type: 'fatal'
  readonly message: string
  readonly diagnostic?: string
}

interface PlatformSessionEvent {
  readonly type: 'platform-session'
  readonly session: PlatformSession | null
}

type DesktopHostEvent = ReadyEvent | FatalEvent | PlatformSessionEvent | {
  readonly type: 'starting'
  readonly runId: string
} | { readonly type: 'shutdown-complete' } | {
  readonly type: 'file-drag-resource'
  readonly requestId: number
  readonly resource: { readonly path: string, readonly sha256: string, readonly size: number } | null
  readonly error?: string
} | {
  readonly type: 'update-tasks'
  readonly requestId: number
  readonly active: boolean
  readonly error?: string
} | {
  readonly type: 'quit-inspection'
  readonly requestId: number
  readonly activeTasks: boolean
  readonly scheduledTasks: boolean
  readonly error?: string
}

type DesktopHostControlResponse = Extract<DesktopHostEvent, { readonly requestId: number }>

export interface DesktopQuitInspection {
  readonly activeTasks: boolean
  readonly scheduledTasks: boolean
}

/** Quit inspection deadline. A slower Host counts as unknown work. */
export const QUIT_INSPECTION_DEADLINE_MS = 2_000

const MAX_HOST_DIAGNOSTIC_CHARS = 64 * 1024
const RUN_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu

export interface DesktopHostReady {
  readonly url: string
  readonly injections?: readonly unknown[]
}

/** The child exited, but task teardown did not finish successfully. */
export class DesktopHostUncleanExitError extends Error {}

/**
 * A Host failure reported over IPC before the process exited.
 * `diagnostic` stays off the enumerable properties so a crash report can print it verbatim.
 */
export class DesktopHostFatalError extends Error {
  readonly #diagnostic: string | undefined

  constructor(message: string, diagnostic: string | undefined) {
    super(message)
    this.#diagnostic = diagnostic
  }

  get diagnostic(): string | undefined {
    return this.#diagnostic
  }
}

export interface DesktopHostProcessOptions {
  node: string
  entry: string
  runtimeDir: string
  projectDir: string
  dshHome: string
  profile?: string
  inspectPort?: number
  environment?: NodeJS.ProcessEnv
  primaryRuntime?: string
  packageManager?: { readonly pnpm: string, readonly nodeBin: string }
  onFailure?: (error: Error) => void
  onPlatformSession?: (session: PlatformSession | null) => void
  onPluginOperation?: (record: PluginOperationRecord) => void
}

/** One Web backend running under the Electron executable in Node mode. */
export class DesktopHostProcess {
  private runId: string | undefined
  private child: ChildProcess | undefined
  private readyResolve: (ready: DesktopHostReady) => void = () => {}
  private readyReject: (error: Error) => void = () => {}
  private readonly readyPromise = new Promise<DesktopHostReady>((resolve, reject) => {
    this.readyResolve = resolve
    this.readyReject = reject
  })
  private exitPromise: Promise<void> | undefined
  private stderr = ''
  private failureReported = false
  private stopping = false
  private shutdownCompleted = false
  private nextControlId = 1
  private readonly controlRequests = new Map<number, {
    resolve: (response: DesktopHostControlResponse) => void
    reject: (error: Error) => void
  }>()

  constructor(private readonly options: DesktopHostProcessOptions) {}

  async start(): Promise<DesktopHostReady> {
    if (this.child !== undefined) return this.readyPromise
    const primaryRuntime = this.options.primaryRuntime ?? join(this.options.runtimeDir, '..', 'runtime', 'primary-runtime')
    const child = spawn(this.options.node, [
      '--expose-internals',
      ...(this.options.inspectPort === undefined ? [] : [`--inspect=127.0.0.1:${String(this.options.inspectPort)}`]),
      this.options.entry,
      this.options.runtimeDir,
      this.options.projectDir,
      primaryRuntime,
      ...(this.options.packageManager === undefined ? [] : [this.options.packageManager.pnpm, this.options.packageManager.nodeBin])
    ], {
      cwd: this.options.projectDir,
      env: desktopNodeEnvironment(this.options.node, undefined, {
        ...this.options.environment,
        DSH_DESKTOP_PROFILE: this.options.profile ?? 'desktop'
      }, this.options.dshHome),
      stdio: ['ignore', 'pipe', 'pipe', 'ipc']
    })
    this.child = child
    const capture = (chunk: string): void => {
      this.stderr = redactHostOutput(this.stderr + chunk).slice(-MAX_HOST_DIAGNOSTIC_CHARS)
    }
    child.stdout?.setEncoding('utf8')
    child.stdout?.on('data', capture)
    child.stderr?.setEncoding('utf8')
    child.stderr?.on('data', capture)
    child.on('message', (message: unknown) => { this.receive(child, message) })
    child.once('error', error => { this.fail(error) })
    this.exitPromise = new Promise(resolve => {
      child.once('close', code => {
        const suffix = this.stderr.trim() === '' ? '' : `: ${this.stderr.trim()}`
        if (code !== 0 && code !== null) this.fail(new Error(`dsh desktop host exited with ${String(code)}${suffix}`))
        else this.fail(new Error(`dsh desktop host stopped${suffix}`))
        resolve()
      })
    })
    return this.readyPromise
  }

  async updateTasks(action: 'inspect' | 'lock' | 'unlock'): Promise<boolean> {
    const response = await this.control(
      { type: 'update-tasks', action },
      10_000,
      'desktop update: task inspection timed out',
      'desktop update'
    )
    if (response.type !== 'update-tasks') throw new Error('desktop update: Host answered with a different control response')
    return response.active
  }

  async inspectQuit(): Promise<DesktopQuitInspection> {
    const response = await this.control(
      { type: 'quit-inspection' },
      QUIT_INSPECTION_DEADLINE_MS,
      'desktop quit: inspection timed out',
      'desktop quit'
    )
    if (response.type !== 'quit-inspection') throw new Error('desktop quit: Host answered with a different control response')
    return { activeTasks: response.activeTasks, scheduledTasks: response.scheduledTasks }
  }

  async resolveDragResource(address: string, signal?: AbortSignal): Promise<
    { readonly path: string, readonly sha256: string, readonly size: number } | null
  > {
    const response = await this.control(
      { type: 'file-drag-resource', address },
      12_000,
      'File drag authorization timed out',
      'file drag',
      signal
    )
    if (response.type !== 'file-drag-resource') throw new Error('Host returned a different control response')
    return response.resource
  }

  async stop(requireGraceful = false): Promise<void> {
    const child = this.child
    if (child === undefined) return
    this.stopping = true
    this.options.onPlatformSession?.(null)
    if (child.connected) child.send({ type: 'shutdown' }, error => { if (error !== null) this.fail(error) })
    const exited = this.exitPromise ?? Promise.resolve()
    const graceful = await exitsWithin(exited, 10_000)
    if (!graceful) child.kill('SIGTERM')
    if (!await exitsWithin(exited, 5_000)) {
      child.kill('SIGKILL')
      if (!await exitsWithin(exited, 5_000)) throw new Error('dsh desktop host did not exit after SIGKILL')
    }
    this.child = undefined
    if (requireGraceful && (!graceful || child.exitCode !== 0 || !this.shutdownCompleted)) {
      throw new DesktopHostUncleanExitError(
        `desktop update: Host did not complete graceful task teardown (exit ${String(child.exitCode)}, signal ${String(child.signalCode)}, shutdown acknowledged ${String(this.shutdownCompleted)}, graceful deadline exceeded ${String(!graceful)})`
      )
    }
  }

  private receive(child: ChildProcess, message: unknown): void {
    if (typeof message === 'object' && message !== null && 'type' in message && message.type === 'plugin-operation') {
      const record = 'record' in message ? parsePluginOperationRecord(message.record) : undefined
      if (record !== undefined && record.runId === this.runId) {
        try {
          this.options.onPluginOperation?.(record)
        } catch {
          console.error('desktop plugin operation diagnostic sink failed')
        }
      }
      return
    }
    const event = readDesktopHostEvent(message)
    if (event === undefined) {
      this.fail(new Error('dsh desktop host sent an invalid IPC event'))
      child.kill('SIGTERM')
      return
    }
    if (event.type === 'starting') this.runId = event.runId
    else if (event.type === 'ready') this.readyResolve({ url: event.url, injections: event.injections })
    else if (event.type === 'platform-session') this.options.onPlatformSession?.(event.session)
    else if (event.type === 'shutdown-complete') {
      if (this.stopping) this.shutdownCompleted = true
      else this.fail(new Error('dsh desktop host acknowledged an unrequested shutdown'))
    } else if (event.type === 'fatal') this.fail(new DesktopHostFatalError(event.message, event.diagnostic))
    else {
      const request = this.controlRequests.get(event.requestId)
      if (event.error === undefined) request?.resolve(event)
      else request?.reject(new Error(event.error))
    }
  }

  private async control(
    request: { readonly type: 'update-tasks', readonly action: 'inspect' | 'lock' | 'unlock' }
      | { readonly type: 'quit-inspection' }
      | { readonly type: 'file-drag-resource', readonly address: string },
    deadlineMs: number,
    deadlineMessage: string,
    operation: string,
    signal?: AbortSignal
  ): Promise<DesktopHostControlResponse> {
    const child = this.child
    if (child === undefined || !child.connected || this.failureReported || this.stopping) {
      throw new Error(`${operation}: Host is unavailable`)
    }
    signal?.throwIfAborted()
    const requestId = this.nextControlId++
    let timer: ReturnType<typeof setTimeout> | undefined
    const abort = (): void => {
      if (request.type === 'file-drag-resource' && child.connected) {
        child.send({ type: 'file-drag-cancel', requestId }, () => {})
      }
      const reason: unknown = signal?.reason
      this.controlRequests.get(requestId)?.reject(reason instanceof Error ? reason : new Error(deadlineMessage))
    }
    try {
      return await new Promise<DesktopHostControlResponse>((resolve, reject) => {
        this.controlRequests.set(requestId, { resolve, reject })
        timer = setTimeout(abort, deadlineMs)
        signal?.addEventListener('abort', abort, { once: true })
        child.send({ ...request, requestId }, error => { if (error !== null) reject(error) })
      })
    } finally {
      clearTimeout(timer)
      signal?.removeEventListener('abort', abort)
      this.controlRequests.delete(requestId)
    }
  }

  private fail(error: Error): void {
    if (this.runId !== undefined) Object.assign(error, { hostRunId: this.runId })
    this.options.onPlatformSession?.(null)
    this.readyReject(error)
    for (const request of this.controlRequests.values()) request.reject(error)
    this.controlRequests.clear()
    if (!this.failureReported && !this.stopping) {
      this.failureReported = true
      try {
        this.options.onFailure?.(error)
      } catch (listenerError) {
        console.error('desktop host failure listener failed', listenerError)
      }
    }
  }
}

/** Drop credential query values before host output is kept for a failure. */
export function redactHostOutput(text: string): string {
  return text.replace(/([?&]token=)[^&\s]+/gu, '$1[redacted]')
}

export function readDesktopHostEvent(message: unknown): DesktopHostEvent | undefined {
  if (typeof message !== 'object' || message === null || !('type' in message)) return undefined
  const candidate = message as Record<string, unknown>
  switch (candidate.type) {
    case 'starting':
      return typeof candidate.runId === 'string' && RUN_ID.test(candidate.runId)
        ? { type: 'starting', runId: candidate.runId }
        : undefined
    case 'shutdown-complete':
      return { type: 'shutdown-complete' }
    case 'ready':
      return typeof candidate.url === 'string' ? { type: 'ready', url: candidate.url, injections: injections(candidate.injections) } : undefined
    case 'platform-session':
      return platformSession(candidate.session)
    case 'fatal':
      return typeof candidate.message === 'string' && (candidate.diagnostic === undefined || typeof candidate.diagnostic === 'string')
        ? { type: 'fatal', message: candidate.message, ...(typeof candidate.diagnostic === 'string' ? { diagnostic: candidate.diagnostic } : {}) }
        : undefined
    case 'update-tasks':
      return isSafeInteger(candidate.requestId) && typeof candidate.active === 'boolean'
        && (candidate.error === undefined || typeof candidate.error === 'string')
        ? {
          type: 'update-tasks',
          requestId: candidate.requestId,
          active: candidate.active,
          ...(typeof candidate.error === 'string' ? { error: candidate.error } : {})
        }
        : undefined
    case 'file-drag-resource':
      return dragResource(candidate)
    case 'quit-inspection':
      return isSafeInteger(candidate.requestId) && typeof candidate.activeTasks === 'boolean'
        && typeof candidate.scheduledTasks === 'boolean'
        && (candidate.error === undefined || typeof candidate.error === 'string')
        ? {
          type: 'quit-inspection',
          requestId: candidate.requestId,
          activeTasks: candidate.activeTasks,
          scheduledTasks: candidate.scheduledTasks,
          ...(typeof candidate.error === 'string' ? { error: candidate.error } : {})
        }
        : undefined
    default:
      return undefined
  }
}

function injections(value: unknown): readonly unknown[] | undefined {
  return Array.isArray(value) ? value : undefined
}

function platformSession(session: unknown): PlatformSessionEvent | undefined {
  if (!isPlatformSession(session)) return undefined
  return { type: 'platform-session', session }
}

function isPlatformSession(session: unknown): session is PlatformSession | null {
  if (session === null) return true
  if (typeof session !== 'object' || !('origin' in session) || !('token' in session)) return false
  if (typeof session.origin !== 'string' || typeof session.token !== 'string' || session.token.length === 0) return false
  if (!('userId' in session) || (session.userId !== null && (typeof session.userId !== 'string' || session.userId.length === 0))) return false
  if ('embeddedPageDist' in session && session.embeddedPageDist !== undefined && typeof session.embeddedPageDist !== 'string') return false
  if ('requestHeaders' in session && session.requestHeaders !== undefined && !stringRecord(session.requestHeaders)) return false
  try {
    const url = new URL(session.origin)
    if (url.origin !== session.origin || url.username !== '' || url.password !== '') return false
    return url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
  } catch {
    return false
  }
}

function stringRecord(value: unknown): value is Readonly<Record<string, string>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  return Object.entries(value).every(([name, item]) => typeof item === 'string'
    && name === name.toLowerCase()
    && !/[\r\n]/u.test(item)
    && !['authorization', 'x-dsh-auth-token', 'host', 'content-length', 'transfer-encoding', 'connection', 'content-type'].includes(name))
}

function dragResource(candidate: Record<string, unknown>): DesktopHostEvent | undefined {
  if (!isSafeInteger(candidate.requestId)) return undefined
  if (candidate.error !== undefined && typeof candidate.error !== 'string') return undefined
  if (!isDragResource(candidate.resource)) return undefined
  return {
    type: 'file-drag-resource',
    requestId: candidate.requestId,
    resource: candidate.resource,
    ...(typeof candidate.error === 'string' ? { error: candidate.error } : {})
  }
}

function isSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value)
}

function isDragResource(resource: unknown): resource is { readonly path: string, readonly sha256: string, readonly size: number } | null {
  if (resource === null) return true
  return typeof resource === 'object'
    && 'path' in resource && typeof resource.path === 'string'
    && 'sha256' in resource && typeof resource.sha256 === 'string' && /^[a-f0-9]{64}$/u.test(resource.sha256)
    && 'size' in resource && isSafeInteger(resource.size) && resource.size >= 0
}

async function exitsWithin(exit: Promise<void>, milliseconds: number): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<false>(resolve => {
    timer = setTimeout(() => { resolve(false) }, milliseconds)
    timer.unref()
  })
  try {
    return await Promise.race([exit.then(() => true), timeout])
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
}
