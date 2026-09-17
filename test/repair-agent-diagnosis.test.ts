import { describe, expect, it } from 'vitest'
import { analyzeCrashContext } from '../src/main/repair-agent'

const include = 'failed to apply loader entry include (cordis:include)'

describe('analyzeCrashContext', () => {
  it('names the parenthesized package, not the entry id or the include wrapper', () => {
    const logs = [
      '[desktop] starting Harness',
      '[desktop] waiting for Harness (5s)',
      `[stderr] [harness-node] DSH entry failed: Error: dsh: plugin tree failed to load: ${include}: failed to import loader entry better-sidebar (dsh-better-sidebar): The requested module '@deepseek-ai/dsh-session' does not provide an export named 'SessionLog'`,
      '[node] Harness process exited (signal SIGTERM)'
    ]

    const finding = analyzeCrashContext(logs, 'en')

    expect(finding).toMatchObject({ type: 'syntax_export_mismatch', culprit: 'dsh-better-sidebar' })
    expect(finding?.summary).toContain('SessionLog')
  })

  it('reports every plugin of an aggregate loader failure', () => {
    const logs = [
      '[desktop] starting Harness',
      `[stderr] [harness-node] DSH entry failed: Error: dsh: plugin tree failed to load: ${include}: loader entries failed to apply`,
      "[stderr] Error: failed to import loader entry better-sidebar (dsh-better-sidebar): The requested module '@deepseek-ai/dsh-settings' does not provide an export named 'settingsNamespace'",
      "[stderr] Error: failed to import loader entry proxy-routing (dsh-proxy-routing): The requested module '@deepseek-ai/dsh-settings' does not provide an export named 'settingsNamespace'"
    ]

    expect(analyzeCrashContext(logs, 'en')?.culprit).toBe('dsh-better-sidebar, dsh-proxy-routing')
  })

  it('classifies load failures without SyntaxError instead of returning nothing', () => {
    const failure = {
      stage: 'apply',
      entryId: 'dsh-workbench',
      packageName: 'dsh-plugin-workbench',
      owner: { packageName: 'dsh-plugin-workbench', version: '0.0.15' },
      chain: [{ entryId: 'dsh-workbench', packageName: 'dsh-plugin-workbench' }],
      message: 'cannot get property "webServer" without inject'
    }
    const logs = [
      '[desktop] starting Harness',
      '[desktop] waiting for Harness (5s)',
      `[stderr] [harness-node] plugin failures: ${JSON.stringify({ version: 1, failures: [failure] })}`,
      '[stderr] [harness-node] DSH entry failed: Error: dsh: plugin tree failed to load: failed to apply loader entry dsh-workbench (dsh-plugin-workbench): cannot get property "webServer" without inject',
      '[node] Harness process exited (signal SIGTERM)'
    ]

    const finding = analyzeCrashContext(logs, 'en')

    // Previously the SIGTERM after a progress line misread this as a watchdog timeout.
    expect(finding).toMatchObject({ type: 'plugin_load_failure', culprit: 'dsh-plugin-workbench' })
    expect(finding?.summary).toContain('webServer')
  })

  it('prefers plugins resolved by plugin recovery over log text', () => {
    const logs = [
      '[desktop] starting Harness',
      `[stderr] [harness-node] DSH entry failed: Error: ${include}: failed to apply loader entry x (dsh-from-logs): boom`
    ]

    const finding = analyzeCrashContext(logs, 'en', { plugins: ['dsh-resolved'], message: 'failed' })

    expect(finding?.culprit).toBe('dsh-resolved')
  })

  it('does not substitute a log suspect when loader provenance has no removable owner', () => {
    const logs = [
      '[desktop] starting Harness',
      `[stderr] [harness-node] DSH entry failed: Error: failed to apply loader entry x (dsh-from-logs): boom`
    ]
    const pluginFailures = [{ stage: 'apply', packageName: 'protected', chain: [], message: 'boom' }]

    const finding = analyzeCrashContext(logs, 'en', { pluginFailures })

    expect(finding).toMatchObject({ type: 'plugin_load_failure' })
    expect(finding?.culprit).toBeUndefined()
  })

  it('uses the runtime watchdog reason for timeouts', () => {
    expect(analyzeCrashContext(['[desktop] starting Harness'], 'en', {
      message: 'Harness did not become ready within 60 seconds.',
      failureReason: 'startup-timeout'
    })?.type).toBe('startup_timeout')
  })

  it('hands unmatched failures to the agent as generic with the real message', () => {
    const finding = analyzeCrashContext(['[desktop] starting Harness'], 'en', {
      message: 'Harness could not start: spawn ENOENT'
    })

    expect(finding).toMatchObject({ type: 'generic' })
    expect(finding?.summary).toContain('spawn ENOENT')
  })

  it('stays silent for logs of a healthy launch', () => {
    expect(analyzeCrashContext(['[desktop] starting Harness', '[desktop] Harness is ready'], 'en')).toBeUndefined()
  })
})
