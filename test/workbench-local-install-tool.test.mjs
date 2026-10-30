import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { localWorkbenchInstallTool } from '../packages/dsh-desktop-workbenches/local-install-tool.mjs'
import { readPackedManifest } from '../packages/dsh-desktop-workbenches/market-install.mjs'

const roots = []
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))))
async function archive() {
  const root = await mkdtemp(join(tmpdir(), 'workbench-tool-'))
  roots.push(root)
  const manifest = { name: 'local-tool-probe', version: '1.0.0', exports: { './client': './client.js' },
    dsh: { bundle: { patch: './cordis.patch.yml' }, client: { platform: 'web', inject: ['dsh-desktop-workbenches'] } } }
  const body = Buffer.from(JSON.stringify(manifest))
  const header = Buffer.alloc(512)
  header.write('package/package.json')
  header.write(body.length.toString(8).padStart(11, '0'), 124)
  header.write('0', 156)
  const padded = Buffer.alloc(Math.ceil(body.length / 512) * 512)
  body.copy(padded)
  const path = join(root, 'workbench.tgz')
  await writeFile(path, gzipSync(Buffer.concat([header, padded, Buffer.alloc(1024)])))
  return { path, manifest }
}
function fixture(application = 'applied', mode = 'danger-full-access', approver) {
  let staged
  const manager = { installBundle: vi.fn(async spec => {
    staged = spec
    expect(readPackedManifest(await readFile(spec)).name).toBe('local-tool-probe')
    return { application, error: application === 'failed' ? { code: 'already-installed', diagnostic: 'original cause' } : undefined }
  }), cancelInstall: vi.fn(async () => ({ status: 'cancelled' })) }
  const restart = { acknowledge: vi.fn(async () => {}) }
  const tool = localWorkbenchInstallTool({ pluginManager: manager, sandboxPolicy: { resolve: () => ({ mode }) }, get: () => approver }, restart)
  const controller = new AbortController()
  const exec = { signal: controller.signal, callId: 'test-call', agent: { session: {} } }
  return { tool, manager, restart, exec, controller, staged: () => staged }
}

describe('model-driven local workbench install', () => {
  it.each(['applied', 'restart-required', 'failed', 'cancelled', 'overridden'])('returns %s without requiring a manual UI', async application => {
    const { path } = await archive()
    const { tool, manager, restart, exec, staged } = fixture(application)
    const result = JSON.parse(await tool.execute({ path, replace: true, approvedBuilds: ['approved-package'] }, exec))
    expect(result).toMatchObject({ packageName: 'local-tool-probe', application })
    expect(manager.installBundle).toHaveBeenCalledWith(staged(), { expectedName: 'local-tool-probe', expectedVersion: '1.0.0', replace: true, requestId: 'workbench-test-call', approvedBuilds: ['approved-package'] })
    expect(staged()).not.toBe(path)
    expect(existsSync(staged())).toBe(false)
    expect(restart.acknowledge).toHaveBeenCalledTimes(application === 'applied' ? 1 : 0)
    if (application === 'failed') expect(result.error.diagnostic).toBe('original cause')
  })

  it('refuses before reading any archive when escalation is rejected', async () => {
    const approver = { request: vi.fn(async () => 'rejected') }
    const { tool, manager, exec } = fixture('applied', 'workspace-write', approver)
    await expect(tool.execute({ path: '/missing.tgz' }, exec)).rejects.toThrow('rejected')
    expect(manager.installBundle).not.toHaveBeenCalled()
    expect(approver.request).toHaveBeenCalledWith(expect.objectContaining({ toolName: 'install_local_workbench' }))
  })

  it('uses a one-call approval without changing session policy and defaults to no replacement', async () => {
    const { path } = await archive()
    const { tool, manager, exec } = fixture('applied', 'workspace-write', { request: async () => 'allowed-once' })
    await tool.execute({ path }, exec)
    expect(manager.installBundle.mock.calls[0][1]).toMatchObject({ replace: false })
    expect(exec.agent.session).toEqual({})
  })

  it('cancels the manager request and keeps staging until installation settles', async () => {
    const { path } = await archive()
    const { tool, manager, exec, controller } = fixture()
    let finish
    manager.installBundle.mockImplementation(spec => new Promise(resolve => {
      finish = () => resolve({ application: 'cancelled' })
      controller.abort()
      expect(existsSync(spec)).toBe(true)
    }))
    const running = tool.execute({ path }, exec)
    await vi.waitFor(() => expect(manager.cancelInstall).toHaveBeenCalledWith('workbench-test-call'))
    finish()
    expect(JSON.parse(await running).application).toBe('cancelled')
  })
})
