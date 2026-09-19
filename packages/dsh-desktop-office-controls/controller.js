import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { randomUUID } from 'node:crypto'

export const OFFICE_PACKAGES = new Set(['dsh-ppt', 'dsh-ppt-composer', 'dsh-office'])
export const OFFICE_CONTEXTS = new Set([
  'dsh-ppt-skill', 'dsh-ppt-composer', 'kimi-ppt-skill', 'kimi-ppt-composer',
  'dsh-office-composer', 'workbuddy-office-composer'
])
export const isOfficeTool = name => /^(?:ppt_|pptd_|office_)/u.test(name)

export async function readPreference(file) {
  try {
    const value = JSON.parse(await readFile(file, 'utf8'))
    if (value.version !== 1 || typeof value.enabled !== 'boolean' || !Number.isSafeInteger(value.revision) || value.revision < 0) {
      throw new Error('Invalid Office preference')
    }
    return value
  } catch (error) {
    if (error.code === 'ENOENT') return { version: 1, enabled: true, revision: 0, history: [] }
    throw error
  }
}

/** One atomic preference also carries the local audit of explicit user changes. */
export async function writePreference(file, value) {
  await mkdir(dirname(file), { recursive: true })
  const temporary = join(dirname(file), `.office-${randomUUID()}.tmp`)
  try {
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx', mode: 0o600 })
    await rename(temporary, file)
  } finally {
    await rm(temporary, { force: true })
  }
}

/** Loader entries remain installed; the Loader owns teardown and recreation. */
export class OfficeController {
  constructor({ file, entries, agents, owns, save = writePreference, report = () => {}, afterApply = () => {} }) {
    Object.assign(this, { file, entries, agents, owns, save, report, afterApply })
    this.preference = { version: 1, enabled: true, revision: 0, history: [] }
    this.applied = true
    this.phase = 'loading'
    this.generation = 0
    this.calls = new Set()
    this.transition = undefined
    this.error = undefined
  }

  managedEntries() {
    return [...this.entries()].filter(entry => OFFICE_PACKAGES.has(entry.options.name))
  }

  state() {
    const names = new Set(this.managedEntries().map(entry => entry.options.name))
    return {
      enabled: this.preference.enabled, applied: this.applied, phase: this.phase,
      generation: this.generation, error: this.error,
      formats: [...(names.has('dsh-ppt') || names.has('dsh-ppt-composer') ? ['ppt'] : []),
        ...(names.has('dsh-office') ? ['word', 'excel'] : [])]
    }
  }

  async initialize() {
    this.preference = await readPreference(this.file)
    await this.applyEntries(this.preference.enabled)
    this.phase = 'idle'
  }

  allows(agent) {
    if (!this.transition) return this.applied && this.phase === 'idle'
    return this.applied && this.draining(agent)
  }

  draining(agent) {
    if (!this.transition) return false
    if (!agent) return false
    const admitted = this.transition.running
    if (admitted.has(agent)) return true
    // Children owned by a draining task must finish with that task.
    const visit = candidate => {
      if (admitted.has(candidate)) return true
      return this.agents().some(parent => parent !== candidate && this.owns(candidate, parent) && visit(parent))
    }
    return visit(agent)
  }

  async beforeStep(agent, signal) {
    const change = this.transition
    if (change && !this.draining(agent)) await waitFor(change.done, signal)
    signal?.throwIfAborted()
    if (this.phase === 'loading' || this.phase === 'error') throw new Error(this.error || 'Office settings are loading')
  }

  trackCall() {
    let finish
    const done = new Promise(resolve => { finish = resolve })
    this.calls.add(done)
    return () => { this.calls.delete(done); finish() }
  }

  async applyEntries(enabled) {
    const entries = this.managedEntries()
    // Word/Excel consumes the mode service supplied by PPT. Stop consumers first.
    entries.sort((a, b) => (a.options.name === 'dsh-office' ? 1 : 0) - (b.options.name === 'dsh-office' ? 1 : 0))
    if (!enabled) entries.reverse()
    const changed = []
    try {
      for (const entry of entries) {
        const disabled = entry.disabled
        if (disabled === !enabled) continue
        await entry.update({ disabled: !enabled })
        changed.push({ entry, disabled })
      }
      this.applied = enabled
      this.afterApply()
    } catch (error) {
      const failures = []
      for (const { entry, disabled } of changed.reverse()) {
        try { await entry.update({ disabled }) } catch (rollback) { failures.push(rollback) }
      }
      if (failures.length) throw new AggregateError([error, ...failures], 'Office plugin transition and recovery failed')
      throw error
    }
  }

  setEnabled(enabled) {
    if (typeof enabled !== 'boolean') throw new Error('enabled must be a boolean')
    if (this.transition) throw new Error('An Office change is already pending')
    if (this.phase === 'loading') throw new Error('Office settings are loading')
    if (this.phase === 'idle' && this.preference.enabled === enabled) return Promise.resolve(this.state())

    const previous = this.preference
    const running = new Set(this.agents().filter(agent => agent.status === 'running'))
    let release
    const done = new Promise(resolve => { release = resolve })
    this.transition = { running, done }
    this.phase = 'saving'
    this.error = undefined
    const next = {
      version: 1, enabled, revision: previous.revision + 1,
      history: [...(previous.history ?? []).slice(-49), { at: new Date().toISOString(), enabled, revision: previous.revision + 1 }]
    }
    // Setting the gate before the first await keeps later tasks out of teardown.
    const operation = async () => {
      let saved = false
      try {
        await this.save(this.file, next)
        saved = true
        this.preference = next
        this.phase = 'pending'
        await Promise.all([...running].map(agent => agent.whenIdle()).concat([...this.calls]))
        this.phase = 'applying'
        await this.applyEntries(enabled)
        this.generation += 1
        this.phase = 'idle'
      } catch (error) {
        this.error = error instanceof Error ? error.message : String(error)
        try {
          if (saved) await this.save(this.file, previous)
          this.preference = previous
          this.phase = this.applied === previous.enabled ? 'idle' : 'error'
        } catch (rollback) {
          this.phase = 'error'
          this.error = `${this.error}; preference recovery failed: ${rollback.message}`
        }
        this.report(error)
      } finally {
        this.transition = undefined
        release()
      }
    }
    this.operation = operation()
    return Promise.resolve(this.state())
  }
}

export function waitFor(promise, signal) {
  if (!signal) return promise
  signal.throwIfAborted()
  return new Promise((resolve, reject) => {
    const aborted = () => reject(signal.reason)
    signal.addEventListener('abort', aborted, { once: true })
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', aborted))
  })
}
