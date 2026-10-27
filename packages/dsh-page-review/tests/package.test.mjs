import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { runInNewContext } from 'node:vm'
import { x } from 'tar'
import { createServer } from 'node:http'
import { Readable } from 'node:stream'
const exec = promisify(execFile)

test('real packed distribution imports its host and registers the external-React client', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-review-package-'))
  const previousHome = process.env.DSH_HOME,
    disposers = []
  let server
  try {
    // The npm CLI that started npm test is portable across cmd.exe and POSIX.
    const npm = process.env.npm_execpath
    assert.ok(npm, 'run distribution tests through npm test')
    const { stdout } = await exec(
      process.execPath,
      [npm, 'pack', '--json', '--pack-destination', root],
      {
        cwd: fileURLToPath(new URL('../', import.meta.url)),
        maxBuffer: 2 * 1024 * 1024,
      },
    )
    const start = stdout.indexOf('[\n'),
      pack = JSON.parse(stdout.slice(start))[0]
    assert.equal(pack.name, 'dsh-page-review')
    assert.equal(
      pack.files.some((f) => /^(node_modules|backups|tests)\//.test(f.path)),
      false,
    )
    await x({ file: join(root, pack.filename), cwd: root })
    // The backend has no runtime dependencies. Load the extracted archive
    // directly, with no npm/network step and no adjacent development tree.
    const manifest = JSON.parse(
      await readFile(join(root, 'package/package.json'), 'utf8'),
    )
    assert.equal(Object.keys(manifest.dependencies || {}).length, 0)
    assert.ok(pack.files.some((f) => f.path === 'lib/THIRD_PARTY_LICENSES.txt'))
    const notices = await readFile(
      join(root, 'package/lib/THIRD_PARTY_LICENSES.txt'),
      'utf8',
    )
    assert.match(notices, /puppeteer-core@23\.11\.1/)
    assert.match(notices, /@puppeteer\/browsers@/)
    assert.doesNotMatch(notices, /undefined@undefined/)
    const host = await import(
      pathToFileURL(join(root, 'package/lib/index.cjs'))
    )
    assert.equal(host.name, 'dsh-page-review')
    assert.equal(typeof host.apply, 'function')
    const fixture = createServer((_req, res) => {
      res.writeHead(200, { 'content-type': 'text/html' })
      res.end('<h1>Distribution browser smoke</h1>')
    })
    server = fixture
    await new Promise((r) => fixture.listen(0, '127.0.0.1', r))
    process.env.DSH_HOME = join(root, 'home')
    let route
    host.apply({
      webServer: {
        register: (value) => {
          route = value
          return () => {}
        },
      },
      effect: (fn) => {
        const off = fn()
        if (off) disposers.push(off)
      },
    })
    const req = Readable.from([
      Buffer.from(
        JSON.stringify({
          session: 'package-smoke',
          kind: 'create',
          url: 'http://127.0.0.1:' + fixture.address().port,
        }),
      ),
    ])
    Object.assign(req, {
      method: 'POST',
      url: '/api/page-review/browser',
      socket: { remoteAddress: '127.0.0.1' },
      headers: { host: '127.0.0.1:9', origin: 'http://127.0.0.1:9' },
    })
    let status, body
    await route.handler(req, {
      writeHead: (code) => (status = code),
      end: (value) => (body = JSON.parse(value)),
    })
    assert.equal(status, 200, JSON.stringify(body))
    assert.ok(body.ok)
    assert.equal(body.value.tabs.length, 1)
    let registration
    runInNewContext(
      await readFile(join(root, 'package/lib/client.js'), 'utf8'),
      {
        window: {
          __ModuleLoader__: { load: (value) => (registration = value) },
        },
        Map,
        Set,
        console,
      },
    )
    assert.equal(registration.id, 'dsh-page-review')
    const required = []
    const client = registration.factory((name) => {
      required.push(name)
      if (name === 'react' || name === 'react-dom') return {}
      throw Error('unexpected runtime dependency ' + name)
    })
    assert.equal(typeof client.apply, 'function')
    assert.ok(client.inject.includes('locale'))
    assert.ok(
      required.includes('react'),
      'React must be supplied by the host, not bundled',
    )
  } finally {
    for (const off of disposers.reverse()) await off()
    if (server) await new Promise((r) => server.close(r))
    if (previousHome === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = previousHome
    await rm(root, { recursive: true, force: true, maxRetries: 3 })
  }
})
