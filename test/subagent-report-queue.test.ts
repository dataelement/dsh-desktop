import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
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

async function loadClientBundle(packageName: string): Promise<ClientBundle> {
  const source = await readFile(
    `node_modules/@deepseek-ai/${packageName}/lib/client.js`,
    'utf8'
  )
  const requireModule = createRequire(import.meta.url)
  const react = requireModule('react')
  const jsxRuntime = requireModule('react/jsx-runtime')
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
  if (descriptor === undefined) throw new Error(`${packageName} did not register its client bundle`)

  return descriptor.factory((id) => {
    if (id === 'react') return react
    if (id === 'react/jsx-runtime') return jsxRuntime
    return fakeModule()
  })
}

describe('background subagent report queue', () => {
  it('preserves message provenance in the client queue projection', async () => {
    const client = await loadClientBundle('dsh-client-runtime')
    expect(client.SessionQueueMirror).toBeTypeOf('function')
    if (typeof client.SessionQueueMirror !== 'function') return

    const mirror = new (client.SessionQueueMirror as new () => {
      replace(items: unknown[]): void
      snapshot(): Array<{ source?: { kind?: string } }>
    })()
    mirror.replace([
      {
        id: 'queue-1',
        placement: 'queued',
        message: {
          id: 'message-1',
          content: [{ type: 'text', text: 'Background subagent child-1 reported:' }],
          source: {
            kind: 'subagent-report',
            form: 'relay',
            senderSessionId: 'child-1'
          }
        }
      }
    ])

    expect(mirror.snapshot()[0]?.source).toEqual({
      kind: 'subagent-report',
      form: 'relay',
      senderSessionId: 'child-1'
    })
  })

  it('keeps internal subagent traffic out of the user-controlled queue', async () => {
    const client = await loadClientBundle('dsh-client-ui-conversation')
    expect(client.userQueuedMessages).toBeTypeOf('function')
    if (typeof client.userQueuedMessages !== 'function') return

    const rows = [
      {
        id: 'user-message',
        placement: 'queued',
        source: { kind: 'user' }
      },
      {
        id: 'subagent-report',
        placement: 'queued',
        source: { kind: 'subagent-report' }
      },
      {
        id: 'subagent-settled',
        placement: 'queued',
        source: { kind: 'subagent-settled' }
      },
      {
        id: 'steering-user-message',
        placement: 'steering',
        source: { kind: 'user' }
      }
    ]

    const visible = (client.userQueuedMessages as (items: typeof rows) => typeof rows)(rows)

    expect(visible.map(({ id }) => id)).toEqual(['user-message'])
  })
})
