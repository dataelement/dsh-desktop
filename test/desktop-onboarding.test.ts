import { readFileSync } from 'node:fs'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import vm from 'node:vm'
import { describe, expect, it, vi } from 'vitest'
import { patchPath, projectRoot } from './patch-path'
// @ts-expect-error Local host plugins are authored as ESM JavaScript.
import { Config as HostConfig, apply as applyHost } from '../packages/dsh-desktop-onboarding/index.js'

interface Registration {
  config: {
    name: string
    id?: string
    order?: number
    priority?: number
    inject?: () => Record<string, unknown>
  }
  component: (props: Record<string, unknown>) => unknown
}

interface CtxHarness {
  inject: (deps: string[], callback: (scope: CtxHarness) => unknown) => unknown
  effect: (fn: () => unknown | (() => void)) => () => void
  locale: {
    register: (ns: string, dicts: Record<string, Record<string, string>>) => void
    bind: (ns: string) => (key: string) => string
  }
  settingsScope: {
    bind: (spec: { namespace: string }) => unknown
    describe: () => unknown
  }
  remote: {
    llm: {
      listProviders: () => Promise<{ ok: boolean; value?: unknown; error?: { message: string } }>
      listConfigurableProviders: () => Promise<{ ok: boolean; value?: unknown; error?: { message: string } }>
    }
    credentials: {
      describe: (refs: string[]) => Promise<{ ok: boolean; value?: Record<string, unknown>; error?: { message: string } }>
      set: (ref: string, value: string) => Promise<{ ok: boolean; error?: { message: string } }>
      unset: (ref: string) => Promise<{ ok: boolean; error?: { message: string } }>
    }
    settings: {
      mutate: (
        ns: string,
        ops: unknown[],
        revision?: number
      ) => Promise<{ ok: boolean; value?: unknown; error?: { code?: string; message: string } }>
    }
  }
  settingsSchema: {
    rehydrate: (schema: unknown) => unknown
    nodeAtPath: (root: unknown, path: readonly string[]) => unknown
  }
  slots: {
    inject: (name: string, callback: () => unknown) => unknown
    register: (config: Registration['config'], component: Registration['component']) => () => void
  }
}

function createReactStub() {
  const createElement = (
    type: unknown,
    props: Record<string, unknown> | null,
    ...children: unknown[]
  ): { type: unknown; props: Record<string, unknown>; children: unknown[] } => ({
    type,
    props: { ...(props ?? {}) },
    children
  })
  const Fragment = Symbol.for('react.fragment')
  const element = (init: unknown) => [init, () => undefined]
  return {
    Fragment,
    createElement,
    useState: element,
    useEffect: () => undefined,
    useMemo: (factory: () => unknown) => factory(),
    useCallback: (factory: (...args: unknown[]) => unknown) => factory,
    useRef: (init: unknown) => ({ current: init }),
    useSyncExternalStore: (_subscribe: unknown, getSnapshot: () => unknown) => getSnapshot()
  } as const
}

function createPrimitiveStub() {
  const passthrough = () => null
  return {
    OnboardingSurface: passthrough,
    Button: passthrough,
    Modal: passthrough,
    Input: passthrough,
    IconApiOutline14: passthrough,
    IconSettingsOutline16: passthrough,
    IconFolderOpenOutline16: passthrough,
    IconChevronRightOutline14: passthrough,
    IconChevronLeftOutline14: passthrough,
    IconCloseOutline16: passthrough,
    IconCheckOutline16: passthrough,
    IconSparkle16: passthrough,
    IconGlobeOutline14: passthrough,
    IconFolderClose16: passthrough,
    IconShieldOutline16: passthrough,
    IconCordisPluginOutline14: passthrough
  } as const
}

function loadPlugin() {
  const source = readFileSync(
    path.join(projectRoot, 'packages', 'dsh-desktop-onboarding', 'client.js'),
    'utf8'
  )
  let definition: {
    id: string
    factory: (require: (id: string) => unknown) => {
      apply: (ctx: CtxHarness) => void
      inject: string[]
      onboardingDecision: (value: unknown) => 'show' | 'complete'
    }
  } | undefined
  const appended: Array<{ id?: string; textContent?: string }> = []
  const document = {
    getElementById: vi.fn(() => null),
    createElement: vi.fn(() => ({ id: '', dataset: {}, textContent: '' })),
    head: { appendChild: (node: { id?: string; textContent?: string }) => appended.push(node) }
  }
  vm.runInNewContext(source, {
    document,
    navigator: { language: 'en-US' },
    window: {
      __ModuleLoader__: {
        load: (value: typeof definition) => {
          definition = value
        }
      }
    }
  })
  if (!definition) throw new Error('client.js did not register a plugin definition')
  const React = createReactStub()
  const primitives = createPrimitiveStub()
  return {
    plugin: definition.factory((id) => {
      if (id === 'react') return React
      if (id === '@deepseek-ai/dsh-client-ui-primitives') return primitives
      if (id === '@deepseek-ai/dsh-client-ui-settings-models') return {
        ModelsSection: primitives.OnboardingSurface,
        ModelsSettingsStore: class {
          store = { subscribe: () => () => undefined, getSnapshot: () => ({}) }
        },
        createModelsOperations: () => ({}),
        createSettingsSchemaOperations: () => ({}),
        refreshIfLoaded: () => undefined
      }
      throw new Error(`Unexpected client dependency: ${id}`)
    }),
    appended,
    React,
    primitives
  }
}

function createCtx(overrides: Partial<CtxHarness> = {}): { ctx: CtxHarness; registrations: Registration[] } {
  const registrations: Registration[] = []
  const slots: CtxHarness['slots'] = {
    inject: (_name, callback) => callback(),
    register: (config, component) => {
      registrations.push({ config, component })
      return () => undefined
    }
  }
  const noopEffect = () => () => undefined
  const ctx: CtxHarness = {
    inject: (_deps, callback) => callback(ctx),
    effect: noopEffect,
    locale: {
      register: () => undefined,
      bind: () => (key: string) => key
    },
    settingsScope: {
      bind: () => ({ getSnapshot: () => ({ mode: 'memory', value: {} }), subscribe: () => () => undefined, set: async () => undefined }),
      describe: () => ({ ensure: async () => undefined, getSnapshot: () => ({ view: undefined }) })
    },
    remote: {
      llm: { listProviders: async () => ({ ok: true, value: [] }), listConfigurableProviders: async () => ({ ok: true, value: [] }) },
      credentials: {
        describe: async () => ({ ok: true, value: {} }),
        set: async () => ({ ok: true }),
        unset: async () => ({ ok: true })
      },
      settings: { mutate: async () => ({ ok: true, value: {} }) }
    },
    settingsSchema: {
      rehydrate: () => ({}),
      nodeAtPath: () => undefined
    },
    slots,
    ...overrides
  }
  return { ctx, registrations }
}

describe('DSH Desktop onboarding wizard', () => {
  it('shows a single notice modal that links straight to the models settings', () => {
    const source = readFileSync(
      path.join(projectRoot, 'packages', 'dsh-desktop-onboarding', 'client.js'),
      'utf8'
    )
    expect(source).toContain("const WIZARD_ACK_FIELD = 'wizardVersion'")
    expect(source).toContain("const MODELS_SECTION_ID = 'models'")
    expect(source).toContain('openSection(MODELS_SECTION_ID)')
    expect(source).not.toContain('OnboardingSurface')
    expect(source).not.toContain('ModelsSection')
    expect(source).toContain('https://github.com/dataelement/dsh-desktop\'')
    expect(source).not.toContain('dsh-desktop/issues')
    expect(source).toContain('GITHUB_MARK_PATH')
    expect(source).toContain('IconGlobeOutline14')
  })

  it('registers the desktop notice as the only onboarding step', () => {
    const { plugin, appended } = loadPlugin()
    const { ctx, registrations } = createCtx()
    plugin.apply(ctx)

    expect(plugin.inject).toEqual([])
    const onboardingRegistrations = registrations.filter(({ config }) => config.name === 'settings.onboarding')
    expect(onboardingRegistrations).toHaveLength(1)
    const [onboardingRegistration] = onboardingRegistrations
    expect(onboardingRegistration).toBeDefined()
    const { config } = onboardingRegistration as Registration
    expect(config.id).toBe('dsh-desktop-onboarding')
    expect(config.order).toBe(0)
    expect(typeof config.inject).toBe('function')

    expect(appended).toHaveLength(1)
    const [styleTag] = appended
    expect(styleTag?.id).toBe('dsh-desktop-onboarding-style')
  })

  it('registers both Chinese and English dictionaries on the desktop-onboarding namespace', () => {
    const localeSpy = vi.fn()
    const { plugin } = loadPlugin()
    const { ctx } = createCtx({
      locale: {
        register: localeSpy,
        bind: () => (key: string) => key
      }
    })
    plugin.apply(ctx)
    expect(localeSpy).toHaveBeenCalledTimes(1)
    const [ns, dicts] = localeSpy.mock.calls[0]!
    expect(ns).toBe('desktop-onboarding')
    expect(Object.keys(dicts as object).sort()).toEqual(['en', 'zh'])
    const dictsRecord = dicts as Record<string, Record<string, string>>
    const zh = dictsRecord.zh ?? {}
    const en = dictsRecord.en ?? {}
    expect(Object.keys(zh).sort()).toEqual(Object.keys(en).sort())
    expect(zh.step0Title).toBe('内测声明')
    expect(zh.configureModel).toBe('去配置模型')
    expect(en.configureModel).toBeTruthy()
    expect(en.later).toBeTruthy()
  })

  it('shows only an eligible install with no acknowledgement', () => {
    const { plugin } = loadPlugin()
    expect(plugin.onboardingDecision({ eligible: true })).toBe('show')
    expect(plugin.onboardingDecision({ eligible: false })).toBe('complete')
    expect(plugin.onboardingDecision({})).toBe('complete')
  })

  it('treats every non-empty wizard version as acknowledgement', () => {
    const { plugin } = loadPlugin()
    expect(plugin.onboardingDecision({ eligible: true, wizardVersion: 'old-version' })).toBe('complete')
    expect(plugin.onboardingDecision({ eligible: true, wizardVersion: '  ' })).toBe('complete')
  })
})

describe('DSH Desktop onboarding composition', () => {
  it('shows the first-run notice at launch rather than only on a blank conversation', async () => {
    const [patch, installed] = await Promise.all([
      readFile(patchPath('@deepseek-ai/dsh-client-ui-settings-general'), 'utf8'),
      readFile(
        path.join(projectRoot, 'node_modules', '@deepseek-ai', 'dsh-client-ui-settings-general', 'lib', 'client.js'),
        'utf8'
      )
    ])
    const gate = 'const onboardingActive = useSessions((state) => state.phase === "ready");'
    expect(patch).toContain('+\t\t\t' + gate)
    expect(installed).toContain(gate)
    expect(installed).not.toContain('state.byId[state.current]?.blank === true));')
  })

  it('is mounted by the desktop profile patch yml', async () => {
    const patch = await readFile(
      path.join(projectRoot, 'build', 'dsh-desktop.patch.yml'),
      'utf8'
    )
    const normalized = patch.replaceAll('\r\n', '\n')
    expect(normalized).toMatch(/- id: dsh-desktop-onboarding\n      name: dsh-desktop-onboarding/u)
  })

  it('declares a file dependency from the root manifest', async () => {
    const manifest = await readFile(path.join(projectRoot, 'package.json'), 'utf8')
    const parsed = JSON.parse(manifest) as { dependencies?: Record<string, string> }
    expect(parsed.dependencies?.['dsh-desktop-onboarding']).toBe('file:packages/dsh-desktop-onboarding')
  })

  it('declares the renderer that provides its slots service as a direct client dependency', async () => {
    const manifest = await readFile(
      path.join(projectRoot, 'packages', 'dsh-desktop-onboarding', 'package.json'),
      'utf8'
    )
    const parsed = JSON.parse(manifest) as { dsh?: { client?: { inject?: string[] } } }
    expect(parsed.dsh?.client?.inject).toContain('@deepseek-ai/dsh-client-ui-renderer')
  })

  it('is reachable from the @deepseek-ai/dsh dependency closure', async () => {
    const dshPatch = await readFile(patchPath('@deepseek-ai/dsh'), 'utf8')
    expect(dshPatch).toContain('+    "dsh-desktop-onboarding": "0.1.0",')
  })
})

describe('DSH Desktop onboarding host eligibility', () => {
  function createHostHarness() {
    const configure = vi.fn(() => () => undefined)
    const fiber = { uid: 1 }
    return {
      configure,
      fiber,
      ctx: {
        fiber,
        inject: (_deps: string[], callback: (ctx: unknown) => void) => callback({
          effect: (effect: () => unknown) => effect(),
          // Reproduce the Cordis proxy symptom from the packaged Harness: the
          // legacy name is present but is not callable. The 0.1.7 integration
          // must not read it at all.
          settings: { register: { shadowed: true }, configure }
        })
      }
    }
  }

  it('publishes eligible only for a valid new-install marker', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'dsh-onboarding-host-'))
    const previous = process.env.DSH_HOME
    try {
      process.env.DSH_HOME = root
      await writeFile(path.join(root, '.desktop-install-state.json'), JSON.stringify({
        schemaVersion: 1,
        classification: 'new',
        firstSeenVersion: '1.0.0',
        classifiedAt: '2026-09-23T00:00:00.000Z'
      }))
      const first = createHostHarness()
      const firstConfig = { eligible: false }
      applyHost(first.ctx, firstConfig)
      expect(firstConfig.eligible).toBe(true)
      expect(first.configure).toHaveBeenCalledWith({ auto: false }, first.fiber)

      await writeFile(path.join(root, '.desktop-install-state.json'), '{broken')
      const brokenConfig = { eligible: true }
      applyHost(createHostHarness().ctx, brokenConfig)
      expect(brokenConfig.eligible).toBe(false)

      await writeFile(path.join(root, '.desktop-install-state.json'), JSON.stringify({
        schemaVersion: 1,
        classification: 'existing',
        firstSeenVersion: '1.0.0',
        classifiedAt: '2026-09-23T00:00:00.000Z'
      }))
      const existingConfig = { eligible: true }
      applyHost(createHostHarness().ctx, existingConfig)
      expect(existingConfig.eligible).toBe(false)

      await rm(path.join(root, '.desktop-install-state.json'))
      const missingConfig = { eligible: true }
      applyHost(createHostHarness().ctx, missingConfig)
      expect(missingConfig.eligible).toBe(false)
    } finally {
      if (previous === undefined) delete process.env.DSH_HOME
      else process.env.DSH_HOME = previous
      await rm(root, { recursive: true, force: true })
    }
  })

  it('publishes both onboarding fields through the Harness 0.1.7 Config schema', () => {
    const json = HostConfig.toJSON() as {
      uid: number
      refs: Record<string, { dict?: Record<string, number>; meta?: Record<string, unknown> }>
    }
    const root = json.refs[String(json.uid)]
    expect(Object.keys(root?.dict ?? {}).sort()).toEqual(['eligible', 'wizardVersion'])
    expect(json.refs[String(root?.dict?.eligible)]?.meta?.volatile).toBe(true)
    expect(json.refs[String(root?.dict?.wizardVersion)]?.meta?.volatile).toBe(true)
  })
})
