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

/** Called while --inspect-brk is still waiting, before application code runs.
 * On any error, leave the process paused for the caller's scoped termination.
 */
export async function prepareInstallInspector(inspector, plan) {
  const reply = await inspector.send('Runtime.evaluate', {
    expression: `(() => { const app = ${electronApp}; app.setPath('appData', ${JSON.stringify(plan.appData)}); app.setPath('home', ${JSON.stringify(plan.userHome)}); app.setPath('userData', ${JSON.stringify(plan.bootstrapUserData)}); app.setPath('sessionData', ${JSON.stringify(plan.bootstrapUserData)}); return true; })()`,
    returnByValue: true
  })
  assert(!reply.exceptionDetails && reply.result?.value === true, 'Could not configure isolated Electron paths before startup')
  const paths = await inspectInstallPaths(inspector)
  assert.equal(paths.appData, plan.appData, 'Electron appData must be isolated before startup')
  assert.equal(paths.osHome, plan.userHome, 'Electron OS home must be isolated before startup')
  assert.equal(paths.userData, plan.bootstrapUserData, 'Electron bootstrap userData must be isolated before startup')
  await inspector.send('Runtime.runIfWaitingForDebugger')
}
