/** Native copy drags for the product page. Renderer paths are never opened directly. */
import { createHash } from 'node:crypto'
import { createReadStream, statSync, type Stats } from 'node:fs'
import { stat } from 'node:fs/promises'
import { basename } from 'node:path'
import { app, ipcMain, type BrowserWindow, type IpcMainInvokeEvent } from 'electron'
import {
  resolveDragFileName,
  type DesktopFileSource,
  type FileDragHandle
} from '@deepseek-ai/dsh-util-file-drag'
import { DESKTOP_IPC } from './window/ipc'
import { DragFiles } from './file-drag-files'

interface LocalResource {
  readonly path: string
  readonly size: number
  readonly sha256: string
}

function field(value: object, key: string): unknown {
  if (!Object.hasOwn(value, key)) return undefined
  return Reflect.get(value, key)
}

function optionalString(value: object, key: string): string | undefined {
  const item = field(value, key)
  if (item === undefined) return undefined
  if (typeof item !== 'string') throw new Error('Invalid file drag request')
  return item
}

function readDragSource(value: unknown): DesktopFileSource {
  if (typeof value !== 'object' || value === null) throw new Error('Invalid file drag request')
  const mediaType = field(value, 'mediaType')
  if (typeof mediaType !== 'string') throw new Error('Invalid file drag request')
  const name = optionalString(value, 'name')
  const outputExtension = optionalString(value, 'outputExtension')
  const naming = {
    mediaType,
    ...(name === undefined ? {} : { name }),
    ...(outputExtension === undefined ? {} : { outputExtension })
  }
  const kind = field(value, 'kind')
  if (kind === 'bytes') {
    const bytes = field(value, 'bytes')
    if (!(bytes instanceof Uint8Array)) throw new Error('Invalid file drag request')
    return { kind: 'bytes', bytes, ...naming }
  }
  if (kind === 'resource') {
    const address = field(value, 'address')
    if (typeof address !== 'string') throw new Error('Invalid file drag request')
    const sha256 = optionalString(value, 'sha256')
    if (sha256 !== undefined && !/^[a-f0-9]{64}$/u.test(sha256)) throw new Error('Invalid file drag request')
    const size = field(value, 'size')
    if (size !== undefined && (typeof size !== 'number' || !Number.isSafeInteger(size) || size < 0)) {
      throw new Error('Invalid file drag request')
    }
    return {
      kind: 'resource',
      address,
      ...naming,
      ...(sha256 === undefined ? {} : { sha256 }),
      ...(typeof size === 'number' ? { size } : {})
    }
  }
  throw new Error('Invalid file drag request')
}

function sameVersion(before: Stats, after: Stats): boolean {
  return after.isFile() && before.dev === after.dev && before.ino === after.ino
    && before.mtimeMs === after.mtimeMs && before.ctimeMs === after.ctimeMs && before.size === after.size
}

async function verifiedVersion(resource: LocalResource, signal: AbortSignal): Promise<Stats | undefined> {
  signal.throwIfAborted()
  const info = await stat(resource.path)
  if (!info.isFile() || info.size !== resource.size) return undefined
  const hash = createHash('sha256')
  const stream = createReadStream(resource.path, { signal })
  for await (const chunk of stream) {
    if (!(chunk instanceof Uint8Array)) throw new Error('File stream returned non-binary data')
    hash.update(chunk)
  }
  const after = await stat(resource.path)
  return sameVersion(info, after) && hash.digest('hex') === resource.sha256 ? after : undefined
}

async function cancellable<T>(operation: Promise<T>, signal: AbortSignal): Promise<T> {
  signal.throwIfAborted()
  let rejectCancelled: (error: unknown) => void = () => undefined
  const cancelled = new Promise<never>((_resolve, reject) => { rejectCancelled = reject })
  const abort = (): void => { rejectCancelled(signal.reason) }
  signal.addEventListener('abort', abort, { once: true })
  try {
    return await Promise.race([operation, cancelled])
  } finally {
    signal.removeEventListener('abort', abort)
  }
}

/**
 * Register preparation and native dragging for the product window.
 * @param owner - accepts only the product page.
 * @param resolveResource - asks the Host to authorize a session file.
 */
export function installDesktopFileDrag(
  owner: (event: IpcMainInvokeEvent) => BrowserWindow,
  resolveResource: (address: string, signal: AbortSignal) => Promise<LocalResource | null>
): () => Promise<void> {
  let disposed = false
  const preparations = new Map<string, AbortController>()
  const files = new DragFiles(app.getPath('temp'))
  const pending = new Set<Promise<FileDragHandle | undefined>>()
  const icons = new Map<string, Electron.NativeImage>()
  const borrowed = new Map<string, { resource: LocalResource, version: Stats }>()
  const authorize = (event: IpcMainInvokeEvent): BrowserWindow => {
    if (disposed) throw new Error('File transfer closed')
    return owner(event)
  }
  const prepare = async (event: IpcMainInvokeEvent, value: unknown, signal: AbortSignal): Promise<FileDragHandle | undefined> => {
    authorize(event)
    const source = readDragSource(value)
    let handle: FileDragHandle
    if (source.kind === 'bytes') handle = await files.prepare(source.bytes, source)
    else {
      const resource = await cancellable(resolveResource(source.address, signal), signal)
      authorize(event)
      if (resource === null || basename(resource.path) !== resolveDragFileName(source)
        || (source.sha256 !== undefined && source.sha256 !== resource.sha256)
        || (source.size !== undefined && source.size !== resource.size)) return undefined
      const version = await verifiedVersion(resource, signal)
      if (version === undefined) return undefined
      handle = files.borrow(resource.path)
      borrowed.set(handle, { resource, version })
    }
    try {
      signal.throwIfAborted()
      const file = files.take(handle, false)
      if (file === undefined) throw new Error('File transfer closed')
      const icon = await cancellable(app.getFileIcon(file, { size: 'normal' }), signal)
      authorize(event)
      icons.set(handle, icon)
      return handle
    } catch (error) {
      borrowed.delete(handle)
      await files.release(handle)
      throw error
    }
  }
  ipcMain.handle(DESKTOP_IPC.fileDragPrepare, (event, source: unknown, requestId: unknown) => {
    authorize(event)
    if (typeof requestId !== 'string' || requestId.length === 0 || requestId.length > 128 || preparations.has(requestId)) {
      throw new Error('Invalid file preparation identity')
    }
    const abort = new AbortController()
    preparations.set(requestId, abort)
    const operation = prepare(event, source, abort.signal).finally(() => { preparations.delete(requestId) })
    pending.add(operation)
    void operation.then(() => { pending.delete(operation) }, () => { pending.delete(operation) })
    return operation
  })
  ipcMain.handle(DESKTOP_IPC.fileDragCancel, (event, requestId: unknown) => {
    authorize(event)
    if (typeof requestId === 'string') preparations.get(requestId)?.abort(new Error('File preparation cancelled'))
  })
  ipcMain.handle(DESKTOP_IPC.fileDragStart, (event, handle: unknown) => {
    const window = authorize(event)
    const icon = typeof handle === 'string' ? icons.get(handle) : undefined
    if (icon === undefined || typeof handle !== 'string') return false
    const file = files.take(handle, false)
    if (file === undefined) return false
    try {
      const original = borrowed.get(handle)
      if (original !== undefined && !sameVersion(original.version, statSync(original.resource.path))) {
        throw new Error('File changed before dragging')
      }
      authorize(event)
      window.webContents.startDrag({ file, icon })
      files.take(handle)
      icons.delete(handle)
      borrowed.delete(handle)
      return true
    } catch (error) {
      console.error(error)
      icons.delete(handle)
      borrowed.delete(handle)
      void files.release(handle).catch((releaseError: unknown) => { console.error(releaseError) })
      return false
    }
  })
  ipcMain.handle(DESKTOP_IPC.fileDragRelease, async (event, handle: unknown) => {
    authorize(event)
    if (typeof handle === 'string') {
      icons.delete(handle)
      borrowed.delete(handle)
    }
    await files.release(handle)
  })
  return async () => {
    if (!disposed) {
      disposed = true
      for (const abort of preparations.values()) abort.abort(new Error('File transfer closed'))
      ipcMain.removeHandler(DESKTOP_IPC.fileDragPrepare)
      ipcMain.removeHandler(DESKTOP_IPC.fileDragCancel)
      ipcMain.removeHandler(DESKTOP_IPC.fileDragStart)
      ipcMain.removeHandler(DESKTOP_IPC.fileDragRelease)
    }
    await Promise.allSettled(pending)
    icons.clear()
    borrowed.clear()
    await files.dispose()
  }
}
