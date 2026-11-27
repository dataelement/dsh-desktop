import { describe, expect, it, vi } from 'vitest'
import { createWorkbenchSourceCard, createWorkbenchSourceRegistry } from '../../packages/dsh-desktop-workbenches/source-provider.mjs'

const makeProvider = () => ({ sourceId: 'mock', list: vi.fn(async () => []), refresh: vi.fn(async () => []), open: vi.fn(), install: vi.fn(), remove: vi.fn(), availability: vi.fn(async () => 'available') })

describe('Workbench source provider contract', () => {
  it('registers independent providers and removes them', () => {
    const registry = createWorkbenchSourceRegistry()
    const dispose = registry.register(makeProvider())
    expect(registry.list()).toHaveLength(1)
    dispose()
    expect(registry.list()).toHaveLength(0)
  })

  it('rejects providers without the stable source operations', () => {
    expect(() => createWorkbenchSourceRegistry().register({ sourceId: 'invalid' })).toThrow('Workbench provider list is required.')
  })

  it('exposes card states and provider-owned actions', () => {
    const open = vi.fn()
    const install = vi.fn()
    const remove = vi.fn()
    const card = createWorkbenchSourceCard({ id: 'item', sourceId: 'cloud', sourceLabel: 'Cloud' }, { loading: true, error: 'offline', open, install, remove })
    expect(card).toMatchObject({ sourceId: 'cloud', sourceLabel: 'Cloud', loading: true, error: 'offline', actions: { open, install, remove } })
  })
})
