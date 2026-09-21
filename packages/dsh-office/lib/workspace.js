import { createHash, randomUUID } from 'node:crypto'
import { appendFile, link, lstat, mkdir, open, readFile, realpath, rename, unlink } from 'node:fs/promises'
import path from 'node:path'

export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')
const locks = new Map()
export async function withLock(key, fn) {
  const previous = locks.get(key) ?? Promise.resolve()
  let release
  const current = new Promise((resolve) => { release = resolve })
  locks.set(key, current)
  await previous.catch(() => undefined)
  try { return await fn() } finally { release(); if (locks.get(key) === current) locks.delete(key) }
}

export function workspaceRoot(exec) {
  const root = exec.agent?.session?.header?.cwd
  if (!root || !path.isAbsolute(root)) throw new Error('Office tools require an active local workspace')
  return root
}

export async function workspacePath(root, relative, createParents = false) {
  if (typeof relative !== 'string' || !relative || relative.includes('\\') || relative.includes('\0') || path.isAbsolute(relative) || /^[A-Za-z]:/u.test(relative)) throw new Error('Use a workspace-relative path')
  const segments = relative.split('/')
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) throw new Error('Use a canonical path inside the active workspace')
  let current = await realpath(root)
  for (let i = 0; i < segments.length; i++) {
    current = path.join(current, segments[i])
    let info
    try { info = await lstat(current) } catch (error) { if (error.code !== 'ENOENT') throw error }
    if (info?.isSymbolicLink()) throw new Error('Office paths must use regular files and directories')
    if (i < segments.length - 1) {
      if (!info && createParents) await mkdir(current, { mode: 0o700 }).catch((error) => { if (error.code !== 'EEXIST') throw error })
      if (!(await lstat(current)).isDirectory()) throw new Error('Office parent path must be a directory')
    } else if (info && !info.isFile()) throw new Error('Office target must be a regular file')
  }
  return current
}

export async function boundedRead(file, maximum) {
  const handle = await open(file, 'r')
  try {
    const metadata = await handle.stat()
    if (!metadata.isFile() || metadata.size > maximum) throw new Error(`Office input must be a regular file up to ${maximum} bytes`)
    let buffer = Buffer.alloc(Math.min(maximum + 1, metadata.size + 1))
    let length = 0
    while (length <= maximum) {
      if (length === buffer.length) {
        const grown = Buffer.alloc(Math.min(maximum + 1, Math.max(buffer.length * 2, 1)))
        buffer.copy(grown); buffer = grown
      }
      const { bytesRead } = await handle.read(buffer, length, buffer.length - length, null)
      if (!bytesRead) break
      length += bytesRead
    }
    if (length > maximum) throw new Error('Office input grew beyond the read limit')
    return buffer.subarray(0, length)
  } finally { await handle.close() }
}

export async function writeRevision(target, bytes, expectedRevision) {
  let prior
  try { prior = await boundedRead(target, 2 * 1024 * 1024) } catch (error) { if (error.code !== 'ENOENT') throw error }
  if (prior === undefined ? expectedRevision !== null : sha256(prior) !== expectedRevision) throw new Error('Revision conflict: read the current project and use its SHA-256; use null for a new file')
  return atomicWrite(target, bytes, prior !== undefined)
}

export async function atomicWrite(target, bytes, replace = false) {
  const temporary = path.join(path.dirname(target), `.office-${randomUUID()}.tmp`)
  const handle = await open(temporary, 'wx', 0o600)
  try { await handle.writeFile(bytes); await handle.sync() } catch (error) {
    await handle.close(); await unlink(temporary).catch(() => undefined); throw error
  }
  await handle.close()
  try {
    if (replace) await rename(temporary, target)
    else await link(temporary, target)
  } finally { await unlink(temporary).catch(() => undefined) }
}

export async function audit(root, exec, entry) {
  await mkdir(root, { recursive: true, mode: 0o700 })
  await withLock(`audit:${root}`, () => appendFile(path.join(root, 'audit.ndjson'), `${JSON.stringify({ time: new Date().toISOString(), sessionId: exec.agent?.session?.id ?? exec.agent?.id, agentId: exec.agent?.id, callId: exec.callId, tool: exec.name, ...entry })}\n`, { mode: 0o600 }))
}
