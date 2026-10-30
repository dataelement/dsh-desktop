import { spawn } from 'node:child_process'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { c as pack } from 'tar'
import { it, expect } from 'vitest'
import { HarnessRuntime } from '../src/main/runtime/harness-runtime'
import { prepareHostPluginSourcesPatch } from '../src/main/state/host-plugin-sources'
import { electronExecutable } from '../scripts/electron-node-loader.mjs'

it('discovers and executes the local install tool in a real Harness session without a manual install page', async () => {
  const root = resolve(import.meta.dirname, '..')
  const home = await mkdtemp(join(tmpdir(), 'workbench-agent-runtime-'))
  const neutral = join(home, 'neutral')
  await mkdir(neutral)
  const directory = join(home, 'package')
  await mkdir(directory)
  const manifest = { name: 'agent-workbench-probe', version: '1.0.0', type: 'module', exports: { '.': './index.js', './client': './client.js' },
    dsh: { bundle: { patch: './cordis.patch.yml' }, client: { platform: 'web', inject: ['dsh-desktop-workbenches'] } } }
  await writeFile(join(directory, 'package.json'), JSON.stringify(manifest))
  await writeFile(join(directory, 'index.js'), "export function apply() {}\n")
  await writeFile(join(directory, 'client.js'), "window.__ModuleLoader__.load({ id: 'agent-workbench-probe', factory: () => ({ apply() {} }) })\n")
  await writeFile(join(directory, 'cordis.patch.yml'), '- insert:\n    - id: agent-workbench-probe\n      name: agent-workbench-probe\n')
  const archive = join(home, 'workbench.tgz')
  await pack({ gzip: true, file: archive, cwd: home }, ['package'])
  const diagnostic = join(home, 'probe.mjs')
  await writeFile(diagnostic, `
export const inject = ['tools', 'connection', 'sessionController']
export function apply(ctx) {
  ctx.connection.fetch.register({ path: '/api/workbench-agent-probe', methods: ['POST'], requestBody: 'buffered', async fetch(request) {
    const payload = await request.json()
    const resolved = await ctx.sessionController.resolveAgent(payload.sessionId)
    if (resolved.error) throw new Error(JSON.stringify(resolved.error))
    const { setSandboxMode } = await import(${JSON.stringify(pathToFileURL(join(root, 'node_modules/@deepseek-ai/dsh-sandbox-policy/lib/index.js')).href)})
    setSandboxMode(resolved.agent.session, 'danger-full-access')
    const tool = ctx.tools.get('install_local_workbench')
    if (!tool) return Response.json({ missing: true }, { status: 500 })
    return Response.json(JSON.parse(await tool.execute({ path: payload.path, replace: payload.replace }, { agent: resolved.agent, signal: request.signal, callId: 'runtime-probe' })))
  } })
}
`)
  const normal = await prepareHostPluginSourcesPatch(home, join(root, 'build/dsh-desktop.patch.yml'), join(root, 'node_modules/@deepseek-ai/dsh/lib/bin.js'))
  const patch = join(home, 'probe.patch.yml')
  await writeFile(patch, `${await readFile(normal, 'utf8')}\n- insert:\n    - id: workbench-agent-probe\n      name: ${JSON.stringify(pathToFileURL(diagnostic).href)}\n`)
  const runtime = new HarnessRuntime({
    dshEntryPath: join(root, 'node_modules/@deepseek-ai/dsh/lib/bin.js'), nodeEntryPath: join(root, 'build/harness-node-entry.mjs'),
    nodeExecutablePath: electronExecutable(root), pnpmEntryPath: join(root, 'node_modules/pnpm/bin/pnpm.cjs'),
    dshPatchPath: patch, dshSafePatchPath: patch, dshHome: home, logPath: join(home, 'harness.log'), startupTimeoutMs: 30_000,
    launchProcess: (executable, args, options) => spawn(executable, args, { ...options, env: { ...options.env, ELECTRON_RUN_AS_NODE: '1' } }), onChanged() {}
  })
  try {
    await runtime.start(neutral)
    const snapshot = runtime.snapshot()
    expect(snapshot.phase).toBe('ready')
    const login = await fetch(`${snapshot.url}/?token=${encodeURIComponent(snapshot.authToken)}`, { redirect: 'manual' })
    const cookie = login.headers.getSetCookie().map(value => value.split(';')[0]).join('; ')
    const headers = { Cookie: cookie, 'content-type': 'application/json' }
    const created = await (await fetch(new URL('/api/session/create', snapshot.url), { method: 'POST', headers,
      body: JSON.stringify({ type: 'client-request', rpcId: 'create', method: 'session/create', payload: { args: { request: {} } } }) })).json()
    expect(created.result?.ok).toBe(true)
    const install = async replace => {
      const response = await fetch(new URL('/api/workbench-agent-probe', snapshot.url), { method: 'POST', headers,
        body: JSON.stringify({ sessionId: created.result.value.sessionId, path: archive, replace }) })
      const result = await response.json()
      expect(response.status, JSON.stringify(result)).toBe(200)
      return result
    }
    const first = await install(false)
    expect(first, JSON.stringify(first)).toMatchObject({ packageName: 'agent-workbench-probe', application: 'applied' })
    expect((await install(false)).error?.code).toBe('already-installed')
    const replacement = await install(true)
    expect(['applied', 'restart-required']).toContain(replacement.application)
    const inventory = await (await fetch(new URL('/api/desktop-workbenches/market-installs', snapshot.url), { headers })).json()
    expect(inventory.installs).toEqual({})
    expect(inventory.lifecycle.bundles).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'agent-workbench-probe', installed: true })]))
    expect((await fetch(new URL('/api/desktop-workbenches/local-install', snapshot.url), { method: 'POST', headers, body: '{}' })).status).not.toBe(200)
  } finally {
    await runtime.stop()
    await rm(home, { recursive: true, force: true })
  }
}, 90_000)
