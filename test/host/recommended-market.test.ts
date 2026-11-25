import { randomUUID } from 'node:crypto'
import { lstat, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join, resolve, sep } from 'node:path'
import { expect, it } from 'vitest'
import { listGenerations, readDesired } from 'dsh-desktop-market-installer/generations/registry'
import { prepareGenerationsForLaunch } from '../../src/main/profile/generation-launch'
import { DesktopHostProcess } from '../../src/main/shell/backend/host-process'
import { writeDesktopProductPatch } from '../../src/main/shell/product-patch'
import { ensureHostBundle, hostBundle } from './host-bundle-helper'

const require = createRequire(import.meta.url)
const electron = require('electron') as string
const root = resolve(import.meta.dirname, '../..')

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('Expected a JSON object: ' + JSON.stringify(value))
  }
  return value as Record<string, unknown>
}

it('installs recommended dshmarket through ordinary Remote RPC generations and preserves disable/removal across restarts', async () => {
  await ensureHostBundle()
  // Resolve macOS /var aliases before comparing generation and Profile paths.
  const home = await realpath(await mkdtemp(join(tmpdir(), 'dsh-recommended-market-')))
  const profile = join(home, 'profiles', 'desktop')
  const fixture = join(home, 'fixture', 'dshmarket')
  let host: DesktopHostProcess | undefined
  let origin = ''
  let cookie = ''

  async function start() {
    // Exercise the same stopped-Host sweep and projection as the desktop shell.
    await prepareGenerationsForLaunch(home, () => undefined, 'desktop')
    host = new DesktopHostProcess({
      node: electron,
      entry: hostBundle,
      runtimeDir: root,
      projectDir: profile,
      dshHome: home,
      profile: 'desktop',
      environment: {
        DSH_DESKTOP_PATCH_FILE: await writeDesktopProductPatch(home),
        npm_config_offline: 'true',
        npm_config_update_notifier: 'false',
        npm_config_registry: 'http://127.0.0.1:1',
        npm_config_store_dir: join(home, 'pnpm-store')
      },
      primaryRuntime: join(home, 'unused-runtime')
    })
    const ready = await host.start()
    origin = new URL(ready.url).origin
    const response = await fetch(ready.url, { redirect: 'manual' })
    expect(response.status).toBe(303)
    const sessionCookie = response.headers.get('set-cookie')?.split(';')[0]
    if (!sessionCookie) throw new Error('Host authentication did not issue a cookie')
    cookie = sessionCookie
  }

  function request(method: string, args: Record<string, unknown> = {}, headers: Record<string, string> = { cookie }) {
    const endpoint = 'pluginManager/' + method
    return fetch(origin + '/api/' + endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify({ type: 'client-request', rpcId: randomUUID(), method: endpoint, payload: { args } }),
      signal: AbortSignal.timeout(120_000)
    })
  }

  async function rpc(method: string, args: Record<string, unknown> = {}) {
    // 0.2.2-rc.1 admits no-Origin loopback requests with the standard owner cookie.
    const response = await request(method, args)
    expect(response.status).toBe(200)
    const envelope = record(await response.json())
    expect(envelope.type).toBe('server-response')
    const result = record(envelope.result)
    expect(result, JSON.stringify(result)).toMatchObject({ ok: true })
    return result.value
  }

  async function market() {
    const bundles = await rpc('listBundles')
    if (!Array.isArray(bundles)) throw new TypeError('listBundles must return an array')
    return bundles.map(record).find(bundle => bundle.name === 'dshmarket')
  }

  async function restart() {
    await host?.stop()
    await start()
  }

  try {
    await mkdir(profile, { recursive: true })
    await mkdir(fixture, { recursive: true })
    await writeFile(join(profile, 'package.json'), JSON.stringify({
      name: 'dsh-profile-desktop', private: true, dependencies: {},
      dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app'] } }
    }))
    await writeFile(join(profile, 'cordis.yml'), '[]\n')
    await writeFile(join(profile, 'cordis.patch.yml'), '[]\n')
    await writeFile(join(fixture, 'package.json'), JSON.stringify({
      name: 'dshmarket', version: '1.66.47', private: true,
      dsh: { bundle: { patch: 'cordis.patch.yml' } }
    }))
    // Deliberately no client/backend code, dependencies, scripts, or network input.
    await writeFile(join(fixture, 'cordis.patch.yml'), '[]\n')
    await start()
    expect(await market()).toBeUndefined()

    const before = await readFile(join(profile, 'package.json'), 'utf8')
    const unauthenticated = await request('installBundle', { spec: fixture }, {})
    expect(unauthenticated.status).toBe(401)
    await unauthenticated.body?.cancel()
    const external = await request('installBundle', { spec: fixture }, { origin: 'https://untrusted.example', 'sec-fetch-site': 'cross-site' })
    expect(external.status).toBe(403)
    await external.body?.cancel()
    expect(await readFile(join(profile, 'package.json'), 'utf8')).toBe(before)
    expect(await readDesired(home)).toEqual([])

    const installed = await rpc('installBundle', { spec: fixture })
    expect(installed, JSON.stringify(installed)).toMatchObject({ packageResult: { exitCode: 0 } })
    expect(record(installed).application).toMatch(/^(applied|restart-required)$/u)
    const generations = await listGenerations(home)
    expect(generations).toHaveLength(1)
    const generation = generations[0]
    if (!generation) throw new Error('Installation produced no generation')
    expect(generation).toMatchObject({ pluginName: 'dshmarket', version: '1.66.47' })
    expect(await readDesired(home)).toEqual([generation.id])
    const projected = join(profile, 'node_modules', 'dshmarket')
    expect((await lstat(projected)).isSymbolicLink()).toBe(true)
    expect(await realpath(projected)).toContain(join(home, 'profiles', '.generations', 'live') + sep)
    expect(await market()).toMatchObject({ installed: true, enabled: true, version: '1.66.47', rows: [] })

    await restart()
    expect(await market()).toMatchObject({ installed: true, enabled: true, version: '1.66.47', rows: [] })
    const disabled = await rpc('setBundleEnabled', { name: 'dshmarket', enabled: false })
    expect(record(disabled).application).toMatch(/^(applied|restart-required)$/u)
    expect(await market()).toMatchObject({ installed: true, enabled: false })
    await restart()
    expect(await market()).toMatchObject({ installed: true, enabled: false })
    expect(await readDesired(home)).toEqual([generation.id])
    expect(record(JSON.parse(await readFile(join(profile, '.dsh-market', 'state.json'), 'utf8'))).disabled).toContain('dshmarket')

    const enabled = await rpc('setBundleEnabled', { name: 'dshmarket', enabled: true })
    expect(record(enabled).application, JSON.stringify(enabled)).toMatch(/^(applied|restart-required)$/u)
    expect(await market()).toMatchObject({ installed: true, enabled: true })
    const disabledAgain = await rpc('setBundleEnabled', { name: 'dshmarket', enabled: false })
    expect(record(disabledAgain).application, JSON.stringify(disabledAgain)).toMatch(/^(applied|restart-required)$/u)

    const removed = await rpc('removeBundle', { name: 'dshmarket' })
    expect(record(removed).application, JSON.stringify(removed)).toMatch(/^(applied|restart-required)$/u)
    expect(await readDesired(home)).toEqual([])
    await restart()
    expect(await market()).toBeUndefined()
    await expect(lstat(projected)).rejects.toMatchObject({ code: 'ENOENT' })
    const manifest = record(JSON.parse(await readFile(join(profile, 'package.json'), 'utf8')))
    expect(record(manifest.dependencies)).not.toHaveProperty('dshmarket')
    await expect(lstat(join(home, 'profiles', 'web'))).rejects.toMatchObject({ code: 'ENOENT' })
  } finally {
    try {
      await host?.stop()
    } finally {
      await rm(home, { recursive: true, force: true })
    }
  }
}, 240_000)
