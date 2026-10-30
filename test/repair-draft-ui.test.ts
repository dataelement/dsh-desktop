import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

async function load(bridge: unknown) {
  const registrations = new Map<string, (props: unknown) => unknown>()
  const effects: Array<() => unknown> = []
  let definition: { factory: (require: (name: string) => unknown) => { apply: (ctx: unknown) => void } } | undefined
  vm.runInNewContext(await readFile(new URL('../packages/dsh-desktop-client-ui/client.js', import.meta.url), 'utf8'), {
    window: { dshDesktop: bridge, __ModuleLoader__: { load: (value: typeof definition) => { definition = value } } },
    document: { getElementById: () => true }, console
  })
  const plugin = definition!.factory(name => name === 'react' ? {
    createElement: (type: unknown, props: unknown, ...children: unknown[]) => ({ type, props, children }),
    useEffect: (effect: () => unknown) => { effects.push(effect) },
    useState: (initial: unknown) => [initial, vi.fn()], useRef: (current: unknown) => ({ current })
  } : { Tooltip: 'Tooltip' })
  plugin.apply({
    slots: {
      inject: (_name: string, callback: () => unknown) => {
        const result = callback()
        if (result && typeof result === 'object' && Symbol.iterator in result) Array.from(result as Iterable<unknown>)
      },
      register: (config: { id?: string }, component: (props: unknown) => unknown) => { if (config.id) registrations.set(config.id, component) }
    },
    locale: { register: () => undefined, bind: () => (key: string) => key }, effect: (callback: () => unknown) => callback()
  })
  return { registrations, effects }
}

describe('repair draft admission', () => {
  it.each([['empty', '', [], true], ['existing text', 'my question', [], false], ['attachment', '', ['file'], false]] as const)(
    'prefills only an untouched empty composer (%s)', async (_name, text, attachments, shouldInsert) => {
      const bridge = { getRepairDraft: vi.fn(async () => ({ text: 'Please diagnose this issue.', token: 't' })), acknowledgeRepairDraft: vi.fn(async () => ({ ok: true })) }
      const { registrations, effects } = await load(bridge)
      const span = { start: 0, end: 0, draftRev: 0 }
      const actions = { captureInsertion: vi.fn(() => span), insertText: vi.fn(() => true), persistDraft: vi.fn(), submit: vi.fn() }
      registrations.get('desktop-repair-draft')!({ session: { sessionId: 's' }, input: { draft: text, attachmentIds: attachments, phase: 'plain' }, inputActions: actions })
      effects[0]!()
      await vi.waitFor(() => expect(bridge.acknowledgeRepairDraft).toHaveBeenCalledWith('s', 't'))
      expect(actions.insertText).toHaveBeenCalledTimes(shouldInsert ? 1 : 0)
      if (shouldInsert) expect(actions.insertText).toHaveBeenCalledWith('Please diagnose this issue.', span)
      expect(actions.submit).not.toHaveBeenCalled()
    }
  )
  it('rejects a draft whose editor revision changed while IPC was pending', async () => {
    const bridge = { getRepairDraft: vi.fn(async () => ({ text: 'repair', token: 't' })), acknowledgeRepairDraft: vi.fn(async () => ({ ok: true })) }
    const { registrations, effects } = await load(bridge)
    const actions = { captureInsertion: () => ({ draftRev: 0 }), insertText: vi.fn(() => false), persistDraft: vi.fn(), submit: vi.fn() }
    registrations.get('desktop-repair-draft')!({ session: { sessionId: 's' }, input: { draft: '', attachmentIds: [], phase: 'plain' }, inputActions: actions })
    effects[0]!()
    await vi.waitFor(() => expect(bridge.acknowledgeRepairDraft).toHaveBeenCalled())
    expect(actions.insertText).toHaveBeenCalledOnce()
    expect(actions.persistDraft).not.toHaveBeenCalled()
    expect(actions.submit).not.toHaveBeenCalled()
  })
  it('renders an accessible wrench beside the phone and routes the two actions separately', async () => {
    const bridge = { openRepairAgent: vi.fn(async () => ({ ok: true })), openMobilePairing: vi.fn(async () => undefined) }
    const { registrations } = await load(bridge)
    const view = registrations.get('desktop-utilities')!({ t: (key: string) => key, wide: true }) as {
      children: Array<{ type: string; props: Record<string, unknown>; children: unknown[] }>
    }
    const [tooltip, phone] = view.children
    const repair = tooltip?.children[0] as typeof phone
    expect(tooltip?.type).toBe('Tooltip')
    expect(tooltip?.props).toMatchObject({ label: 'description', side: 'top', align: 'end', portal: true, maxWidth: 280, delayMs: 0, focusDelayMs: 0 })
    expect(repair?.props['data-dsh-repair-entry']).toBe(true)
    expect(phone?.props['data-dsh-mobile-entry']).toBe(true)
    expect(repair?.props['aria-label']).toBe('open')
    expect(repair?.props['aria-description']).toBe('description')
    expect(repair?.props.title).toBeUndefined()
    expect(repair?.children[0]).toMatchObject({ type: 'svg', props: { width: 18, height: 18, viewBox: '0 0 24 24' } })
    expect(phone?.children[0]).toMatchObject({ type: 'svg', props: { width: 18, height: 18, viewBox: '0 0 24 24' } })
    expect(repair?.children).not.toContain('open')
    ;(repair?.props.onClick as () => void)()
    await vi.waitFor(() => expect(bridge.openRepairAgent).toHaveBeenCalledOnce())
    ;(phone?.props.onClick as () => void)()
    await vi.waitFor(() => expect(bridge.openMobilePairing).toHaveBeenCalledOnce())
  })
  it('does not persist a rejected revision or apply a draft after unmount', async () => {
    let finish: (value: { text: string; token: string }) => void = () => undefined
    const bridge = { getRepairDraft: () => new Promise(resolve => { finish = resolve }), acknowledgeRepairDraft: vi.fn() }
    const { registrations, effects } = await load(bridge)
    const actions = { captureInsertion: () => ({ draftRev: 0 }), insertText: vi.fn(() => false), persistDraft: vi.fn() }
    registrations.get('desktop-repair-draft')!({ session: { sessionId: 's' }, input: { draft: '', attachmentIds: [], phase: 'plain' }, inputActions: actions })
    const dispose = effects[0]!() as () => void
    dispose()
    finish({ text: 'repair', token: 't' })
    await Promise.resolve()
    expect(actions.insertText).not.toHaveBeenCalled()
    expect(bridge.acknowledgeRepairDraft).not.toHaveBeenCalled()
  })
})
