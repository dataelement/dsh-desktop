import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { HarnessRuntime } from '../src/main/runtime/harness-runtime'
import { projectRoot } from './patch-path'

const homes: string[] = []
afterEach(async () => { await Promise.all(homes.splice(0).map((home) => rm(home, { recursive: true, force: true }))) })

// The real desktop profile also weaves dsh-desktop-office, whose offline
// runtime is prepared per-platform by `office:prepare`. That artifact is
// irrelevant here and cannot exist on every contributor platform, so the
// boot below uses the shipped patch with the trailing office block removed.
// Everything else — including this plugin's own row — is the product patch.
async function writeBootPatch(home: string): Promise<string> {
  const shipped = await readFile(join(projectRoot, 'build', 'dsh-desktop.patch.yml'), 'utf8')
  expect(shipped).toContain('dsh-desktop-multi-account')
  const officeMarker = '# Offline Office authoring is installation-owned'
  const cut = shipped.indexOf(officeMarker)
  expect(cut, 'office block marker not found in shipped patch').toBeGreaterThan(0)
  const patchPath = join(home, 'desktop-boot.patch.yml')
  await writeFile(patchPath, shipped.slice(0, cut))
  return patchPath
}

describe('multi-account plugin in the real Harness', () => {
  it('boots with the desktop profile and serves its owner routes', async () => {
    const home = await mkdtemp(join(tmpdir(), 'dsh-multi-account-'))
    homes.push(home)
    const runtime = new HarnessRuntime({
      dshEntryPath: join(projectRoot, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js'),
      nodeEntryPath: join(projectRoot, 'build', 'harness-node-entry.mjs'),
      nodeExecutablePath: process.execPath,
      dshPatchPath: await writeBootPatch(home),
      dshSafePatchPath: join(projectRoot, 'build', 'dsh-desktop-safe.patch.yml'),
      dshHome: home,
      logPath: join(home, 'harness.log'),
      preferredPort: 0,
      startupTimeoutMs: 30_000,
      launchProcess: (executable, args, options) => spawn(executable, args, options),
      onChanged() {}
    })
    try {
      await runtime.start(home)
      const snapshot = runtime.snapshot()
      expect(snapshot.phase, snapshot.logs.join('\n')).toBe('ready')
      if (!snapshot.url || !snapshot.authToken) throw new Error('Harness did not announce an authenticated endpoint')
      const login = await fetch(`${snapshot.url}/?token=${encodeURIComponent(snapshot.authToken)}`, { redirect: 'manual' })
      const cookie = login.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ')
      const headers = { Cookie: cookie }
      const jsonHeaders = { ...headers, 'content-type': 'application/json' }

      // The state route lists every declared provider; views carry no keys.
      const stateResponse = await fetch(new URL('/api/desktop-multi-account/state', snapshot.url), { headers })
      expect(stateResponse.status).toBe(200)
      const stateText = await stateResponse.text()
      const state = JSON.parse(stateText) as { providers: Array<Record<string, any>> }
      expect(state.providers.length).toBeGreaterThan(0)
      const openrouter = state.providers.find((provider) => provider.provider === 'openrouter')
      expect(openrouter, `providers: ${state.providers.map((provider) => provider.provider).join(', ')}`).toBeDefined()
      expect(openrouter?.manageable, `openrouter view: ${JSON.stringify(openrouter)}`).toBe(true)
      expect(openrouter?.accounts).toEqual([])
      // The first-party DeepSeek adapter is its own settings namespace with
      // the profile at the section root; it must be manageable too.
      const deepseek = state.providers.find((provider) => provider.provider === 'deepseek')
      expect(deepseek?.manageable, `deepseek view: ${JSON.stringify(deepseek)}`).toBe(true)

      // Adding an account works against the real settings/credentials stack,
      // and the secret never appears in any response body.
      const addResponse = await fetch(new URL('/api/desktop-multi-account/mutate', snapshot.url), {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({
          action: 'add-account',
          provider: 'openrouter',
          label: 'Smoke account',
          apiKey: 'sk-smoke-test-key-0001'
        })
      })
      const addText = await addResponse.text()
      expect(addResponse.status, addText).toBe(200)
      expect(addText).not.toContain('sk-smoke-test-key-0001')
      const added = JSON.parse(addText) as { provider: Record<string, any> }
      expect(added.provider.accounts).toHaveLength(1)
      expect(added.provider.accounts[0].label).toBe('Smoke account')
      expect(added.provider.activeId).toBe(added.provider.accounts[0].id)
      expect(added.provider.accounts[0].fingerprint).toBeTruthy()

      // Strategy changes persist and are reflected in a fresh state read.
      const strategyResponse = await fetch(new URL('/api/desktop-multi-account/mutate', snapshot.url), {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({ action: 'set-strategy', provider: 'openrouter', strategy: 'failover' })
      })
      expect(strategyResponse.status, await strategyResponse.text()).toBe(200)
      const reread = await fetch(new URL('/api/desktop-multi-account/state', snapshot.url), { headers })
      const rereadState = await reread.json() as { providers: Array<Record<string, any>> }
      const managed = rereadState.providers.find((provider) => provider.provider === 'openrouter')
      expect(managed?.strategy).toBe('failover')
      expect(managed?.accounts).toHaveLength(1)

      // The client half is assembled into the served page (module map).
      const page = await fetch(snapshot.url, { headers })
      expect(page.status).toBe(200)
      expect(await page.text()).toContain('dsh-desktop-multi-account')
    } finally {
      await runtime.stop()
    }
  }, 90_000)
})
