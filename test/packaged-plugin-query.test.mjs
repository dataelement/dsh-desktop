import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { copyFile, mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { pnpmLaunchArguments } from '../packages/dsh-desktop-market-installer/pnpm-runner.mjs'

const require = createRequire(import.meta.url)
const pnpmEntry = join(dirname(require.resolve('pnpm')), 'bin', 'pnpm.cjs')
const npmEntry = join(dirname(createRequire(pnpmEntry).resolve('npm/package.json')), 'bin', 'npm-cli.js')
const runner = fileURLToPath(new URL('../packages/dsh-desktop-market-installer/pnpm-runner.mjs', import.meta.url))
const packageName = '@query-fixture/plugin'
const fixtureToken = 'local-registry-fixture-token'

function isolatedEnvironment(root) {
  // Windows treats env keys case-insensitively. Remove every spelling before
  // supplying our own paths so no developer config, credential or npm shim leaks in.
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
    !/^(?:path|node_options|node_path|home|userprofile|appdata|localappdata|xdg_config_home|npm_config_.*|pnpm_.*|corepack_.*|.*_proxy|dsh_desktop_.*)$/iu.test(key)))
  return {
    ...env,
    PATH: '',
    HOME: join(root, 'home'),
    USERPROFILE: join(root, 'home'),
    APPDATA: join(root, 'home'),
    LOCALAPPDATA: join(root, 'home'),
    XDG_CONFIG_HOME: join(root, 'home'),
    npm_config_userconfig: join(root, 'home', '.npmrc'),
    npm_config_globalconfig: join(root, 'global.npmrc'),
    npm_config_cache: join(root, 'cache'),
    npm_config_update_notifier: 'false',
    npm_config_audit: 'false',
    npm_config_fund: 'false',
    // Electron is also a supported Desktop Node executable.
    ELECTRON_RUN_AS_NODE: '1'
  }
}

function runChild(args, cwd, env) {
  // Keep the event loop free: this same process serves the fake registry.
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], timeout: 20_000
    })
    let stdout = ''
    let stderr = ''
    child.stdout.setEncoding('utf8').on('data', chunk => { stdout += chunk })
    child.stderr.setEncoding('utf8').on('data', chunk => { stderr += chunk })
    child.once('error', reject)
    child.once('close', (code, signal) => resolve({ code, signal, stdout, stderr }))
  })
}

describe('packaged plugin metadata queries', () => {
  it.each(['view', 'info', 'show', 'v'])('dispatches %s to installation-owned npm and translates config flags', command => {
    const query = [packageName, 'peerDependencies', '--json', '--config.fetch-retries=0',
      '--config.registry=http://127.0.0.1:12345/registry/', '--config.tag=tag=with=equals']
    const original = [pnpmEntry, command, ...query]
    expect(pnpmLaunchArguments(original, {}, 'linux')).toEqual([
      npmEntry, command, packageName, 'peerDependencies', '--json', '--fetch-retries=0',
      '--registry=http://127.0.0.1:12345/registry/', '--tag=tag=with=equals'
    ])
    expect(original).toEqual([pnpmEntry, command, ...query])
  })

  it('keeps add and its pnpm-specific arguments unchanged on every platform', () => {
    const args = [pnpmEntry, 'add', `${packageName}@^1.0.0`, '--config.fetch-retries=0', '--ignore-scripts']
    for (const platform of ['linux', 'darwin', 'win32']) {
      expect(pnpmLaunchArguments(args, {}, platform)).toEqual(args)
    }
  })

  it('reports missing installation-owned npm instead of falling back to the system', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh missing query runtime '))
    try {
      const missingPnpm = join(root, 'node_modules', 'pnpm', 'bin', 'pnpm.cjs')
      expect(() => pnpmLaunchArguments([missingPnpm, 'view', 'dshmarket'], {}, 'win32'))
        .toThrow('Desktop bundled npm query runtime is unavailable')
    } finally { await rm(root, { recursive: true, force: true }) }
  })

  it('queries a local authenticated scoped registry without PATH npm, preserving JSON and errors', async () => {
    const root = await realpath(await mkdtemp(join(tmpdir(), 'dsh packaged query ')))
    const requests = []
    const versions = Object.fromEntries(['1.0.0', '1.2.0', '2.0.0'].map(version => [version, {
      name: packageName, version,
      description: 'Local plugin metadata fixture',
      peerDependencies: { '@deepseek-ai/dsh': '^0.2.0' },
      dsh: { bundle: { patch: 'cordis.patch.yml' } }
    }]))
    const packument = {
      name: packageName, 'dist-tags': { latest: '2.0.0' }, versions
    }
    const server = createServer((request, response) => {
      const path = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname)
      requests.push({ path, authorization: request.headers.authorization })
      response.setHeader('content-type', 'application/json')
      if (path === `/scoped/${packageName}`) {
        if (request.headers.authorization !== `Bearer ${fixtureToken}`) {
          response.writeHead(401)
          response.end(JSON.stringify({ error: 'Fixture authentication required' }))
          return
        }
        response.end(JSON.stringify(packument))
      } else {
        response.writeHead(404)
        response.end(JSON.stringify({ error: 'Fixture package not found' }))
      }
    })
    try {
      server.listen(0, '127.0.0.1')
      await once(server, 'listening')
      const registry = `http://127.0.0.1:${server.address().port}`
      await mkdir(join(root, 'home'))
      await writeFile(join(root, 'package.json'), '{}')
      await writeFile(join(root, 'global.npmrc'), '')
      await writeFile(join(root, 'home', '.npmrc'), [
        `registry=${registry}/default/`,
        `@query-fixture:registry=${registry}/scoped/`,
        `//127.0.0.1:${server.address().port}/scoped/:_authToken=${fixtureToken}`,
        ''
      ].join('\n'))
      // The real shim runs a staged copy. A Profile-owned npm must not shadow
      // the query runtime beside the installation's absolute pnpm entry.
      const staged = join(root, '.desktop-bin')
      await mkdir(staged)
      for (const file of ['pnpm-runner.mjs', 'windows-hide-console.mjs']) {
        await copyFile(join(dirname(runner), file), join(staged, file))
      }
      const profileNpm = join(root, 'node_modules', 'npm')
      await mkdir(join(profileNpm, 'bin'), { recursive: true })
      await writeFile(join(profileNpm, 'package.json'), JSON.stringify({ name: 'npm', exports: { './package.json': './package.json' } }))
      await writeFile(join(profileNpm, 'bin', 'npm-cli.js'), 'throw new Error("Profile npm must not execute")')
      const env = isolatedEnvironment(root)
      const config = [`--config.registry=${registry}/default/`, '--config.fetch-retries=0',
        '--config.fetch-timeout=5000', '--config.update-notifier=false']
      const query = args => runChild([join(staged, 'pnpm-runner.mjs'), pnpmEntry, ...args, ...config], root, env)

      // Negative control reproduces pnpm 10's delegation to an absent PATH npm,
      // under exactly the environment and arguments the fixed runner handles.
      const legacy = await runChild([pnpmEntry, 'view', `${packageName}@1.2.0`, '--json', ...config], root, env)
      expect(legacy.signal).toBeNull()
      expect(legacy.code).not.toBe(0)
      expect(`${legacy.stdout}\n${legacy.stderr}`).toMatch(/spawn(?:Sync)? npm(?:\.cmd)? ENOENT/iu)
      expect(requests).toEqual([])

      const full = await query(['view', `${packageName}@1.2.0`, '--json'])
      expect(full.signal).toBeNull()
      expect(full.code, full.stderr).toBe(0)
      expect(JSON.parse(full.stdout)).toMatchObject(versions['1.2.0'])

      const fields = await query(['info', `${packageName}@1.2.0`, 'version', 'peerDependencies', 'dsh', '--json'])
      expect(fields.code, fields.stderr).toBe(0)
      expect(JSON.parse(fields.stdout)).toEqual({
        version: '1.2.0', peerDependencies: versions['1.2.0'].peerDependencies, dsh: versions['1.2.0'].dsh
      })

      const range = await query(['show', `${packageName}@^1.0.0`, 'version', '--json'])
      expect(range.code, range.stderr).toBe(0)
      expect(JSON.parse(range.stdout)).toEqual(['1.0.0', '1.2.0'])

      const latest = await query(['v', packageName, 'version', '--json'])
      expect(latest.code, latest.stderr).toBe(0)
      expect(JSON.parse(latest.stdout)).toBe('2.0.0')

      const missing = await query(['view', '@query-fixture/missing', '--json'])
      expect(missing.signal).toBeNull()
      expect(missing.code).not.toBe(0)
      expect(JSON.parse(missing.stdout).error.code).toBe('E404')
      expect(missing.stderr).toContain('E404')
      expect(requests.length).toBeGreaterThanOrEqual(5)
      expect(requests.every(request => request.path.startsWith('/scoped/@query-fixture/'))).toBe(true)
      expect(requests.every(request => request.authorization === `Bearer ${fixtureToken}`)).toBe(true)
      expect(requests.some(request => request.path === '/scoped/@query-fixture/missing')).toBe(true)
    } finally {
      await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
      await rm(root, { recursive: true, force: true })
    }
  }, 60_000)
})
