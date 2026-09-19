import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import { OfficeController, readPreference, isOfficeTool } from '../packages/dsh-desktop-office-controls/controller.js'
import { clearOfficeContext, officeIncludeConfig } from '../packages/dsh-desktop-office-controls/index.js'

const directories = []
afterEach(async () => { await Promise.all(directories.splice(0).map(dir => rm(dir, { recursive: true, force: true }))) })
function deferred() {
  let resolve
  const promise = new Promise(done => { resolve = done })
  return { promise, resolve }
}
async function setup(options = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'office-control-'))
  directories.push(directory)
  const changes = []
  const entries = ['dsh-ppt-composer', 'dsh-office', 'dsh-image-generation'].map(name => ({
    options: { name }, disabled: false,
    async update({ disabled }) { this.disabled = disabled; changes.push([name, disabled]) }
  }))
  const agents = []
  const controller = new OfficeController({
    file: join(directory, 'settings.json'), entries: () => entries, agents: () => agents,
    owns: (child, parent) => child.parent === parent, ...options
  })
  await controller.initialize()
  return { controller, directory, entries, agents, changes }
}

describe('one Office plugin switch', () => {
  it('composes a disabled preference into live profile reloads before plugin creation', () => {
    const config = { path: './cordis.yml', patches: [{ id: 'dsh-ppt-composer', disabled: false }] }
    const entries = ['dsh-ppt-composer', 'dsh-office', 'dsh-image-generation'].map(name => ({ options: { id: name, name } }))
    const owner = { subtree: { entries: () => entries } }
    expect(officeIncludeConfig(owner, config, false).patches).toEqual([
      ...config.patches,
      { id: 'dsh-ppt-composer', name: 'dsh-ppt-composer', disabled: true },
      { id: 'dsh-office', name: 'dsh-office', disabled: true }
    ])
    expect(config.patches).toHaveLength(1)
    expect(officeIncludeConfig(owner, config, true)).toBe(config)
    expect(officeIncludeConfig(undefined, config, false)).toBe(config)
  })
  it('unloads all Office plugins, keeps image generation, and restores Office in dependency order', async () => {
    const { controller, entries, changes } = await setup()
    expect(controller.state().formats).toEqual(['ppt', 'word', 'excel'])
    await controller.setEnabled(false)
    await controller.operation
    expect(entries.map(entry => entry.disabled)).toEqual([true, true, false])
    expect(changes).toEqual([['dsh-office', true], ['dsh-ppt-composer', true]])
    await controller.setEnabled(true)
    await controller.operation
    expect(changes.slice(2)).toEqual([['dsh-ppt-composer', false], ['dsh-office', false]])
    expect((await readPreference(controller.file)).history.map(item => item.enabled)).toEqual([false, true])
  })

  it('starts disabled after restart while retaining templates and unrelated profile data', async () => {
    const { controller, entries, directory } = await setup()
    await writeFile(join(directory, 'personal-template.pptx'), 'existing template')
    await controller.setEnabled(false)
    await controller.operation
    entries.forEach(entry => { entry.disabled = false })
    await controller.initialize()
    expect(entries.map(entry => entry.disabled)).toEqual([true, true, false])
    expect(await readFile(join(directory, 'personal-template.pptx'), 'utf8')).toBe('existing template')
  })

  it('drains current tasks and their children while subsequent tasks wait for the switch', async () => {
    const { controller, agents, entries } = await setup()
    const idle = deferred()
    const current = { id: 'current', status: 'running', whenIdle: () => idle.promise }
    const later = { id: 'later', status: 'running' }
    const child = { id: 'child', parent: current, status: 'running' }
    agents.push(current)
    await controller.setEnabled(false)
    agents.push(later, child)
    expect(controller.allows(current)).toBe(true)
    expect(controller.allows(child)).toBe(true)
    expect(controller.allows(later)).toBe(false)
    let started = false
    const waiting = controller.beforeStep(later, new AbortController().signal).then(() => { started = true })
    await new Promise(resolve => setTimeout(resolve, 10))
    expect(started).toBe(false)
    expect(entries[0].disabled).toBe(false)
    idle.resolve()
    await waiting
    expect(entries[0].disabled).toBe(true)
    expect(controller.state().phase).toBe('idle')
  })

  it('waits for a tool already executing outside a model turn', async () => {
    const { controller } = await setup()
    const finish = controller.trackCall()
    await controller.setEnabled(false)
    try {
      await vi.waitFor(() => expect(controller.state().phase).toBe('pending'))
    } finally {
      finish()
      await controller.operation
    }
    expect(controller.state().applied).toBe(false)
  })

  it('lets a waiting task cancel without canceling the requested setting', async () => {
    const { controller, agents } = await setup()
    const idle = deferred()
    agents.push({ id: 'current', status: 'running', whenIdle: () => idle.promise })
    await controller.setEnabled(false)
    const signal = new AbortController()
    const waiting = controller.beforeStep({ id: 'later' }, signal.signal)
    signal.abort(new Error('Canceled'))
    await expect(waiting).rejects.toThrow('Canceled')
    idle.resolve()
    await controller.operation
    expect(controller.state().enabled).toBe(false)
  })

  it('recovers original plugin state and preference if a plugin cannot stop', async () => {
    const { controller, entries } = await setup()
    entries[0].update = async () => { throw new Error('teardown failure') }
    await controller.setEnabled(false)
    await controller.operation
    expect(entries.map(entry => entry.disabled)).toEqual([false, false, false])
    expect(controller.state()).toMatchObject({ enabled: true, applied: true, error: 'teardown failure' })
    expect((await readPreference(controller.file)).enabled).toBe(true)
  })

  it('retains effective state on a failed write and rejects overlapping mutations', async () => {
    const wait = deferred()
    const save = vi.fn(async () => { await wait.promise; throw new Error('disk full') })
    const { controller, entries } = await setup({ save })
    await controller.setEnabled(false)
    expect(() => controller.setEnabled(true)).toThrow('already pending')
    wait.resolve()
    await controller.operation
    expect(entries.every(entry => !entry.disabled)).toBe(true)
    expect(controller.state().enabled).toBe(true)
  })

  it('supports the PPT-only upstream composition and validates persisted state', async () => {
    const { controller, entries } = await setup()
    entries.splice(1)
    expect(controller.state().formats).toEqual(['ppt'])
    expect(() => controller.setEnabled('false')).toThrow('boolean')
    await writeFile(controller.file, '{"version":1,"enabled":"false","revision":0}')
    await expect(readPreference(controller.file)).rejects.toThrow('Invalid Office preference')
    expect(isOfficeTool('office_build')).toBe(true)
    expect(isOfficeTool('pptd_render')).toBe(true)
    expect(isOfficeTool('image_generate')).toBe(false)
  })

  it('retires only derived Office instructions from the active surface', () => {
    const events = [
      { type: 'user/message', data: { source: { kind: 'plugin', plugin: 'dsh-ppt-skill', form: 'snapshot' } } },
      { type: 'user/message', data: { source: { kind: 'plugin', plugin: 'dsh-office-composer', form: 'snapshot' } } },
      { type: 'user/message', data: { source: { kind: 'user' } } },
      { type: 'assistant/message', data: {} }
    ]
    const append = vi.fn()
    clearOfficeContext({ session: { surface: { nodes: [0, 1, 2, 3] }, eventAt: seq => events[seq], append } })
    expect(append).toHaveBeenCalledTimes(2)
    expect(append.mock.calls.map(call => call[2].surfaceOp.startSeq)).toEqual([0, 1])
  })

  it('uses real Cordis Loader disposal and recreation for registered tools and Skills', async () => {
    const ctx = new Context()
    const registered = new Set()
    try {
      await ctx.plugin(Loader)
      for (const name of ['dsh-ppt-composer', 'dsh-office', 'dsh-image-generation']) {
        ctx.loader.builtins[name] = {
          name,
          apply(pluginCtx) {
            pluginCtx.effect(() => {
              registered.add(`${name}:tool`)
              registered.add(`${name}:skill`)
              return () => { registered.delete(`${name}:tool`); registered.delete(`${name}:skill`) }
            })
          }
        }
      }
      // Override only import resolution; entry lifecycle remains the real Loader.
      ctx.loader.import = async name => ctx.loader.builtins[name]
      await ctx.loader.root.update([...Object.keys(ctx.loader.builtins)].map(name => ({ id: name, name })))
      const { controller } = await setup({ entries: () => ctx.loader.entries() })
      expect(registered.size).toBe(6)
      await controller.setEnabled(false)
      await controller.operation
      expect([...registered]).toEqual(['dsh-image-generation:tool', 'dsh-image-generation:skill'])
      await controller.setEnabled(true)
      await controller.operation
      expect(registered.size).toBe(6)
    } finally { await ctx.fiber.dispose() }
  })
})
