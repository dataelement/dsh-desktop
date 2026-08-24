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
        '@deepseek-ai+dsh-host-apiproxy+0.1.0-rc.7.patch'
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

  it('keeps the loopback API discoverable by an explicitly requested online Skill', async () => {
    const webApp = await readFile(
      path.join(projectRoot, 'node_modules', '@deepseek-ai', 'dsh-web-app', 'lib', 'index.js'),
      'utf8'
    )
    const hostPatch = await readFile(
      path.join(
        projectRoot,
        'patches',
        '@deepseek-ai+dsh-host-apiproxy+0.1.0-rc.7.patch'
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
