import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export const MAX_STATE_BYTES = 1024 * 1024
export class StateError extends Error {
  constructor(message, status = 400) { super(message); this.status = status }
}
const fail = (message) => { throw new StateError(message) }
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const validId = (value) => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,255}$/.test(value)
  && !['__proto__', 'prototype', 'constructor'].includes(value)
const validFavorite = value => validId(value) || (typeof value === 'string'
  && /^[A-Za-z0-9][A-Za-z0-9_.-]*\/[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(value) && value.length <= 255)

export function emptyState() {
  return { version: 1, added: [], pinned: [], favorites: [], active: null, sessionBindings: {}, recentSessions: {}, notes: {} }
}

export function validateState(value, previous, migrations = {}) {
  if (!isObject(value) || value.version !== 1) fail('Unsupported workbench state version.')
  if (Object.keys(value).some(key => !Object.hasOwn(emptyState(), key))) fail('Unknown workbench state field.')
  for (const key of ['added', 'pinned', 'favorites']) {
    const validate = key === 'favorites' ? validFavorite : validId
    if (!Array.isArray(value[key]) || !value[key].every(validate)
      || new Set(value[key]).size !== value[key].length) fail(`Invalid ${key} workbench IDs.`)
  }
  if (value.pinned.some(id => !value.added.includes(id))) fail('Pinned workbenches must be added.')
  if (value.active !== null && (!validId(value.active) || !value.added.includes(value.active))) fail('Active workbench must be added.')
  for (const key of ['sessionBindings', 'recentSessions', 'notes']) {
    if (!isObject(value[key])) fail(`Invalid ${key}.`)
    for (const [id, content] of Object.entries(value[key])) {
      if (!validId(id) || (key === 'notes' ? typeof content !== 'string' || content.length > 200000 : !validId(content))) fail(`Invalid ${key} entry.`)
    }
  }
  for (const [workbench, session] of Object.entries(value.recentSessions)) {
    if (value.sessionBindings[session] !== workbench) fail('Recent session must belong to its workbench.')
  }
  if (previous) {
    for (const [session, owner] of Object.entries(previous.sessionBindings)) {
      if (value.sessionBindings[session] !== owner && value.sessionBindings[session] !== migrations[owner]) fail('Existing session ownership cannot be changed or removed.')
    }
    for (const [session, owner] of Object.entries(value.sessionBindings)) {
      if (!Object.hasOwn(previous.sessionBindings, session) && !value.added.includes(owner)) fail('New session bindings require an added workbench.')
    }
    for (const id of Object.keys(previous.notes)) {
      if (!Object.hasOwn(value.notes, id) && !Object.hasOwn(value.notes, migrations[id])) fail('Removing a workbench must preserve its notes.')
    }
  }
  if (Buffer.byteLength(JSON.stringify(value)) > MAX_STATE_BYTES - 100) fail('Workbench state is too large.')
  return structuredClone(value)
}

// All reads and writes for this host instance share a queue. Read the disk on
// every operation so corrupt data is surfaced rather than silently replaced.
export function createStateStore(root) {
  const path = join(root, 'state.json')
  let pending = Promise.resolve()
  const queue = (operation) => {
    const result = pending.then(operation)
    pending = result.catch(() => {})
    return result
  }
  async function read() {
    let raw
    try { raw = await readFile(path) } catch (error) {
      if (error.code === 'ENOENT') return { revision: 0, state: emptyState() }
      throw error
    }
    try {
      if (raw.length > MAX_STATE_BYTES) throw new Error('File exceeds size limit')
      const saved = JSON.parse(raw.toString('utf8'))
      if (!Number.isSafeInteger(saved.revision) || saved.revision < 0) throw new Error('Invalid revision')
      const state = isObject(saved.state) && saved.state.version === 1 && !Object.hasOwn(saved.state, 'favorites')
        ? { ...saved.state, favorites: [] }
        : saved.state
      return { revision: saved.revision, state: validateState(state) }
    } catch {
      throw new StateError('Stored workbench state is invalid. Restore or repair state.json before saving.', 500)
    }
  }
  return {
    read: () => queue(read),
    write: (input) => {
      // Snapshot before queuing so callers cannot mutate an in-flight write.
      const payload = structuredClone(input)
      return queue(async () => {
        if (!isObject(payload) || !Number.isSafeInteger(payload.revision) || payload.revision < 0) fail('A valid revision is required.')
        const current = await read()
        if (payload.revision !== current.revision) throw new StateError('Workbench state changed. Reload before saving.', 409)
        if (current.revision === Number.MAX_SAFE_INTEGER) throw new StateError('Workbench state revision exhausted.', 500)
        const next = { revision: current.revision + 1, state: validateState(payload.state, current.state) }
        await mkdir(root, { recursive: true })
        const temporary = join(root, `.state-${randomUUID()}.tmp`)
        try {
          await writeFile(temporary, JSON.stringify(next), { flag: 'wx', mode: 0o600 })
          await rename(temporary, path)
        } finally { await rm(temporary, { force: true }) }
        return next
      })
    },
    migrate: (input, migrations) => {
      const payload = structuredClone(input)
      const allowed = structuredClone(migrations)
      return queue(async () => {
        if (!isObject(payload) || !Number.isSafeInteger(payload.revision) || payload.revision < 0) fail('A valid revision is required.')
        if (!isObject(allowed) || !Object.entries(allowed).every(([from, to]) => validId(from) && validId(to) && from !== to)) fail('Invalid workbench ID migration.')
        const current = await read()
        if (payload.revision !== current.revision) throw new StateError('Workbench state changed. Reload before saving.', 409)
        if (current.revision === Number.MAX_SAFE_INTEGER) throw new StateError('Workbench state revision exhausted.', 500)
        const next = { revision: current.revision + 1, state: validateState(payload.state, current.state, allowed) }
        await mkdir(root, { recursive: true })
        const temporary = join(root, `.state-${randomUUID()}.tmp`)
        try {
          await writeFile(temporary, JSON.stringify(next), { flag: 'wx', mode: 0o600 })
          await rename(temporary, path)
        } finally { await rm(temporary, { force: true }) }
        return next
      })
    }
  }
}
