import { createServer } from 'node:http'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { stagePnpmRunner } from '../packages/dsh-desktop-market-installer/index.js'
import { PluginManager } from '@deepseek-ai/dsh-plugin-manager'

const execute = promisify(execFile)
const pnpm = resolve('node_modules/pnpm/bin/pnpm.cjs')
let directory, server, registry, calls, environment, runner, redirectTo, primaryStatus
const manifest = (name, version) => ({ name, version, description: 'Fixture plugin',
  engines: { dsh: '^0.2.2' }, peerDependencies: { '@deepseek-ai/dsh': '^0.2.2' },
  dsh: { client: { entry: 'client.js' } }, dist: { integrity: 'sha512-fixture' } })
const metadata = name => ({ name, 'dist-tags': { latest: '2.0.0', beta: '3.0.0-beta.1' },
  versions: Object.fromEntries(['1.0.0', '1.5.0', '2.0.0', '3.0.0-beta.1'].map(version => [version, manifest(name, version)])) })

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'dsh registry view '))
  calls = []
  redirectTo = undefined
  primaryStatus = undefined
  server = createServer((request, response) => {
    calls.push({ url: request.url, authorization: request.headers.authorization })
    const pathname = new URL(request.url, 'http://fixture.invalid').pathname
    if (pathname.startsWith('/unavailable/')) {
      response.writeHead(primaryStatus)
      response.end('private server error fixture-token')
      return
    }
    const name = decodeURIComponent(pathname.replace(/^\/private\//u, '/').slice(1))
    if (name === 'redirect') { response.writeHead(302, { location: redirectTo }); response.end(); return }
    if (name === 'missing') { response.writeHead(404); response.end('private server error'); return }
    if (name === 'slow') return
    if (name === 'invalid') { response.end('{'); return }
    if (name === '@private/plugin' && request.headers.authorization !== 'Bearer fixture-token') {
      response.writeHead(401); response.end(); return
    }
    response.setHeader('content-type', 'application/json')
    response.end(JSON.stringify(metadata(name)))
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  registry = `http://127.0.0.1:${server.address().port}/`
  await writeFile(join(directory, 'package.json'), '{"private":true}')
  await writeFile(join(directory, 'user.npmrc'), '')
  await writeFile(join(directory, 'global.npmrc'), '')
  await mkdir(join(directory, 'empty-path'))
  await mkdir(join(directory, 'bin'))
  runner = await stagePnpmRunner(join(directory, 'bin'))
  environment = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^npm_config_/iu.test(key) && !/^DSH_/u.test(key) && !/^path$/iu.test(key)))
  Object.assign(environment, { PATH: join(directory, 'empty-path'),
    npm_config_userconfig: join(directory, 'user.npmrc'), npm_config_globalconfig: join(directory, 'global.npmrc'),
    npm_config_registry: registry, ELECTRON_RUN_AS_NODE: '1' })
})

afterEach(async () => {
  server.closeAllConnections()
  await new Promise(resolve => server.close(resolve))
  await rm(directory, { recursive: true, force: true })
})

const query = (args, options = {}) => execute(process.execPath, [runner, pnpm, 'view', ...args, '--json'], {
  cwd: directory, env: environment, timeout: 10000, ...options
})

describe('registry metadata without system npm or node on PATH', () => {
  it('runs the staged runner and real pnpm, preserving plugin and compatibility fields', async () => {
    const result = await query(['plugin', 'name', 'version', 'description', 'dsh', 'engines', 'peerDependencies', 'dist.integrity'])
    expect(JSON.parse(result.stdout)).toEqual({ name: 'plugin', version: '2.0.0', description: 'Fixture plugin',
      dsh: manifest('plugin', '2.0.0').dsh, engines: { dsh: '^0.2.2' },
      peerDependencies: { '@deepseek-ai/dsh': '^0.2.2' }, 'dist.integrity': 'sha512-fixture' })
    expect(calls).toHaveLength(1)
    expect(await readFile(join(directory, 'bin/registry-view.mjs'), 'utf8')).toContain('export async function registryView')
  })

  it('selects exact versions, tags and ordered semver range matches', async () => {
    expect(JSON.parse((await query(['plugin@1.0.0', 'version'])).stdout)).toBe('1.0.0')
    expect(JSON.parse((await query(['plugin@v1.0.0', 'version'])).stdout)).toBe('1.0.0')
    expect(JSON.parse((await query(['plugin@beta', 'version'])).stdout)).toBe('3.0.0-beta.1')
    expect(JSON.parse((await query(['plugin@^1', 'name', 'version'])).stdout)).toEqual([
      { name: 'plugin', version: '1.0.0' }, { name: 'plugin', version: '1.5.0' }
    ])
    expect(JSON.parse((await query(['plugin', 'versions'])).stdout)).toEqual(['1.0.0', '1.5.0', '2.0.0', '3.0.0-beta.1'])
  })

  it('uses scoped registries and path-scoped credentials from the Profile npmrc', async () => {
    await writeFile(join(directory, '.npmrc'), `@private:registry=${registry}private/\n//127.0.0.1:${server.address().port}/private/:_authToken=fixture-token\n`)
    const result = await query(['@private/plugin', 'name', 'version'])
    expect(JSON.parse(result.stdout)).toEqual({ name: '@private/plugin', version: '2.0.0' })
    expect(calls).toEqual([{ url: '/private/%40private%2Fplugin', authorization: 'Bearer fixture-token' }])
  })

  it('honors a registry argument over environment configuration', async () => {
    environment.npm_config_registry = 'http://127.0.0.1:1/'
    expect(JSON.parse((await query(['plugin', 'version', `--registry=${registry}`])).stdout)).toBe('2.0.0')
  })

  it('uses the configured HTTP proxy through pnpm networking', async () => {
    environment.npm_config_registry = 'http://fixture.invalid/'
    await writeFile(join(directory, '.npmrc'), `proxy=${registry}\n`)
    expect(JSON.parse((await query(['plugin', 'version'])).stdout)).toBe('2.0.0')
    expect(calls[0].url).toBe('http://fixture.invalid/plugin')
  })

  it('does not forward registry authorization across hosts on redirects', async () => {
    const received = []
    const other = createServer((request, response) => {
      received.push(request.headers.authorization)
      response.end(JSON.stringify(metadata('redirect')))
    })
    await new Promise(resolve => other.listen(0, '127.0.0.1', resolve))
    redirectTo = `http://127.0.0.1:${other.address().port}/redirect`
    try {
      await writeFile(join(directory, '.npmrc'), `//127.0.0.1:${server.address().port}/:_authToken=fixture-token\n`)
      expect(JSON.parse((await query(['redirect', 'version'])).stdout)).toBe('2.0.0')
      expect(calls[0].authorization).toBe('Bearer fixture-token')
      expect(received).toEqual([undefined])
    } finally { other.closeAllConnections(); await new Promise(resolve => other.close(resolve)) }
  })

  it('returns nonzero for missing packages, missing versions and invalid metadata', async () => {
    for (const [spec, code] of [['missing', 'E404'], ['plugin@9', 'ETARGET'], ['invalid', 'ERR_REGISTRY_METADATA']]) {
      const error = await query([spec, 'name']).catch(error => error)
      expect(error.code).toBe(1)
      expect(error.stderr).toContain(code)
      expect(error.stderr).not.toContain('fixture-token')
      expect(error.stderr).not.toContain('private server error')
      expect(error.stdout).toBe('')
    }
  })

  // Use the shipped manager's query loop and classifier, plus real pnpm and
  // HTTP responses, so a change in the adapter's error contract is observable.
  const askRegistries = async () => {
    const manager = Object.assign(Object.create(PluginManager.prototype), {
      profile: { dir: directory, packageManager: {
        command: process.execPath, args: [runner, pnpm], env: environment
      } },
      inspectTimeoutMs: 10000
    })
    return manager.askRegistries('plugin', ['name', 'version'],
      [registry + 'unavailable/', registry], { kind: 'registry', name: 'plugin' })
  }

  it.each([500, 503])('tries the fallback registry when the primary returns HTTP %i', async status => {
    primaryStatus = status
    const result = await askRegistries()
    expect(result).toMatchObject({ status: 'answered', registry,
      answer: { name: 'plugin', version: '2.0.0' },
      attempts: [{ registry: registry + 'unavailable/', problem: 'network' }, { registry }] })
    expect(result.attempts[0].reason).toContain(`ERR_PNPM_FETCH_${status}`)
    expect(result.attempts[0].reason).not.toMatch(/private server error|fixture-token/u)
    expect(calls.map(call => call.url)).toEqual(['/unavailable/plugin', '/plugin'])
  })

  it.each([401, 403])('does not try another registry after HTTP %i', async status => {
    primaryStatus = status
    const result = await askRegistries()
    expect(result).toMatchObject({ status: 'refused', problem: 'unknown',
      attempts: [{ registry: registry + 'unavailable/', problem: 'unknown' }] })
    expect(calls.map(call => call.url)).toEqual(['/unavailable/plugin'])
  })

  it('bounds a nonresponding registry request without npm fallback', async () => {
    const started = Date.now()
    const error = await query(['slow', 'name', '--config.fetch-timeout=150']).catch(error => error)
    expect(error.code).toBe(1)
    expect(Date.now() - started).toBeLessThan(5000)
    expect(error.stderr).not.toContain('spawnSync npm')
    expect(calls).toHaveLength(1)
  })
})
