import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import { describe, expect, it, vi } from 'vitest'
import { apply as applyPresetTransfer } from 'dsh-desktop-preset-transfer'
import { patchPath, projectRoot } from './patch-path'

const composition = [
  '- id: persona',
  "  name: '@deepseek-ai/dsh-persona'",
  '  config:',
  '    text: Test package transfer',
  ''
].join('\n')

interface RegisteredRoute {
  path: string
  methods: readonly string[]
  fetch(request: Request): Promise<Response>
}

const EXPORT_PATH = '/api/agent-preset.export'
const IMPORT_PATH = '/api/agent-preset.import'

/**
 * Apply the preset-transfer plugin against a minimal Host context and expose
 * its routes through the shape the archive tests were written against.
 *
 * The capability used to be a patch on dsh-host-apiproxy, whose package
 * 0.1.2-alpha.1 deleted. It is a desktop plugin now, registering on the same
 * Connection fetch-route seam upstream uses for /api/session.export, so a fake
 * registry is all the carrier this needs: what these tests cover is the
 * archive behavior behind the routes.
 */
function presetTransferApi(root: string) {
  const routes = new Map<string, RegisteredRoute>()
  const presets = {
    roots: [{ path: root, trust: 'user' }],
    async resolve(id: string) {
      const compositionPath = path.join(root, id, 'agent.cordis.yml')
      await readFile(compositionPath)
      return { id, trust: 'user', path: compositionPath, name: id }
    }
  }
  applyPresetTransfer({
    get(name: string) {
      return name === 'agentPresets' ? presets : undefined
    },
    connection: {
      fetch: {
        register(route: RegisteredRoute) {
          routes.set(route.path, route)
          return async () => {}
        }
      }
    }
  } as never)

  return {
    routes,
    agentPresets: {
      async exportArchive(id: string, signal?: AbortSignal): Promise<Response> {
        return routes.get(EXPORT_PATH)!.fetch(new Request(
          `http://127.0.0.1${EXPORT_PATH}?agentPreset=${encodeURIComponent(id)}`,
          signal === undefined ? {} : { signal }
        ))
      },
      async importArchive(
        data: Uint8Array,
        options: { agentPreset?: string; install?: boolean },
        signal?: AbortSignal
      ): Promise<Response> {
        const url = new URL(`http://127.0.0.1${IMPORT_PATH}`)
        if (options.agentPreset !== undefined) url.searchParams.set('agentPreset', options.agentPreset)
        if (options.install === true) url.searchParams.set('install', '1')
        return routes.get(IMPORT_PATH)!.fetch(new Request(url, {
          method: 'POST',
          headers: { 'content-type': 'application/vnd.dsh.preset+zip' },
          body: data as unknown as BodyInit,
          ...(signal === undefined ? {} : { signal })
        }))
      }
    }
  }
}

function presetPackage(
  id: string,
  layout: 'nested' | 'flat',
  sourceDshVersion = '0.1.2-alpha.1'
) {
  const versionMetadata = layout === 'nested'
    ? {
        sourceDshVersion,
        exportedAt: '2026-08-26T00:00:00.000Z'
      }
    : {
        dshVersion: sourceDshVersion,
        createdAt: '2026-08-26T00:00:00.000Z'
      }
  const manifest = strToU8(
    JSON.stringify({
      format: 'dsh-preset',
      version: 1,
      id,
      name: 'Gallery preset',
      ...versionMetadata
    })
  )
  const compositionPath = layout === 'nested'
    ? 'preset/agent.cordis.yml'
    : 'agent.cordis.yml'
  return zipSync({
    'manifest.json': manifest,
    [compositionPath]: strToU8(composition)
  })
}

/** The plugin source these assertions pin, in place of the deleted patch. */
async function presetTransferSource(): Promise<string> {
  return readFile(
    path.join(projectRoot, 'packages', 'dsh-desktop-preset-transfer', 'index.js'),
    'utf8'
  )
}

describe('agent preset package transfer', () => {
  it('routes binary export and two-phase import requests outside the JSON RPC carrier', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'dsh-preset-routes-'))
    try {
      const { routes } = presetTransferApi(root)

      expect([...routes.keys()].sort()).toEqual([
        '/api/agent-preset.export',
        '/api/agent-preset.import'
      ])
      expect(routes.get('/api/agent-preset.export')!.methods).toEqual(['GET', 'HEAD'])
      expect(routes.get('/api/agent-preset.import')!.methods).toEqual(['POST'])

      // The export route validates its own query parameter before it reaches
      // the preset roots, so a malformed id never becomes a filesystem lookup.
      const badId = await routes.get('/api/agent-preset.export')!.fetch(
        new Request('http://127.0.0.1/api/agent-preset.export?agentPreset=Not%20An%20Id')
      )
      expect(badId.status).toBe(400)

      const missingId = await routes.get('/api/agent-preset.export')!.fetch(
        new Request('http://127.0.0.1/api/agent-preset.export')
      )
      expect(missingId.status).toBe(400)

      // The import route refuses anything that is not a package before it
      // buffers a body, which is what keeps the 16 MB cap meaningful.
      const wrongType = await routes.get('/api/agent-preset.import')!.fetch(
        new Request('http://127.0.0.1/api/agent-preset.import', {
          method: 'POST',
          headers: { 'content-type': 'text/plain' },
          body: 'nope'
        })
      )
      expect(wrongType.status).toBe(415)

      const tooLarge = await routes.get('/api/agent-preset.import')!.fetch(
        new Request('http://127.0.0.1/api/agent-preset.import', {
          method: 'POST',
          headers: {
            'content-type': 'application/vnd.dsh.preset+zip',
            'content-length': String(17 * 1024 * 1024)
          },
          body: new Uint8Array([80, 75, 3, 4]) as unknown as BodyInit
        })
      )
      expect(tooLarge.status).toBe(413)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('round-trips canonical gallery packages and accepts rc.1/rc.2 flat archives', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'dsh-preset-transfer-'))
    const signal = new AbortController().signal
    try {
      const sourceId = 'source-preset'
      const sourceDir = path.join(root, sourceId)
      await mkdir(sourceDir, { recursive: true })
      await writeFile(path.join(sourceDir, 'agent.cordis.yml'), composition)
      await writeFile(path.join(sourceDir, 'preset.yml'), 'name: Source preset\n')
      const api = presetTransferApi(root)

      const exported = await api.agentPresets.exportArchive(sourceId, signal)
      expect(exported.status).toBe(200)
      const archive = unzipSync(new Uint8Array(await exported.arrayBuffer()))
      expect(Object.keys(archive).sort()).toEqual([
        'manifest.json',
        'preset/agent.cordis.yml',
        'preset/preset.yml'
      ])
      expect(archive['agent.cordis.yml']).toBeUndefined()
      const manifestBytes = archive['manifest.json']
      if (manifestBytes === undefined) throw new Error('exported package has no manifest')
      const exportedManifest = JSON.parse(strFromU8(manifestBytes))
      expect(exportedManifest).toMatchObject({
        format: 'dsh-preset',
        version: 1,
        id: sourceId,
        sourceDshVersion: '0.1.2-alpha.1'
      })
      expect(exportedManifest.exportedAt).toEqual(expect.any(String))
      expect(exportedManifest.dshVersion).toBeUndefined()
      expect(exportedManifest.createdAt).toBeUndefined()

      for (const [layout, targetId] of [
        ['nested', 'gallery-import'],
        ['flat', 'legacy-flat-import']
      ] as const) {
        const data = presetPackage(`${layout}-source`, layout)
        const preview = await api.agentPresets.importArchive(
          data,
          { agentPreset: targetId, install: false },
          signal
        )
        expect(preview.status).toBe(200)
        expect(await preview.json()).toMatchObject({
          ok: true,
          agentPreset: targetId,
          sourceAgentPreset: `${layout}-source`,
          name: 'Gallery preset',
          sourceDshVersion: '0.1.2-alpha.1',
          fileCount: 1,
          conflict: false,
          installed: false
        })

        const installed = await api.agentPresets.importArchive(
          data,
          { agentPreset: targetId, install: true },
          signal
        )
        const installedBody = await installed.json()
        expect(installed.status, JSON.stringify(installedBody)).toBe(200)
        expect(installedBody).toMatchObject({
          ok: true,
          agentPreset: targetId,
          installed: true
        })
        expect(await readFile(path.join(root, targetId, 'agent.cordis.yml'), 'utf8'))
          .toBe(composition)
      }

      const versionPreview = await api.agentPresets.importArchive(
        presetPackage('outdated-source', 'nested', '0.1.0-rc.8'),
        { install: false },
        signal
      )
      expect(versionPreview.status).toBe(200)
      expect(await versionPreview.json()).toMatchObject({
        sourceDshVersion: '0.1.0-rc.8',
        warnings: []
      })
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('rejects ambiguous archives that contain both canonical and flat paths', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'dsh-preset-transfer-'))
    try {
      const data = zipSync({
        'manifest.json': strToU8(JSON.stringify({
          format: 'dsh-preset',
          version: 1,
          id: 'ambiguous-preset'
        })),
        'agent.cordis.yml': strToU8(composition),
        'preset/agent.cordis.yml': strToU8(composition)
      })
      const response = await presetTransferApi(root).agentPresets.importArchive(
        data,
        { install: false },
        new AbortController().signal
      )
      expect(response.status).toBe(400)
      expect(await response.json()).toMatchObject({
        ok: false,
        error: 'Package contains conflicting file "agent.cordis.yml".'
      })
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('rejects unsafe archive paths instead of silently ignoring them', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'dsh-preset-transfer-'))
    try {
      const data = zipSync({
        'manifest.json': strToU8(JSON.stringify({
          format: 'dsh-preset',
          version: 1,
          id: 'unsafe-preset'
        })),
        'preset/agent.cordis.yml': strToU8(composition),
        'preset/../outside.yml': strToU8('unsafe')
      })
      const response = await presetTransferApi(root).agentPresets.importArchive(
        data,
        { install: false },
        new AbortController().signal
      )
      expect(response.status).toBe(400)
      expect(await response.json()).toMatchObject({
        ok: false,
        error: 'Package contains an unsafe path "preset/../outside.yml".'
      })
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('keeps the archive boundary strict and installs through an atomic validated directory move', async () => {
    const patch = await presetTransferSource()

    expect(patch).toContain('const PRESET_ARCHIVE_FORMAT = "dsh-preset"')
    expect(patch).toContain('const PRESET_ARCHIVE_MAX_COMPRESSED = 16 * 1024 * 1024')
    expect(patch).toContain('const PRESET_ARCHIVE_MAX_UNCOMPRESSED = 32 * 1024 * 1024')
    expect(patch).toContain('safePresetArchivePath')
    expect(patch).toContain('PRESET_ARCHIVE_IGNORED_FILES')
    expect(patch).toContain('.DS_Store')
    expect(patch).toContain('info.isSymbolicLink()')
    expect(patch).toContain('files[`preset/${rel}`]')
    expect(patch).toContain('safe.slice("preset/".length)')
    expect(patch).toContain('scanRoot({')
    expect(patch).toContain('scanned.find((candidate) => candidate.id === targetId)')
    expect(patch).not.toContain('scanned.get(targetId)')
    expect(patch).toContain('await rename(imported, target)')
    expect(patch).toContain('A preset named')
    expect(patch).toContain('possible-secrets')
    expect(patch).toContain('absolute-paths')
  })

  it('creates and resolves the writable preset root inside the structured import failure boundary', async () => {
    const patch = await presetTransferSource()

    expect(patch).toContain('const root = writableRoot(presets.roots)')
    expect(patch).not.toContain('const root = writableRoot();')
    expect(patch).toContain('await mkdir(root, { recursive: true })')
    expect(patch).toContain('let container;')
    expect(patch).toContain('container = await mkdtemp')
    expect(patch).toContain('if (container !== void 0) await rm(container')
  })

  it('adds import preview, conflict rename, trust warning, and custom-card export controls', async () => {
    const patch = await readFile(
      patchPath('@deepseek-ai/dsh-client-ui-agent-preset'),
      'utf8'
    )

    expect(patch).toContain('ImportDialog')
    expect(patch).toContain('previewImport(file)')
    expect(patch).toContain('confirmImport()')
    expect(patch).toContain('exportPreset(id)')
    expect(patch).toContain('IconArchiveOutline20')
    expect(patch).toContain('IconDownloadOutline16')
    expect(patch).toContain('Custom presets can run tools and commands')
    expect(patch).toContain('自定义预设可以使用与 Agent 相同权限的工具和命令')
    expect(patch).toContain('draft.conflict ? "idTaken"')
    expect(patch).toContain('.dshpreset')
    expect(patch).toContain('importPreset: "Import"')
    expect(patch).toContain('awesomePreset: "Awesome preset"')
    expect(patch).toContain('https://www.dshdesktop.com/preset/')
    expect(patch).toContain('"_blank", "noopener,noreferrer"')
    expect(patch).toContain('AgentPresetSection_module_css_default.sectionActions')
    expect(patch).toContain('.rtSEdW_sectionHead{align-items:center;gap:16px;display:flex}')
    expect(patch).toContain('justify-content:flex-end')
    expect(patch).toContain('margin-left:auto')
    expect(patch).toContain('.rtSEdW_hiddenInput{display:none}')
  })

  it('keeps a large mode roster searchable, grouped, compact, and connected to Awesome Presets', async () => {
    const patch = await readFile(
      patchPath('@deepseek-ai/dsh-client-ui-agent-preset'),
      'utf8'
    )

    expect(patch).toContain('searchPresets: "Search modes…"')
    expect(patch).toContain('recentPresets: "Recent"')
    expect(patch).toContain('RECENT_PRESETS_KEY')
    expect(patch).toContain('option.trust === "system"')
    expect(patch).toContain('option.trust === "user"')
    expect(patch).toContain('text-overflow:ellipsis')
    expect(patch).toContain('IconSearchOutline16')
    expect(patch).toContain('IconSparkle16')
    expect(patch).toContain('selectedItem')
    expect(patch).toContain(':focus-within')
    expect(patch).toContain('[role=menu]:has(')
    expect(patch).toContain('max-height:min(360px')
    expect(patch).toContain('side: "bottom"')
    expect(patch).toContain('footer: [{')
    expect(patch).toContain('id: AWESOME_PRESETS_ID')
    expect(patch).toContain('browseAwesomePresets: "浏览 Awesome Presets…"')
  })

  it('keeps the loopback API discoverable by an explicitly requested online Skill', async () => {
    const webApp = await readFile(
      path.join(projectRoot, 'node_modules', '@deepseek-ai', 'dsh-web-app', 'lib', 'index.js'),
      'utf8'
    )
    const hostPatch = await presetTransferSource()

    expect(webApp).toContain('const DSH_WEB_URL = "DSH_WEB_URL"')
    expect(webApp).toContain('variables: { [DSH_WEB_URL]')
    expect(hostPatch).toContain("const EXPORT_PATH = '/api/agent-preset.export'")
    expect(hostPatch).toContain("const IMPORT_PATH = '/api/agent-preset.import'")
    expect(hostPatch).toContain("url.searchParams.get('install') === '1'")
  })
})
