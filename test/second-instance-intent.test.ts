import { describe, expect, it } from 'vitest'
import { isUserInitiatedInstance } from '../src/main/launchd-guard'

const mainBinary = '/Applications/DSH Desktop.app/Contents/MacOS/DSH Desktop'
const helperBinary =
  '/Applications/DSH Desktop.app/Contents/Frameworks/DSH Desktop Helper.app/Contents/MacOS/DSH Desktop Helper'

describe('second instance intent', () => {
  it('treats a plain application launch as the user asking for the window', () => {
    expect(isUserInitiatedInstance([mainBinary])).toBe(true)
  })

  it('treats a launch carrying a file to open as the user asking for the window', () => {
    expect(isUserInitiatedInstance([mainBinary, '/Users/alex/project'])).toBe(true)
  })

  it('rejects a helper binary, which no user launch ever runs', () => {
    expect(isUserInitiatedInstance([helperBinary, '/plugin/cli.mjs', 'supervisor'])).toBe(false)
  })

  it('rejects a launch that carries a script for the runtime to execute', () => {
    expect(isUserInitiatedInstance([mainBinary, '/plugin/cli.mjs', 'supervisor'])).toBe(false)
  })

  it('rejects a commonjs script argument just the same', () => {
    expect(isUserInitiatedInstance([mainBinary, '/plugin/daemon.js'])).toBe(false)
  })

  it('treats an empty argument list as a user launch rather than guessing', () => {
    expect(isUserInitiatedInstance([])).toBe(true)
  })
})
