import { createServer } from 'node:http'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { HarnessShell, HARNESS_SHELL_URL } from '../src/main/harness-shell'
import { apply, INSTALL_PATH, STATUS_PATH, UNINSTALL_PATH } from '../packages/dsh-desktop-market-installer/index.js'

// Exercise the actual registered installer handlers over HTTP, but use an
// already-installed fixture so the test never starts pnpm or touches a real profile.
describe('desktop shell and market installer origin contract', () => {
  let home
  let server
  let shell
  let disposers = []
  const originalHome = process.env.DSH_HOME

  afterEach(async () => {
    shell?.reset()
    if (server) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
    for (const dispose of disposers.reverse()) await dispose()
    if (originalHome === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = originalHome
    if (home) await rm(home, { recursive: true, force: true })
  })

  it('accepts trusted shell mutations without weakening direct origin checks', async () => {
    home = await mkdtemp(join(tmpdir(), 'shell-market-origin-'))
    process.env.DSH_HOME = home
    const profile = join(home, 'profiles', 'web')
    await mkdir(join(profile, 'node_modules', 'dshmarket'), { recursive: true })
    await writeFile(join(profile, 'package.json'), JSON.stringify({ dependencies: { dshmarket: '1.0.0' } }))
    await writeFile(join(profile, 'node_modules', 'dshmarket', 'package.json'), JSON.stringify({ name: 'dshmarket', version: '1.0.0' }))
    const routes = new Map()
    const ctx = {
      provide() {},
      logger: { warn() {} },
      effect(callback) { disposers.push(callback()) },
      inject(_services, callback) { callback(this) },
      webServer: { register(route) { routes.set(route.path, route.handler); return () => routes.delete(route.path) } }
    }
    const entry = process.argv[1]
    try {
      process.argv[1] = join(home, 'bin.js')
      await apply(ctx)
    } finally {
      process.argv[1] = entry
    }
    server = createServer((req, res) => {
      if (req.url === '/?token=secret') return res.writeHead(303, { location: '/', 'set-cookie': 'session=owned; HttpOnly' }).end()
      if (req.headers.cookie !== 'session=owned') return res.writeHead(401).end()
      if (req.url === '/api/desktop/boot') return res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ injections: [] }))
      const handler = routes.get(req.url)
      if (!handler) return res.writeHead(404).end()
      void handler(req, res).catch(() => res.writeHead(500).end())
    })
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('Missing server address')
    const origin = 'http://127.0.0.1:' + address.port
    shell = new HarnessShell({ frontendRoot: home })
    await shell.connect(origin, 'secret')
    const shellRequest = (path, method, originHeader = 'dsh-desktop://harness') => shell.handle(new Request(HARNESS_SHELL_URL + path.slice(1), { method, headers: { origin: originHeader } }))
    expect((await shellRequest(STATUS_PATH, 'GET')).status).toBe(200)
    expect((await shellRequest(INSTALL_PATH, 'POST')).status).toBe(200)
    // Windows custom-scheme posts often omit Origin. This handler only sees the
    // shell document, so a missing header is filled with the loopback host.
    // The opaque origin "null" stays rejected.
    expect((await shell.handle(new Request(HARNESS_SHELL_URL + INSTALL_PATH.slice(1), { method: 'POST' }))).status).toBe(200)
    expect((await shell.handle(new Request(HARNESS_SHELL_URL + INSTALL_PATH.slice(1), { method: 'POST', headers: { origin: 'null' } }))).status).toBe(403)
    expect((await shellRequest(UNINSTALL_PATH, 'POST', 'https://attacker.example')).status).toBe(403)
    expect((await fetch(origin + INSTALL_PATH, { method: 'POST', headers: { cookie: 'session=owned', origin } })).status).toBe(200)
    for (const value of [undefined, 'https://attacker.example']) {
      const headers = { cookie: 'session=owned' }
      if (value) headers.origin = value
      expect((await fetch(origin + UNINSTALL_PATH, { method: 'POST', headers })).status).toBe(403)
    }
    await writeFile(join(profile, 'package.json'), '{}')
    await rm(join(profile, 'node_modules', 'dshmarket'), { recursive: true, force: true })
    const uninstall = await shellRequest(UNINSTALL_PATH, 'POST')
    expect(uninstall.status).toBe(200)
    expect(await uninstall.json()).toMatchObject({ phase: 'uninstalled', restartRequired: true })
  })
})
