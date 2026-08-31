import { readFile, rm, mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { runInNewContext } from 'node:vm'
import { parse } from 'yaml'
import { describe, expect, it, vi } from 'vitest'
import { SessionId } from '@deepseek-ai/dsh-session'

type SnapshotStore<T> = {
  getSnapshot(): T
  set(value: T): void
  subscribe(listener: () => void): () => void
}

function createSnapshotStore<T>(initial: T): SnapshotStore<T> {
  let value = initial
  const listeners = new Set<() => void>()
  return {
    getSnapshot: () => value,
    set(next) {
      value = next
      for (const listener of listeners) listener()
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    }
  }
}

async function loadAgentPresetClient(): Promise<Record<string, unknown>> {
  const source = await readFile(
    'node_modules/@deepseek-ai/dsh-client-ui-agent-preset/lib/client.js',
    'utf8'
  )
  let descriptor:
    | { factory(require: (id: string) => unknown): Record<string, unknown> }
    | undefined
  runInNewContext(source, {
    window: {
      __ModuleLoader__: {
        load(value: typeof descriptor) {
          descriptor = value
        }
      }
    }
  })
  if (descriptor === undefined) throw new Error('Agent preset client bundle did not register')
  return descriptor.factory((id) =>
    id === '@deepseek-ai/dsh-client-runtime/client' ? { createSnapshotStore } : {}
  )
}

const roster = {
  presets: [
    {
      id: 'standard',
      trust: 'system',
      name: 'Standard mode',
      description: 'Standard tools',
      isDefault: false
    },
    { id: 'code', trust: 'system', name: 'PTC mode', isDefault: false },
    { id: 'minimal', trust: 'system', name: 'Minimal mode', isDefault: false },
    { id: 'cordis', trust: 'system', name: 'Creator mode', isDefault: false },
    { id: 'liangshen', trust: 'user', name: '梁神模式', isDefault: true }
  ],
  authorable: true,
  hasDocument: true
}

describe('Sherlock standard agent preset policy', () => {
  it('instructs the agent to provide concise user-facing progress during long work', async () => {
    const source = await readFile(
      'node_modules/@deepseek-ai/dsh/config/sherlock-agent-presets/standard/agent.cordis.yml',
      'utf8'
    )
    const entries = parse(source, {
      customTags: [
        {
          tag: 'tag:yaml.org,2002:js',
          resolve: (value: string) => value
        }
      ]
    }) as Array<{ id?: string; config?: { text?: string } }>
    const persona = entries.find((entry) => entry.id === 'persona')?.config?.text ?? ''

    expect(persona).toContain('concise user-facing progress updates')
    expect(persona).toContain('Do not reveal private reasoning')
    expect(persona).toContain('final answer')
  })

  it('gives the single Standard-mode picker enough room and wraps its description', async () => {
    const source = await readFile(
      'node_modules/@deepseek-ai/dsh-client-ui-agent-preset/lib/client.js',
      'utf8'
    )

    expect(source).toContain('.cubgiG_picker{min-width:420px}')
    expect(source).toContain('.cubgiG_item{box-sizing:border-box;flex-direction:column;gap:1px;width:376px')
    expect(source).toContain(
      '.cubgiG_itemDesc{color:var(--dsw-alias-label-tertiary);white-space:normal;overflow-wrap:anywhere;font-size:12px;line-height:17px}'
    )
    expect(source).toContain(
      '[role=menu]:has(.cubgiG_item){width:420px!important;max-width:calc(100vw - 24px)}'
    )
    expect(source).toContain('data-agent-preset-fallback')
    expect(source).toContain('children: t("presetStandardName")')
  })

  it('falls back old session preset selections to standard mode', async () => {
    const { resolveSessionPreset } = await import('@deepseek-ai/dsh-agent-presets')

    expect(
      resolveSessionPreset({
        header: {
          version: 0,
          id: SessionId('session-old-custom-preset'),
          createdAt: 1,
          agentPreset: 'liangshen'
        },
        events: []
      })
    ).toBe('standard')
    expect(
      resolveSessionPreset({
        header: {
          version: 0,
          id: SessionId('session-old-builtin-preset'),
          createdAt: 1,
          agentPreset: 'minimal'
        },
        events: [
          {
            type: 'agent-preset/selected',
            seq: 0,
            time: 2,
            data: { agentPreset: 'cordis' }
          }
        ]
      })
    ).toBe('standard')
  })

  it('composes only the shipped standard preset and excludes the user preset root', async () => {
    const dshHome = await mkdtemp(path.join(tmpdir(), 'sherlock-preset-policy-'))
    try {
      const result = spawnSync(
        process.execPath,
        ['node_modules/@deepseek-ai/dsh/lib/bin.js', '--profile', 'web', '--dump-config'],
        {
          cwd: process.cwd(),
          env: { ...process.env, DSH_HOME: dshHome },
          encoding: 'utf8'
        }
      )
      expect(result.status, result.stderr).toBe(0)
      const entries = parse(result.stdout, {
        customTags: [
          {
            tag: 'tag:yaml.org,2002:js',
            resolve: (value: string) => value
          }
        ]
      }) as Array<{
        id?: string
        config?: {
          default?: string
          includeUserRoot?: boolean
          roots?: Array<{ path?: string; trust?: string }>
        }
      }>
      const presets = entries.find((entry) => entry.id === 'agent-presets')

      expect(presets?.config).toMatchObject({
        default: 'standard',
        includeUserRoot: false,
        roots: [{ trust: 'system' }]
      })
      const configuredRoots = presets?.config?.roots ?? []
      expect(path.basename(configuredRoots[0]?.path ?? '')).toBe('sherlock-agent-presets')

      const { discoverPresets } = await import('@deepseek-ai/dsh-agent-presets')
      const discovered = await discoverPresets(
        configuredRoots.map((root) => ({
          path: root.path ?? '',
          trust: root.trust === 'system' ? 'system' : 'user'
        }))
      )
      expect(discovered.map((preset) => preset.id)).toEqual(['standard'])
    } finally {
      await rm(dshHome, { recursive: true, force: true })
    }
  })

  it('normalizes settings, composer, and management stores to standard mode', async () => {
    const client = await loadAgentPresetClient()
    expect(client.AgentPresetSettingsController).toBeTypeOf('function')
    expect(client.AgentPresetSeatController).toBeTypeOf('function')
    expect(client.AgentPresetSectionController).toBeTypeOf('function')

    if (
      typeof client.AgentPresetSettingsController !== 'function' ||
      typeof client.AgentPresetSeatController !== 'function' ||
      typeof client.AgentPresetSectionController !== 'function'
    ) {
      return
    }

    const update = vi.fn(async () => ({ result: { ok: true, value: {} } }))
    const list = vi.fn(async () => ({ result: { ok: true, value: roster } }))
    const api = {
      agentPresets: { list },
      settings: {
        describe: vi.fn(async () => ({ result: { ok: true, value: { writable: true } } })),
        update
      }
    }

    const SettingsController = client.AgentPresetSettingsController as new (
      api: unknown
    ) => { load(): Promise<void>; store: SnapshotStore<Record<string, unknown>> }
    const settings = new SettingsController(api)
    await settings.load()
    expect(settings.store.getSnapshot()).toMatchObject({
      status: 'ready',
      currentValue: 'standard',
      options: [{ id: 'standard', trust: 'system' }]
    })

    const SeatController = client.AgentPresetSeatController as new (
      api: unknown,
      currentSession: () => unknown
    ) => { load(): Promise<void>; store: SnapshotStore<Record<string, unknown>> }
    const seat = new SeatController(api, () => ({
      id: 'blank-session',
      blank: true,
      agentPreset: 'liangshen'
    }))
    await seat.load()
    expect(seat.store.getSnapshot()).toMatchObject({
      current: 'standard',
      options: [{ id: 'standard', trust: 'system' }]
    })

    const SectionController = client.AgentPresetSectionController as new (
      api: unknown
    ) => { load(): Promise<void>; store: SnapshotStore<Record<string, unknown>> }
    const section = new SectionController(api)
    await section.load()
    expect(section.store.getSnapshot()).toMatchObject({
      status: 'ready',
      authorable: false,
      hasDocument: false,
      rows: [{ id: 'standard', trust: 'system', isDefault: true }]
    })
    expect(update).toHaveBeenCalledWith({
      ns: 'agent-presets',
      patch: { default: 'standard' }
    })
  })
})
