import { mkdtempSync, writeFileSync } from 'node:fs'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { electronNodeExecutable } from '../../src/main/shell/backend/electron-node-executable'
import { DesktopHostFatalError, DesktopHostProcess, hostLaunchArguments, redactHostOutput } from '../../src/main/shell/backend/host-process'
import { packageManagerEnvironment } from '../../src/host/index'
import { HIDE_CONSOLE_BOOTSTRAP_ENV } from 'dsh-desktop-market-installer/windows-hide-console'

const require = createRequire(import.meta.url)
const electron = require('electron') as string
const fixture = join(import.meta.dirname, 'fixtures', 'host-child.mjs')
const temporary: string[] = []

afterEach(async () => {
  await Promise.all(temporary.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

describe('desktop host process', () => {
  it('sets DSH_HOME and returns the ready URL', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'shell-host-'))
    temporary.push(directory)
    const report = join(directory, 'report.json')
    const host = new DesktopHostProcess({
      node: electron,
      entry: fixture,
      runtimeDir: directory,
      projectDir: directory,
      dshHome: join(directory, 'harness'),
      profile: 'desktop',
      environment: { FIXTURE_REPORT: report }
    })
    await expect(host.start()).resolves.toEqual({ url: 'http://127.0.0.1:9/', injections: ['boot'] })
    expect(JSON.parse(await readFile(report, 'utf8'))).toEqual({
      home: join(directory, 'harness'),
      profile: 'desktop',
      execPath: electron
    })
    await host.stop()
  })

  it('keeps the macOS Helper as its own executable', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'shell-host-'))
    temporary.push(directory)
    const report = join(directory, 'report.json')
    const node = electronNodeExecutable(electron)
    const host = new DesktopHostProcess({
      node,
      entry: fixture,
      runtimeDir: directory,
      projectDir: directory,
      dshHome: directory,
      environment: { FIXTURE_REPORT: report }
    })
    await host.start()
    expect(JSON.parse(await readFile(report, 'utf8')).execPath).toBe(node)
    await host.stop()
  })

  it('finishes graceful stop when a plugin child still holds the Host pipes', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'shell-host-'))
    temporary.push(directory)
    const host = new DesktopHostProcess({
      node: electron,
      entry: fixture,
      runtimeDir: directory,
      projectDir: directory,
      dshHome: directory,
      environment: { FIXTURE_MODE: 'inherited-pipes' }
    })
    await host.start()
    const started = Date.now()
    await expect(host.stop(true)).resolves.toBeUndefined()
    expect(Date.now() - started).toBeLessThan(3_000)
  })

  it('does not hang stopping a Host that failed to spawn', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'shell-host-'))
    temporary.push(directory)
    const host = new DesktopHostProcess({
      node: join(directory, 'missing-node'), entry: fixture,
      runtimeDir: directory, projectDir: directory, dshHome: directory
    })
    await expect(host.start()).rejects.toThrow()
    await expect(host.stop()).resolves.toBeUndefined()
  })

  it('forwards child output before the process exit callback', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'shell-host-'))
    temporary.push(directory)
    const chunks: string[] = []
    let seenAtExit = ''
    const host = new DesktopHostProcess({
      node: electron,
      entry: fixture,
      runtimeDir: directory,
      projectDir: directory,
      dshHome: directory,
      environment: { FIXTURE_MODE: 'output' },
      onOutput: (_source, chunk) => { chunks.push(chunk) },
      onProcessExit: () => { seenAtExit = chunks.join('') }
    })
    await expect(host.start()).rejects.toThrow(/stopped/u)
    expect(seenAtExit).toContain('child-stdout')
    expect(seenAtExit).toContain('token=secret')
    expect(chunks.join('')).toBe(seenAtExit)
    await host.stop()
  })

  it('passes the console bootstrap to the Host and imports it only on Windows', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'shell-host-'))
    temporary.push(directory)
    const report = join(directory, 'report.json')
    const bootstrap = join(directory, 'windows-hide-console-import.mjs')
    writeFileSync(bootstrap, 'export {}\n')
    const host = new DesktopHostProcess({
      node: electron,
      entry: fixture,
      runtimeDir: directory,
      projectDir: directory,
      dshHome: directory,
      hideConsoleBootstrapPath: bootstrap,
      environment: { FIXTURE_MODE: 'launch-args', FIXTURE_REPORT: report }
    })
    await host.start()
    const launched = JSON.parse(await readFile(report, 'utf8')) as { bootstrap: string, execArgv: string[] }
    expect(launched.bootstrap).toBe(bootstrap)
    expect(launched.execArgv.includes('--import')).toBe(process.platform === 'win32')
    await host.stop()
  })

  it('rejects a fatal host message', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'shell-host-'))
    temporary.push(directory)
    const host = new DesktopHostProcess({
      node: electron,
      entry: fixture,
      runtimeDir: directory,
      projectDir: directory,
      dshHome: directory,
      environment: { FIXTURE_MODE: 'fatal' }
    })
    await expect(host.start()).rejects.toBeInstanceOf(DesktopHostFatalError)
    await host.stop()
  })
})

describe('host launch arguments', () => {
  it('places the Windows console import before the Host entry', () => {
    const directory = mkdtempSync(join(tmpdir(), 'shell-host-argv-'))
    temporary.push(directory)
    const bootstrap = join(directory, 'windows-hide-console-import.mjs')
    writeFileSync(bootstrap, 'export {}\n')
    const entry = join(directory, 'host.js')
    const options = {
      entry,
      runtimeDir: directory,
      projectDir: directory,
      primaryRuntime: join(directory, 'primary'),
      hideConsoleBootstrapPath: bootstrap,
      inspectPort: 9
    }
    const args = hostLaunchArguments(options, {}, 'win32')
    expect(args.slice(0, 4)).toEqual([
      '--expose-internals',
      '--import',
      pathToFileURL(bootstrap).href,
      '--inspect=127.0.0.1:9'
    ])
    expect(args[4]).toBe(entry)
    expect(hostLaunchArguments(options, {}, 'darwin')).toEqual([
      '--expose-internals',
      '--inspect=127.0.0.1:9',
      entry,
      directory,
      directory,
      join(directory, 'primary')
    ])
    expect(hostLaunchArguments({
      ...options,
      hideConsoleBootstrapPath: undefined,
      inspectPort: undefined
    }, {}, 'win32')[1]).toBe(entry)
  })
})

describe('package manager environment', () => {
  it('carries the Windows console bootstrap into the packaged pnpm runner', () => {
    const environment = packageManagerEnvironment({
      PATH: 'system-bin',
      [HIDE_CONSOLE_BOOTSTRAP_ENV]: 'C:\\DSH\\windows-hide-console-import.mjs'
    }, 'electron.exe', 'desktop-bin')
    expect(environment).toEqual({
      ELECTRON_RUN_AS_NODE: '1',
      DSH_DESKTOP_NODE_EXECUTABLE: 'electron.exe',
      PATH: `desktop-bin${process.platform === 'win32' ? ';' : ':'}system-bin`,
      [HIDE_CONSOLE_BOOTSTRAP_ENV]: 'C:\\DSH\\windows-hide-console-import.mjs'
    })
  })
})

describe('shell boundaries', () => {
  it('removes the credential from host output', () => {
    expect(redactHostOutput('dsh web: http://127.0.0.1:9/?token=secret&x=1')).toBe('dsh web: http://127.0.0.1:9/?token=[redacted]&x=1')
  })

  it('keeps Electron out of the host entry', async () => {
    const source = await readFile(join(import.meta.dirname, '../../src/host/index.ts'), 'utf8')
    expect(source.includes("from 'electron'")).toBe(false)
  })

  it('uses the product updater without the old entry or the official fatal dialog', async () => {
    const source = await readFile(join(import.meta.dirname, '../../src/main/shell/app.ts'), 'utf8')
    expect(source.includes('../update/update-manager')).toBe(true)
    expect(source.includes('mandatory-update')).toBe(false)
    expect(source.includes('../index')).toBe(false)
    expect(source.includes('DesktopFatalRecovery')).toBe(false)
    expect(source.includes('../recovery/fatal-entry')).toBe(true)
    expect(source.includes('node: electronNodeExecutable(process.execPath)')).toBe(true)
  })
})
