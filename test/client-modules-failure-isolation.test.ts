import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import vm from 'node:vm'
import { describe, expect, it } from 'vitest'
import { projectRoot } from './patch-path'

interface ClientModuleExports {
  createClientModuleSystem(
    target: { mode: string; pendingQueue: unknown[]; load?: (registration: unknown) => void },
    bootstrap: { id: string; exports: unknown },
    options: { boot: unknown; staticModules: Record<string, unknown> }
  ): {
    entries: {
      state: { getSnapshot(): { failures: Array<{ id: string; message: string }> } }
      start(loader: FakeLoader, manifest: unknown): Promise<void>
    }
    manifest: unknown
  }
}

interface FakeEntry {
  id: string
  options: { id?: string; name: string }
  failure?: Error
  fiber?: { state: number }
}

interface FakeLoader {
  ctx: { effect(register: () => unknown): void }
  ensureId(options: FakeEntry['options']): string
  create(options: FakeEntry['options'], parent: null, position: number, settleFailure: boolean): Promise<string>
  resolve(id: string): FakeEntry
  await(): Promise<void>
}

async function loadClientModules(): Promise<ClientModuleExports> {
  const source = await readFile(
    join(projectRoot, 'node_modules/@deepseek-ai/dsh-client-modules/lib/client.js'),
    'utf8'
  )
  let loaded: ClientModuleExports | undefined
  vm.runInNewContext(source, {
    window: {
      __ModuleLoader__: {
        load({ factory }: { factory: (require: (name: string) => never) => ClientModuleExports }) {
          loaded = factory((name) => { throw new Error(`unexpected require: ${name}`) })
        }
      }
    }
  })
  if (!loaded) throw new Error('client modules bundle did not register')
  return loaded
}

function boot(inject: string[]): {
  rev: string
  entries: Array<{ id: string; url: string; rev: string; inject: string[] }>
  batches: Array<{ phase: string; url: string; rev: string; entries: string[] }>
} {
  return {
    rev: 'boot-1',
    entries: [{ id: 'broken-plugin', url: '/plugins/broken-plugin/client.js?rev=1', rev: '1', inject }],
    batches: [{ phase: 'application', url: '/??broken-plugin/client.js&rev=1', rev: '1', entries: ['broken-plugin'] }]
  }
}

function failingLoader(): FakeLoader {
  const entries = new Map<string, FakeEntry>()
  return {
    ctx: { effect(register) { register() } },
    ensureId(options) {
      options.id ??= options.name
      return options.id
    },
    async create(options, _parent, _position, settleFailure) {
      expect(settleFailure).toBe(true)
      const id = options.id ?? options.name
      entries.set(id, { id, options, failure: new Error('incompatible client API') })
      return id
    },
    resolve(id) {
      const entry = entries.get(id)
      if (!entry) throw new Error(`missing entry ${id}`)
      return entry
    },
    async await() {}
  }
}

describe('client workbench failure isolation', () => {
  it('keeps client boot alive and records a failed workbench', async () => {
    const api = await loadClientModules()
    const wire = boot(['dsh-desktop-workbenches'])
    const modules = api.createClientModuleSystem(
      { mode: 'queue', pendingQueue: [] },
      { id: '@deepseek-ai/dsh-client-modules', exports: api },
      { boot: wire, staticModules: {} }
    )

    await expect(modules.entries.start(failingLoader(), modules.manifest)).resolves.toBeUndefined()
    expect(modules.entries.state.getSnapshot().failures).toEqual([{
      id: 'broken-plugin',
      message: 'Error: incompatible client API'
    }])
  })

  it('still rejects a failed required client module', async () => {
    const api = await loadClientModules()
    const wire = boot([])
    const modules = api.createClientModuleSystem(
      { mode: 'queue', pendingQueue: [] },
      { id: '@deepseek-ai/dsh-client-modules', exports: api },
      { boot: wire, staticModules: {} }
    )

    await expect(modules.entries.start(failingLoader(), modules.manifest)).rejects.toThrow(
      'incompatible client API'
    )
  })
})
