import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const home = process.env.OFFICE_CONTROLS_HOME || await mkdtemp(path.join(tmpdir(), 'dsh-office-controls-host-'))
const reserved = createServer()
await new Promise(resolve => reserved.listen(0, '127.0.0.1', resolve))
const port = reserved.address().port
await new Promise(resolve => reserved.close(resolve))
const base = `http://127.0.0.1:${port}`
const child = spawn(process.execPath, [path.join(root, 'build/harness-node-entry.mjs'),
  path.join(root, 'node_modules/@deepseek-ai/dsh/lib/bin.js'), 'web', '--patch', path.join(root, 'build/dsh-desktop.patch.yml'),
  '--no-open', '--host', '127.0.0.1', '--port', String(port)], {
  cwd: root, env: { ...process.env, DSH_HOME: home, NO_COLOR: '1', DSH_TELEMETRY_DISABLED: '1' }, stdio: ['ignore', 'pipe', 'pipe']
})
let output = ''
const exited = new Promise(resolve => child.once('exit', resolve))
try {
  const url = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Host startup timed out')), 60_000)
    const scan = chunk => {
      output += chunk.toString()
      const match = /dsh web:\s*(\S+)/.exec(output)
      if (match) { clearTimeout(timer); resolve(match[1]) }
    }
    child.stdout.on('data', scan); child.stderr.on('data', scan)
    child.once('exit', code => { clearTimeout(timer); reject(new Error(`Host exited ${code}`)) })
  })
  const endpoint = `${base}/dsh-desktop/office`
  assert.equal((await fetch(endpoint)).status, 401)
  const exchange = await fetch(url, { redirect: 'manual' })
  const cookie = exchange.headers.getSetCookie().map(value => value.split(';')[0]).join('; ')
  const api = async (enabled, headers = {}) => fetch(endpoint, {
    method: enabled === undefined ? 'GET' : 'POST', headers: { Cookie: cookie, ...headers, ...(enabled === undefined ? {} : { 'content-type': 'application/json' }) },
    ...(enabled === undefined ? {} : { body: JSON.stringify({ enabled }) })
  })
  const settled = async () => {
    for (let count = 0; count < 200; count++) {
      const response = await api()
      assert.equal(response.status, 200, await response.clone().text())
      const state = await response.json()
      if (state.phase === 'idle') { assert.equal(state.error, undefined); return state }
      if (state.phase === 'error') throw new Error(state.error)
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    throw new Error('Office switch did not settle')
  }
  const rpc = async (method, args) => {
    const response = await fetch(`${base}/api/${method}`, {
      method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'client-request', rpcId: 'office-smoke', method, payload: { args } })
    })
    const data = await response.json()
    assert.equal(response.status, 200, JSON.stringify(data))
    assert.equal(data.result.ok, true, JSON.stringify(data))
    return data.result.value
  }
  let state = await settled()
  const initialEnabled = state.applied
  assert.ok(state.formats.includes('ppt'))
  const workspacePath = await mkdtemp(path.join(home, 'office-workspace-'))
  const { workspace } = await rpc('workspace/create', { request: { path: workspacePath } })
  const sessionId = `office-smoke-${Date.now()}`
  await rpc('session/create', { request: { workspaceId: workspace.workspaceId, sessionId } })
  // PPT's provider is mode-only (userInvocable=false). This endpoint lists
  // user-invocable Skills, including Word/Excel and their business library.
  const expectedSkills = state.formats.filter(format => format !== 'ppt').map(format => `dsh-${format}`)
  assert.equal((await api(false, { Origin: 'https://untrusted.example' })).status, 403)
  assert.equal((await api('false')).status, 400)
  for (const enabled of [false, true]) {
    assert.equal((await api(enabled)).status, 200)
    state = await settled()
    assert.equal(state.applied, enabled)
    const entries = (await rpc('pluginInventory/list', {})).entries.filter(entry => ['dsh-ppt', 'dsh-ppt-composer', 'dsh-office'].includes(entry.moduleName))
    assert.ok(entries.length)
    assert.ok(entries.every(entry => entry.enabled === enabled), JSON.stringify(entries))
    const { skills } = await rpc('skills/list', { request: { sessionId } })
    for (const name of expectedSkills) assert.equal(skills.some(skill => skill.name === name), enabled, `${name} availability`)
    if (!enabled) {
      const patchFile = path.join(home, 'cordis.patch.yml')
      const original = await readFile(patchFile, 'utf8').catch(error => { if (error.code !== 'ENOENT') throw error })
      try {
        await writeFile(patchFile, '- id: dsh-ppt-composer\n  disabled: false\n')
        await new Promise(resolve => setTimeout(resolve, 1000))
        const reloaded = (await rpc('pluginInventory/list', {})).entries.filter(entry => ['dsh-ppt', 'dsh-ppt-composer', 'dsh-office'].includes(entry.moduleName))
        assert.ok(reloaded.every(entry => !entry.enabled), 'The Office preference survives profile recomposition')
      } finally {
        if (original === undefined) await rm(patchFile, { force: true })
        else await writeFile(patchFile, original)
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    const page = await (await fetch(base, { headers: { Cookie: cookie } })).text()
    assert.ok(page.includes('dsh-desktop-office-controls'))
  }
  if (process.argv.includes('--leave-disabled')) {
    assert.equal((await api(false)).status, 200)
    state = await settled()
    assert.equal(state.applied, false)
  }
  console.log(JSON.stringify({ status: 'PASS', formats: state.formats, initialEnabled, checks: ['authenticated Host', 'Origin validation', 'boolean validation', 'live Loader disable', 'live Loader enable', 'user-invocable Skills discovery', 'profile recomposition'] }))
  if (process.argv.includes('--keep')) {
    await writeFile(path.join(home, 'browser-url.txt'), url, { mode: 0o600 })
    await writeFile(path.join(home, 'base-url.txt'), base, { mode: 0o600 })
    console.log(`Browser fixture: ${home}`)
    await new Promise(resolve => { process.once('SIGINT', resolve); process.once('SIGTERM', resolve) })
  }
} catch (error) {
  console.error(error)
  console.error(output.replace(/([?&]token=)[^\s"']+/gu, '$1[REDACTED]'))
  process.exitCode = 1
} finally {
  child.kill('SIGTERM')
  await exited
  if (!process.argv.includes('--keep') && !process.env.OFFICE_CONTROLS_HOME) await rm(home, { recursive: true, force: true })
}
