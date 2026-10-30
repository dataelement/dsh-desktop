import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'
import { installPnpmArguments } from 'dsh-desktop-market-installer/generations/installer'
import { pnpmLaunchArguments } from '../packages/dsh-desktop-market-installer/pnpm-runner.mjs'
import {
  HIDE_CONSOLE_BOOTSTRAP_ENV,
  hideConsoleBootstrapPath,
  hideConsoleCmdAssignment,
  hideConsoleImportArguments
} from 'dsh-desktop-market-installer/windows-hide-console'

const bootstrap = 'C:\\Program Files (x86)\\DSH Desktop\\resources\\windows-hide-console-import.mjs'

describe('windows console hide launch arguments', () => {
  it('rejects paths that a quoted cmd assignment cannot carry', () => {
    expect(hideConsoleBootstrapPath(bootstrap)).toBe(bootstrap)
    expect(hideConsoleBootstrapPath('C:\\bad"path.mjs')).toBeUndefined()
    expect(hideConsoleBootstrapPath('C:\\bad\r\npath.mjs')).toBeUndefined()
    expect(hideConsoleBootstrapPath('C:\\bad\0path.mjs')).toBeUndefined()
    expect(hideConsoleCmdAssignment('C:\\bad"path.mjs')).toBe('')
  })

  it('quotes the bootstrap for the pnpm shim', () => {
    expect(hideConsoleCmdAssignment(bootstrap)).toBe(
      `@set "${HIDE_CONSOLE_BOOTSTRAP_ENV}=${bootstrap}"\r\n`
    )
  })

  it('loads the bootstrap through a file URL before pnpm on Windows', () => {
    const dir = mkdtempSync(join(tmpdir(), 'dsh-console-hide-'))
    const path = join(dir, 'windows-hide-console-import.mjs')
    writeFileSync(path, '')
    const env = { [HIDE_CONSOLE_BOOTSTRAP_ENV]: path }
    expect(hideConsoleImportArguments(env, 'win32')).toEqual(['--import', pathToFileURL(path).href])
    expect(pnpmLaunchArguments(['pnpm.cjs', 'view', 'dshmarket@^1.65.1'], env, 'win32')).toEqual([
      '--import',
      pathToFileURL(path).href,
      'pnpm.cjs',
      'view',
      'dshmarket@^1.65.1'
    ])
    expect(hideConsoleImportArguments(env, 'darwin')).toEqual([])
    expect(hideConsoleImportArguments({}, 'win32')).toEqual([])
  })

  it('skips a Windows import when the bootstrap file is gone', () => {
    const env = { [HIDE_CONSOLE_BOOTSTRAP_ENV]: join(tmpdir(), 'missing-windows-hide-console-import.mjs') }
    expect(hideConsoleImportArguments(env, 'win32')).toEqual([])
  })

  it('keeps a scrubbed install environment from dropping the process bootstrap', () => {
    const dir = mkdtempSync(join(tmpdir(), 'dsh-console-hide-install-'))
    const path = join(dir, 'windows-hide-console-import.mjs')
    writeFileSync(path, '')
    const argv = installPnpmArguments({
      pnpmEntryPath: 'pnpm.cjs',
      pluginSpec: 'dshmarket@^1.65.1',
      environment: { CI: 'true' }
    }, { [HIDE_CONSOLE_BOOTSTRAP_ENV]: path }, 'win32')
    expect(argv.slice(0, 2)).toEqual(['--import', pathToFileURL(path).href])
    expect(argv.slice(2, 5)).toEqual(['pnpm.cjs', 'add', 'dshmarket@^1.65.1'])

    const replaced = installPnpmArguments({
      pnpmEntryPath: 'pnpm.cjs',
      pluginSpec: 'demo@1.0.0',
      environment: { [HIDE_CONSOLE_BOOTSTRAP_ENV]: join(dir, 'missing.mjs') }
    }, { [HIDE_CONSOLE_BOOTSTRAP_ENV]: path }, 'win32')
    expect(replaced[0]).toBe('pnpm.cjs')
  })
})

describe('windows console hide import under Electron', () => {
  it('loads the bootstrap with ELECTRON_RUN_AS_NODE', () => {
    const electron: unknown = createRequire(import.meta.url)('electron')
    if (typeof electron !== 'string') return
    const result = spawnSync(electron, [
      '--import',
      pathToFileURL(join(process.cwd(), 'build', 'windows-hide-console-import.mjs')).href,
      '--input-type=module',
      '-e',
      'process.stdout.write("console-hide-import-ok")'
    ], {
      encoding: 'utf8',
      timeout: 20_000,
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }
    })
    expect(result.error).toBeUndefined()
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('console-hide-import-ok')
  })
})
