import { spawn } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { expect, it } from 'vitest'

import { CONFIGURE_PATH, LOGIN_PATH, STATUS_PATH, VINABOT_PROVIDER } from '../packages/dsh-desktop-vinabot/index.js'
import { HarnessRuntime } from '../src/main/runtime/harness-runtime'
import { ensureSafeModeProfile, SAFE_MODE_PROFILE } from '../src/main/state/safe-mode-profile'
import { resolveTestNodeExecutable } from './node-executable'

it('serves VinaRouter status through the real Harness 0.1.7 settings service', async () => {
  const root = resolve(import.meta.dirname, '..')
  const home = await mkdtemp(join(tmpdir(), 'dsh-vinabot-runtime-'))
  const patch = join(home, 'vinabot.patch.yml')
  const relayStub = join(home, 'relay-stub.mjs')
  const runtime = new HarnessRuntime({
    dshEntryPath: join(root, 'node_modules/@deepseek-ai/dsh/lib/bin.js'),
    nodeEntryPath: join(root, 'build/harness-node-entry.mjs'),
    nodeExecutablePath: resolveTestNodeExecutable(),
    dshPatchPath: join(root, 'build/dsh-desktop.patch.yml'),
    dshSafePatchPath: patch,
    dshHome: home,
    logPath: join(home, 'harness.log'),
    startupTimeoutMs: 30_000,
    launchProcess: (executable, args, options) => spawn(executable, ['--import', pathToFileURL(relayStub).href, ...args], options),
    onChanged() {}
  })
  try {
    await ensureSafeModeProfile(home)
    await writeFile(patch, '- insert:\n    - id: dsh-desktop-vinabot\n      name: dsh-desktop-vinabot\n')
    await writeFile(relayStub, `
const realFetch = globalThis.fetch;
let tokenName;
globalThis.fetch = async (input, init) => {
  const url = new URL(typeof input === 'string' ? input : input.url);
  if (url.origin !== 'https://router.vinabot.ai') return realFetch(input, init);
  const json = (data) => Response.json({ success: true, data });
  if (url.pathname === '/api/status') return json({ turnstile_check: false });
  if (url.pathname === '/api/user/login') return json({ access_token: 'fixture-panel', session: {}, user: { display_name: 'Fixture' } });
  if (url.pathname === '/api/token/search') return json({ items: tokenName ? [{ id: 41, name: tokenName, status: 1 }] : [] });
  if (url.pathname === '/api/token/') {
    tokenName = JSON.parse(init.body).name;
    return json({});
  }
  if (url.pathname === '/api/token/41/key') return json({ key: 'fixture-key' });
  if (url.pathname === '/v1/models') return json([{ id: 'gpt-5.6-sol', supported_endpoint_types: ['openai-response'] }]);
  if (url.pathname === '/api/user/auth/logout') return json({});
  throw new Error('Unexpected relay fixture path: ' + url.pathname);
};
`)
    await runtime.start(home, SAFE_MODE_PROFILE)
    const snapshot = runtime.snapshot()
    expect(snapshot.phase, snapshot.logs.join('\n')).toBe('ready')
    if (!snapshot.url || !snapshot.authToken) throw new Error('Harness did not announce its authenticated endpoint')

    const login = await fetch(`${snapshot.url}/?token=${encodeURIComponent(snapshot.authToken)}`, { redirect: 'manual' })
    const cookie = login.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ')
    const response = await fetch(new URL(STATUS_PATH, snapshot.url), { headers: { Cookie: cookie } })
    expect(response.status, await response.clone().text()).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ ok: true, configured: false })

    const request = async (path: string, payload: unknown) => {
      const result = await fetch(new URL(path, snapshot.url), {
        method: 'POST',
        headers: { Cookie: cookie, 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const body = await result.json()
      expect(result.status, JSON.stringify(body)).toBe(200)
      return body
    }
    const loginResult = await request(LOGIN_PATH, { username: 'fixture', password: 'fixture' })
    expect(loginResult).toMatchObject({ ok: true, stage: 'models' })
    const configured = await request(CONFIGURE_PATH, {
      flowId: loginResult.flowId,
      selections: [{ model: 'gpt-5.6-sol', protocol: 'openai-responses' }],
      defaultModel: 'gpt-5.6-sol'
    })
    expect(configured).toMatchObject({ ok: true, configured: true, provider: VINABOT_PROVIDER })
    const after = await fetch(new URL(STATUS_PATH, snapshot.url), { headers: { Cookie: cookie } })
    expect(after.status, await after.clone().text()).toBe(200)
    await expect(after.json()).resolves.toMatchObject({ ok: true, configured: true, credentialConfigured: true })
    expect(runtime.snapshot().logs.join('\n')).not.toContain('settings.get is not a function')
  } finally {
    await runtime.stop()
    await rm(home, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  }
}, 60_000)
