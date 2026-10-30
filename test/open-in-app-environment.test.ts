import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm, rmdir, writeFile } from 'node:fs/promises'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { scrubbedParentEnv } from '@deepseek-ai/dsh-subprocess'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { projectRoot } from './patch-path'

type Launcher = (command: string, args: readonly string[], options: {
  watchMs: number
  env?: Record<string, string>
  windowsHide?: boolean
}) => Promise<void>

const packageRoot = join(projectRoot, 'node_modules/@deepseek-ai/dsh-host-open-in-app')
const nativeElectron = process.env.DSH_TEST_OPEN_IN_ELECTRON === '1' &&
  (process.platform === 'darwin' || process.platform === 'win32')
const selectorNames = ['ELECTRON_RUN_AS_NODE', 'electron_run_as_node', 'Electron_Run_As_Node']
let scratch: string
let witness: string
let originalRunAsNode: string | undefined

beforeEach(async () => {
  originalRunAsNode = process.env.ELECTRON_RUN_AS_NODE
  scratch = await mkdtemp(join(tmpdir(), 'dsh-open-in-env-'))
  witness = join(scratch, 'child-result.txt')
  await writeFile(join(scratch, 'package.json'), JSON.stringify({ main: 'entry.cjs', type: 'commonjs' }))
})

async function installedLauncher(artifact: 'bundle' | 'module'): Promise<Launcher> {
  if (artifact === 'module') {
    const resolver = await import(pathToFileURL(join(packageRoot, 'lib/types/resolver.js')).href)
    return resolver.launchDetachedApp as Launcher
  }
  // The production bundle keeps this helper private. Execute its installed
  // implementation with the real spawn and shared scrub, rather than a copy.
  const source = await readFile(join(packageRoot, 'lib/index.js'), 'utf8')
  const start = source.indexOf('const launchDetachedApp = ')
  const end = source.indexOf('function resolveInternals(', start)
  expect(start).toBeGreaterThan(-1)
  expect(end).toBeGreaterThan(start)
  return new Function('spawn', 'scrubbedParentEnv', `${source.slice(start, end)}\nreturn launchDetachedApp;`)(
    spawn, scrubbedParentEnv
  ) as Launcher
}

function inheritedSelector(name: string): void {
  for (const selector of selectorNames) vi.stubEnv(selector, undefined)
  vi.stubEnv(name, '1')
}

function childAssertions(expected: Record<string, string | undefined>, selectors: string[] = []): string {
  return `
  {
    const assert = require('node:assert/strict');
    assert.deepEqual(Object.keys(process.env).filter(name => name.toUpperCase() === 'ELECTRON_RUN_AS_NODE'), ${JSON.stringify(selectors)});
    ${Object.entries(expected).map(([name, value]) =>
      `assert.equal(process.env[${JSON.stringify(name)}], ${JSON.stringify(value) ?? 'undefined'});`
    ).join('\n')}
    require('node:fs').writeFileSync(${JSON.stringify(witness)}, 'passed');
  }
  `
}

afterEach(async () => {
  vi.unstubAllEnvs()
  // Windows aliases share one process.env entry, while Vitest tracks each
  // spelling separately. Restore the original value after those aliases.
  if (process.platform === 'win32') {
    if (originalRunAsNode === undefined) Reflect.deleteProperty(process.env, 'ELECTRON_RUN_AS_NODE')
    else process.env.ELECTRON_RUN_AS_NODE = originalRunAsNode
  }
  await rm(witness, { force: true })
  await rm(join(scratch, 'entry.cjs'), { force: true })
  await rm(join(scratch, 'package.json'))
  await rmdir(scratch)
})

describe.each(['bundle', 'module'] as const)('installed Open In %s environment', (artifact) => {
  it.each(selectorNames)('removes inherited %s before launching a GUI adapter', async (name) => {
    inheritedSelector(name)
    vi.stubEnv('OPEN_IN_TEST_SECRET', 'test-only-secret')
    vi.stubEnv('DSH_OPEN_IN_TEST_FACT', 'test-only-host-fact')
    vi.stubEnv('dsh_open_in_test_fact', 'test-only-host-fact')
    vi.stubEnv('HTTPS_PROXY', 'http://proxy.example.test:8080')
    vi.stubEnv('OPEN_IN_TEST_VALUE', 'ordinary-value')
    const launch = await installedLauncher(artifact)

    await expect(launch(process.execPath, ['-e', childAssertions({
      OPEN_IN_TEST_SECRET: undefined,
      DSH_OPEN_IN_TEST_FACT: undefined,
      dsh_open_in_test_fact: undefined,
      HTTPS_PROXY: 'http://proxy.example.test:8080',
      PATH: process.env.PATH,
      OPEN_IN_TEST_VALUE: 'ordinary-value'
    })], { watchMs: 10_000 })).resolves.toBeUndefined()
    expect(await readFile(witness, 'utf8')).toBe('passed')
    expect(process.env[name]).toBe('1')
  })

  it('preserves explicit Node mode required by the GitHub Desktop CLI adapter', async () => {
    inheritedSelector('electron_run_as_node')
    const launch = await installedLauncher(artifact)

    await expect(launch(process.execPath, ['-e', childAssertions({
      ELECTRON_RUN_AS_NODE: '1',
      OPEN_IN_ADAPTER_VALUE: 'explicit-value'
    }, ['ELECTRON_RUN_AS_NODE'])], {
      watchMs: 10_000,
      windowsHide: true,
      env: { ELECTRON_RUN_AS_NODE: '1', OPEN_IN_ADAPTER_VALUE: 'explicit-value' }
    })).resolves.toBeUndefined()
    expect(await readFile(witness, 'utf8')).toBe('passed')
    expect(process.env.electron_run_as_node).toBe('1')
  })

  it('still reports early nonzero child exits as launch failures', async () => {
    const launch = await installedLauncher(artifact)
    await expect(launch(process.execPath, ['-e', 'process.exit(7)'], { watchMs: 10_000 }))
      .rejects.toThrow('launcher exited with code 7')
  })

  it.runIf(nativeElectron)('starts Electron in GUI mode with an inherited Node selector', async () => {
    inheritedSelector('ELECTRON_RUN_AS_NODE')
    const launch = await installedLauncher(artifact)
    const electron = createRequire(import.meta.url)('electron') as string
    // Keep Electron-created caches outside the fixture; never recursively
    // remove them as part of test cleanup.
    const userData = await mkdtemp(join(tmpdir(), 'dsh-open-in-electron-userdata-'))
    await writeFile(join(scratch, 'entry.cjs'), `
      const assert = require('node:assert/strict');
      const { app } = require('electron');
      app.setPath('userData', ${JSON.stringify(userData)});
      app.setPath('sessionData', ${JSON.stringify(userData)});
      try {
        assert.equal(process.type, 'browser');
        assert.ok(app);
        ${childAssertions({})}
      } finally {
        app.exit(0);
      }
    `)

    await expect(launch(electron, [scratch, `--user-data-dir=${userData}`], {
      watchMs: 10_000, env: { DSH_HOME: scratch }
    })).resolves.toBeUndefined()
    expect(await readFile(witness, 'utf8')).toBe('passed')
  })

  it.runIf(nativeElectron)('runs an explicit Electron CLI adapter in Node mode', async () => {
    inheritedSelector('electron_run_as_node')
    const launch = await installedLauncher(artifact)
    const electron = createRequire(import.meta.url)('electron') as string
    await writeFile(join(scratch, 'entry.cjs'), `
      const assert = require('node:assert/strict');
      assert.equal(process.type, undefined);
      assert.ok(process.versions.electron);
      ${childAssertions({ ELECTRON_RUN_AS_NODE: '1' }, ['ELECTRON_RUN_AS_NODE'])}
    `)

    await expect(launch(electron, [join(scratch, 'entry.cjs')], {
      watchMs: 10_000,
      windowsHide: true,
      env: { ELECTRON_RUN_AS_NODE: '1' }
    })).resolves.toBeUndefined()
    expect(await readFile(witness, 'utf8')).toBe('passed')
  })
})

it('launches through the installed host plugin route without leaking Node mode', async () => {
  inheritedSelector('ELECTRON_RUN_AS_NODE')
  await writeFile(join(scratch, 'entry.cjs'), childAssertions({}))
  type Route = { path: string; handler(req: IncomingMessage, res: ServerResponse): Promise<void> }
  const routes: Route[] = []
  const plugin = await import(pathToFileURL(join(packageRoot, 'lib/types/index.js')).href)
  const { internals } = await import(pathToFileURL(join(packageRoot, 'lib/types/internals.js')).href)
  const originalCatalog = internals.catalog
  internals.catalog = { platform: 'linux', ssh: false, env: { DISPLAY: ':1' } }
  plugin.apply({
    get: () => undefined,
    effect: (register: () => unknown) => register(),
    connection: { requestRejection: () => undefined },
    subprocess: { resolveExecutable: async (name: string) => name === 'code' ? process.execPath : null },
    webServer: { register: (route: Route) => { routes.push(route); return () => {} } }
  }, { probeTimeoutMs: 100, iconTimeoutMs: 100, launchWatchMs: 10_000 })
  const server = createServer((req, res) => {
    const route = routes.find(({ path }) => path === req.url)
    if (!route) { res.statusCode = 404; res.end(); return }
    void route.handler(req, res).catch(error => { res.statusCode = 500; res.end(String(error)) })
  })
  try {
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject)
      server.listen(0, '127.0.0.1', resolve)
    })
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('test server has no TCP port')
    const response = await fetch(`http://127.0.0.1:${address.port}/open-in-app/open`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ app: 'vscode', path: scratch })
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
    expect(await readFile(witness, 'utf8')).toBe('passed')
  } finally {
    internals.catalog = originalCatalog
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  }
})

it('keeps Node mode in the shared parent environment for internal subprocesses', () => {
  inheritedSelector('ELECTRON_RUN_AS_NODE')
  expect(scrubbedParentEnv().ELECTRON_RUN_AS_NODE).toBe('1')
  expect(process.env.ELECTRON_RUN_AS_NODE).toBe('1')
})
