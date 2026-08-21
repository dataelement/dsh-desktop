import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  buildHarnessArguments,
  buildHarnessSpawnOptions,
  buildNodeArguments,
  extractDuplicateLoaderEntryId,
  extractFailureCause,
  extractOffendingPlugin,
  extractOffendingPlugins,
  extractPluginFailureReferences,
  extractSlotConflictName,
  formatExitCode,
  updateReadyStability
} from '../src/main/runtime/harness-runtime'
import { canGrantWindowPermission, isTrustedAppUrl } from '../src/main/security-policy'
import { buildDisclaimedUtilityProcessSpec } from '../src/main/runtime/disclaimed-utility-process'
import {
  desktopHarnessUrl,
  isAbortedNavigationError,
  shouldLoadHarnessUrl
} from '../src/main/window-navigation'

describe('Harness launch contract', () => {
  it('does not treat a briefly reachable port as a completed Harness startup', () => {
    const firstProbe = updateReadyStability(undefined, true, 1_000)
    expect(firstProbe).toEqual({ readySince: 1_000, ready: false })

    const interruptedProbe = updateReadyStability(firstProbe.readySince, false, 1_400)
    expect(interruptedProbe).toEqual({ readySince: undefined, ready: false })

    const restartedProbe = updateReadyStability(interruptedProbe.readySince, true, 2_000)
    expect(updateReadyStability(restartedProbe.readySince, true, 2_499).ready).toBe(false)
    expect(updateReadyStability(restartedProbe.readySince, true, 2_500).ready).toBe(true)
  })

  it('binds the web server to a random loopback port', () => {
    expect(buildHarnessArguments(43127)).toEqual([
      'web',
      '--no-open',
      '--host',
      '127.0.0.1',
      '--port',
      '43127'
    ])
  })

  it('keeps Harness from handing the loopback URL to the system browser', () => {
    expect(buildHarnessArguments(43127)).toContain('--no-open')
  })

  it('applies the desktop composition patch before web arguments', () => {
    expect(buildHarnessArguments(43127, 'C:\\app\\dsh-desktop.patch.yml')).toEqual([
      'web',
      '--patch',
      'C:\\app\\dsh-desktop.patch.yml',
      '--no-open',
      '--host',
      '127.0.0.1',
      '--port',
      '43127'
    ])
  })

  it('launches Harness with the bundled Node.js runtime', () => {
    const options = buildHarnessSpawnOptions(
      'C:\\Users\\tester\\AppData\\Roaming\\dsh-desktop\\launch-root',
      'C:\\Users\\tester\\AppData\\Roaming\\dsh-desktop\\harness',
      'win32',
      {
        ELECTRON_RUN_AS_NODE: '1',
        PATH: 'fallback-path',
        Path: 'windows-path'
      }
    )

    expect(options).toMatchObject({
      cwd: 'C:\\Users\\tester\\AppData\\Roaming\\dsh-desktop\\launch-root',
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
      env: {
        DSH_HOME: 'C:\\Users\\tester\\AppData\\Roaming\\dsh-desktop\\harness',
        NO_COLOR: '1',
        Path: 'windows-path'
      }
    })
    expect(options.env).not.toHaveProperty('ELECTRON_RUN_AS_NODE')
  })

  it('passes the internal-loader flag directly to bundled Node.js', () => {
    expect(
      buildNodeArguments(
        'C:\\app\\harness-node-entry.mjs',
        'C:\\app\\dsh\\lib\\bin.js',
        43127,
        'C:\\app\\dsh-desktop.patch.yml'
      )
    ).toEqual([
      '--expose-internals',
      'C:\\app\\harness-node-entry.mjs',
      'C:\\app\\dsh\\lib\\bin.js',
      'web',
      '--patch',
      'C:\\app\\dsh-desktop.patch.yml',
      '--no-open',
      '--host',
      '127.0.0.1',
      '--port',
      '43127'
    ])
  })

  it('disclaims macOS TCC responsibility when Harness runs as a utility process', () => {
    const spawnOptions = buildHarnessSpawnOptions(
      '/Users/tester/Library/Application Support/dsh-desktop/launch-root',
      '/Users/tester/Library/Application Support/dsh-desktop/harness',
      'darwin',
      { PATH: '/usr/bin', ELECTRON_RUN_AS_NODE: '1' }
    )
    const nodeArguments = buildNodeArguments(
      '/Applications/DSH Desktop.app/Contents/Resources/harness-node-entry.mjs',
      '/Applications/DSH Desktop.app/Contents/Resources/app/node_modules/@deepseek-ai/dsh/lib/bin.js',
      43127,
      '/Applications/DSH Desktop.app/Contents/Resources/dsh-desktop.patch.yml'
    )

    expect(buildDisclaimedUtilityProcessSpec(nodeArguments, spawnOptions)).toEqual({
      modulePath: '/Applications/DSH Desktop.app/Contents/Resources/harness-node-entry.mjs',
      args: [
        '/Applications/DSH Desktop.app/Contents/Resources/app/node_modules/@deepseek-ai/dsh/lib/bin.js',
        'web',
        '--patch',
        '/Applications/DSH Desktop.app/Contents/Resources/dsh-desktop.patch.yml',
        '--no-open',
        '--host',
        '127.0.0.1',
        '--port',
        '43127'
      ],
      options: {
        cwd: '/Users/tester/Library/Application Support/dsh-desktop/launch-root',
        env: {
          PATH: '/usr/bin',
          DSH_HOME: '/Users/tester/Library/Application Support/dsh-desktop/harness',
          NO_COLOR: '1',
          PNPM_MAX_WORKERS: '1',
          npm_config_child_concurrency: '1',
          npm_config_package_import_method: 'clone-or-copy',
          npm_config_side_effects_cache: 'false',
          PNPM_CONFIG_CHILD_CONCURRENCY: '1',
          PNPM_CONFIG_PACKAGE_IMPORT_METHOD: 'clone-or-copy',
          PNPM_CONFIG_SIDE_EFFECTS_CACHE: 'false'
        },
        execArgv: ['--expose-internals'],
        stdio: 'pipe',
        serviceName: 'DSH Harness',
        disclaim: true
      }
    })

    expect(
      buildDisclaimedUtilityProcessSpec(nodeArguments, spawnOptions, { disclaim: false }).options
        .disclaim
    ).toBe(false)
  })

  it('declares Node mode for Harness children without imposing it on the utility process', async () => {
    // dsh-market re-runs the dsh CLI as `execPath [...execArgv] bin.js plugin
    // --profile web add …`. On macOS execPath is the Electron helper, so
    // without Node mode that child boots as an Electron app, the leading
    // `--expose-internals` shifts argv, and the CLI answers "--profile <name>
    // is required" instead of installing. The flag cannot travel in the
    // process environment: the utility process is launched with Chromium
    // switches Node rejects, so the entry sets it from the inside instead.
    const macOptions = buildHarnessSpawnOptions('/launch-root', '/harness', 'darwin', {
      PATH: '/usr/bin',
      ELECTRON_RUN_AS_NODE: '1'
    })
    expect(macOptions.env).not.toHaveProperty('ELECTRON_RUN_AS_NODE')

    const entry = await readFile(join(process.cwd(), 'build', 'harness-node-entry.mjs'), 'utf8')
    expect(entry).toContain('process.versions.electron !== undefined')
    expect(entry).toContain("process.env.ELECTRON_RUN_AS_NODE = '1'")
  })

  it('rejects an unexpected macOS Harness argument layout', () => {
    expect(() =>
      buildDisclaimedUtilityProcessSpec(['entry.mjs'], {
        cwd: '/tmp/dsh',
        env: {},
        stdio: ['pipe', 'pipe', 'pipe']
      })
    ).toThrow('Unexpected Harness Node arguments')
  })

  it('makes native Windows termination codes diagnosable', () => {
    expect(formatExitCode(4294930435)).toContain(
      '0xFFFF7003, Crashpad handler unavailable'
    )
  })
})



describe('harness failure cause extraction', () => {
  it('extracts the DSH entry failure message from stderr', () => {
    const logs = [
      '[stderr] [harness-node] DSH entry failed: Error: dsh: plugin tree failed to load',
      '[stderr] AggregateError: loader entries failed to apply',
    ]
    expect(extractFailureCause(logs)).toBe('Error: dsh: plugin tree failed to load')
  })

  it('extracts uncaught exception messages from stderr', () => {
    const logs = [
      '[stderr] [harness-node] uncaught exception: ReferenceError: foo is not defined',
    ]
    expect(extractFailureCause(logs)).toBe('ReferenceError: foo is not defined')
  })

  it('extracts unhandled rejection messages from stderr', () => {
    const logs = [
      '[stderr] [harness-node] unhandled rejection: TypeError: cannot read property x of null',
    ]
    expect(extractFailureCause(logs)).toBe('TypeError: cannot read property x of null')
  })

  it('prefers DSH entry failure over uncaught error', () => {
    const logs = [
      '[stderr] [harness-node] uncaught exception: some error',
      '[stderr] [harness-node] DSH entry failed: Error: plugin failed to load',
    ]
    expect(extractFailureCause(logs)).toBe('Error: plugin failed to load')
  })

  it('falls back to the last error-like stderr line', () => {
    const logs = [
      '[stderr] some random output',
      '[stderr] another line',
      '[stderr] FATAL: configuration error in settings.yaml',
    ]
    expect(extractFailureCause(logs)).toBe('FATAL: configuration error in settings.yaml')
  })

  it('falls back to the last stderr line when nothing matches', () => {
    const logs = [
      '[stderr] starting up',
      '[stderr] something happened',
      '[stderr] process exiting now',
    ]
    expect(extractFailureCause(logs)).toBe('process exiting now')
  })

  it('returns undefined when there are no stderr lines', () => {
    const logs = [
      '[stdout] normal output',
      '[desktop] starting harness',
    ]
    expect(extractFailureCause(logs)).toBeUndefined()
  })

  it('returns undefined for empty log array', () => {
    expect(extractFailureCause([])).toBeUndefined()
  })

  it('uses only the latest Harness launch when earlier attempts also failed', () => {
    const logs = [
      '[desktop] starting 2026-08-19T08:00:00.000Z',
      '[stderr] [harness-node] DSH entry failed: Error: first plugin failed',
      '[desktop] starting 2026-08-19T08:01:00.000Z',
      '[stderr] [harness-node] DSH entry failed: Error: second plugin failed'
    ]
    expect(extractFailureCause(logs)).toBe('Error: second plugin failed')
  })

  it('ignores long error lines (>200 chars) when falling back', () => {
    const longLine = 'x'.repeat(250)
    const logs = [
      `[stderr] ${longLine}`,
      '[stderr] short error message',
    ]
    expect(extractFailureCause(logs)).toBe('short error message')
  })
})

describe('offending plugin extraction', () => {
  it('extracts plugin name from loader entry failure in stderr', () => {
    const logs = [
      '[stderr] [harness-node] DSH entry failed: Error: dsh: plugin tree failed to load: failed to apply loader entry web-ui-better-sidebar (dsh-better-sidebar): webserver: duplicate prefix route "/sidebar/api"',
      '[stderr] Error: webserver: duplicate prefix route "/sidebar/api"'
    ]
    expect(extractOffendingPlugin(logs)).toBe('dsh-better-sidebar')
  })

  it('extracts scoped plugin name from loader entry failure', () => {
    const logs = [
      '[stderr] [harness-node] DSH entry failed: Error: dsh: plugin tree failed to load: failed to apply loader entry abc (@linxin666/dsh-web-ui-all): error message'
    ]
    expect(extractOffendingPlugin(logs)).toBe('@linxin666/dsh-web-ui-all')
  })

  it('extracts plugin name from cannot resolve profile bundle error', () => {
    const logs = [
      '[stderr] [harness-node] DSH entry failed: Error: dsh: cannot resolve profile bundle "custom-broken-bundle" from the dsh installation'
    ]
    expect(extractOffendingPlugin(logs)).toBe('custom-broken-bundle')
  })

  it('extracts plugin name from declares no dsh.bundle error', () => {
    const logs = [
      '[stderr] [harness-node] DSH entry failed: Error: dsh: profile bundle "plain-npm-package" declares no dsh.bundle in its package.json'
    ]
    expect(extractOffendingPlugin(logs)).toBe('plain-npm-package')
  })

  it('ignores core deepseek packages as offending plugins', () => {
    const logs = [
      '[stderr] [harness-node] DSH entry failed: Error: dsh: plugin tree failed to load: failed to apply loader entry picker (@deepseek-ai/dsh-client-ui-directory-picker-native): some error'
    ]
    expect(extractOffendingPlugin(logs)).toBeUndefined()
  })

  it('extracts only third-party packages from the frontend boot failure list', () => {
    const logs = [
      '[stderr] Failed to load plugins\n@deepseek-ai/dsh-client-ui-directory-picker-native\ndsh-remote\nweb boot: 2 entries did not activate'
    ]
    expect(extractOffendingPlugins(logs)).toEqual(['dsh-remote'])
    expect(extractPluginFailureReferences(logs)).toEqual([
      '@deepseek-ai/dsh-client-ui-directory-picker-native',
      'dsh-remote'
    ])
  })

  it('keeps a failed core entry as ownership evidence without making it uninstallable', () => {
    const logs = [
      '[stderr] failed to apply loader entry 43d01328 (@deepseek-ai/dsh-client-ui-directory-picker-browse): single slot "conversation.hero.workspace.directoryFlow" already has a registration at priority 0'
    ]
    expect(extractPluginFailureReferences(logs)).toEqual([
      '@deepseek-ai/dsh-client-ui-directory-picker-browse'
    ])
    expect(extractOffendingPlugins(logs)).toEqual([])
  })

  it('extracts a generic renderer slot conflict without registration identities', () => {
    const logs = [
      '[stderr] UI slot "conversation.hero.workspace.directoryFlow" has duplicate registrations from conflicting plugins.'
    ]
    expect(extractSlotConflictName(logs)).toBe(
      'conversation.hero.workspace.directoryFlow'
    )
  })

  it('returns undefined when no plugin error is matched', () => {
    const logs = [
      '[stderr] [harness-node] uncaught exception: ReferenceError: x is not defined'
    ]
    expect(extractOffendingPlugin(logs)).toBeUndefined()
  })

  it('never treats an internal Cordis loader as an uninstallable plugin', () => {
    const logs = [
      '[stderr] [harness-node] DSH entry failed: Error: dsh: plugin tree failed to load: failed to apply loader entry include (cordis:include): duplicate loader entry id: storage'
    ]
    expect(extractOffendingPlugins(logs)).toEqual([])
    expect(extractDuplicateLoaderEntryId(logs)).toBe('storage')
  })

  it('collects multiple unique plugins reported by the same launch', () => {
    const logs = [
      '[desktop] starting 2026-08-19T08:00:00.000Z',
      '[stderr] Error: failed to apply loader entry sidebar (dsh-better-sidebar): duplicate prefix route "/sidebar/api"',
      '[stderr] Error: failed to import loader entry tools (@example/dsh-tools): missing dependency',
      '[stderr] Error: failed to apply loader entry sidebar (dsh-better-sidebar): duplicate prefix route "/sidebar/api"'
    ]
    expect(extractOffendingPlugins(logs)).toEqual([
      'dsh-better-sidebar',
      '@example/dsh-tools'
    ])
  })

  it('does not keep offering a plugin removed during an earlier launch', () => {
    const logs = [
      '[desktop] starting 2026-08-19T08:00:00.000Z',
      '[stderr] Error: failed to apply loader entry sidebar (first-plugin): duplicate prefix route "/sidebar/api"',
      '[desktop] starting 2026-08-19T08:01:00.000Z',
      '[stderr] Error: failed to apply loader entry panel (second-plugin): duplicate prefix route "/panel/api"'
    ]
    expect(extractOffendingPlugins(logs)).toEqual(['second-plugin'])
  })
})

describe('navigation trust boundary', () => {
  it('only trusts the launcher and loopback HTTP pages', () => {
    expect(isTrustedAppUrl('file:///app/index.html')).toBe(true)
    expect(isTrustedAppUrl('http://127.0.0.1:43127')).toBe(true)
    expect(isTrustedAppUrl('http://localhost:43127')).toBe(true)
    expect(isTrustedAppUrl('https://127.0.0.1:43127')).toBe(false)
    expect(isTrustedAppUrl('http://example.com')).toBe(false)
    expect(isTrustedAppUrl('javascript:alert(1)')).toBe(false)
  })

  it('only grants clipboard writes from the trusted main frame', () => {
    expect(
      canGrantWindowPermission(
        'clipboard-sanitized-write',
        'http://127.0.0.1:43127/session',
        true
      )
    ).toBe(true)
    expect(
      canGrantWindowPermission(
        'clipboard-sanitized-write',
        'http://localhost:43127/session',
        true
      )
    ).toBe(true)
    expect(
      canGrantWindowPermission('clipboard-read', 'http://127.0.0.1:43127/session', true)
    ).toBe(false)
    expect(
      canGrantWindowPermission(
        'clipboard-sanitized-write',
        'http://127.0.0.1:43127/session',
        false
      )
    ).toBe(false)
    expect(
      canGrantWindowPermission(
        'clipboard-sanitized-write',
        'https://example.com/session',
        true
      )
    ).toBe(false)
    expect(
      canGrantWindowPermission('clipboard-sanitized-write', 'file:///tmp/app.html', true)
    ).toBe(false)
  })
})

describe('Harness window activation', () => {
  it('stamps Windows renderer URLs so plugins can avoid the native titlebar overlay', () => {
    expect(desktopHarnessUrl('http://127.0.0.1:43127', 'win32')).toBe(
      'http://127.0.0.1:43127/?dsh-desktop-mode=advanced&dsh-desktop-platform=win32'
    )
    expect(desktopHarnessUrl('http://127.0.0.1:43127/?workspace=demo', 'win32')).toBe(
      'http://127.0.0.1:43127/?workspace=demo&dsh-desktop-mode=advanced&dsh-desktop-platform=win32'
    )
    expect(desktopHarnessUrl('http://127.0.0.1:43127', 'darwin')).toBe(
      'http://127.0.0.1:43127'
    )
  })

  it('preserves the current page when the existing Harness instance is focused again', () => {
    expect(
      shouldLoadHarnessUrl(
        'http://127.0.0.1:43127/settings/models',
        'http://127.0.0.1:43127'
      )
    ).toBe(false)
  })

  it('loads the page for a new window or a restarted Harness instance', () => {
    expect(shouldLoadHarnessUrl('about:blank', 'http://127.0.0.1:43127')).toBe(true)
    expect(
      shouldLoadHarnessUrl('http://127.0.0.1:43127/settings', 'http://127.0.0.1:43128')
    ).toBe(true)
  })

  it('recognizes Electron navigation cancellation without hiding other load failures', () => {
    expect(isAbortedNavigationError({ code: 'ERR_ABORTED', errno: -3 })).toBe(true)
    expect(
      isAbortedNavigationError(
        new Error("ERR_ABORTED (-3) loading 'http://127.0.0.1:43127/'")
      )
    ).toBe(true)
    expect(isAbortedNavigationError({ code: 'ERR_CONNECTION_REFUSED', errno: -102 })).toBe(
      false
    )
  })
})
