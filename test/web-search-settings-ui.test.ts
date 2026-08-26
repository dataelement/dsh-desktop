import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'

const requireModule = createRequire(import.meta.url)
const { renderToStaticMarkup } = requireModule('react-dom/server') as {
  renderToStaticMarkup(node: unknown): string
}

type BundleDescriptor = {
  factory(require: (id: string) => unknown): { apply(ctx: unknown): void }
}

type SlotRegistration = {
  options: { key?: string }
  component: (props: Record<string, unknown>) => {
    props: { children: unknown }
  }
}

function fakeComponentModule(): unknown {
  let fake: unknown
  const component = () => null
  fake = new Proxy(
    { ChevronDown: component },
    {
      get(target, property) {
        return Reflect.get(target, property) ?? component
      }
    }
  )
  return fake
}

function snapshotStore<T>(initial: T) {
  let value = initial
  return {
    getSnapshot: () => value,
    subscribe: () => () => undefined,
    set: (next: T) => {
      value = next
    }
  }
}

async function settingsPluginBundle() {
  const source = await readFile(
    'node_modules/@deepseek-ai/dsh-client-ui-settings-plugins/lib/client.js',
    'utf8'
  )
  let descriptor: BundleDescriptor | undefined
  runInNewContext(source, {
    window: {
      __ModuleLoader__: {
        load(value: BundleDescriptor) {
          descriptor = value
        }
      }
    },
    document: undefined
  })
  if (!descriptor) throw new Error('settings plugin did not register')
  const react = requireModule('react')
  const jsxRuntime = requireModule('react/jsx-runtime')
  return descriptor.factory((id) => {
    if (id === 'react') return react
    if (id === 'react/jsx-runtime') return jsxRuntime
    if (id === '@deepseek-ai/dsh-client-runtime/client') {
      return { createSnapshotStore: snapshotStore }
    }
    if (id === '@deepseek-ai/dsh-client-ui-slots') {
      return { resolveSlotLabel: (label: unknown) => label }
    }
    if (id === '@deepseek-ai/dsh-client-ui-primitives') return fakeComponentModule()
    return fakeComponentModule()
  })
}

describe('web search settings card', () => {
  it('renders the automatic, native-only, and off choices for the new search namespace', async () => {
    const registrations: SlotRegistration[] = []
    const dictionaries: Record<string, Record<string, string>> = {}
    const scope = {
      getSnapshot: () => ({
        status: 'ready',
        writable: true,
        value: { mode: 'auto' },
        base: { mode: 'auto' },
        user: undefined
      }),
      subscribe: () => () => undefined,
      set: async () => undefined,
      unset: async () => undefined
    }
    const slots = {
      entries: () => [],
      getVersion: () => 0,
      subscribe: () => () => undefined,
      register: (options: SlotRegistration['options'], component: SlotRegistration['component']) => {
        if (options.key) registrations.push({ options, component })
        return undefined
      },
      inject: (_name: string, install: () => unknown) => {
        const result = install()
        if (result && typeof (result as Iterable<unknown>)[Symbol.iterator] === 'function') {
          Array.from(result as Iterable<unknown>)
        }
      }
    }
    const api = {
      settings: {
        describe: async () => ({
          result: {
            ok: true,
            value: { namespaces: [{ ns: 'web-search-session-model' }] }
          }
        })
      },
      credentials: {
        describe: async () => ({
          result: { ok: true, value: { credentials: {} } }
        })
      }
    }
    const bundle = await settingsPluginBundle()
    bundle.apply({
      get: (name: string) => (name === 'connection' ? { api } : undefined),
      effect: (install: () => unknown) => {
        install()
      },
      on: () => () => undefined,
      remote: { $on: () => () => undefined },
      settingsScope: { bind: () => scope },
      slots,
      locale: {
        bind: () => (key: string) => dictionaries.zh?.[key] ?? key,
        register: (_namespace: string, values: Record<string, Record<string, string>>) => {
          Object.assign(dictionaries, values)
          return () => undefined
        },
        getSnapshot: () => ({ revision: 0 }),
        subscribe: () => () => undefined
      }
    })

    const registration = registrations.find(
      ({ options }) => options.key === 'web-search-session-model'
    )
    expect(registration).toBeDefined()
    if (!registration) return

    const card = registration.component({
      t: (key: string) => dictionaries.zh?.[key] ?? key,
      useWebSearchCard: (select: (value: unknown) => unknown) =>
        select({
          available: true,
          writable: true,
          dirty: false,
          invalid: false,
          saving: false,
          failed: false,
          mode: { text: 'auto', overridden: false, invalid: false }
        }),
      edit: () => undefined,
      resetField: () => undefined,
      save: () => undefined,
      discard: () => undefined
    })
    const html = renderToStaticMarkup(card.props.children)

    expect(html).toContain('id="plugin-config-web-search-mode"')
    expect(html).toContain('value="auto" selected="">自动（推荐）')
    expect(html).toContain('value="native-only">仅模型原生')
    expect(html).toContain('value="off">关闭')
    expect(html).not.toContain('API Key')
  })
})
