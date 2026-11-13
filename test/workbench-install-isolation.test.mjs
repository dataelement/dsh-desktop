import { describe, expect, it, vi } from 'vitest'
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, realpath, symlink, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { isAbsolute, join, relative, sep } from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { once } from 'node:events'
import { win32 } from 'node:path'
import { runInNewContext } from 'node:vm'
import { connect, createWorkbenchInstallFixtureRoot, pauseInstallEntry, workbenchInstallIsolation, assertWorkbenchInstallPaths, prepareInstallInspector, inspectInstallPaths } from '../scripts/verify/workbench-install-isolation.mjs'

const root = 'C:\\acceptance artifacts\\isolated run'
const entryPause = () => ({ reason: 'Break on start', callFrames: [{ url: 'file:///fixture.cjs', location: { scriptId: '1' } }] })

describe('packaged workbench acceptance isolation', () => {
  it('creates unique physical temporary trees whose fixtures cannot resolve checkout packages', async () => {
    const directory = await realpath(await mkdtemp(join(tmpdir(), 'dsh-acceptance-root-test-')))
    const checkout = join(directory, 'checkout')
    const runnerTemp = join(directory, 'runner temp')
    await mkdir(join(checkout, 'node_modules', 'checkout-only'), { recursive: true })
    await mkdir(runnerTemp)
    await writeFile(join(checkout, 'node_modules', 'checkout-only', 'index.js'), 'module.exports = true\n')
    try {
      const first = await createWorkbenchInstallFixtureRoot(checkout, { RUNNER_TEMP: runnerTemp })
      const second = await createWorkbenchInstallFixtureRoot(checkout, { RUNNER_TEMP: runnerTemp })
      expect(first).not.toBe(second)
      expect(relative(runnerTemp, first)).toMatch(/^dsh-workbench-install-/u)
      for (const path of [first, join(first, 'fixture'), join(first, 'workspace'), join(first, 'user home', 'AppData', 'Roaming')]) {
        const fromCheckout = relative(checkout, path)
        expect(fromCheckout === '..' || fromCheckout.startsWith(`..${sep}`) || isAbsolute(fromCheckout)).toBe(true)
        await mkdir(path, { recursive: true })
        expect(() => createRequire(join(path, 'entry.cjs')).resolve('checkout-only')).toThrow('Cannot find module')
      }
    } finally {
      // directory is the canonical mkdtemp-owned test tree, not a user profile.
      await rm(directory, { recursive: true, force: true })
    }
  })

  it('rejects checkout temp paths and their physical aliases, falling back outside checkout', async () => {
    const directory = await realpath(await mkdtemp(join(tmpdir(), 'dsh-acceptance-alias-test-')))
    const checkout = join(directory, 'checkout')
    const internalTemp = join(checkout, 'artifacts')
    const alias = join(directory, 'runner-alias')
    await mkdir(internalTemp, { recursive: true })
    await symlink(internalTemp, alias, process.platform === 'win32' ? 'junction' : 'dir')
    try {
      for (const candidate of [checkout, internalTemp, alias, 'relative-temp']) {
        const actual = await createWorkbenchInstallFixtureRoot(checkout, { RUNNER_TEMP: candidate }, directory)
        expect(relative(directory, actual)).toMatch(/^dsh-workbench-install-/u)
      }
      const fallback = await createWorkbenchInstallFixtureRoot(checkout, {}, directory)
      expect(relative(directory, fallback)).toMatch(/^dsh-workbench-install-/u)
      await expect(createWorkbenchInstallFixtureRoot(checkout, { RUNNER_TEMP: alias }, internalTemp)).rejects.toThrow('outside the checkout')
    } finally {
      // directory owns both the junction and target; never remove a resolved alias.
      await rm(directory, { recursive: true, force: true })
    }
  })

  it('wires the acceptance driver to temporary fixtures/cwd and artifact-only output', async () => {
    const driver = await readFile(fileURLToPath(new URL('../scripts/verify/check-workbench-install.mjs', import.meta.url)), 'utf8')
    expect(driver).toContain('const fixtureRoot = await createWorkbenchInstallFixtureRoot(')
    expect(driver).toContain('const isolationRoot = fixtureRoot')
    expect(driver).toContain('cwd: fixtureRoot')
    expect(driver).not.toContain('realpath(output)')
    expect(driver).toContain("join(output, `${name}.png`)")
    expect(driver).toContain("join(output, 'results.json')")
  })

  it.each(['production', 'development'])('isolates %s child OS paths without changing the parent environment', channel => {
    const inherited = {
      APPDATA: 'C:\\real user\\AppData\\Roaming', AppData: 'C:\\other real user',
      HOME: 'C:\\real user', USERPROFILE: 'C:\\real user',
      DSH_DEV_PROFILE: channel === 'production' ? 'ignored-in-production' : 'other-worktree',
      DSH_HOME: 'C:\\real harness', BISHENG_DEV_USER_DATA: 'C:\\real bisheng',
      ELECTRON_RUN_AS_NODE: '1', NODE_OPTIONS: '--inspect=9000', PATH: 'unchanged', TOKEN: 'not logged'
    }
    const before = { ...inherited }
    const plan = workbenchInstallIsolation('win32', root, inherited)
    expect(inherited).toEqual(before)
    expect(plan.env).toMatchObject({
      APPDATA: `${root}\\user home\\AppData\\Roaming`,
      LOCALAPPDATA: `${root}\\user home\\AppData\\Local`,
      HOME: `${root}\\user home`, USERPROFILE: `${root}\\user home`,
      HOMEDRIVE: 'C:', HOMEPATH: '\\acceptance artifacts\\isolated run\\user home',
      DSH_DEV_PROFILE: 'dsh-workbench-acceptance-dev', PATH: 'unchanged'
    })
    for (const key of ['AppData', 'DSH_HOME', 'BISHENG_DEV_USER_DATA', 'ELECTRON_RUN_AS_NODE', 'NODE_OPTIONS']) {
      expect(plan.env).not.toHaveProperty(key)
    }
    // Production ignores the dev profile; development reads it. Both actual
    // identities must remain in the fresh OS appData tree, including spaces.
    const profile = channel === 'production' ? 'dsh-desktop' : plan.env.DSH_DEV_PROFILE
    const userData = win32.join(plan.env.APPDATA, profile)
    const actual = { userData, home: win32.join(userData, 'harness') }
    expect(assertWorkbenchInstallPaths(plan, [actual])).toEqual(actual)
  })

  it('handles case-insensitive environment names and Windows physical path casing', () => {
    const plan = workbenchInstallIsolation('win32', root, { appdata: 'real', Home: 'real', node_options: 'real' })
    expect(plan.env).not.toHaveProperty('appdata')
    expect(plan.env).not.toHaveProperty('Home')
    expect(plan.env).not.toHaveProperty('node_options')
    const actual = Object.fromEntries(Object.entries(plan.candidates[0]).map(([key, path]) => [key, path.toUpperCase()]))
    expect(assertWorkbenchInstallPaths(plan, [actual])).toEqual(actual)
  })

  it('fails closed for missing, ambiguous, escaped or mismatched profile evidence', () => {
    const plan = workbenchInstallIsolation('win32', root, {})
    expect(() => assertWorkbenchInstallPaths(plan, [])).toThrow('exactly one')
    expect(() => assertWorkbenchInstallPaths(plan, plan.candidates)).toThrow('exactly one')
    expect(() => assertWorkbenchInstallPaths(plan, [{ userData: 'C:\\real', home: 'C:\\real\\harness' }])).toThrow('owned acceptance')
    expect(() => assertWorkbenchInstallPaths(plan, [{ ...plan.candidates[0], home: 'C:\\real\\harness' }])).toThrow('owned acceptance')
    expect(() => assertWorkbenchInstallPaths(plan, [{ ...plan.candidates[0], userData: `${root}\\..\\real` }])).toThrow('owned acceptance')
  })

  it.each(['darwin', 'linux'])('rejects unverified native appData isolation on %s before launch', platform => {
    expect(() => workbenchInstallIsolation(platform, root, {})).toThrow('Windows launches only')
  })

  it.each(['production', 'development'])('sets actual Electron paths before resuming %s entry', async channel => {
    const plan = workbenchInstallIsolation('win32', root, {})
    const paths = { appData: 'C:\\native real appData', home: 'C:\\native real home', userData: 'C:\\native real userData' }
    const calls = []
    const app = {
      setPath: (key, value) => { calls.push(`set:${key}`); paths[key] = value },
      getPath: key => paths[key]
    }
    const inspector = {
      waitForEvent(method) {
        calls.push(`wait:${method}`)
        return { promise: Promise.resolve(entryPause()), cancel() {} }
      },
      async send(method, params) {
        calls.push(method)
        if (method === 'Debugger.enable' || method === 'Runtime.runIfWaitingForDebugger') return {}
        if (method === 'Debugger.resume') {
          expect(paths.appData).toBe(plan.appData)
          expect(paths.home).toBe(plan.userHome)
          expect(paths.userData).toBe(plan.bootstrapUserData)
          // Simulate unchanged production/development identity configuration.
          paths.userData = win32.join(paths.appData, channel === 'production' ? 'dsh-desktop' : plan.env.DSH_DEV_PROFILE)
          return {}
        }
        const value = runInNewContext(params.expression, {
          process: { execPath: 'C:\\Program Files\\Desktop.exe', getBuiltinModule: name => name === 'path' ? win32 : { createRequire: () => name => { expect(name).toBe('electron'); return { app } } } }
        })
        return { result: { value } }
      }
    }
    await prepareInstallInspector(inspector, plan)
    expect(calls.slice(0, 3)).toEqual(['Debugger.enable', 'wait:Debugger.paused', 'Runtime.runIfWaitingForDebugger'])
    expect(calls.at(-1)).toBe('Debugger.resume')
    const diagnostic = await inspectInstallPaths(inspector)
    expect(assertWorkbenchInstallPaths(plan, [diagnostic]).home).toBe(win32.join(paths.userData, 'harness'))
  })

  it.each(['exception', 'mismatch', 'missing'])('does not resume an unsafe startup diagnostic: %s', async failure => {
    const plan = workbenchInstallIsolation('win32', root, {})
    const methods = []
    let evaluations = 0
    const inspector = {
      waitForEvent: () => ({ promise: Promise.resolve(entryPause()), cancel() {} }),
      async send(method) {
        methods.push(method)
        if (method !== 'Runtime.evaluate') return {}
        if (++evaluations === 1) return failure === 'exception' ? { exceptionDetails: {} } : { result: { value: true } }
        return { result: { value: failure === 'missing' ? null : { appData: 'C:\\real user' } } }
      }
    }
    await expect(prepareInstallInspector(inspector, plan)).rejects.toThrow()
    expect(methods).not.toContain('Debugger.resume')
  })

  it.each(['missing', 'other pause', 'internal frame', 'command failure'])('fails closed without a verified entry breakpoint: %s', async failure => {
    const methods = []
    const cancel = vi.fn()
    const pause = entryPause()
    if (failure === 'other pause') pause.reason = 'other'
    if (failure === 'internal frame') pause.callFrames[0].url = 'node:internal/bootstrap/node'
    const inspector = {
      waitForEvent: () => ({ promise: failure === 'missing' ? Promise.reject(new Error('No entry pause')) : Promise.resolve(pause), cancel }),
      async send(method) {
        methods.push(method)
        if (failure === 'command failure' && method === 'Runtime.runIfWaitingForDebugger') throw new Error('command failed')
        return {}
      }
    }
    await expect(prepareInstallInspector(inspector, workbenchInstallIsolation('win32', root, {}))).rejects.toThrow()
    expect(methods).not.toContain('Runtime.evaluate')
    expect(methods).not.toContain('Debugger.resume')
    expect(cancel).toHaveBeenCalledOnce()
  })

  it('bounds event waits and clears their timers on event, cancellation and close', async () => {
    class Socket extends EventTarget {
      constructor() { super(); queueMicrotask(() => this.dispatchEvent(new Event('open'))) }
      close() { this.dispatchEvent(new Event('close')) }
      send() {}
      emit(method) { this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify({ method, params: { ready: true } }) })) }
    }
    const NativeWebSocket = globalThis.WebSocket
    let socket
    vi.stubGlobal('WebSocket', class extends Socket { constructor() { super(); socket = this } })
    vi.useFakeTimers()
    try {
      const connecting = connect('ws://fixture')
      await vi.runAllTicks()
      const inspector = await connecting
      const success = inspector.waitForEvent('Debugger.paused', 100)
      socket.emit('Debugger.paused')
      await expect(success.promise).resolves.toEqual({ ready: true })
      expect(vi.getTimerCount()).toBe(0)
      const cancelled = inspector.waitForEvent('cancel', 100)
      const cancelledResult = expect(cancelled.promise).rejects.toThrow('cancelled')
      cancelled.cancel()
      await cancelledResult
      expect(vi.getTimerCount()).toBe(0)
      const expired = inspector.waitForEvent('timeout', 100)
      const expiredResult = expect(expired.promise).rejects.toThrow('timed out')
      await vi.advanceTimersByTimeAsync(100)
      await expiredResult
      expect(vi.getTimerCount()).toBe(0)
      const disconnected = inspector.waitForEvent('close', 100)
      const disconnectedResult = expect(disconnected.promise).rejects.toThrow('closed')
      inspector.close()
      await disconnectedResult
      expect(vi.getTimerCount()).toBe(0)
    } finally {
      vi.useRealTimers()
      vi.stubGlobal('WebSocket', NativeWebSocket)
    }
  })

  it('reaches a real Node inspect-brk entry with process available before the sentinel executes', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'dsh-inspector-entry-'))
    const fixture = join(directory, 'entry.cjs')
    await writeFile(fixture, 'globalThis.entrySentinel = true; setInterval(() => {}, 1000)\n')
    // This fixture has no Electron or profile access. Isolation expressions above
    // run only in a VM; this child proves the real inspector boot ordering.
    const child = spawn(process.execPath, ['--inspect-brk=127.0.0.1:0', fixture], {
      cwd: directory, env: { ...process.env, NODE_OPTIONS: '' }, stdio: ['ignore', 'ignore', 'pipe']
    })
    let inspector
    try {
      const url = await new Promise((resolve, reject) => {
        let output = ''
        const finish = (error, value) => {
          clearTimeout(timer)
          child.stderr.off('data', onData)
          child.off('error', onError)
          child.off('exit', onExit)
          if (error) reject(error); else resolve(value)
        }
        const onData = chunk => {
          output += chunk
          const match = output.match(/ws:\/\/127\.0\.0\.1:\d+\/[^\s]+/u)
          if (match) finish(null, match[0])
        }
        const onError = error => finish(error)
        const onExit = () => finish(new Error('Node inspector fixture exited before connecting'))
        const timer = setTimeout(() => finish(new Error('Node inspector fixture startup timed out')), 10_000)
        child.stderr.on('data', onData)
        child.once('error', onError)
        child.once('exit', onExit)
      })
      inspector = await connect(url)
      // Node versions expose process at different bootstrap stages. The safety
      // invariant is that application code has not executed, not its availability.
      const before = await inspector.send('Runtime.evaluate', { expression: 'typeof globalThis.entrySentinel', returnByValue: true })
      expect(before.exceptionDetails).toBeUndefined()
      expect(before.result.value).toBe('undefined')
      const paused = await pauseInstallEntry(inspector)
      expect(paused.reason).toBe('Break on start')
      // Node may omit frame.url; the script source still identifies the entry.
      const source = await inspector.send('Debugger.getScriptSource', { scriptId: paused.callFrames[0].location.scriptId })
      expect(source.scriptSource).toContain('globalThis.entrySentinel = true')
      const diagnostic = await inspector.send('Runtime.evaluate', {
        expression: '({ process: typeof process, sentinel: typeof globalThis.entrySentinel })', returnByValue: true
      })
      expect(diagnostic.result.value).toEqual({ process: 'object', sentinel: 'undefined' })
      await inspector.send('Debugger.resume')
      const resumed = await inspector.send('Runtime.evaluate', { expression: 'globalThis.entrySentinel', returnByValue: true })
      expect(resumed.result.value).toBe(true)
    } finally {
      inspector?.close()
      if (child.exitCode === null && child.signalCode === null) {
        const exited = once(child, 'exit')
        child.kill('SIGKILL')
        await exited
      }
      // directory is the fresh mkdtemp-owned fixture, never a user profile.
      await rm(directory, { recursive: true, force: true })
    }
  }, 20_000)

  it('rejects relative isolation paths', () => {
    expect(() => workbenchInstallIsolation('win32', 'relative run', {})).toThrow('absolute')
  })
})
