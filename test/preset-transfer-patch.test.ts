import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import { describe, expect, it, vi } from 'vitest'
import { createApiProxy, toFetchHandler } from '@deepseek-ai/dsh-host-apiproxy'
import { patchPath, projectRoot } from './patch-path'

const composition = [
  '- id: persona',
  "  name: '@deepseek-ai/dsh-persona'",
  '  config:',
  '    text: Test package transfer',
  ''
].join('\n')

type PatchedApiProxy = Omit<ReturnType<typeof createApiProxy>, 'agentPresets'> & {
  agentPresets: ReturnType<typeof createApiProxy>['agentPresets'] & {
    exportArchive(id: string, signal: AbortSignal): Promise<Response>
    importArchive(
      data: Uint8Array,
      options: { agentPreset?: string; install?: boolean },
      signal: AbortSignal
    ): Promise<Response>
  }
}

function presetTransferApi(root: string) {
  const presets = {
    roots: [{ path: root, trust: 'user' }],
    async resolve(id: string) {
      const compositionPath = path.join(root, id, 'agent.cordis.yml')
      await readFile(compositionPath)
      return {
        id,
        trust: 'user',
        path: compositionPath,
        name: id
      }
    }
  }
  return createApiProxy(
    {
      get(name: string) {
        return name === 'agentPresets' ? presets : undefined
      },
      inject() {},
      on() {},
      effect() {},
      userQuestions: {
        registerProvider: () => () => {}
      }
    } as never,
    {
      cwd: root,
      defaultModelSelection: () => ({ provider: 'test', model: 'test' })
    }
  ) as unknown as PatchedApiProxy
}

function presetPackage(
  id: string,
  layout: 'nested' | 'flat',
  sourceDshVersion = '0.1.1-rc.2'
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

describe('agent preset package transfer', () => {
  it('routes binary export and two-phase import requests outside the JSON RPC carrier', async () => {
    const exportArchive = vi.fn(async () =>
      new Response(new Uint8Array([80, 75, 3, 4]), {
        headers: { 'content-type': 'application/vnd.dsh.preset+zip' }
      })
    )
    const importArchive = vi.fn(async () => Response.json({ ok: true }))
    const handler = toFetchHandler({
      agentPresets: { exportArchive, importArchive }
    } as never)

    const exported = await handler.fetch(
      new Request('http://127.0.0.1/api/agent-preset.export?agentPreset=my-agent')
    )
    expect(exported.status).toBe(200)
    expect(exported.headers.get('content-type')).toBe('application/vnd.dsh.preset+zip')
    expect(exportArchive).toHaveBeenCalledWith('my-agent', expect.any(AbortSignal))

    const payload = new Uint8Array([80, 75, 3, 4])
    const previewed = await handler.fetch(
      new Request('http://127.0.0.1/api/agent-preset.import', {
        method: 'POST',
        headers: { 'content-type': 'application/vnd.dsh.preset+zip' },
        body: payload
      })
    )
    expect(previewed.status).toBe(200)
    expect(importArchive).toHaveBeenLastCalledWith(
      expect.any(Uint8Array),
      { agentPreset: undefined, install: false },
      expect.any(AbortSignal)
    )

    await handler.fetch(
      new Request(
        'http://127.0.0.1/api/agent-preset.import?agentPreset=renamed-agent&install=1',
        {
          method: 'POST',
          headers: { 'content-type': 'application/zip' },
          body: payload
        }
      )
    )
    expect(importArchive).toHaveBeenLastCalledWith(
      expect.any(Uint8Array),
      { agentPreset: 'renamed-agent', install: true },
      expect.any(AbortSignal)
    )
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
        sourceDshVersion: '0.1.1-rc.2'
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
          sourceDshVersion: '0.1.1-rc.2',
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
        warnings: ['version-mismatch']
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
    const patch = await readFile(
      patchPath('@deepseek-ai/dsh-host-apiproxy'),
      'utf8'
    )

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
    const patch = await readFile(
      patchPath('@deepseek-ai/dsh-host-apiproxy'),
      'utf8'
    )

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
    const hostPatch = await readFile(
      patchPath('@deepseek-ai/dsh-host-apiproxy'),
      'utf8'
    )

    expect(webApp).toContain('const DSH_WEB_URL = "DSH_WEB_URL"')
    expect(webApp).toContain('variables: { [DSH_WEB_URL]')
    expect(hostPatch).toContain('path === "/api/agent-preset.export"')
    expect(hostPatch).toContain('path === "/api/agent-preset.import"')
    expect(hostPatch).toContain('url.searchParams.get("install") === "1"')
  })
})
