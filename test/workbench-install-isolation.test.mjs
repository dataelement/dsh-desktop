import { describe, expect, it } from 'vitest'
import { win32 } from 'node:path'
import { runInNewContext } from 'node:vm'
import { workbenchInstallIsolation, assertWorkbenchInstallPaths, prepareInstallInspector, inspectInstallPaths } from '../scripts/verify/workbench-install-isolation.mjs'

const root = 'C:\\acceptance artifacts\\isolated run'

describe('packaged workbench acceptance isolation', () => {
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
      async send(method, params) {
        calls.push(method)
        if (method === 'Runtime.runIfWaitingForDebugger') {
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
    expect(calls.at(-1)).toBe('Runtime.runIfWaitingForDebugger')
    const diagnostic = await inspectInstallPaths(inspector)
    expect(assertWorkbenchInstallPaths(plan, [diagnostic]).home).toBe(win32.join(paths.userData, 'harness'))
  })

  it.each(['exception', 'mismatch', 'missing'])('does not resume an unsafe startup diagnostic: %s', async failure => {
    const plan = workbenchInstallIsolation('win32', root, {})
    const methods = []
    const inspector = { async send(method) {
      methods.push(method)
      if (methods.length === 1) return failure === 'exception' ? { exceptionDetails: {} } : { result: { value: true } }
      return { result: { value: failure === 'missing' ? null : { appData: 'C:\\real user' } } }
    } }
    await expect(prepareInstallInspector(inspector, plan)).rejects.toThrow()
    expect(methods).not.toContain('Runtime.runIfWaitingForDebugger')
  })

  it('rejects relative isolation paths', () => {
    expect(() => workbenchInstallIsolation('win32', 'relative run', {})).toThrow('absolute')
  })
})
