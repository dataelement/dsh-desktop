import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { patchPath, projectRoot } from './patch-path'

const modelSelectionClient = path.join(
  projectRoot,
  'node_modules',
  '@deepseek-ai',
  'dsh-client-ui-model-selection',
  'lib',
  'client.js'
)

interface Selection {
  provider: string
  model: string
  reasoningEffort?: string
}

interface Catalog {
  default: Selection
  routableProviders: string[]
  groups: Array<{ id: string; models: Array<{ id: string }> }>
}

interface ModelSelectionHelpers {
  catalogServes(selection: Selection | null | undefined, catalog: Catalog): boolean
  replacementSelection(current: Selection, catalog: Catalog): Selection | undefined
  ModelDirectory: new (
    sessions: { selectModel(request: Selection & { sessionId: string }): Promise<{ ok: boolean }> },
    sessionId: string,
    available: () => boolean,
    catalog: { store: SnapshotStore; load(): Promise<unknown> },
    projected: { getSnapshot(): unknown; subscribe(listener: () => void): () => void }
  ) => {
    store: {
      getSnapshot(): { current: Selection | null; groups: Array<{ id: string }>; status: string; error: string | null }
      subscribe(listener: () => void): () => void
    }
    load(): Promise<unknown>
    syncInputs(): void
    dispose(): void
  }
}

interface SnapshotStore {
  getSnapshot(): { value: unknown; status: string; error: string | null }
  set(next: unknown): void
  update(mutate: (draft: Record<string, unknown>) => void): void
  subscribe(listener: () => void): () => void
}

/**
 * The bundle's own store primitive is not stubbed: the composer renders from
 * the store the directory publishes, so the test drives the real engine and
 * only stands in for the modules the browser loader would have supplied.
 */
async function loadBootstrapStore(): Promise<(init: unknown) => SnapshotStore> {
  const engine = (await import('@deepseek-ai/dsh-client-store')) as {
    createSnapshotStore(init: unknown): SnapshotStore
  }
  if (typeof engine.createSnapshotStore !== 'function') {
    throw new Error('the pinned store engine exports no createSnapshotStore')
  }
  return engine.createSnapshotStore
}

/** Load the shipped client bundle with the minimum environment its factory needs. */
async function loadModelSelectionBundle(): Promise<{
  exports: ModelSelectionHelpers
  notifyCatalogChanged(): void
  notifyProjectionChanged(): void
}> {
  const source = await readFile(modelSelectionClient, 'utf8')
  const createSnapshotStore = await loadBootstrapStore()
  const listeners = new Set<() => void>()
  const stubs: Record<string, unknown> = {
    '@deepseek-ai/cordis': { Service: class {} },
    '@deepseek-ai/dsh-client-store': { createSnapshotStore },
    'react/jsx-runtime': {},
    react: {},
    '@deepseek-ai/dsh-client-ui-primitives': {}
  }
  let captured: ModelSelectionHelpers | undefined
  const window = {
    __ModuleLoader__: {
      load({ factory }: { factory: (require: (id: string) => unknown) => unknown }) {
        captured = factory((id: string) => stubs[id]) as ModelSelectionHelpers
      }
    }
  }

  new Function('window', source)(window)
  if (captured === undefined) throw new Error('model-selection bundle exported nothing')
  return {
    exports: captured,
    notifyCatalogChanged: () => {
      for (const listener of [...listeners]) listener()
    },
    notifyProjectionChanged: () => {
      for (const listener of [...listeners]) listener()
    }
  }
}

const catalog: Catalog = {
  default: { provider: 'deepseek-official', model: 'deepseek-v4-pro' },
  routableProviders: ['deepseek-official', 'other'],
  groups: [
    { id: 'deepseek-official', models: [{ id: 'deepseek-v4-pro' }, { id: 'deepseek-v4-flash' }] },
    { id: 'other', models: [{ id: 'legacy-model' }] }
  ]
}

/**
 * Editing a model in Settings can leave a Session's durable selection naming a
 * model the Host no longer serves. That selection has no display name left to
 * resolve, so the composer used to render the bare "provider/model" identifier
 * and the model selector only looked fixed after a manual re-selection.
 */
describe('DSH Desktop model selection after a Settings model edit', () => {
  it('recognizes a selection the refreshed catalog no longer serves', async () => {
    const { exports: { catalogServes } } = await loadModelSelectionBundle()

    expect(catalogServes({ provider: 'deepseek-official', model: 'deepseek-v4-pro' }, catalog)).toBe(true)
    expect(catalogServes({ provider: 'deepseek-official', model: 'deepseek-v4-flash' }, catalog)).toBe(true)
    expect(catalogServes({ provider: 'deepseek-official', model: 'removed-model' }, catalog)).toBe(false)
    expect(catalogServes({ provider: 'retired-provider', model: 'deepseek-v4-pro' }, catalog)).toBe(false)
    expect(catalogServes(undefined, catalog)).toBe(false)
    expect(catalogServes(null, catalog)).toBe(false)
  })

  it('follows the deployment default when the selected model was removed', async () => {
    const { exports: { replacementSelection } } = await loadModelSelectionBundle()

    expect(
      replacementSelection({ provider: 'deepseek-official', model: 'deepseek-v4-flash' }, {
        ...catalog,
        default: { provider: 'deepseek-official', model: 'deepseek-v4-pro' }
      })
    ).toEqual({ provider: 'deepseek-official', model: 'deepseek-v4-pro' })
  })

  it('falls through a default that went stale in the same edit', async () => {
    const { exports: { replacementSelection } } = await loadModelSelectionBundle()

    // The removed model is also the deployment default, which is exactly the
    // state a Settings-driven model rename leaves behind.
    expect(
      replacementSelection({ provider: 'deepseek-official', model: 'removed-model' }, {
        default: { provider: 'deepseek-official', model: 'removed-model' },
        routableProviders: ['deepseek-official'],
        groups: [{ id: 'deepseek-official', models: [{ id: 'deepseek-v4-pro' }] }]
      })
    ).toEqual({ provider: 'deepseek-official', model: 'deepseek-v4-pro' })
  })

  it('never replaces with the model it is replacing', async () => {
    const { exports: { replacementSelection } } = await loadModelSelectionBundle()

    const replacement = replacementSelection({ provider: 'deepseek-official', model: 'deepseek-v4-pro' }, {
      ...catalog,
      default: { provider: 'deepseek-official', model: 'deepseek-v4-pro' }
    })

    expect(replacement).not.toEqual({ provider: 'deepseek-official', model: 'deepseek-v4-pro' })
    expect(replacement).toEqual({ provider: 'deepseek-official', model: 'deepseek-v4-flash' })
  })

  it('offers only routable providers when the catalog names any', async () => {
    const { exports: { replacementSelection } } = await loadModelSelectionBundle()

    const replacement = replacementSelection({ provider: 'deepseek-official', model: 'gone' }, {
      default: { provider: 'deepseek-official', model: 'also-gone' },
      routableProviders: ['other'],
      groups: [
        { id: 'deepseek-official', models: [{ id: 'unroutable-model' }] },
        { id: 'other', models: [{ id: 'legacy-model' }] }
      ]
    })

    expect(replacement).toEqual({ provider: 'other', model: 'legacy-model' })
  })

  it('reports no replacement when the catalog serves nothing else', async () => {
    const { exports: { replacementSelection } } = await loadModelSelectionBundle()

    expect(
      replacementSelection({ provider: 'deepseek-official', model: 'gone' }, {
        default: { provider: 'deepseek-official', model: 'gone' },
        routableProviders: ['deepseek-official'],
        groups: [{ id: 'deepseek-official', models: [{ id: 'gone' }] }]
      })
    ).toBeUndefined()
  })
})

describe('DSH Desktop model selection reconciliation wiring', () => {
  /** Build one directory over a catalog store whose value the test controls. */
  async function directoryHarness(options: {
    catalog: Catalog | null
    selected: Selection | null
  }): Promise<{
    directory: InstanceType<ModelSelectionHelpers['ModelDirectory']>
    selections: Array<Selection & { sessionId: string }>
    publishCatalog(next: Catalog): void
    dispose(): void
  }> {
    const { exports, notifyCatalogChanged } = await loadModelSelectionBundle()
    const createSnapshotStore = await loadBootstrapStore()
    const catalogStore = createSnapshotStore({
      value: options.catalog,
      status: options.catalog === null ? 'loading' : 'ready',
      error: null
    })
    const selections: Array<Selection & { sessionId: string }> = []
    const directory = new exports.ModelDirectory(
      {
        selectModel: async (request) => {
          selections.push(request)
          return { ok: true }
        }
      },
      'session-1',
      () => true,
      {
        store: catalogStore,
        load: async () => catalogStore.getSnapshot().value
      },
      {
        getSnapshot: () => (options.selected === null ? undefined : { next: options.selected }),
        subscribe: () => () => undefined
      }
    )

    return {
      directory,
      selections,
      publishCatalog: (next) => {
        catalogStore.set({ value: next, status: 'ready', error: null })
        notifyCatalogChanged()
      },
      dispose: () => directory.dispose()
    }
  }

  it('follows the deployment default and records it as the Session selection', async () => {
    const harness = await directoryHarness({
      catalog,
      selected: { provider: 'deepseek-official', model: 'deepseek-v4-flash-vision-exp' }
    })

    try {
      await harness.directory.load()

      // The composer renders the name the catalog carries, not the bare id.
      expect(harness.directory.store.getSnapshot().current).toEqual({
        provider: 'deepseek-official',
        model: 'deepseek-v4-pro'
      })
      expect(harness.directory.store.getSnapshot().status).toBe('ready')
      expect(harness.selections).toEqual([
        { sessionId: 'session-1', provider: 'deepseek-official', model: 'deepseek-v4-pro' }
      ])
    } finally {
      harness.dispose()
    }
  })

  it('replaces a selection whose model disappeared from the refreshed catalog', async () => {
    const harness = await directoryHarness({
      catalog,
      selected: { provider: 'deepseek-official', model: 'deepseek-v4-flash' }
    })

    try {
      await harness.directory.load()
      expect(harness.directory.store.getSnapshot().current).toEqual({
        provider: 'deepseek-official',
        model: 'deepseek-v4-flash'
      })
      expect(harness.selections).toHaveLength(0)

      // The Settings edit removes the model; the catalog re-fetch is the only
      // event the selector gets.
      harness.publishCatalog({
        default: { provider: 'deepseek-official', model: 'deepseek-v4-pro' },
        routableProviders: ['deepseek-official'],
        groups: [{ id: 'deepseek-official', models: [{ id: 'deepseek-v4-pro' }] }]
      })
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(harness.directory.store.getSnapshot().current).toEqual({
        provider: 'deepseek-official',
        model: 'deepseek-v4-pro'
      })
      expect(harness.selections).toEqual([
        { sessionId: 'session-1', provider: 'deepseek-official', model: 'deepseek-v4-pro' }
      ])
    } finally {
      harness.dispose()
    }
  })

  it('attempts one replacement per catalog value, never a chain', async () => {
    const harness = await directoryHarness({
      catalog,
      selected: { provider: 'deepseek-official', model: 'deepseek-v4-flash' }
    })

    try {
      await harness.directory.load()
      const stale = {
        default: { provider: 'deepseek-official', model: 'deepseek-v4-pro' },
        routableProviders: ['deepseek-official'],
        groups: [{ id: 'deepseek-official', models: [{ id: 'deepseek-v4-pro' }] }]
      }
      harness.publishCatalog(stale)
      await new Promise((resolve) => setTimeout(resolve, 0))
      // Re-delivering the same catalog must not re-select anything.
      harness.publishCatalog(stale)
      harness.publishCatalog(stale)
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(harness.selections).toHaveLength(1)
    } finally {
      harness.dispose()
    }
  })

  it('leaves a selection the catalog still serves alone', async () => {
    const harness = await directoryHarness({
      catalog,
      selected: { provider: 'other', model: 'legacy-model' }
    })

    try {
      await harness.directory.load()
      harness.publishCatalog({ ...catalog, default: { provider: 'deepseek-official', model: 'deepseek-v4-pro' } })
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(harness.directory.store.getSnapshot().current).toEqual({
        provider: 'other',
        model: 'legacy-model'
      })
      expect(harness.selections).toHaveLength(0)
    } finally {
      harness.dispose()
    }
  })

  it('holds the selection while the catalog is unloaded or failed', async () => {
    const harness = await directoryHarness({
      catalog: null,
      selected: { provider: 'deepseek-official', model: 'gone' }
    })

    try {
      expect(harness.directory.store.getSnapshot().current).toBeNull()
      expect(harness.selections).toHaveLength(0)
      // A failed refresh resolves nothing: the selection survives for the retry.
      expect(harness.directory.store.getSnapshot().status).toBe('loading')
    } finally {
      harness.dispose()
    }
  })

  it('adopts the replacement as a real selection so the Session stops naming the removed model', async () => {
    const client = await readFile(modelSelectionClient, 'utf8')

    expect(client).toContain('reconciledCatalog')
    expect(client).toContain('this.followDefault(pinned, catalog.value) ?? pinned')
    expect(client).toContain('this.adopting = true')
    expect(client).toContain('this.select({')
  })

  it('marks the catalog value before starting the replacement', async () => {
    const client = await readFile(modelSelectionClient, 'utf8')
    const reconcile = client.slice(
      client.indexOf('const pinned = projected.next ?? catalog.value.default;'),
      client.indexOf('this.resolved = true;')
    )

    // Settling the replacement re-enters syncInputs with the same catalog; the
    // marker has to be recorded before that, or every later notification for
    // that catalog would select again.
    expect(reconcile.indexOf('this.reconciledCatalog = fingerprint;')).toBeLessThan(
      reconcile.indexOf('this.followDefault(pinned, catalog.value)')
    )
    expect(reconcile).toContain('if (this.adopting) return;')
    expect(reconcile).toContain('if (stale && this.reconciledCatalog !== fingerprint)')
  })

  it('leaves the catalog untouched while it is still loading or failed', async () => {
    const { exports: { catalogServes } } = await loadModelSelectionBundle()

    // The class returns true for a non-ready catalog, so a failed refresh can
    // never start a replacement chain against half a catalog.
    expect(catalogServes({ provider: 'deepseek-official', model: 'removed' }, catalog)).toBe(false)
    const client = await readFile(modelSelectionClient, 'utf8')
    expect(client).toContain('if (catalog.status !== "ready" || catalog.value === null) return true;')
  })

  it('carries the reconciliation in the reproducible dependency patch', async () => {
    const patch = await readFile(patchPath('@deepseek-ai/dsh-client-ui-model-selection'), 'utf8')

    expect(patch).toContain('function catalogServes(selection, catalog)')
    expect(patch).toContain('function replacementSelection(current, catalog)')
    expect(patch).toContain('exports.catalogServes = catalogServes')
    expect(patch).toContain('exports.replacementSelection = replacementSelection')
    expect(patch).toContain('reconciledCatalog')
    expect(patch).toContain('followDefault(pinned, catalog.value)')
  })
})
