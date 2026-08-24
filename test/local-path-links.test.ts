import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

type Bundle = Record<string, unknown>
type BundleDescriptor = { factory(require: (id: string) => unknown): Bundle }

const requireModule = createRequire(import.meta.url)

function fakeModule(): unknown {
  let fake: unknown
  const target = function () {}
  fake = new Proxy(target, {
    get: () => fake,
    apply: () => fake,
    construct: () => ({}),
  })
  return fake
}

async function loadDeliverables(): Promise<Bundle> {
  const source = await readFile(
    'node_modules/@deepseek-ai/dsh-client-ui-deliverables/lib/client.js',
    'utf8',
  )
  let descriptor: BundleDescriptor | undefined
  runInNewContext(source, {
    window: {
      __ModuleLoader__: {
        load(value: BundleDescriptor) { descriptor = value },
      },
    },
  })
  if (descriptor === undefined) throw new Error('deliverables bundle did not register')
  return descriptor.factory((id) => {
    if (id === 'react') return requireModule('react')
    if (id === 'react/jsx-runtime') return requireModule('react/jsx-runtime')
    return fakeModule()
  })
}

describe('assistant local path links', () => {
  it('exposes the absolute backing path for a relative file mention in the current workspace', async () => {
    const client = await loadDeliverables()
    expect(client.apply).toBeTypeOf('function')
    const provided: Record<string, unknown> = {}
    const ctx = {
      get: () => ({ isLoopback: true }),
      conversationEvents: { register: () => {} },
      effect: (callback: () => void) => { callback() },
      locale: {
        register: () => {},
        bind: () => (_key: string, values: { name: string }) => `Open ${values.name}`,
      },
      slots: {
        inject: (_name: string, callback: () => void) => { callback() },
        register: () => () => {},
      },
      provide: (name: string, value: unknown) => { provided[name] = value },
    }
    ;(client.apply as (ctx: unknown) => void)(ctx)

    const openFile = vi.fn()
    const service = provided.chatFileMentions as {
      forClosing(owner: unknown): {
        resolve(value: string): { title: string; label: string; open(): void } | undefined
      }
    }
    const mentions = service.forClosing({
      turn: { data: new Map() },
      seq: 12,
      cwd: '/Users/me/Project',
      openFile,
    })
    const mention = mentions.resolve('index.html')

    expect(mention?.title).toBe('/Users/me/Project/index.html')
    expect(mention?.label).toBe('Open index.html')
    mention?.open()
    expect(openFile).toHaveBeenCalledWith('index.html')
  })
})
