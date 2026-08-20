import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { toFetchHandler } from '@deepseek-ai/dsh-host-apiproxy'

const projectRoot = path.resolve(import.meta.dirname, '..')

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

  it('keeps the archive boundary strict and installs through an atomic validated directory move', async () => {
    const patch = await readFile(
      path.join(
        projectRoot,
        'patches',
        '@deepseek-ai+dsh-host-apiproxy+0.1.0-rc.8.patch'
      ),
      'utf8'
    )

    expect(patch).toContain('const PRESET_ARCHIVE_FORMAT = "dsh-preset"')
    expect(patch).toContain('const PRESET_ARCHIVE_MAX_COMPRESSED = 16 * 1024 * 1024')
    expect(patch).toContain('const PRESET_ARCHIVE_MAX_UNCOMPRESSED = 32 * 1024 * 1024')
    expect(patch).toContain('safePresetArchivePath')
    expect(patch).toContain('PRESET_ARCHIVE_IGNORED_FILES')
    expect(patch).toContain('.DS_Store')
    expect(patch).toContain('info.isSymbolicLink()')
    expect(patch).toContain('scanRoot({')
    expect(patch).toContain('await rename(imported, target)')
    expect(patch).toContain('A preset named')
    expect(patch).toContain('possible-secrets')
    expect(patch).toContain('absolute-paths')
  })

  it('adds import preview, conflict rename, trust warning, and custom-card export controls', async () => {
    const patch = await readFile(
      path.join(
        projectRoot,
        'patches',
        '@deepseek-ai+dsh-client-ui-agent-preset+0.1.0-rc.8.patch'
      ),
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
  })

  it('keeps a large mode roster searchable, grouped, compact, and connected to Awesome Presets', async () => {
    const patch = await readFile(
      path.join(
        projectRoot,
        'patches',
        '@deepseek-ai+dsh-client-ui-agent-preset+0.1.0-rc.8.patch'
      ),
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
      path.join(
        projectRoot,
        'patches',
        '@deepseek-ai+dsh-host-apiproxy+0.1.0-rc.8.patch'
      ),
      'utf8'
    )

    expect(webApp).toContain('const DSH_WEB_URL = "DSH_WEB_URL"')
    expect(webApp).toContain('variables: { [DSH_WEB_URL]')
    expect(hostPatch).toContain('path === "/api/agent-preset.export"')
    expect(hostPatch).toContain('path === "/api/agent-preset.import"')
    expect(hostPatch).toContain('url.searchParams.get("install") === "1"')
  })
})
