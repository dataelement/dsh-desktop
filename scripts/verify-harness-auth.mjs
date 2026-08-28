/**
 * Prove the 0.1.2 Host authentication chain end to end against the packed
 * Harness in node_modules.
 *
 * Since 0.1.2-alpha.1 every Host API call is authenticated before dispatch.
 * This script starts a real `dsh web`, reads the per-process launch token from
 * the URL line, shows that an unauthenticated /api call is refused, trades the
 * token for the session cookie, and drives one real endpoint with it — the
 * exact sequence `LanMobileBridge` performs at runtime.
 *
 * Run with: node scripts/verify-harness-auth.mjs
 */
import { spawn } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const home = mkdtempSync(join(tmpdir(), 'dsh-auth-verify-'))
const port = 45731
const base = `http://127.0.0.1:${port}`
const child = spawn(process.execPath, [
  'node_modules/@deepseek-ai/dsh/lib/bin.js',
  'web', '--no-open', '--host', '127.0.0.1', '--port', String(port)
], { env: { ...process.env, DSH_HOME: home, NO_COLOR: '1', DSH_TELEMETRY_DISABLED: '1' }, stdio: ['ignore','pipe','pipe'] })

let out = ''
const token = await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('timeout waiting for URL line\n' + out)), 90_000)
  const scan = (b) => {
    out += b.toString()
    const m = /dsh web:\s*(\S+)/.exec(out)
    if (!m) return
    const t = new URL(m[1]).searchParams.get('token')
    if (t) { clearTimeout(timer); resolve(t) }
  }
  child.stdout.on('data', scan); child.stderr.on('data', scan)
  child.on('exit', (c) => { clearTimeout(timer); reject(new Error(`dsh exited ${c}\n${out}`)) })
})
console.log('1) 捕获令牌:', token.slice(0, 12) + '…')

const noAuth = await fetch(new URL('/api/session/list', base), {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ type: 'client-request', rpcId: 'x1', method: 'session/list', payload: { args: { _request: {} } } })
})
console.log('2) 无 cookie 调 /api:', noAuth.status, noAuth.status === 401 ? '✓ 按预期 401' : '✗ 预期 401')

const url = new URL('/', base); url.searchParams.set('token', token)
const ex = await fetch(url, { redirect: 'manual' })
const setCookie = ex.headers.getSetCookie()
const cookie = setCookie.map(h => h.split(';')[0].trim()).find(p => p.includes('='))
console.log('3) 令牌换 cookie:', ex.status, cookie ? `✓ 拿到 ${cookie.split('=')[0]}` : '✗ 没有 Set-Cookie')

const withAuth = await fetch(new URL('/api/session/list', base), {
  method: 'POST', headers: { 'content-type': 'application/json', cookie },
  body: JSON.stringify({ type: 'client-request', rpcId: 'x2', method: 'session/list', payload: { args: { _request: {} } } })
})
const body = await withAuth.text()
console.log('4) 带 cookie 调 /api:', withAuth.status, withAuth.status === 200 ? '✓ 通过' : '✗')
console.log('   响应:', body.slice(0, 160))
child.kill('SIGTERM')
