import { randomUUID } from 'node:crypto'
import type { PluginOperationRunId } from '@deepseek-ai/dsh-plugin-manager/diagnostic'
import { localDragResource } from './file-drag'
import { installOperationDiagnostics } from './operation-diagnostics'
import { pluginOperationHost } from './upstream-api'
import { delimiter, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { registerOfficeEngineResolution } from '../../build/office-engine-resolution.mjs'
import { inspect } from 'node:util'
import { StartupError, loadLayeredEnv, loadProfileDirectory, reportSkippedBundles } from '@deepseek-ai/dsh-app-boot'
import { runProfile } from '@deepseek-ai/dsh/profile-boot'
import type {} from '@deepseek-ai/dsh-client-connection'
import type {} from '@deepseek-ai/dsh-host-webserver'

const MAX_FATAL_DIAGNOSTIC_CHARS = 64 * 1024
const MAX_ORIGINAL_ERROR_CHARS = 8 * 1024
const MAX_STARTUP_ENTRY_CHARS = 8 * 1024
const PROFILE_NAME = /^[a-z0-9][a-z0-9-]{0,63}$/u

async function main(): Promise<void> {
  // The diagnostic contract brands this startup UUID; randomUUID already returns that shape.
  const runId = randomUUID() as PluginOperationRunId
  sendIpc({ type: 'starting', runId })
  const runtimeDir = process.argv[2]
  const projectDir = process.argv[3]
  if (runtimeDir === undefined || projectDir === undefined) {
    throw new Error('dsh desktop host: runtime and project directories are required')
  }
  // The packaged engine is spawned by the OS, so it has to resolve under
  // app.asar.unpacked. This path only supplies the archive depth; bin.js is
  // not executed. Outside a package the registration does nothing.
  registerOfficeEngineResolution(join(runtimeDir, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js'))
  const installAnchor = join(runtimeDir, 'node_modules', '@deepseek-ai', 'dsh', 'package.json')
  const profile = loadProfileDirectory('dsh', projectDir, installAnchor)
  reportSkippedBundles('dsh', profile)
  const packageManager = process.argv[5] === undefined ? undefined : {
    command: process.execPath,
    args: ['--expose-internals', process.argv[5]],
    env: {
      ELECTRON_RUN_AS_NODE: '1',
      DSH_DESKTOP_NODE_EXECUTABLE: process.execPath,
      PATH: `${process.argv[6] ?? ''}${delimiter}${process.env.PATH ?? ''}`
    }
  }
  const application = runProfile({
    environment: loadLayeredEnv('dsh'),
    profile: profileName(),
    resolvedProfile: { profile, installAnchor },
    patchFiles: productPatchFiles(),
    args: ['--no-open', '--host', '127.0.0.1', '--port', '0'],
    ...(packageManager === undefined ? {} : { packageManager })
  })
  let stopping: Promise<void> | undefined
  const dragReads = new Map<number, AbortController>()
  const dragTasks = new Set<Promise<void>>()
  const send = (message: object): Promise<void> => new Promise((resolve, reject) => {
    sendIpc(message, error => { if (error === null) resolve(); else reject(error) })
  })
  const stop = (): Promise<void> => stopping ??= (async () => {
    for (const abort of dragReads.values()) abort.abort()
    await Promise.allSettled(dragTasks)
    const running = await application.catch(() => undefined)
    await running?.shutdown.shutdown(0)
    await send({ type: 'shutdown-complete' })
    if (process.connected) process.disconnect()
    if (running !== undefined) process.exit()
  })()
  process.on('message', (message: unknown) => {
    if (typeof message !== 'object' || message === null || !('type' in message)) return
    if (message.type === 'shutdown') {
      void stop()
      return
    }
    if (message.type === 'file-drag-cancel') {
      if ('requestId' in message && typeof message.requestId === 'number') dragReads.get(message.requestId)?.abort()
      return
    }
    if (message.type !== 'file-drag-resource') return
    if (!('requestId' in message) || typeof message.requestId !== 'number' || !Number.isSafeInteger(message.requestId)
      || !('address' in message) || typeof message.address !== 'string') return
    const requestId = message.requestId
    const address = message.address
    const abort = new AbortController()
    dragReads.set(requestId, abort)
    const task = (async () => {
      try {
        if (stopping !== undefined) throw new Error('Host stopping')
        const { ctx } = await application
        const resource = await localDragResource(ctx, address, abort.signal)
        await send({ type: 'file-drag-resource', requestId, resource })
      } catch (error) {
        if (!abort.signal.aborted) console.error(error)
        await send({ type: 'file-drag-resource', requestId, resource: null, error: 'File drag resource unavailable' })
      } finally {
        dragReads.delete(requestId)
      }
    })().catch((error: unknown) => { console.error(error) })
    dragTasks.add(task)
    void task.finally(() => { dragTasks.delete(task) })
  })
  process.once('disconnect', () => { void stop() })
  const { ctx } = await application
  installOperationDiagnostics(pluginOperationHost(ctx), async record => {
    await send({ type: 'plugin-operation', record })
  }, 32, runId)
  const url = ctx.connection.authenticatedUrl(`${ctx.webServer.protocol}//127.0.0.1:${String(ctx.webServer.port)}`)
  sendIpc({
    type: 'ready',
    url,
    injections: ctx.webServer.collectIndexInjections(ctx.connection.browserPeer)
  })
}

function sendIpc(message: object, callback?: (error: Error | null) => void): void {
  if (!process.connected || process.send === undefined) {
    callback?.(null)
    return
  }
  process.send(message, undefined, undefined, error => {
    if (error !== null) console.error(error)
    callback?.(error)
  })
}

function productPatchFiles(): string[] {
  const configured = process.env.DSH_DESKTOP_PATCH_FILE
  if (configured === undefined || configured === '') return []
  return [configured]
}

function profileName(): string {
  const configured = process.env.DSH_DESKTOP_PROFILE
  if (configured === undefined || configured === '') return 'desktop'
  if (!PROFILE_NAME.test(configured)) throw new Error('dsh desktop host: DSH_DESKTOP_PROFILE must be a short lowercase name')
  return configured
}

export function formatFatalDiagnostic(error: unknown): string {
  const original = inspect(error, { depth: 4, maxArrayLength: 50 })
  const sections: string[] = []
  const seen = new Set<Error>()
  const visit = (value: unknown): void => {
    if (!(value instanceof Error) || seen.has(value)) return
    seen.add(value)
    if (value instanceof StartupError) {
      if (value.startup !== undefined) sections.push(`Configuration file: ${value.startup.configurationPath}`)
      const entries = inspect(value.entries, { depth: 6, maxArrayLength: null, maxStringLength: 4096 })
      sections.push('--- startup entries ---', entries.length <= MAX_STARTUP_ENTRY_CHARS
        ? entries
        : `${entries.slice(0, MAX_STARTUP_ENTRY_CHARS)}\n… (startup entries truncated at ${MAX_STARTUP_ENTRY_CHARS} characters)`)
      sections.push(value.composition === undefined
        ? 'Startup composition diagnostic unavailable.'
        : `Omitted plugin rows: ${String(value.composition.omittedPlugins)}; omitted missing-service observations: ${String(value.composition.omittedServices)}.`)
    }
    visit(value.cause)
    if (value instanceof AggregateError) for (const item of value.errors) visit(item)
  }
  visit(error)
  sections.unshift(sections.length === 0 || original.length <= MAX_ORIGINAL_ERROR_CHARS
    ? original
    : `${original.slice(0, MAX_ORIGINAL_ERROR_CHARS)}\n… (original error truncated at ${MAX_ORIGINAL_ERROR_CHARS} characters)`)
  const text = sections.join('\n')
  if (text.length <= MAX_FATAL_DIAGNOSTIC_CHARS) return text
  const notice = `\n… (Host diagnostic truncated at ${MAX_FATAL_DIAGNOSTIC_CHARS} characters)`
  return text.slice(0, MAX_FATAL_DIAGNOSTIC_CHARS - notice.length) + notice
}

function isDirectRun(): boolean {
  const entry = process.argv[1]
  if (entry === undefined) return false
  return pathToFileURL(entry).href === import.meta.url
}

if (isDirectRun()) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    const diagnostic = formatFatalDiagnostic(error)
    sendIpc({ type: 'fatal', message, diagnostic })
    console.error(error)
    process.exitCode = 1
    if (process.connected) process.disconnect()
  })
}
