/** Probe the Electron Node runtime with a disposable Harness Profile.
 *
 * This must pass on the target platform before replacing the bundled Node
 * executable: loading the native resolver alone does not prove Harness boots.
 */
import { spawn, execFileSync } from 'node:child_process'
import { createServer } from 'node:net'
import { mkdtemp, mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const electron = require('electron')
const entry = require.resolve('@deepseek-ai/dsh/lib/bin.js')
const startupTimeoutMs = 90_000

async function freePort() {
  const server = createServer()
  await new Promise((resolveReady, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolveReady)
  })
  const address = server.address()
  if (typeof address === 'string' || address === null) throw new Error('No TCP port was allocated')
  await new Promise((resolveClosed) => server.close(resolveClosed))
  return address.port
}

async function stop(child) {
  if (child.exitCode !== null) return
  const exited = new Promise((resolveExit) => {
    child.once('exit', resolveExit)
    child.once('error', resolveExit)
    setTimeout(resolveExit, 3_000).unref()
  })
  if (process.platform === 'win32') {
    try {
      if (child.pid !== undefined) {
        execFileSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' })
      }
    } catch {
      child.kill()
    }
  } else {
    child.kill('SIGTERM')
  }
  await exited
}

async function main() {
  const home = await mkdtemp(join(tmpdir(), 'dsh-electron-node-probe-'))
  const launchRoot = join(home, 'launch-root')
  await mkdir(launchRoot)
  const port = await freePort()
  const child = spawn(electron, [
    '--expose-internals',
    join(root, 'build', 'harness-node-entry.mjs'),
    entry,
    'web', '--no-open', '--host', '127.0.0.1', '--port', String(port)
  ], {
    cwd: launchRoot,
    env: { ...process.env, DSH_HOME: join(home, 'harness'), ELECTRON_RUN_AS_NODE: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
    detached: process.platform === 'win32'
  })

  let output = ''
  let launchError
  const append = (chunk) => { output = `${output}${chunk.toString('utf8')}`.slice(-16_384) }
  child.stdout.on('data', append)
  child.stderr.on('data', append)
  child.once('error', (error) => { launchError = error; append(error.message) })

  try {
    const deadline = Date.now() + startupTimeoutMs
    let url
    while (Date.now() < deadline && child.exitCode === null && launchError === undefined) {
      url = /dsh web: (http:\/\/127\.0\.0\.1:\d+\/\?token=[^\s]+)/u.exec(output)?.[1]
      if (url) break
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 200))
    }
    if (!url) throw new Error('Harness did not report a ready endpoint')
    const exchange = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(10_000)
    })
    const cookie = exchange.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ')
    if (!cookie) throw new Error(`Harness token exchange returned HTTP ${exchange.status} without a session cookie`)
    const response = await fetch(new URL('/', url), {
      headers: { Cookie: cookie },
      signal: AbortSignal.timeout(10_000)
    })
    if (!response.ok) throw new Error(`Harness returned HTTP ${response.status}`)
    console.log(`Electron RunAsNode Harness probe passed on ${process.platform}/${process.arch} (HTTP ${response.status})`)
  } catch (error) {
    const diagnostic = output.replace(/token=[^\s]+/gu, 'token=[redacted]')
    throw new Error(`${error instanceof Error ? error.message : String(error)}\n${diagnostic}`, { cause: error })
  } finally {
    await stop(child)
    await rm(home, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
