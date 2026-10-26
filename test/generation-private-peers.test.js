import { afterEach, expect, it } from 'vitest'
import { mkdtemp, mkdir, readFile, writeFile, readdir, rm, cp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { installGeneration, installPnpmArguments } from '../packages/dsh-desktop-market-installer/generations/installer.mjs'

const roots = []
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))) })
async function fixture(manifest, second = async () => ({ code: 0, output: '' }), spec = 'fixture-plugin@moving', initial = async () => {}, expectedPluginName) {
  const home = await mkdtemp(join(tmpdir(), 'dsh-peer-unit-'))
  roots.push(home)
  const calls = []
  const result = await installGeneration({ dshHome: home, pluginSpec: spec, expectedPluginName, nodeExecutablePath: process.execPath, pnpmEntryPath: 'pnpm', runInstall: async (staging, phase) => {
    calls.push(phase)
    if (phase === 'peers') return second(staging)
    await writeFile(join(staging, 'package.json'), JSON.stringify({ dependencies: { 'fixture-plugin': 'moving' } }))
    const directory = join(staging, 'node_modules/fixture-plugin')
    await mkdir(directory, { recursive: true })
    await writeFile(join(directory, 'package.json'), JSON.stringify({ name: 'fixture-plugin', version: '1.0.0', ...manifest }))
    await writeFile(join(directory, 'index.js'), '')
    await writeFile(join(staging, 'pnpm-lock.yaml'), 'initial-selected-lock')
    await initial(staging)
    return { code: 0, output: '' }
  } })
  return { home, calls, result }
}
async function provider(staging, version = '1.2.0') {
  const directory = join(staging, 'node_modules/private-provider')
  await mkdir(directory, { recursive: true })
  await writeFile(join(directory, 'package.json'), JSON.stringify({ name: 'private-provider', version, main: 'index.js' }))
  await writeFile(join(directory, 'index.js'), 'module.exports = 42')
}
async function expectNoPublication(home) {
  expect(await readdir(join(home, 'profiles/.generations/live'))).toEqual([])
  expect(await readdir(join(home, 'profiles/.generations/staging'))).toEqual([])
}

it.each([
  { peerDependencies: { 'private-provider': '*' }, peerDependenciesMeta: { 'private-provider': { optional: true } } },
  { peerDependencies: { 'private-provider': '^1' }, dependencies: { 'private-provider': '^2' } },
  { peerDependencies: { 'private-provider': '^1' }, optionalDependencies: { 'private-provider': '^2' } },
  { peerDependencies: { 'fixture-plugin': '^1', '@deepseek-ai/cordis': '*', react: '*', 'react-dom': '*' } }
])('leaves optional peers, explicit dependencies and host ownership authoritative: %j', async manifest => {
  const { calls, result } = await fixture(manifest)
  expect(result.ok).toBe(true)
  expect(calls).toEqual([undefined])
})

it.each(['fixture-plugin@moving', 'https://registry.invalid/opaque.tgz', 'github:owner/source#' + 'a'.repeat(40)])('uses the selected manifest and preserves root spec for %s', async spec => {
  const { calls, result } = await fixture({ peerDependencies: { 'private-provider': '1.0.0 || 1.2.0' } }, async staging => {
    const root = JSON.parse(await readFile(join(staging, 'package.json'), 'utf8'))
    expect(root.dependencies).toEqual({ 'fixture-plugin': 'moving', 'private-provider': '1.0.0 || 1.2.0' })
    expect(await readFile(join(staging, 'pnpm-lock.yaml'), 'utf8')).toBe('initial-selected-lock')
    await provider(staging)
    return { code: 0, output: '' }
  }, spec)
  expect(result.ok, result.detail).toBe(true)
  expect(result.generation.pluginName).toBe('fixture-plugin')
  expect(result.generation.version).toBe('1.0.0')
  expect(calls).toEqual([undefined, 'peers'])
})

it.each([
  ['invalid range', { 'private-provider': '--registry=https://evil.invalid' }],
  ['invalid name', { '--registry=evil': '*' }]
])('rejects %s without starting a provider command', async (_label, peers) => {
  const { home, calls, result } = await fixture({ peerDependencies: peers })
  expect(result.ok).toBe(false)
  expect(result.detail).toContain('ERR_PRIVATE_PEER_RANGE')
  expect(calls).toEqual([undefined])
  await expectNoPublication(home)
})

it.each(['wrong-version', 'missing', 'failed-command', 'changed-name', 'changed-version'])('does not publish on %s', async failure => {
  const { home, result } = await fixture({ peerDependencies: { 'private-provider': '^1.0.0' } }, async staging => {
    if (failure === 'failed-command') return { code: 1, output: 'ERR_PNPM_FETCH_404 provider unavailable' }
    if (failure !== 'missing') await provider(staging, failure === 'wrong-version' ? '2.0.0' : '1.2.0')
    if (failure.startsWith('changed-')) await writeFile(join(staging, 'node_modules/fixture-plugin/package.json'), JSON.stringify({ name: failure === 'changed-name' ? 'other-plugin' : 'fixture-plugin', version: failure === 'changed-version' ? '9.0.0' : '1.0.0' }))
    return { code: 0, output: '' }
  })
  expect(result.ok).toBe(false)
  expect(result.detail).toMatch(/ERR_PRIVATE_PEER_VERSION|ERR_PRIVATE_PEER_MISSING|ERR_PNPM_FETCH_404|ERR_RESOLVED_PACKAGE_MISMATCH/)
  await expectNoPublication(home)
})


it('does not reinstall an already-compatible generation-private peer', async () => {
  const { calls, result } = await fixture({ peerDependencies: { 'private-provider': '^1.0.0' } }, async () => { throw new Error('unnecessary second install') }, 'fixture-plugin@moving', staging => provider(staging))
  expect(result.ok, result.detail).toBe(true)
  expect(calls).toEqual([undefined])
})

it('repairs an incompatible private peer, but does not hide invalid package metadata', async () => {
  const repaired = await fixture({ peerDependencies: { 'private-provider': '^1.0.0' } }, async staging => { await provider(staging); return { code: 0, output: '' } }, 'fixture-plugin@moving', staging => provider(staging, '2.0.0'))
  expect(repaired.result.ok, repaired.result.detail).toBe(true)
  expect(repaired.calls).toEqual([undefined, 'peers'])
  const malformed = await fixture({ peerDependencies: { 'private-provider': '^1.0.0' } }, async () => { throw new Error('must not repair invalid metadata') }, 'fixture-plugin@moving', async staging => {
    await provider(staging)
    await writeFile(join(staging, 'node_modules/private-provider/package.json'), '{')
  })
  expect(malformed.result.ok).toBe(false)
  expect(malformed.calls).toEqual([undefined])
  expect(malformed.result.detail).toMatch(/Invalid package config|JSON/)
})

it('does not bypass a nearer wrong-name subpath provider for a valid farther provider', async () => {
  const { home, calls, result } = await fixture(
    { peerDependencies: { 'private-provider': '^1.0.0' } },
    async () => ({ code: 0, output: '' }),
    'fixture-plugin@moving',
    async staging => {
      await provider(staging)
      await writeFile(join(staging, 'node_modules/private-provider/package.json'), JSON.stringify({
        name: 'private-provider', version: '1.2.0', exports: './index.js'
      }))
      const nearer = join(staging, 'node_modules/fixture-plugin/node_modules/private-provider')
      await mkdir(nearer, { recursive: true })
      await writeFile(join(nearer, 'package.json'), JSON.stringify({
        name: 'other-provider', version: '1.2.0', exports: { './feature': './feature.js' }
      }))
      await writeFile(join(nearer, 'feature.js'), 'module.exports = 0')
    }
  )
  expect(calls).toEqual([undefined, 'peers'])
  expect(result.ok).toBe(false)
  expect(result.detail).toContain('ERR_PRIVATE_PEER_MISSING: private-provider')
  await expectNoPublication(home)
})

it('accepts a private peer whose wildcard export selects a nested helper manifest', async () => {
  const { calls, result } = await fixture(
    { peerDependencies: { 'private-provider': '^1.0.0' } },
    async () => { throw new Error('unnecessary second install') },
    'fixture-plugin@moving',
    async staging => {
      const directory = join(staging, 'node_modules/private-provider')
      await mkdir(join(directory, 'dist/cjs'), { recursive: true })
      await writeFile(join(directory, 'package.json'), JSON.stringify({
        name: 'private-provider', version: '1.2.0', exports: { './*': './dist/cjs/*' }
      }))
      await writeFile(join(directory, 'dist/cjs/package.json'), JSON.stringify({ type: 'commonjs' }))
    }
  )
  expect(result.ok, result.detail).toBe(true)
  expect(calls).toEqual([undefined])
})

it.each([true, false])('preserves copied source and only supplies its missing private peer (existing=%s)', async existing => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-source-peer-'))
  roots.push(root)
  const source = join(root, 'local-source')
  await mkdir(source, { recursive: true })
  await writeFile(join(source, 'package.json'), JSON.stringify({ name: 'fixture-plugin', version: '1.0.0', main: 'index.js', peerDependencies: { 'private-provider': '^1.0.0' } }))
  await writeFile(join(source, 'index.js'), 'source marker')
  if (existing) await provider(source)
  const calls = []
  const result = await installGeneration({ dshHome: join(root, 'home'), pluginSpec: 'file:' + source, sourceDirectory: source, expectedPluginName: 'fixture-plugin', nodeExecutablePath: process.execPath, pnpmEntryPath: 'pnpm', runInstall: async (staging, phase) => {
    calls.push(phase)
    if (phase === 'peers') { await provider(staging); return { code: 0, output: '' } }
    await cp(join(staging, 'source/fixture-plugin'), join(staging, 'node_modules/fixture-plugin'), { recursive: true })
    await writeFile(join(staging, 'package.json'), JSON.stringify({ dependencies: { 'fixture-plugin': 'file:./source/fixture-plugin' } }))
    await writeFile(join(staging, 'pnpm-lock.yaml'), 'source lock')
    return { code: 0, output: '' }
  } })
  expect(result.ok, result.detail).toBe(true)
  expect(calls).toEqual(existing ? [undefined] : [undefined, 'peers'])
  expect(await readFile(join(result.generation.directory, 'node_modules/fixture-plugin/index.js'), 'utf8')).toBe('source marker')
  expect(await readFile(join(source, 'index.js'), 'utf8')).toBe('source marker')
})


it.each([false, true])('preserves an aliased install key while freezing its actual manifest identity (peers=%s)', async peers => {
  const { calls, result } = await fixture({ name: 'actual-plugin', ...(peers ? { peerDependencies: { 'private-provider': '^1.0.0' } } : {}) }, async staging => {
    await provider(staging)
    return { code: 0, output: '' }
  }, 'fixture-plugin@npm:actual-plugin@1.0.0', async staging => {
    await writeFile(join(staging, 'package.json'), JSON.stringify({ dependencies: { 'fixture-plugin': 'npm:actual-plugin@1.0.0' } }))
  }, 'fixture-plugin')
  expect(result.ok, result.detail).toBe(true)
  expect(result.generation.pluginName).toBe('fixture-plugin')
  expect(JSON.parse(await readFile(join(result.generation.directory, 'node_modules/fixture-plugin/package.json'), 'utf8')).name).toBe('actual-plugin')
  expect(calls).toEqual(peers ? [undefined, 'peers'] : [undefined])
})

it('preserves every subprocess policy and never repeats the moving plugin spec in the peer phase', () => {
  const args = installPnpmArguments({ pnpmEntryPath: '/pnpm.cjs', pluginSpec: 'fixture-plugin@moving', installPhase: 'peers', registry: 'https://registry.invalid', autoInstallPeers: false, strictDepBuilds: true, minimumReleaseAge: 0, environment: {} }, {}, 'linux')
  expect(args).toEqual(['/pnpm.cjs', 'install', '--no-frozen-lockfile', '--registry=https://registry.invalid', '--config.auto-install-peers=false', '--config.strict-dep-builds=true', '--config.minimum-release-age=0'])
})
