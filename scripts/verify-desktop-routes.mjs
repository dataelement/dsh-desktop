import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { mkdtemp, rm, access } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const home = await mkdtemp(path.join(tmpdir(), 'dsh-desktop-routes-'))
const portServer = createServer()
await new Promise(resolve => portServer.listen(0, '127.0.0.1', resolve))
const port = portServer.address().port
await new Promise(resolve => portServer.close(resolve))
const base = `http://127.0.0.1:${port}`
const child = spawn(path.join(root, 'node_modules/node/bin', process.platform === 'win32' ? 'node.exe' : 'node'), [path.join(root, 'build/harness-node-entry.mjs'),
  path.join(root, 'node_modules/@deepseek-ai/dsh/lib/bin.js'), 'web', '--patch', path.join(root, 'build/dsh-desktop.patch.yml'), '--no-open', '--host', '127.0.0.1', '--port', String(port)],
  { cwd: root, env: { ...process.env, DSH_HOME: home, NO_COLOR: '1', DSH_TELEMETRY_DISABLED: '1' }, stdio: ['ignore', 'pipe', 'pipe'] })
let output = ''
try {
  const url = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Desktop Host startup timed out')), 45_000)
    const scan = chunk => { output += chunk; const match = /dsh web:\s*(\S+)/.exec(output); if (match) { clearTimeout(timer); resolve(match[1]) } }
    child.stdout.on('data', scan); child.stderr.on('data', scan)
    child.once('exit', code => { clearTimeout(timer); reject(new Error(`Desktop Host exited ${code}`)) })
  })
  const response = await fetch(url, { redirect: 'manual' })
  const cookie = response.headers.getSetCookie().map(value => value.split(';')[0]).join('; ')
  assert.ok(cookie)
  const rpc = async (channel, method, payload) => {
    const result = await fetch(`${base}${channel}/${method}`, { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'client-request', rpcId: 'route-smoke', method, payload }) })
    assert.equal(result.status, 200, `${channel}/${method}`)
    const message = await result.json(); assert.equal(message.result.ok, true); assert.equal(message.result.value.status, 'ok')
    return message.result.value.data
  }
  const sessionId = 'desktop-route-smoke'
  assert.equal((await fetch(`${base}/dsh-ppt/state`, { method: 'POST' })).status, 401)
  assert.equal((await rpc('/dsh-ppt', 'state', { sessionId })).templates.length, 16)
  await rpc('/dsh-ppt', 'presentation/mode', { sessionId, mode: 'ppt' })
  assert.equal((await rpc('/dsh-ppt', 'state', { sessionId })).presentationMode, 'ppt')
  const present = async name => access(path.join(root, 'packages', name)).then(() => true, () => false)
  if (await present('dsh-office')) {
    for (const mode of ['word', 'excel']) {
      assert.equal((await rpc('/dsh-office', 'mode', { sessionId, mode })).mode, mode)
      const state = await rpc('/dsh-ppt', 'state', { sessionId }); assert.equal(state.documentMode, mode); assert.equal(state.presentationMode, undefined)
    }
    assert.equal((await rpc('/dsh-office', 'state', { sessionId })).templates.length, 6)
    assert.ok((await rpc('/dsh-office', 'template/preview', { sessionId, templateId: 'equity-research', page: 1 })).image.startsWith('data:image/webp;base64,'))
  }
  for (const [plugin, endpoint] of [['dsh-image-generation', 'image-generation.settings'], ['dsh-desktop-enterprise', 'enterprise.state']]) {
    if (!(await present(plugin))) continue
    assert.equal((await fetch(`${base}/api/${endpoint}`)).status, 401)
    const result = await fetch(`${base}/api/${endpoint}`, { headers: { Cookie: cookie } }); assert.equal(result.status, 200); assert.ok(await result.json())
  }
  console.log('PASS: actual Desktop entry, authenticated PPT RPC and installed feature routes')
} catch (error) {
  console.error(output.replace(/([?&]token=)[^\s"']+/g, '$1[REDACTED]')); throw error
} finally {
  if (child.exitCode === null) { const stopped = new Promise(resolve => child.once('exit', resolve)); child.kill('SIGTERM'); await stopped }
  await rm(home, { recursive: true, force: true })
}
