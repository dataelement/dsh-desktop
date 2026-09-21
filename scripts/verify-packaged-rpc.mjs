import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parseArgs } from 'node:util'

const { values } = parseArgs({ options: { app: { type: 'string' }, output: { type: 'string' } } })
for (const name of ['app', 'output']) assert.ok(values[name] && path.isAbsolute(values[name]), `--${name} requires an absolute path`)

const resources = path.join(values.app, 'Contents', 'Resources')
const appRoot = path.join(resources, 'app')
const node = path.join(appRoot, 'node_modules', 'node', 'bin', 'node')
const dsh = path.join(appRoot, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js')
const patch = path.join(resources, 'dsh-desktop.patch.yml')
const evidenceDirectory = values.output
const dshHome = path.join(evidenceDirectory, 'harness')
await mkdir(evidenceDirectory)

const output = { stdout: '', stderr: '' }
const child = spawn(node, [dsh, 'web', '--patch', patch, '--no-open', '--host', '127.0.0.1', '--port', '0'], {
  cwd: evidenceDirectory,
  env: {
    PATH: '/usr/bin:/bin',
    LANG: 'en_US.UTF-8',
    NO_COLOR: '1',
    DSH_HOME: dshHome,
    DSH_PERMISSION_MODE: 'workspace-write'
  },
  stdio: ['ignore', 'pipe', 'pipe']
})

const append = (name, chunk) => {
  output[name] = (output[name] + chunk.toString('utf8')).slice(-500_000)
}
child.stdout.on('data', chunk => append('stdout', chunk))
child.stderr.on('data', chunk => append('stderr', chunk))

const sanitize = value => value.replace(/([?&]token=)[^\s&]+/gu, '$1[redacted]')
const ready = new Promise((resolve, reject) => {
  const deadline = setTimeout(() => reject(new Error(`Packaged Harness did not become ready.\n${sanitize(output.stderr)}`)), 90_000)
  const inspect = () => {
    const url = /\bdsh web:\s*(http:\/\/127\.0\.0\.1:\d+\/\?token=[^\s]+)/u.exec(output.stdout)?.[1]
    if (!url) return
    clearTimeout(deadline)
    resolve(url)
  }
  child.stdout.on('data', inspect)
  child.once('exit', code => {
    clearTimeout(deadline)
    reject(new Error(`Packaged Harness exited before RPC verification (code ${code}).\n${sanitize(output.stderr)}`))
  })
})

const stopped = new Promise(resolve => child.once('exit', resolve))
try {
  const authenticatedUrl = await ready
  const auth = await fetch(authenticatedUrl, { redirect: 'manual' })
  assert.ok(auth.status >= 300 && auth.status < 400, `Expected authentication redirect, got HTTP ${auth.status}`)
  const cookies = (auth.headers.getSetCookie?.() ?? [auth.headers.get('set-cookie')]).filter(Boolean).map(value => value.split(';', 1)[0]).join('; ')
  assert.ok(cookies, 'Harness did not issue an authenticated browser cookie')
  const redirect = auth.headers.get('location')
  assert.ok(redirect, 'Harness did not return an authentication redirect location')
  const browser = await fetch(new URL(redirect, authenticatedUrl), { headers: { cookie: cookies }, redirect: 'manual' })
  assert.ok(browser.status >= 200 && browser.status < 400, `Authenticated browser request failed with HTTP ${browser.status}`)

  const base = new URL(authenticatedUrl).origin
  const calls = []
  async function rpc(channel, method, payload) {
    const rpcId = randomUUID()
    const response = await fetch(`${base}${channel}/${method}`, {
      method: 'POST',
      headers: { cookie: cookies, 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ type: 'client-request', rpcId, method, payload })
    })
    assert.equal(response.status, 200, `${channel}/${method} returned HTTP ${response.status}`)
    const body = await response.json()
    assert.equal(body.rpcId, rpcId, `${channel}/${method} returned another request id`)
    assert.equal(body.result?.ok, true, `${channel}/${method} transport failed: ${JSON.stringify(body.result?.error)}`)
    assert.equal(body.result.value?.status, 'ok', `${channel}/${method} rejected the request: ${JSON.stringify(body.result.value?.error)}`)
    calls.push(`${channel}/${method}`)
    return body.result.value.data
  }

  const sessionId = `package-rpc-${randomUUID()}`
  const word = await rpc('/dsh-office', 'mode', { sessionId, mode: 'word' })
  assert.equal(word.mode, 'word')
  const presentation = await rpc('/dsh-ppt', 'presentation/mode', { sessionId, mode: 'ppt' })
  assert.equal(presentation, true)
  const shared = await rpc('/dsh-office', 'state', { sessionId })
  assert.equal(shared.mode, 'ppt')

  const manifest = JSON.parse(await readFile(path.join(appRoot, 'node_modules', '@deepseek-ai', 'dsh', 'package.json'), 'utf8'))
  const evidence = {
    status: 'PASS',
    app: values.app,
    harnessVersion: manifest.version,
    calls,
    transitions: ['word', 'ppt'],
    sharedMode: shared.mode
  }
  await writeFile(path.join(evidenceDirectory, 'rpc-verification.json'), `${JSON.stringify(evidence, null, 2)}\n`)
  console.log(JSON.stringify(evidence))
} finally {
  child.kill('SIGTERM')
  await Promise.race([stopped, new Promise(resolve => setTimeout(resolve, 5_000))])
  if (child.exitCode === null) child.kill('SIGKILL')
}
