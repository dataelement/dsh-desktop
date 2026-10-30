import { it, expect } from 'vitest'
import { mkdtemp, mkdir, writeFile, readFile, realpath, rm, symlink, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createServer } from 'node:http'
import { promisify } from 'node:util'
import { installGeneration, verifyGenerationPeers } from '../packages/dsh-desktop-market-installer/generations/installer.mjs'

it('provisions a required private peer with real pnpm without fetching host or optional peers (#723)', async () => {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'dsh-private-peers-')))
  const run = promisify(execFile)
  const plugin = 'dsh-fixture-private-peer-plugin'
  const peer = 'dsh-fixture-private-peer'
  const host = '@deepseek-ai/fixture-unpublished'
  const requests = []
  const packages = new Map()
  let server
  try {
    for (const [name, manifest, source] of [
      [peer, { name: peer, version: '1.2.0', type: 'module', exports: './index.js' }, 'export const value = 42'],
      [plugin, { name: plugin, version: '1.0.0', type: 'module', exports: './index.js', peerDependencies: { [peer]: '^1.0.0', [host]: '1.0.0', 'dsh-fixture-optional': '*' }, peerDependenciesMeta: { 'dsh-fixture-optional': { optional: true } } }, "import { value } from 'dsh-fixture-private-peer'; export default value; export function apply(ctx) { ctx.emit('fixture-private-peer:value', value) }"]
    ]) {
      const directory = join(root, name, 'package')
      await mkdir(directory, { recursive: true })
      await writeFile(join(directory, 'package.json'), JSON.stringify(manifest))
      await writeFile(join(directory, 'index.js'), source)
      const tarball = join(root, name + '.tgz')
      await run('tar', ['-czf', name + '.tgz', '-C', join(directory, '..'), 'package'], { cwd: root })
      const bytes = await readFile(tarball)
      packages.set(name, { manifest, bytes, integrity: 'sha512-' + createHash('sha512').update(bytes).digest('base64') })
    }
    server = createServer((req, res) => {
      requests.push(req.url)
      const path = decodeURIComponent(req.url.slice(1))
      const name = path.endsWith('.tgz') ? path.slice(0, -4) : path
      const pkg = packages.get(name)
      if (!pkg) { res.statusCode = 404; res.end('{}'); return }
      if (path.endsWith('.tgz')) { res.end(pkg.bytes); return }
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify({ name, 'dist-tags': { latest: pkg.manifest.version }, time: { [pkg.manifest.version]: '2025-01-01T00:00:00.000Z' }, versions: { [pkg.manifest.version]: { ...pkg.manifest, dist: { integrity: pkg.integrity, tarball: 'http://127.0.0.1:' + server.address().port + '/' + name + '.tgz' } } } }))
    })
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
    const home = join(root, 'home')
    const profile = join(home, 'profiles/web')
    await mkdir(profile, { recursive: true })
    // Force an isolated staging workspace; do not inherit an ancestor workspace.
    await writeFile(join(profile, 'pnpm-workspace.yaml'), 'autoInstallPeers: false\nallowBuilds:\n  fixture-approved: true\n')
    const hostDirectory = join(root, 'host', host)
    await mkdir(hostDirectory, { recursive: true })
    await writeFile(join(hostDirectory, 'package.json'), JSON.stringify({ name: host, version: '1.0.0', main: 'index.js' }))
    await writeFile(join(hostDirectory, 'index.js'), 'module.exports = {}')
    await mkdir(join(home, 'profiles/node_modules/@deepseek-ai'), { recursive: true })
    await symlink(hostDirectory, join(home, 'profiles/node_modules', host), 'junction')
    const result = await installGeneration({ dshHome: home, pluginSpec: plugin + '@1.0.0', expectedPluginName: plugin, expectedVersion: '1.0.0', registry: 'http://127.0.0.1:' + server.address().port, autoInstallPeers: false, nodeExecutablePath: process.execPath, pnpmEntryPath: resolve('node_modules/pnpm/bin/pnpm.cjs'), environment: { ...process.env, HOME: root, XDG_CACHE_HOME: join(root, 'cache'), npm_config_store_dir: join(root, 'store') } })
    expect(result.ok, result.detail).toBe(true)
    expect(result.hoisted).toEqual([])
    expect(await verifyGenerationPeers(home, result.generation)).toEqual({ ok: true, problems: [] })
    const installed = join(result.generation.directory, 'node_modules', plugin)
    const childCode = [
      'import assert from "node:assert/strict";',
      'import { Context } from ' + JSON.stringify(pathToFileURL(resolve('node_modules/@deepseek-ai/cordis/lib/index.js')).href) + ';',
      'const loaded = await import(' + JSON.stringify(pathToFileURL(join(installed, 'index.js')).href) + ');',
      'assert.equal(loaded.default, 42);',
      'const ctx = new Context(); let observed;',
      'ctx.on("fixture-private-peer:value", value => { observed = value });',
      'try { await ctx.plugin(loaded.apply); assert.equal(observed, 42); console.log(JSON.stringify({ imported: loaded.default, activated: observed })) } finally { await ctx.fiber.dispose() }'
    ].join('\n')
    const child = await run(process.execPath, ['--input-type=module', '-e', childCode], { cwd: root })
    expect(JSON.parse(child.stdout.trim())).toEqual({ imported: 42, activated: 42 })
    const lock = await readFile(join(result.generation.directory, 'pnpm-lock.yaml'), 'utf8')
    expect(lock).toContain('autoInstallPeers: false')
    expect(lock).toContain('specifier: ^1.0.0')
    expect(lock).toContain(peer + '@1.2.0')
    expect(JSON.parse(await readFile(join(installed, 'package.json'), 'utf8'))).toMatchObject({ name: plugin, version: '1.0.0' })
    expect(requests.some(path => decodeURIComponent(path).includes(host))).toBe(false)
    expect(requests.some(path => path.includes('dsh-fixture-optional'))).toBe(false)
  } finally {
    if (server) await new Promise(resolve => server.close(resolve))
    await rm(root, { recursive: true, force: true })
  }
}, 30000)

it('rejects a previously compatible peer displaced by real pnpm provider hoisting (#723)', async () => {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'dsh-peer-hoist-')))
  const run = promisify(execFile)
  const manifests = [
    { name: 'a-provider', version: '1.0.0' },
    { name: 'a-provider', version: '2.0.0' },
    { name: 'b-provider', version: '1.0.0', dependencies: { 'a-provider': '2.0.0' } },
    { name: 'z-carrier', version: '1.0.0', dependencies: { 'a-provider': '1.0.0' } },
    { name: 'z-plugin', version: '1.0.0', dependencies: { 'z-carrier': '1.0.0' }, peerDependencies: { 'a-provider': '^1.0.0', 'b-provider': '^1.0.0' } }
  ]
  const packages = new Map()
  const archives = new Map()
  const trace = []
  let server
  try {
    for (const manifest of manifests) {
      const key = manifest.name + '-' + manifest.version
      const directory = join(root, key, 'package')
      await mkdir(directory, { recursive: true })
      await writeFile(join(directory, 'package.json'), JSON.stringify({ ...manifest, main: 'index.js' }))
      await writeFile(join(directory, 'index.js'), 'module.exports = {}')
      const tarball = join(root, key + '.tgz')
      await run('tar', ['-czf', key + '.tgz', '-C', join(directory, '..'), 'package'], { cwd: root })
      const bytes = await readFile(tarball)
      archives.set('/' + key + '.tgz', bytes)
      if (!packages.has(manifest.name)) packages.set(manifest.name, [])
      packages.get(manifest.name).push({ ...manifest, main: 'index.js', dist: { integrity: 'sha512-' + createHash('sha512').update(bytes).digest('base64'), tarball: key + '.tgz' } })
    }
    server = createServer((req, res) => {
      if (archives.has(req.url)) { res.end(archives.get(req.url)); return }
      const versions = packages.get(decodeURIComponent(req.url.slice(1)))
      if (!versions) { res.statusCode = 404; res.end('{}'); return }
      const registry = 'http://127.0.0.1:' + server.address().port
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify({ name: versions[0].name, 'dist-tags': { latest: versions.at(-1).version }, time: Object.fromEntries(versions.map(pkg => [pkg.version, '2025-01-01T00:00:00.000Z'])), versions: Object.fromEntries(versions.map(pkg => [pkg.version, { ...pkg, dist: { ...pkg.dist, tarball: registry + '/' + pkg.dist.tarball } }])) }))
    })
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
    const home = join(root, 'home')
    const profile = join(home, 'profiles/web')
    await mkdir(profile, { recursive: true })
    await writeFile(join(profile, 'pnpm-workspace.yaml'), 'autoInstallPeers: false\nallowBuilds:\n  fixture-approved: true\n')
    const previousProfile = JSON.stringify({ dependencies: { 'old-working-plugin': '1.0.0' } })
    await writeFile(join(profile, 'package.json'), previousProfile)
    const result = await installGeneration({ dshHome: home, pluginSpec: 'z-plugin@1.0.0', expectedPluginName: 'z-plugin', expectedVersion: '1.0.0', autoInstallPeers: false, registry: 'http://127.0.0.1:' + server.address().port, nodeExecutablePath: process.execPath, pnpmEntryPath: resolve('node_modules/pnpm/bin/pnpm.cjs'), environment: { ...process.env, HOME: root, XDG_CACHE_HOME: join(root, 'cache'), npm_config_store_dir: join(root, 'store') }, onTrace: line => trace.push(line) })
    expect(result.ok, JSON.stringify({ result, trace })).toBe(false)
    expect(result.detail).toContain('ERR_PRIVATE_PEER_VERSION: a-provider does not satisfy ^1.0.0')
    expect(await readdir(join(home, 'profiles/.generations/live'))).toEqual([])
    expect(await readdir(join(home, 'profiles/.generations/staging'))).toEqual([])
    expect(await readFile(join(profile, 'package.json'), 'utf8')).toBe(previousProfile)
  } finally {
    if (server) await new Promise(resolve => server.close(resolve))
    await rm(root, { recursive: true, force: true })
  }
}, 60000)
