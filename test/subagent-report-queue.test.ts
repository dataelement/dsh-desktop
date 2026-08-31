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
      snapshot(): Array<{ anchorSeq?: number; source?: { kind?: string } }>
    })()
    mirror.replace([
      {
        id: 'queue-1',
        anchorSeq: 66,
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
    expect(mirror.snapshot()[0]?.anchorSeq).toBe(66)
  })

  it('anchors pending queue rows to the durable splice sequence', async () => {
    const host = await import('@deepseek-ai/dsh-host-apiproxy') as unknown as Record<string, unknown>
    expect(host.rememberQueueAnchorSeqs).toBeTypeOf('function')
    expect(host.projectQueueItems).toBeTypeOf('function')
    if (
      typeof host.rememberQueueAnchorSeqs !== 'function' ||
      typeof host.projectQueueItems !== 'function'
    ) return

    const anchors = new Map<string, number>()
    const message = {
      id: 'steering-1',
      source: { kind: 'user' },
      content: [{ type: 'text', text: '继续，但先回答这个问题' }]
    }
    const splice = {
      target: 'next-step',
      start: 0,
      removedCount: 0,
      inserted: [message]
    }

    ;(host.rememberQueueAnchorSeqs as (
      anchors: Map<string, number>,
      event: { type: string; seq: number; data: typeof splice }
    ) => void)(anchors, {
      type: 'agent/inbox/spliced',
      seq: 66,
      data: splice
    })

    const items = (host.projectQueueItems as (
      agent: { inbox: { nextTurn: unknown[]; nextStep: unknown[] } },
      change: typeof splice,
      anchors: ReadonlyMap<string, number>
    ) => Array<{ id: string; anchorSeq?: number; placement: string }>)(
      { inbox: { nextTurn: [], nextStep: [] } },
      splice,
      anchors
    )

    expect(items).toEqual([
      {
        id: 'steering-1',
        anchorSeq: 66,
        placement: 'steering',
        message
      }
    ])
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
