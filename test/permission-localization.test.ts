import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'

type ClientBundle = Record<string, unknown>
type BundleDescriptor = {
  factory(require: (id: string) => unknown): ClientBundle
}

function fakeModule(): unknown {
  let fake: unknown
  const target = function () {}
  fake = new Proxy(target, {
    get: () => fake,
    apply: () => fake,
    construct: () => ({})
  })
  return fake
}

async function loadConversationBundle(): Promise<ClientBundle> {
  const source = await readFile(
    'node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js',
    'utf8'
  )
  const requireModule = createRequire(import.meta.url)
  let descriptor: BundleDescriptor | undefined
  runInNewContext(source, {
    window: {
      __ModuleLoader__: {
        load(value: BundleDescriptor) {
          descriptor = value
        }
      }
    }
  })
  if (descriptor === undefined) throw new Error('conversation bundle did not register')
  return descriptor.factory((id) => {
    if (id === 'react') return requireModule('react')
    if (id === 'react/jsx-runtime') return requireModule('react/jsx-runtime')
    return fakeModule()
  })
}

describe('permission menu localization', () => {
  it('uses localized product copy for every built-in permission mode', async () => {
    const bundle = await loadConversationBundle()
    const permissionOptionLabel = bundle.permissionOptionLabel
    expect(permissionOptionLabel).toBeTypeOf('function')
    if (typeof permissionOptionLabel !== 'function') return

    const zh: Record<string, string> = {
      'access.mode.readOnly': '只读',
      'access.mode.workspaceWrite': '工作区写入',
      'access.mode.fullAccess': '完全访问'
    }
    const en: Record<string, string> = {
      'access.mode.readOnly': 'Read Only',
      'access.mode.workspaceWrite': 'Workspace Write',
      'access.mode.fullAccess': 'Full access'
    }
    const options = [
      { value: 'read-only', name: 'read-only' },
      { value: 'workspace-write', name: 'workspace-write' },
      { value: 'danger-full-access', name: 'danger-full-access' }
    ]

    expect(options.map((option) => permissionOptionLabel(option, (key: string) => zh[key] ?? key)))
      .toEqual(['只读', '工作区写入', '完全访问'])
    expect(options.map((option) => permissionOptionLabel(option, (key: string) => en[key] ?? key)))
      .toEqual(['Read Only', 'Workspace Write', 'Full access'])
  })

  it('renders the permission menu outside clipped composer containers', async () => {
    const source = await readFile(
      'node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js',
      'utf8'
    )
    const start = source.indexOf('function PermissionSelect(')
    const end = source.indexOf('\n\t\t//#endregion', start)

    expect(start).toBeGreaterThanOrEqual(0)
    expect(end).toBeGreaterThan(start)
    expect(source.slice(start, end)).toContain('portal: true')
  })
})
