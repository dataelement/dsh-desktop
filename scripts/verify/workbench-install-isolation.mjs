import assert from 'node:assert/strict'
import { win32 } from 'node:path'

/** Child environment isolation complements the paused Electron app.setPath gate;
 * APPDATA alone does not prove native Electron appData isolation on Windows.
 * Never mutate the launcher's environment or rely on a development app identity.
 */
export function workbenchInstallIsolation(platform, root, inherited) {
  assert.equal(platform, 'win32', 'Packaged installation acceptance currently supports isolated Windows launches only')
  assert(win32.isAbsolute(root), 'Acceptance isolation root must be absolute')
  const userHome = win32.join(root, 'user home')
  const appData = win32.join(userHome, 'AppData', 'Roaming')
  const developmentProfile = 'dsh-workbench-acceptance-dev'
  const env = { ...inherited }
  // Windows environment names are case insensitive. Remove inherited spellings
  // too, so child_process cannot choose a stale AppData/Home variant.
  const replaced = new Set(['appdata', 'localappdata', 'home', 'userprofile', 'homedrive', 'homepath',
    'dsh_home', 'dsh_dev_profile', 'bisheng_dev_user_data', 'electron_run_as_node', 'node_options'])
  for (const key of Object.keys(env)) {
    if (replaced.has(key.toLowerCase())) delete env[key]
  }
  Object.assign(env, {
    APPDATA: appData,
    LOCALAPPDATA: win32.join(userHome, 'AppData', 'Local'),
    HOME: userHome,
    USERPROFILE: userHome,
    HOMEDRIVE: win32.parse(userHome).root.replace(/\\$/u, ''),
    HOMEPATH: userHome.slice(win32.parse(userHome).root.length - 1),
    DSH_DEV_PROFILE: developmentProfile
  })
  return {
    root, appData, userHome, env,
    bootstrapUserData: win32.join(root, 'bootstrap userData'),
    candidates: ['dsh-desktop', developmentProfile].map(profile => {
      const userData = win32.join(appData, profile)
      return { userData, home: win32.join(userData, 'harness') }
    })
  }
}

/** Fail closed if startup initialized no owned profile (or ambiguous identities).
 * Only return paths canonicalized by the caller, never a renderer-supplied path.
 */
export function assertWorkbenchInstallPaths(plan, initialized) {
  assert.equal(initialized.length, 1, 'Expected exactly one initialized isolated Desktop profile')
  const actual = initialized[0]
  const same = (a, b) => typeof a === 'string' && win32.normalize(a).toLowerCase() === win32.normalize(b).toLowerCase()
  assert(plan.candidates.some(candidate => same(actual.userData, candidate.userData) && same(actual.home, candidate.home)),
    'Initialized Desktop paths must match the owned acceptance profile')
  for (const path of [actual.userData, actual.home]) {
    const relative = win32.relative(plan.root, path)
    assert(relative && relative !== '..' && !relative.startsWith('..\\') && !win32.isAbsolute(relative),
      'Desktop paths must remain inside the owned isolation root')
  }
  return actual
}

/** Shared CDP transport for main and renderer. Event waits are explicitly armed
 * before triggering commands, and disposed on success, cancellation or closure.
 */
export async function connect(url) {
  const socket = new WebSocket(url)
  let id = 0
  let closed = false
  const pending = new Map()
  const events = new Set()
  function failPending(error) {
    for (const request of [...pending.values(), ...events]) request.finish(error)
  }
  socket.addEventListener('message', event => {
    let message
    try { message = JSON.parse(event.data) } catch (error) {
      failPending(error)
      socket.close()
      return
    }
    if (message.id !== undefined) {
      const request = pending.get(message.id)
      if (request) request.finish(message.error ? new Error(JSON.stringify(message.error)) : null, message.result)
    } else {
      for (const request of [...events]) {
        if (request.method === message.method) request.finish(null, message.params)
      }
    }
  })
  socket.addEventListener('close', () => {
    closed = true
    failPending(new Error('Packaged debugging connection disconnected'))
  })
  socket.addEventListener('error', () => failPending(new Error('Packaged debugging connection failed')))
  await new Promise((resolve, reject) => {
    const finish = error => {
      clearTimeout(timer)
      socket.removeEventListener('open', onOpen)
      socket.removeEventListener('error', onError)
      socket.removeEventListener('close', onClose)
      if (error) { socket.close(); reject(error) } else resolve()
    }
    const onOpen = () => finish()
    const onError = () => finish(new Error('Packaged debugging connection failed'))
    const onClose = () => finish(new Error('Packaged debugging connection closed before opening'))
    const timer = setTimeout(() => finish(new Error('Packaged debugging connection timed out')), 10_000)
    socket.addEventListener('open', onOpen)
    socket.addEventListener('error', onError)
    socket.addEventListener('close', onClose)
  })
  function request(timeout, description, register, unregister) {
    let finish
    const promise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => finish(new Error(`CDP timed out for ${description}`)), timeout)
      finish = (error, value) => {
        clearTimeout(timer)
        unregister()
        if (error) reject(error)
        else resolve(value)
      }
      register({ finish })
      if (closed) finish(new Error('Packaged debugging connection disconnected'))
    })
    return { promise, cancel: () => finish(new Error(`CDP wait cancelled for ${description}`)) }
  }
  return {
    close() {
      closed = true
      failPending(new Error('Packaged debugging connection closed'))
      socket.close()
    },
    waitForEvent(method, timeout = 30_000) {
      assert(Number.isFinite(timeout) && timeout > 0, 'CDP event timeout must be positive and finite')
      let entry
      return request(timeout, method, value => { entry = { ...value, method }; events.add(entry) }, () => events.delete(entry))
    },
    send(method, params = {}) {
      const requestId = ++id
      const result = request(30_000, method, value => pending.set(requestId, value), () => pending.delete(requestId))
      try { socket.send(JSON.stringify({ id: requestId, method, params })) } catch (error) {
        pending.get(requestId)?.finish(error)
      }
      return result.promise
    }
  }
}

// Resolve Electron's built-in module without relying on a CommonJS global in
// the packaged entry. Only fixed path diagnostics cross this inspector channel.
const electronApp = `process.getBuiltinModule('module').createRequire(process.execPath)('electron').app`

export async function inspectInstallPaths(inspector) {
  const reply = await inspector.send('Runtime.evaluate', {
    expression: `(() => { const app = ${electronApp}; const path = process.getBuiltinModule('path'); const userData = app.getPath('userData'); return { appData: app.getPath('appData'), userData, home: path.join(userData, 'harness'), osHome: app.getPath('home') }; })()`,
    returnByValue: true
  })
  assert(!reply.exceptionDetails, 'Electron isolation diagnostic failed')
  assert(reply.result?.value && typeof reply.result.value === 'object', 'Electron isolation diagnostic returned no paths')
  return reply.result.value
}

/** Advance Node initialization, but stop at the --inspect-brk entry breakpoint.
 * The process global's availability before this pause varies by Node version;
 * only the verified entry breakpoint proves application code has not run.
 * Never substitute Debugger.pause: it could let application code run first.
 */
export async function pauseInstallEntry(inspector) {
  await inspector.send('Debugger.enable')
  const paused = inspector.waitForEvent('Debugger.paused', 10_000)
  // Observe rejection immediately, including when the command fails first.
  const pauseResult = paused.promise.then(value => ({ value }), error => ({ error }))
  try {
    await inspector.send('Runtime.runIfWaitingForDebugger')
    const result = await pauseResult
    if (result.error) throw result.error
    const frame = result.value?.callFrames?.[0]
    assert.equal(result.value?.reason, 'Break on start', 'Expected --inspect-brk application entry breakpoint')
    assert(frame?.location?.scriptId && !frame.url?.startsWith('node:'), 'Expected application entry script frame')
    return result.value
  } finally {
    paused.cancel()
  }
}

/** On any error, leave entry paused for the caller's scoped termination. */
export async function prepareInstallInspector(inspector, plan) {
  await pauseInstallEntry(inspector)
  const reply = await inspector.send('Runtime.evaluate', {
    expression: `(() => { const app = ${electronApp}; app.setPath('appData', ${JSON.stringify(plan.appData)}); app.setPath('home', ${JSON.stringify(plan.userHome)}); app.setPath('userData', ${JSON.stringify(plan.bootstrapUserData)}); app.setPath('sessionData', ${JSON.stringify(plan.bootstrapUserData)}); return true; })()`,
    returnByValue: true
  })
  assert(!reply.exceptionDetails && reply.result?.value === true, 'Could not configure isolated Electron paths before startup')
  const paths = await inspectInstallPaths(inspector)
  assert.equal(paths.appData, plan.appData, 'Electron appData must be isolated before startup')
  assert.equal(paths.osHome, plan.userHome, 'Electron OS home must be isolated before startup')
  assert.equal(paths.userData, plan.bootstrapUserData, 'Electron bootstrap userData must be isolated before startup')
  await inspector.send('Debugger.resume')
}
