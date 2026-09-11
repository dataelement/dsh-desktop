/** Real Host/auth/client composition smoke with a local provider, no billable generation.
 * node scripts/verify-image-generation.mjs [--keep]
 * --keep writes a private browser launch URL under the printed temporary directory.
 */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { imagePreviewFixture } from './image-preview-fixture.mjs'
import { DEFAULTS } from '../packages/dsh-image-generation/lib/provider.js'

const root = fileURLToPath(new URL('..', import.meta.url))
const home = await mkdtemp(path.join(tmpdir(), 'dsh-image-host-'))
const preview = await imagePreviewFixture(home)
const calls = []
const mock = createServer(async (request, response) => {
  let body = ''; for await (const chunk of request) body += chunk
  calls.push({ method: request.method, path: request.url })
  const valid = request.headers.authorization === 'Bearer smoke-image-key'
  const probe = valid && request.url.endsWith('/images/generations') && body && !Object.hasOwn(JSON.parse(body), 'prompt')
  assert.ok(!body || !JSON.parse(body).prompt, 'The configuration flow must omit the required generation prompt')
  response.writeHead(valid ? probe ? 400 : 200 : 401, { 'Content-Type': 'application/json' })
  response.end(JSON.stringify(valid ? probe ? { error: { code: 'MissingParameter', message: 'The request is missing a required parameter: prompt.' } } : request.url.endsWith('/models') ? { data: [{ id: 'gpt-image-2.5-flare' }, { id: DEFAULTS.openai.model }, { id: 'gpt-5' }] } : { id: DEFAULTS.openai.model } : { error: { message: 'Invalid API key' } }))
})
await new Promise((resolve, reject) => { mock.once('error', reject); mock.listen(0, '127.0.0.1', resolve) })
const mockBase = `http://127.0.0.1:${mock.address().port}/v1`
const portServer = createServer()
await new Promise(resolve => portServer.listen(0, '127.0.0.1', resolve))
const port = portServer.address().port
await new Promise(resolve => portServer.close(resolve))
const base = `http://127.0.0.1:${port}`
const node = process.env.IMAGE_SMOKE_NODE || path.join(root, 'node_modules/node/bin/node')
const bin = process.env.IMAGE_SMOKE_DSH || path.join(root, 'node_modules/@deepseek-ai/dsh/lib/bin.js')
const patch = process.env.IMAGE_SMOKE_PATCH || path.join(root, 'build/dsh-desktop.patch.yml')
const child = spawn(node, [bin, 'web', '--patch', patch, '--no-open', '--host', '127.0.0.1', '--port', String(port)], {
  cwd: root, env: { ...process.env, DSH_HOME: home, NO_COLOR: '1', DSH_TELEMETRY_DISABLED: '1' }, stdio: ['ignore', 'pipe', 'pipe'],
})
let output = ''; let cleaned = false
async function cleanup() {
  if (cleaned) return; cleaned = true
  child.kill('SIGTERM'); mock.closeAllConnections(); mock.close()
  await rm(home, { recursive: true, force: true })
}
process.on('SIGINT', () => { void cleanup().then(() => process.exit(0)) })
process.on('SIGTERM', () => { void cleanup().then(() => process.exit(0)) })
try {
  const url = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Host startup timed out')), 60_000)
    const scan = buffer => {
      output += buffer.toString()
      const match = /dsh web:\s*(\S+)/.exec(output)
      if (match) { clearTimeout(timer); resolve(match[1]) }
    }
    child.stdout.on('data', scan); child.stderr.on('data', scan)
    child.once('exit', code => { clearTimeout(timer); reject(new Error(`Host exited ${code}`)) })
  })
  assert.equal((await fetch(`${base}/api/image-generation.settings`)).status, 401)
  const exchange = await fetch(url, { redirect: 'manual' })
  const cookie = exchange.headers.getSetCookie().map(value => value.split(';')[0]).join('; ')
  assert.ok(cookie)
  const api = async (suffix, body, extra = {}) => fetch(`${base}/api/image-generation.${suffix}`, {
    method: body ? 'POST' : 'GET', headers: { Cookie: cookie, ...(body ? { 'Content-Type': 'application/json' } : {}), ...extra },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const previewPath = `preview?session=${preview.sessionId}&asset=${preview.image.sha256}`
  assert.equal((await fetch(`${base}/api/image-generation.${previewPath}`)).status, 401)
  const imageResponse = await api(previewPath)
  assert.equal(imageResponse.status, 200)
  assert.deepEqual(Buffer.from(await imageResponse.arrayBuffer()), preview.png)
  const initialResponse = await api('settings')
  assert.equal(initialResponse.status, 200)
  assert.equal(initialResponse.headers.get('cache-control'), 'no-store')
  let state = await initialResponse.json()
  assert.equal(state.profiles.openai.configured, false)
  assert.equal((await api('save', { revision: 0 }, { Origin: 'https://evil.example' })).status, 403)
  for (const provider of ['openai', 'bytedance']) {
    const response = await api('save', { revision: state.revision, provider, baseUrl: mockBase, model: DEFAULTS[provider].model, apiKey: 'smoke-image-key' })
    const result = await response.json()
    assert.equal(response.status, 200, JSON.stringify(result))
    assert.equal(result.profiles[provider].configured, true)
    assert.ok(!JSON.stringify(result).includes('smoke-image-key'))
    state = result
  }
  const failure = await api('save', { revision: state.revision, provider: 'bytedance', baseUrl: mockBase, model: DEFAULTS.bytedance.model, apiKey: 'wrong-key' })
  assert.equal((await failure.json()).code, 'AUTH')
  assert.deepEqual(await (await api('settings')).json(), state)
  assert.equal(calls.length, 3)
  assert.deepEqual(calls.map(call => call.method), ['GET', 'POST', 'POST'])
  assert.equal((await api('models', { revision: state.revision }, { Origin: 'https://evil.example' })).status, 403)
  const models = await api('models', { revision: state.revision, provider: 'openai', baseUrl: mockBase, model: DEFAULTS.openai.model, apiKey: '' })
  assert.equal(models.status, 200)
  assert.deepEqual((await models.json()).models, ['gpt-image-2.5-flare', DEFAULTS.openai.model])
  assert.equal(calls.length, 4)
  assert.deepEqual(await (await api('settings')).json(), state)
  const page = await (await fetch(base, { headers: { Cookie: cookie } })).text()
  assert.ok(page.includes('dsh-image-generation'), 'Image client entry must be present in the composed page')
  assert.ok(!/image-generation.*(?:failed|Error)/i.test(output), 'Image plugin must load successfully')
  console.log('PASS: Host composition, authentication, origin checks, redacted settings, save success/failure, single-request validation read-only model discovery and authenticated historical PNG preview.')
  if (process.argv.includes('--keep')) {
    await writeFile(path.join(home, 'browser-url.txt'), url, { mode: 0o600 })
    await writeFile(path.join(home, 'smoke-context.json'), JSON.stringify({ base, mockBase, sessionId: preview.sessionId }), { mode: 0o600 })
    console.log(`Browser fixture ready: ${home}`)
    await new Promise(() => {})
  }
} catch (error) {
  console.error(error)
  console.error(output.replace(/([?&]token=)[^\s"']+/g, '$1[REDACTED]'))
  process.exitCode = 1
} finally { await cleanup() }
