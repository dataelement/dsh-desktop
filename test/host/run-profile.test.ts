import { lstat, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, expect, it } from 'vitest'
import { ensureSafeModeProfile, SAFE_MODE_PROFILE } from '../../src/main/recovery/safe-mode-profile'
import { DesktopHostProcess } from '../../src/main/shell/backend/host-process'
import { writeDesktopProductPatch } from '../../src/main/shell/product-patch'
import { ensureHostBundle, hostBundle } from './host-bundle-helper'

// Enabled Loader ids from a real Host. Anonymous ids change every boot, so those rows use their module name.
const DESKTOP_ENABLED_PLUGINS: readonly string[] = [
  '@deepseek-ai/dsh-client-ui-directory-picker-native',
  '@deepseek-ai/dsh-host-directory-picker-native',
  'include',
  'include:agent',
  'include:agent-default-model',
  'include:agent-loop',
  'include:agent-preset-registry',
  'include:agent-team',
  'include:api-remotes',
  'include:approval',
  'include:attachment-local',
  'include:authorization',
  'include:bash-sandbox',
  'include:client-hmr',
  'include:command-feedback',
  'include:commands',
  'include:config-editor',
  'include:connection',
  'include:cordis-client-runner',
  'include:cordis-host-runner',
  'include:cordis-inspect-providers',
  'include:credentials',
  'include:deepseek-account',
  'include:deepseek-llm-api-extensions',
  'include:deliverable-file-references',
  'include:directory-picker',
  'include:dsh-desktop-client-ui',
  'include:dsh-desktop-market-installer',
  'include:dsh-desktop-office',
  'include:dsh-desktop-workbenches',
  'include:dsh-ppt-composer',
  'include:entry-customization',
  'include:file-reference-local',
  'include:file-upload',
  'include:fs-sandbox',
  'include:goal',
  'include:goal-round-driver',
  'include:harness-dev-context',
  'include:hmr',
  'include:image-offload',
  'include:job-controller',
  'include:jobs',
  'include:llm',
  'include:llm-deepseek',
  'include:llm-deepseek-account',
  'include:llm-pi-ai',
  'include:llm-retry',
  'include:locale',
  'include:mcp-manager',
  'include:mcp-resources',
  'include:message-feedback',
  'include:message-quotes',
  'include:modules',
  'include:office-kit',
  'include:open-in-app',
  'include:otel',
  'include:permission',
  'include:plugin-inventory',
  'include:plugin-manager',
  'include:plugin-package-inventory-deepseek',
  'include:preset-cordis',
  'include:preset-minimal',
  'include:preset-ptc',
  'include:preset-standard',
  'include:ptc-runtime',
  'include:remote-access',
  'include:repeat-tool-reminder',
  'include:resources',
  'include:sandbox',
  'include:sandbox-policy',
  'include:schedule',
  'include:session',
  'include:session-checkpoint-policy',
  'include:session-controller',
  'include:session-log-deepseek',
  'include:session-log-download',
  'include:session-persistence-jsonl',
  'include:session-projection',
  'include:session-projection-cache',
  'include:session-query-sqlite',
  'include:session-reference',
  'include:session-stats',
  'include:session-telemetry-otel',
  'include:session-title',
  'include:session-title-llm',
  'include:session-turn-outline',
  'include:settings',
  'include:settings-controller',
  'include:shell-env',
  'include:shortcuts',
  'include:skill',
  'include:skill-office',
  'include:spill-local',
  'include:spill-policy',
  'include:storage',
  'include:storage-domain',
  'include:storage-json',
  'include:subagent',
  'include:subagent-fork-in-process',
  'include:subagent-model-selection-settings',
  'include:subagent-spawn-in-process',
  'include:subprocess',
  'include:system-prompt',
  'include:terminal-controller',
  'include:timeout-policy',
  'include:timer',
  'include:token-meter',
  'include:tool-agent-team',
  'include:tool-executor-native',
  'include:tool-working-directory',
  'include:tools',
  'include:typert',
  'include:typert-gateway',
  'include:typert-loader',
  'include:ui-agent-preset',
  'include:ui-agent-team',
  'include:ui-approval',
  'include:ui-attachment',
  'include:ui-chat',
  'include:ui-commands',
  'include:ui-context-menu',
  'include:ui-conversation',
  'include:ui-cordis',
  'include:ui-deliverables',
  'include:ui-file-actions',
  'include:ui-file-drag',
  'include:ui-goal',
  'include:ui-input-trigger',
  'include:ui-jobs',
  'include:ui-layout',
  'include:ui-message-feedback',
  'include:ui-model-selection',
  'include:ui-open-in-app',
  'include:ui-permission',
  'include:ui-plan',
  'include:ui-plugin-manager',
  'include:ui-reference',
  'include:ui-renderer',
  'include:ui-schedule',
  'include:ui-secret-mask',
  'include:ui-session',
  'include:ui-settings',
  'include:ui-settings-agent-loop',
  'include:ui-settings-general',
  'include:ui-settings-models',
  'include:ui-settings-plugin-inventory',
  'include:ui-settings-plugins',
  'include:ui-settings-session-log',
  'include:ui-settings-shell',
  'include:ui-settings-subagent',
  'include:ui-settings-web-search',
  'include:ui-shortcuts',
  'include:ui-sidebar',
  'include:ui-sidebar-browser',
  'include:ui-sidebar-documentpreview',
  'include:ui-sidebar-files',
  'include:ui-sidebar-right',
  'include:ui-sidebar-terminal',
  'include:ui-skill',
  'include:ui-subagent',
  'include:ui-theme',
  'include:ui-tool',
  'include:ui-trajectory',
  'include:ui-user-questions',
  'include:ui-workflow-run',
  'include:ui-workspace',
  'include:user-questions',
  'include:web',
  'include:web-deepseek-api',
  'include:web-fetch-http',
  'include:web-runtime',
  'include:web-search-deepseek',
  'include:web-startup',
  'include:webserver',
  'include:working-directory',
  'include:workspace',
  'include:workspace-changes',
  'include:workspace-controller',
  'include:workspace-dependencies',
  'include:workspace-files',
]

const SAFE_MODE_ENABLED_PLUGINS: readonly string[] = [
  '@deepseek-ai/dsh-client-ui-directory-picker-native',
  '@deepseek-ai/dsh-host-directory-picker-native',
  'include',
  'include:agent',
  'include:agent-default-model',
  'include:agent-loop',
  'include:agent-preset-registry',
  'include:agent-team',
  'include:api-remotes',
  'include:approval',
  'include:attachment-local',
  'include:authorization',
  'include:bash-sandbox',
  'include:client-hmr',
  'include:command-feedback',
  'include:commands',
  'include:config-editor',
  'include:connection',
  'include:cordis-client-runner',
  'include:cordis-host-runner',
  'include:cordis-inspect-providers',
  'include:credentials',
  'include:deepseek-account',
  'include:deepseek-llm-api-extensions',
  'include:deliverable-file-references',
  'include:directory-picker',
  'include:dsh-desktop-client-ui',
  'include:entry-customization',
  'include:file-reference-local',
  'include:file-upload',
  'include:fs-sandbox',
  'include:goal',
  'include:goal-round-driver',
  'include:harness-dev-context',
  'include:hmr',
  'include:image-offload',
  'include:job-controller',
  'include:jobs',
  'include:llm',
  'include:llm-deepseek',
  'include:llm-deepseek-account',
  'include:llm-pi-ai',
  'include:llm-retry',
  'include:locale',
  'include:mcp-manager',
  'include:mcp-resources',
  'include:message-feedback',
  'include:message-quotes',
  'include:modules',
  'include:office-kit',
  'include:open-in-app',
  'include:otel',
  'include:permission',
  'include:plugin-inventory',
  'include:plugin-manager',
  'include:plugin-package-inventory-deepseek',
  'include:preset-cordis',
  'include:preset-minimal',
  'include:preset-ptc',
  'include:preset-standard',
  'include:ptc-runtime',
  'include:remote-access',
  'include:repeat-tool-reminder',
  'include:resources',
  'include:sandbox',
  'include:sandbox-policy',
  'include:schedule',
  'include:session',
  'include:session-checkpoint-policy',
  'include:session-controller',
  'include:session-log-deepseek',
  'include:session-log-download',
  'include:session-persistence-jsonl',
  'include:session-projection',
  'include:session-projection-cache',
  'include:session-query-sqlite',
  'include:session-reference',
  'include:session-stats',
  'include:session-telemetry-otel',
  'include:session-title',
  'include:session-title-llm',
  'include:session-turn-outline',
  'include:settings',
  'include:settings-controller',
  'include:shell-env',
  'include:shortcuts',
  'include:skill',
  'include:skill-office',
  'include:spill-local',
  'include:spill-policy',
  'include:storage',
  'include:storage-domain',
  'include:storage-json',
  'include:subagent',
  'include:subagent-fork-in-process',
  'include:subagent-model-selection-settings',
  'include:subagent-spawn-in-process',
  'include:subprocess',
  'include:system-prompt',
  'include:terminal-controller',
  'include:timeout-policy',
  'include:timer',
  'include:token-meter',
  'include:tool-agent-team',
  'include:tool-executor-native',
  'include:tool-working-directory',
  'include:tools',
  'include:typert',
  'include:typert-gateway',
  'include:typert-loader',
  'include:ui-agent-preset',
  'include:ui-agent-team',
  'include:ui-approval',
  'include:ui-attachment',
  'include:ui-chat',
  'include:ui-commands',
  'include:ui-context-menu',
  'include:ui-conversation',
  'include:ui-cordis',
  'include:ui-deliverables',
  'include:ui-file-actions',
  'include:ui-file-drag',
  'include:ui-goal',
  'include:ui-input-trigger',
  'include:ui-jobs',
  'include:ui-layout',
  'include:ui-message-feedback',
  'include:ui-model-selection',
  'include:ui-open-in-app',
  'include:ui-permission',
  'include:ui-plan',
  'include:ui-plugin-manager',
  'include:ui-reference',
  'include:ui-renderer',
  'include:ui-schedule',
  'include:ui-secret-mask',
  'include:ui-session',
  'include:ui-settings',
  'include:ui-settings-agent-loop',
  'include:ui-settings-general',
  'include:ui-settings-models',
  'include:ui-settings-plugin-inventory',
  'include:ui-settings-plugins',
  'include:ui-settings-session-log',
  'include:ui-settings-shell',
  'include:ui-settings-subagent',
  'include:ui-settings-web-search',
  'include:ui-shortcuts',
  'include:ui-sidebar',
  'include:ui-sidebar-documentpreview',
  'include:ui-sidebar-files',
  'include:ui-sidebar-right',
  'include:ui-sidebar-terminal',
  'include:ui-skill',
  'include:ui-subagent',
  'include:ui-theme',
  'include:ui-tool',
  'include:ui-trajectory',
  'include:ui-user-questions',
  'include:ui-workflow-run',
  'include:ui-workspace',
  'include:user-questions',
  'include:web',
  'include:web-deepseek-api',
  'include:web-fetch-http',
  'include:web-runtime',
  'include:web-search-deepseek',
  'include:web-startup',
  'include:webserver',
  'include:working-directory',
  'include:workspace',
  'include:workspace-changes',
  'include:workspace-controller',
  'include:workspace-files',
]

const DISABLED_PRODUCT_IDS = [
  'include:ui-account-notifications',
  'include:ui-settings-account',
  'include:product-analytics',
  'include:desktop-product-telemetry',
  'include:ui-brand-official'
]

// dsh-base enables pwsh-sandbox on Windows and bash-sandbox on other platforms.
// The snapshots keep bash-sandbox in sorted order; substitute before comparing.
function expectedEnabledPlugins(plugins: readonly string[], platform = process.platform): string[] {
  const shellSandbox = platform === 'win32' ? 'include:pwsh-sandbox' : 'include:bash-sandbox'
  return plugins.map(id => id === 'include:bash-sandbox' ? shellSandbox : id).sort()
}

function expectEnabledBoundaries(ids: readonly string[] | undefined, mode: 'desktop' | 'safe'): void {
  expect(ids, 'Host did not report enabled plugins').toBeDefined()
  if (ids === undefined) return
  for (const id of DISABLED_PRODUCT_IDS) expect(ids, id).not.toContain(id)
  expect(ids.filter(id => id === 'include:skill-office')).toHaveLength(1)
  expect(ids.filter(id => id === 'include:workspace-dependencies')).toHaveLength(mode === 'desktop' ? 1 : 0)
  expect(ids.filter(id => id.includes('cua') || id.includes('chat-import'))).toEqual([])
  for (const id of ['include:dsh-desktop-office', 'include:dsh-ppt-composer', 'include:dsh-desktop-workbenches', 'include:dsh-desktop-market-installer']) {
    expect(ids.includes(id)).toBe(mode === 'desktop')
  }
  expect(ids).toContain('include:dsh-desktop-client-ui')
}

const require = createRequire(import.meta.url)
const electron = require('electron') as string
const root = resolve(import.meta.dirname, '../..')
const temporary: string[] = []

afterEach(async () => {
  await Promise.all(temporary.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

it('keeps one shell sandbox in sorted order for each platform', () => {
  for (const plugins of [DESKTOP_ENABLED_PLUGINS, SAFE_MODE_ENABLED_PLUGINS]) {
    const posix = expectedEnabledPlugins(plugins, 'darwin')
    const windows = expectedEnabledPlugins(plugins, 'win32')
    expect(posix).toContain('include:bash-sandbox')
    expect(posix).not.toContain('include:pwsh-sandbox')
    expect(windows).toContain('include:pwsh-sandbox')
    expect(windows).not.toContain('include:bash-sandbox')
    expect(windows.indexOf('include:pwsh-sandbox')).toBe(windows.indexOf('include:ptc-runtime') + 1)
    expect(posix).toEqual([...posix].sort())
    expect(windows).toEqual([...windows].sort())
  }
})

it('boots runProfile on a temporary home and redirects the authenticated document', async () => {
  await ensureHostBundle()
  const home = await mkdtemp(join(tmpdir(), 'dsh-shell-profile-'))
  temporary.push(home)
  const profile = join(home, 'profiles', 'desktop')
  await mkdir(profile, { recursive: true })
  await writeFile(join(profile, 'package.json'), JSON.stringify({
    name: 'dsh-profile-desktop',
    private: true,
    dependencies: {},
    dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app'] } }
  }))
  await writeFile(join(profile, 'cordis.yml'), '[]\n')
  await writeFile(join(profile, 'cordis.patch.yml'), '[]\n')
  const host = new DesktopHostProcess({
    node: electron,
    entry: hostBundle,
    runtimeDir: root,
    projectDir: profile,
    dshHome: home,
    profile: 'desktop',
    environment: { DSH_DESKTOP_PATCH_FILE: await writeDesktopProductPatch(home) },
    primaryRuntime: join(home, 'unused-runtime')
  })
  try {
    const ready = await host.start()
    const url = new URL(ready.url)
    expect(url.protocol).toBe('http:')
    expect(url.hostname).toBe('127.0.0.1')
    expect(url.port).not.toBe('')
    const response = await fetch(ready.url, { redirect: 'manual' })
    expect(response.status).toBe(303)
    expect(response.headers.has('set-cookie')).toBe(true)
    const injections = JSON.stringify(ready.injections)
    expect(injections).toContain('dsh-desktop-office')
    expect(injections).toContain('dsh-ppt-composer')
    expectEnabledBoundaries(ready.enabledPlugins, 'desktop')
    expect(ready.enabledPlugins).toEqual(expectedEnabledPlugins(DESKTOP_ENABLED_PLUGINS))
  } finally {
    await host.stop()
  }
}, 120_000)

it('boots safe mode without creating the shared profile modules directory', async () => {
  await ensureHostBundle()
  const home = await mkdtemp(join(tmpdir(), 'dsh-shell-safe-'))
  temporary.push(home)
  const profile = await ensureSafeModeProfile(home, 'desktop')
  const host = new DesktopHostProcess({
    node: electron,
    entry: hostBundle,
    runtimeDir: root,
    projectDir: profile,
    dshHome: home,
    profile: SAFE_MODE_PROFILE,
    environment: { DSH_DESKTOP_PATCH_FILE: await writeDesktopProductPatch(home, 'safe') },
    primaryRuntime: join(home, 'unused-runtime')
  })
  try {
    const ready = await host.start()
    expect(new URL(ready.url).hostname).toBe('127.0.0.1')
    const manifest: unknown = JSON.parse(await readFile(join(profile, 'package.json'), 'utf8'))
    expect(manifest).toMatchObject({ dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app'] } } })
    await expect(lstat(join(home, 'profiles', 'node_modules'))).rejects.toMatchObject({ code: 'ENOENT' })
    const injections = JSON.stringify(ready.injections)
    expect(injections).not.toContain('dsh-desktop-office')
    expect(injections).not.toContain('dsh-ppt-composer')
    expectEnabledBoundaries(ready.enabledPlugins, 'safe')
    expect(ready.enabledPlugins).toEqual(expectedEnabledPlugins(SAFE_MODE_ENABLED_PLUGINS))
  } finally {
    await host.stop()
  }
}, 120_000)
