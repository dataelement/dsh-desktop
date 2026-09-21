import { createHash, randomUUID } from 'node:crypto'
import { appendFile, link, mkdir, open, rename, unlink } from 'node:fs/promises'
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

function requireWorkspaceRelative(relative) {
  if (typeof relative !== 'string' || !relative || relative.includes('\\') || relative.includes('\0') || path.isAbsolute(relative) || /^[A-Za-z]:/u.test(relative)) throw new Error('Use a workspace-relative path')
  if (relative.split('/').some(segment => !segment || segment === '.' || segment === '..')) throw new Error('Use a canonical path inside the active workspace')
}

async function rejectSymlinkTraversal(fs, relative, cwd, signal) {
  const segments = relative.split('/')
  for (let index = 0; index < segments.length; index++) {
    signal?.throwIfAborted()
    const candidate = segments.slice(0, index + 1).join('/')
    const info = await fs.lstat(candidate, { cwd }, signal)
    if (!info) break
    if (info.type === 'symlink') throw new Error('Office paths must use regular files and directories')
    if (index < segments.length - 1 && info.type !== 'directory') throw new Error('Office parent path must be a directory')
    if (index === segments.length - 1 && info.type !== 'file') throw new Error('Office target must be a regular file')
  }
}

export async function resolveWorkspaceFile(fs, policy, relative, signal) {
  requireWorkspaceRelative(relative)
  const root = await fs.resolve(policy.workspaceRoot, { signal })
  await rejectSymlinkTraversal(fs, relative, policy.workspaceRoot, signal)
  const target = await fs.resolve(relative, { cwd: policy.workspaceRoot, signal })
  if (!fs.contains(root, target)) throw new Error('Use a path inside the active workspace')
  return target
}

export async function resolveRegularFile(fs, file, cwd, signal) {
  const root = await fs.resolve(cwd, { signal })
  const relative = path.relative(cwd, file).split(path.sep).join('/')
  requireWorkspaceRelative(relative)
  await rejectSymlinkTraversal(fs, relative, cwd, signal)
  const target = await fs.resolve(relative, { cwd, signal })
  if (!fs.contains(root, target)) throw new Error('Office path escaped its isolated job')
  return target
}

export async function readBytes(fs, target, maximum, signal) {
  return Buffer.from(await fs.readBytes(target, signal, maximum))
}

/**
 * Publish Office binary bytes atomically at a target already resolved and fenced
 * by ctx.fs. Harness ctx.fs intentionally writes UTF-8 text only, so this is the
 * sole native filesystem boundary retained by the Office package.
 */
export async function writeBinaryAtomic(fs, target, bytes, { replace = false, signal } = {}) {
  signal?.throwIfAborted()
  const destination = fs.processPath(target)
  await mkdir(path.dirname(destination), { recursive: true, mode: 0o700 })
  const temporary = path.join(path.dirname(destination), `.office-${randomUUID()}.tmp`)
  const handle = await open(temporary, 'wx', 0o600)
  try {
    await handle.writeFile(bytes)
    await handle.sync()
    signal?.throwIfAborted()
  } catch (error) {
    await handle.close()
    await unlink(temporary).catch(() => undefined)
    throw error
  }
  await handle.close()
  try {
    if (replace) await rename(temporary, destination)
    else await link(temporary, destination)
  } finally { await unlink(temporary).catch(() => undefined) }
}

export async function audit(root, exec, entry) {
  await mkdir(root, { recursive: true, mode: 0o700 })
  await withLock(`audit:${root}`, () => appendFile(path.join(root, 'audit.ndjson'), `${JSON.stringify({ time: new Date().toISOString(), sessionId: exec.agent?.session?.id ?? exec.agent?.id, agentId: exec.agent?.id, callId: exec.callId, tool: exec.name, ...entry })}\n`, { mode: 0o600 }))
}
