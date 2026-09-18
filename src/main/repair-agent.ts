import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { cookiePair } from './mobile/lan-mobile-bridge'
import {
  extractDshEntryFailureCause,
  extractOffendingPlugins,
  latestHarnessAttemptLogs
} from './runtime/harness-runtime'
import type { RuntimeSnapshot } from '../shared/contracts'
import { parsePluginStartupFailures, type PluginStartupFailure } from '../shared/plugin-startup-failure'

export interface RepairAgentServiceOptions {
  harnessUrl: () => string | undefined
  harnessAuthToken: () => string | undefined
  ensureHarnessReady: () => Promise<void>
  /** Harness's own home (DSH_HOME): profiles, plugins, and the patch layer the agent diagnoses. */
  workspaceDirectory: string
  /** harness.log lives in the app's log folder, outside the workspace. */
  harnessLogPath?: string
  /** The bundled read-only agent presets, the baseline for repairing a copied one. */
  shippedPresetsDirectory?: string
  locale: () => 'en' | 'zh'
  /** Evidence of the last failed normal launch; Safe Mode replaces the live runtime logs. */
  crashEvidence?: () => CrashEvidence | undefined
  appVersion?: () => string
}

export interface DiagnosticFinding {
  type:
    | 'syntax_export_mismatch'
    | 'plugin_load_failure'
    | 'symlink_eperm'
    | 'overlay_yaml_corrupt'
    | 'startup_timeout'
    | 'generic'
  summary: string
  culprit?: string
  suggestedAction: string
}

/** What the failed normal launch left behind, captured before Safe Mode starts its own Harness. */
export interface CrashEvidence {
  logs: readonly string[]
  message?: string
  failureReason?: RuntimeSnapshot['failureReason']
  pluginFailures?: readonly PluginStartupFailure[]
  /** Removable plugins plugin recovery already resolved against the profile. */
  plugins?: readonly string[]
}

/**
 * Extract relevant crash logs near the most recent launch attempt.
 * Filters out noise and highlights critical error markers.
 */
export function extractRelevantCrashLogs(logs: readonly string[] = []): string[] {
  if (!logs || logs.length === 0) return []

  // Find the index of the most recent launch
  let lastLaunchIndex = -1
  for (let i = logs.length - 1; i >= 0; i--) {
    const line = logs[i]
    if (line && (line.includes('[desktop] starting') || line.includes('[desktop] launch requested'))) {
      lastLaunchIndex = i
      break
    }
  }

  const slice = lastLaunchIndex >= 0 ? logs.slice(lastLaunchIndex) : logs.slice(-80)
  const keyMarkers = [
    'SyntaxError',
    'Error:',
    'EPERM',
    'failed to apply loader entry',
    'does not provide an export named',
    'YAMLException',
    'SIGTERM',
    'plugin failures:',
    'waiting for Harness (',
    'Harness could not start',
    'Harness stopped unexpectedly',
    'failed to prepare profile bundle'
  ]

  const extracted: string[] = []
  for (let i = 0; i < slice.length; i++) {
    const line = slice[i]
    if (!line) continue
    const isCritical = keyMarkers.some((m) => line.includes(m))
    if (isCritical) {
      // Include 1 previous context line if available and not already included
      const prev = slice[i - 1]
      if (prev && extracted[extracted.length - 1] !== prev) {
        extracted.push(prev)
      }
      extracted.push(line)
      // Include next line if available
      const next = slice[i + 1]
      if (next) {
        extracted.push(next)
        i++
      }
    }
  }

  // If filtered result is too sparse, fall back to the tail of the last launch slice
  return extracted.length >= 3 ? extracted.slice(-50) : slice.slice(-30)
}

/**
 * Offline diagnosis for the Repair Agent.
 *
 * Plugin attribution is ordered by evidence strength and shares its sources
 * with plugin recovery, so the agent never names a different culprit than the
 * recovery page: the loader's own provenance report first, then the plugins
 * recovery already resolved against the profile, and only then the loader
 * error text (Harness builds that predate the provenance report). Desktop-owned
 * failures such as the startup watchdog come from the runtime snapshot.
 */
export function analyzeCrashContext(
  logs: readonly string[] = [],
  locale: 'en' | 'zh' = 'zh',
  evidence: Omit<CrashEvidence, 'logs'> = {}
): DiagnosticFinding | undefined {
  const isZh = locale === 'zh'
  const logText = logs.join('\n')

  // 1. Plugin tree failed to load (the largest startup-failure class)
  const reported = evidence.pluginFailures?.length ? evidence.pluginFailures : pluginFailuresFromLogs(logs)
  const culprits = evidence.plugins?.length
    ? [...evidence.plugins]
    : reported.length
      // Explicit provenance is authoritative: an unknown or protected owner
      // must not be replaced by a log-derived suspect.
      ? [...new Set(reported.flatMap((failure) => failure.owner ? [failure.owner.packageName] : []))]
      : extractOffendingPlugins(logs)
  const loaderMessage = reported[0]?.message ?? extractDshEntryFailureCause(logs)
  const missingExport = (reported.map((failure) => failure.message).join('\n') || logText)
    .match(/does not provide an export named ['"]([^'"]+)['"]/)?.[1]
  if (reported.length > 0 || culprits.length > 0 || missingExport) {
    const culprit = culprits.join(', ') || undefined
    const named = culprit ? (isZh ? `插件「${culprit}」` : `Plugin "${culprit}"`) : (isZh ? '某个插件' : 'A plugin')
    const action = culprit
      ? isZh
        ? `建议在安全模式中停用或升级${named}，然后退出安全模式重启。`
        : `Disable or upgrade ${culprit} in Safe Mode, then exit Safe Mode and restart.`
      : isZh
        ? '加载器未能归属到可卸载的第三方插件，建议在安全模式中逐个停用近期新增或更新的插件后重启。'
        : 'The loader could not attribute this to a removable third-party plugin. Disable recently added or updated plugins one at a time in Safe Mode, then restart.'
    if (missingExport) {
      return {
        type: 'syntax_export_mismatch',
        culprit,
        summary: isZh
          ? `检测到${named}与当前桌面端内核接口不兼容：它引用的导出「${missingExport}」已不存在，导致插件树加载失败。`
          : `${named} is incompatible with the current runtime: it imports "${missingExport}", which no longer exists, so the plugin tree failed to load.`,
        suggestedAction: action
      }
    }
    return {
      type: 'plugin_load_failure',
      culprit,
      summary: isZh
        ? `检测到${named}加载失败，导致插件树无法启动${loaderMessage ? `：${truncate(loaderMessage)}` : '。'}`
        : `${named} failed to load, so the plugin tree could not start${loaderMessage ? `: ${truncate(loaderMessage)}` : '.'}`,
      suggestedAction: action
    }
  }

  // 2. Windows Symlink EPERM
  if (logText.includes('EPERM: operation not permitted, symlink')) {
    return {
      type: 'symlink_eperm',
      summary: isZh
        ? '检测到 Windows 跨卷软链接权限拒绝 (EPERM: symlink)。当前软件可能安装在非系统盘，且未开启 Windows 开发人员模式。'
        : 'Windows symlink creation was denied (EPERM). App may be installed on a non-system drive without Developer Mode.',
      suggestedAction: isZh
        ? '建议在 Windows 系统设置中开启【开发人员模式】，或将软件重新安装至 C 盘系统默认路径。'
        : 'Enable Developer Mode in Windows Settings, or install the app in default C: drive.'
    }
  }

  // 3. YAML corrupt
  if (logText.includes('failed to parse overlay') || logText.includes('YAMLException')) {
    return {
      type: 'overlay_yaml_corrupt',
      summary: isZh
        ? '检测到启动补丁配置文件 (cordis.patch.yml) 格式损坏或被截断。'
        : 'Profile overlay configuration (cordis.patch.yml) is corrupt or truncated.',
      suggestedAction: isZh
        ? '建议重置或清空损坏的 patch.yml 文件。'
        : 'Reset or clean the corrupt cordis.patch.yml file.'
    }
  }

  // 4. Watchdog Timeout. Without a runtime snapshot, a SIGTERM after progress
  // lines only means a timeout when the entry did not already reject: a fast
  // entry failure is also stopped with SIGTERM once "waiting for Harness" ran.
  const timedOut = evidence.failureReason === 'startup-timeout' || (
    evidence.failureReason === undefined && evidence.message === undefined &&
    logText.includes('waiting for Harness') && logText.includes('SIGTERM') &&
    !extractDshEntryFailureCause(logs)
  )
  if (timedOut) {
    return {
      type: 'startup_timeout',
      summary: isZh
        ? '检测到启动过程严重超时，被系统看门狗终止。通常由于插件在启动时执行网络大文件下载或深度全盘扫描导致。'
        : 'Startup timed out and was terminated by the watchdog. Often caused by heavy plugins downloading files or scanning disk.',
      suggestedAction: isZh
        ? '在安全模式中检查近期新增或更新的大型插件，建议先行禁用以恢复正常启动。'
        : 'Check recently added or updated plugins in Safe Mode and disable them.'
    }
  }

  // 5. Known failure without a matching rule: hand the agent the real message.
  // Heuristic stderr scraping is left out: without a captured failure these
  // logs may belong to a healthy Safe Mode Harness.
  const cause = evidence.message ?? extractDshEntryFailureCause(logs)
  if (cause) {
    return {
      type: 'generic',
      summary: isZh
        ? `未匹配到已知故障模式，启动失败原因：${truncate(cause)}`
        : `No known failure pattern matched. Startup failure: ${truncate(cause)}`,
      suggestedAction: isZh
        ? '请结合下方日志分析根因；如涉及插件，优先在安全模式中停用近期变更的插件。'
        : 'Analyze the logs below; if a plugin is involved, disable recently changed plugins in Safe Mode first.'
    }
  }

  return undefined
}

function pluginFailuresFromLogs(logs: readonly string[]): PluginStartupFailure[] {
  const failures: PluginStartupFailure[] = []
  for (const line of latestHarnessAttemptLogs(logs)) {
    if (!line.startsWith('[stderr] ')) continue
    failures.push(...(parsePluginStartupFailures(line.slice(9)) ?? []))
  }
  return failures
}

function truncate(text: string, limit = 300): string {
  const firstLine = text.trim().split(/\r?\n/)[0] ?? ''
  return firstLine.length > limit ? `${firstLine.slice(0, limit)}…` : firstLine
}

type Localized = { zh: string; en: string }

/** Where everything the agent diagnoses lives; derived once so the prompt and the playbooks agree. */
interface RepairPaths {
  home: string
  normalProfile: string
  safeProfile: string
  userPresets: string
  shippedPresets?: string
  settings: string
  sessionIndex: string
  log?: string
}

interface RepairPlaybook {
  title: Localized
  symptom: Localized
  cause: Localized
  fix: Localized
  avoid?: Localized
}

/**
 * Failure classes collected from real incidents, with the fix path for each.
 * One bilingual source, so the Chinese and English prompts cannot drift apart.
 */
function repairPlaybooks(paths: RepairPaths): RepairPlaybook[] {
  const shipped = paths.shippedPresets ?? '<内置 preset 目录 / shipped preset folder>'
  return [
    {
      title: { zh: '插件加载失败', en: 'Plugin failed to load' },
      symptom: {
        zh: '`plugin tree failed to load`、`failed to apply|import loader entry <入口> (<包名>)`，或 `does not provide an export named`。',
        en: '`plugin tree failed to load`, `failed to apply|import loader entry <entry> (<package>)`, or `does not provide an export named`.'
      },
      cause: {
        zh: '括号里的包名才是插件；外层 `cordis:include` 只是包装入口。`does not provide an export named` 表示插件引用了新版 Harness 已移除的导出。',
        en: 'The parenthesized package is the plugin; the outer `cordis:include` is only the wrapper. `does not provide an export named` means the plugin imports an export the current Harness removed.'
      },
      fix: {
        zh: '在安全模式列表里勾选该插件 →「停用所选插件」（不删除，可随时重新启用），有兼容新版时优先「升级」，然后退出安全模式重启验证。',
        en: 'In the Safe Mode list, select the plugin → "Disable selected plugins" (nothing is deleted; it can be re-enabled), or "Upgrade" when a compatible release exists; then exit Safe Mode and restart.'
      }
    },
    {
      title: { zh: '插件包不完整或损坏', en: 'Plugin package incomplete or broken' },
      symptom: {
        zh: '`node_modules/<包名>/` 下的 `cordis.patch.yml` 或入口文件报 `ENOENT`，或包自带的 patch 解析失败。',
        en: '`ENOENT` for `cordis.patch.yml` or the entry file under `node_modules/<package>/`, or the package\'s own patch fails to parse.'
      },
      cause: {
        zh: '安装中断导致盘上的包不完整。加载器在应用用户 patch 层之前就要读包自带的 patch，所以**停用对这类问题无效**。',
        en: 'An interrupted install left the package incomplete. The loader reads the package\'s own patch before the user patch layer applies, so **disabling does not help here**.'
      },
      fix: {
        zh: '卸载后重装。让用户退出安全模式，在自动出现的「启动修复」页卸载该插件（带备份），再到插件市场重新安装。',
        en: 'It must be removed and reinstalled: have the user exit Safe Mode, remove the plugin on the Startup Recovery page that appears (it is backed up), then reinstall it from the plugin market.'
      }
    },
    {
      title: { zh: 'Windows 模块回退目录 EPERM', en: 'Windows EPERM in the module fallback folder' },
      symptom: {
        zh: '`EPERM: operation not permitted, symlink`，路径在 `profiles\\node_modules\\...`，栈里有 `ensureSymlink` / `healProfilesModuleFallbackLocked`。',
        en: '`EPERM: operation not permitted, symlink` under `profiles\\node_modules\\...`, with `ensureSymlink` / `healProfilesModuleFallbackLocked` in the stack.'
      },
      cause: {
        zh: 'Harness 升级后要重建模块回退链接，旧链接被其他 DSH 进程或杀毒软件占用，替换失败。与安装盘、开发者模式无关。',
        en: 'After a Harness upgrade the module fallback links are rebuilt; an old link held by another DSH process or antivirus cannot be replaced. It is unrelated to the install drive or Developer Mode.'
      },
      fix: {
        zh: '让用户完全退出所有 DSH 窗口和后台进程（任务管理器里确认），必要时暂时放行杀毒软件对该目录的扫描，然后重新启动。仍失败就把日志原文反馈给开发团队。',
        en: 'Have the user quit every DSH window and background process (check Task Manager), temporarily exempt that folder from antivirus scanning if needed, then start again. If it still fails, report the log lines to the developers.'
      },
      avoid: {
        zh: '不要建议开启开发者模式或重装到 C 盘。',
        en: 'Do not suggest Developer Mode or reinstalling on the C: drive.'
      }
    },
    {
      title: { zh: '用户 patch 层损坏', en: 'User patch layer corrupt' },
      symptom: {
        zh: `\`YAMLException\` 或 \`failed to parse overlay\`，指向 \`${paths.normalProfile}/cordis.patch.yml\`。`,
        en: `\`YAMLException\` or \`failed to parse overlay\` pointing at \`${paths.normalProfile}/cordis.patch.yml\`.`
      },
      cause: {
        zh: '强制关机或掉电把文件截断，或手工编辑出错。',
        en: 'A forced shutdown truncated the file, or a hand edit broke it.'
      },
      fix: {
        zh: '先备份，再修正 YAML。它必须是顶层列表；无法修复时只保留能解析的条目，全都不行就改成只有一行 `[]`。',
        en: 'Back it up, then repair the YAML. It must be a top-level list; keep only the entries that parse, or reduce it to a single `[]` line.'
      }
    },
    {
      title: { zh: '启动超时', en: 'Startup timeout' },
      symptom: {
        zh: '`waiting for Harness` 之后被看门狗 `SIGTERM`，且没有更早的入口报错。',
        en: 'The watchdog `SIGTERM`s after `waiting for Harness`, with no earlier entry failure.'
      },
      cause: {
        zh: '某个插件在启动主链路里下载大文件或扫描大量数据。',
        en: 'A plugin downloads large files or scans a lot of data on the startup path.'
      },
      fix: {
        zh: '按日志里最后活动的插件判断，在安全模式里停用它后重启。',
        en: 'Find the last plugin active in the log, disable it in Safe Mode, and restart.'
      }
    },
    {
      title: { zh: '历史会话 preset「code」找不到（已改名为 ptc）', en: 'Old sessions cannot find preset "code" (renamed to ptc)' },
      symptom: {
        zh: `打开旧会话或新建会话报 \`agent-presets: preset "code" not found (available: ...)\`。日志里是 \`[harness-log] session-error <会话id>: agent-presets: preset "code" not found\`；新建会话失败只显示在界面上。日志里找不到时，按下面第 2 步查文件：\`${paths.settings}\` 的默认 preset 是 \`code\`，或者有会话记录的 preset 是 \`code\`，而内置和自建 preset 里都没有 \`code\`，即可确认。`,
        en: `Opening an old session or creating one fails with \`agent-presets: preset "code" not found (available: ...)\`. The log shows \`[harness-log] session-error <session id>: agent-presets: preset "code" not found\`; a failed new session only shows in the UI. Without a log line, confirm from files (step 2 below): the default in \`${paths.settings}\` or a session's recorded preset is \`code\`, and neither shipped nor user presets contain \`code\`.`
      },
      cause: {
        zh: `旧版的 \`code\` preset 已改名为 \`ptc\`。旧会话记录的 preset 仍是 \`code\`；\`${paths.settings}\` 里 \`agent-presets\` 的 \`default\` 也可能还是 \`code\`。`,
        en: `The old \`code\` preset was renamed \`ptc\`. Old sessions still record \`code\`, and \`default\` under \`agent-presets\` in \`${paths.settings}\` may still say \`code\`.`
      },
      fix: {
        zh: `1) 备份后把 \`${paths.settings}\` 中 \`agent-presets\` 的 \`default: code\` 改为 \`default: ptc\`。2) 查受影响的会话：在 \`${paths.sessionIndex}\` 的 json 里找 \`record.rows.agentPreset.val\` 为 \`code\` 的文件。3) 有旧会话要继续用时，把 \`${shipped}/ptc\` 整个目录复制为 \`${paths.userPresets}/code\`，并把其中 \`preset.yml\` 的 \`name\` 改为「PTC 模式（旧会话兼容）」。这样旧会话按原名解析到相同的组合。`,
        en: `1) Back up \`${paths.settings}\` and change \`default: code\` under \`agent-presets\` to \`default: ptc\`. 2) Find affected sessions: json files in \`${paths.sessionIndex}\` whose \`record.rows.agentPreset.val\` is \`code\`. 3) If old sessions must keep working, copy the whole \`${shipped}/ptc\` folder to \`${paths.userPresets}/code\` and set \`name\` in its \`preset.yml\` to "PTC mode (legacy sessions)", so they resolve to the same composition under their old id.`
      },
      avoid: {
        zh: '不要解压或改写 `sessions` 下的 `session.v3.jsonl.zstd`，它是追加写的会话日志。',
        en: 'Never decompress or rewrite `session.v3.jsonl.zstd` under `sessions`; it is an append-only session log.'
      }
    },
    {
      title: { zh: '自建 preset 的 schema 报错', en: 'Schema error in a user preset' },
      symptom: {
        zh: '`agent-presets: preset "<id>" failed to mount: ...`，原因里是 `expected … but got …`、`missing required value`、`names no plugin` 或 `not valid YAML`，通常带出错的键路径。日志里以 `[harness-log]` 开头；日志里没有时，请用户从界面复制报错，或者逐个检查自建 preset 的 `agent.cordis.yml` 能否解析。',
        en: '`agent-presets: preset "<id>" failed to mount: ...` with `expected … but got …`, `missing required value`, `names no plugin`, or `not valid YAML`, usually naming the key path. In the log it starts with `[harness-log]`; without it, ask the user to copy the error from the UI, or check that each user preset\'s `agent.cordis.yml` parses.'
      },
      cause: {
        zh: `\`${paths.userPresets}/<id>/agent.cordis.yml\` 多半是从旧版内置 preset 复制来的；Harness 升级后插件配置的键改名或类型变化。`,
        en: `\`${paths.userPresets}/<id>/agent.cordis.yml\` was usually copied from an older shipped preset; a Harness upgrade renamed a plugin config key or changed its type.`
      },
      fix: {
        zh: `找出它的来源（通常是 \`${shipped}\` 下的 \`standard\` 或 \`ptc\`），以当前内置版本为基准比对，只改报错指到的键（改名、改类型或补必填项）。先备份原文件，改完确认 YAML 能解析。`,
        en: `Find what it was copied from (usually \`standard\` or \`ptc\` under \`${shipped}\`), compare against the current shipped version, and change only the keys the error names (rename, retype, or add the required value). Back up first and confirm the YAML parses afterwards.`
      },
      avoid: {
        zh: '不要删除整个 preset 目录，也不要修改内置 preset。',
        en: 'Do not delete the preset folder or edit a shipped preset.'
      }
    }
  ]
}

/**
 * The Repair Agent's system context, sent ahead of the user's first request.
 * Built from real incident data: the offline diagnosis anchors the agent, the
 * directory map keeps it off the Safe Mode profile it runs in, and the full
 * log is left for it to read rather than pasted in.
 */
export function buildSystemRepairPrompt(options: {
  locale: 'en' | 'zh'
  platform: string
  arch: string
  nodeVersion: string
  desktopVersion: string
  /** Harness home (DSH_HOME), the session's workspace. */
  workspaceDirectory?: string
  harnessLogPath?: string
  /** The bundled read-only presets, the baseline for repairing a copied one. */
  shippedPresetsDirectory?: string
  finding?: DiagnosticFinding
  logsSample: string[]
  /** Whether a failed normal launch was captured; without one the user entered Safe Mode on purpose. */
  crashCaptured?: boolean
}): string {
  const zh = options.locale === 'zh'
  const t = (text: Localized): string => (zh ? text.zh : text.en)
  const home = options.workspaceDirectory ?? (zh ? '<Harness 数据目录>' : '<Harness home>')
  const paths: RepairPaths = {
    home,
    normalProfile: join(home, 'profiles', 'web'),
    safeProfile: join(home, 'profiles', 'desktop-safe-mode'),
    userPresets: join(home, '.agent-presets'),
    shippedPresets: options.shippedPresetsDirectory,
    settings: join(home, 'settings.yaml'),
    sessionIndex: join(home, 'storages', 'session_projcache', 'sessions'),
    log: options.harnessLogPath
  }
  const log = paths.log ?? 'harness.log'
  const excerpt = options.logsSample.slice(-20)

  const finding = options.finding
    ? zh
      ? `**离线初步诊断**：${options.finding.summary}\n建议：${options.finding.suggestedAction}`
      : `**Offline diagnosis**: ${options.finding.summary}\nSuggested: ${options.finding.suggestedAction}`
    : zh ? '**离线初步诊断**：未匹配到已知故障。' : '**Offline diagnosis**: no known failure matched.'
  const evidence = options.crashCaptured === false
    ? zh
      ? '本次没有捕获到失败的正常启动：用户可能是主动进入安全模式。先问清用户遇到的具体现象，再去日志里找对应时间段。'
      : 'No failed normal launch was captured: the user may have entered Safe Mode on purpose. Ask what they saw first, then find that time in the log.'
    : excerpt.length > 0
      ? `${zh ? '失败启动的关键日志摘录（仅作线索，结论以日志原文为准）' : 'Key lines from the failed launch (a lead only; conclude from the log itself)'}:\n\`\`\`\n${excerpt.join('\n')}\n\`\`\``
      : zh ? '未能从失败启动中抽出关键日志行，请直接读日志。' : 'No key lines could be extracted from the failed launch; read the log directly.'

  const playbooks = repairPlaybooks(paths).map((playbook, index) => [
    `${index + 1}. **${t(playbook.title)}**`,
    `   - ${zh ? '特征' : 'Symptom'}：${t(playbook.symptom)}`,
    `   - ${zh ? '原因' : 'Cause'}：${t(playbook.cause)}`,
    `   - ${zh ? '处理' : 'Fix'}：${t(playbook.fix)}`,
    ...(playbook.avoid ? [`   - ${zh ? '禁止' : 'Avoid'}：${t(playbook.avoid)}`] : [])
  ].join('\n')).join('\n')

  if (zh) {
    return `你是 DSH Desktop 的系统维修诊断专家（Repair Agent），运行在安全模式中，帮助用户排查启动失败、插件和会话异常。

## 环境
- 系统：${options.platform} (${options.arch})；Node.js ${options.nodeVersion}；DSH Desktop ${options.desktopVersion}
- 当前状态：安全模式。第三方插件全部未加载，你所在的这个 Harness 不是出问题的那个。

## 目录（先分清再动手）
- Harness 数据目录（当前会话的工作区）：\`${paths.home}\`
- **正常启动的 profile（诊断和修复的对象）**：\`${paths.normalProfile}\`
  - \`package.json\`：\`dsh.profile.bundles\` 是启用的插件列表，由插件安装记录在每次启动时重新生成，不要手改。
  - \`cordis.patch.yml\`：用户 patch 层。停用插件就是在这里给它的加载行写 \`- id: <行id>\` 和 \`  disabled: true\`。
  - \`.dsh-market/state.json\`：插件市场状态，\`disabled\` 是已停用插件列表。
  - \`node_modules/<包名>\`：插件包，多数是指向插件安装目录的链接。
- **安全模式 profile**：\`${paths.safeProfile}\`。你当前就运行在这里，它由桌面端每次重建。不要修改它，也不要把这里的现象当成正常启动的问题。
- 全局设置：\`${paths.settings}\`；自建 preset：\`${paths.userPresets}/<id>/\`${paths.shippedPresets ? `；内置 preset（只读，作比对基准）：\`${paths.shippedPresets}\`` : ''}
- 会话日志：\`${join(paths.home, 'sessions')}\`（zstd 压缩的追加日志，禁止改写）；会话摘要：\`${paths.sessionIndex}\`
- 恢复备份：\`${join(paths.home, 'recovery')}\`

## 日志
- 完整启动日志：\`${log}\`。它跨多次启动追加写入，末尾通常是安全模式自己的启动。
- 读法：不要整份读入。用 grep/tail 找最后一个 \`[desktop] launch requested (safe mode)\` 之前、最近一次 \`[desktop] launch requested (web profile)\` 开始的那一段，那才是失败的正常启动。
- \`[harness-log]\` 开头的行是 Harness 运行期的警告和错误，\`[harness-log] session-error\` 是会话打开失败。某次启动里如果没有 \`[harness-log] info dsh-desktop-log-bridge\` 这一行，说明那时还不记录运行期错误，那段日志里没有错误不代表没出错。
${finding}
${evidence}

## 已知问题与处理路径
0. 如果离线诊断点名了插件，这个名字来自加载器的归属信息或启动修复的解析结果，以它为准，不要根据堆栈另行猜测。
${playbooks}

## 工作方式
- 先读证据再下结论：结论必须引用日志原文或文件内容。
- 修改任何文件前，先说明要改哪个文件、改什么、怎么回滚，等用户明确确认。改之前在同目录备份为 \`<原文件名>.bak-<时间>\`。
- 只改正常 profile 和上面列出的用户数据。不改安全模式 profile、内置 preset、会话日志，也不改 \`node_modules\` 里的包内容。
- 插件的停用、升级、卸载用界面完成：安全模式里「停用所选插件」（可重新启用）、「升级」；包损坏的插件要在启动修复页卸载，或者到插件市场卸载。
- 处理完请用户「退出安全模式并重启」验证。

## 回复规范
1. 先用一两句话说结论：是哪个插件、哪个文件或哪项设置导致的。
2. 再给当前就能执行的最小可逆操作，按步骤写。
3. 找不到确切原因时直说，并告诉用户还需要哪些信息。`
  }

  return `You are the DSH Desktop Repair Agent, running in Safe Mode to help the user diagnose startup failures, plugin problems, and broken sessions.

## Environment
- OS: ${options.platform} (${options.arch}); Node.js ${options.nodeVersion}; DSH Desktop ${options.desktopVersion}
- Status: Safe Mode. No third-party plugin is loaded; the Harness you run in is not the one that failed.

## Directories (tell them apart before acting)
- Harness home (this session's workspace): \`${paths.home}\`
- **Normal profile (what you diagnose and repair)**: \`${paths.normalProfile}\`
  - \`package.json\`: \`dsh.profile.bundles\` lists enabled plugins. It is regenerated from the plugin install records on every launch; do not edit it by hand.
  - \`cordis.patch.yml\`: the user patch layer. Disabling a plugin writes \`- id: <row id>\` and \`  disabled: true\` for its loader rows here.
  - \`.dsh-market/state.json\`: plugin market state; \`disabled\` lists disabled plugins.
  - \`node_modules/<package>\`: plugin packages, mostly links into the plugin install folders.
- **Safe Mode profile**: \`${paths.safeProfile}\`. You are running here, and Desktop rebuilds it on every Safe Mode launch. Do not edit it, and do not mistake what you see here for the normal launch's problem.
- Global settings: \`${paths.settings}\`; user presets: \`${paths.userPresets}/<id>/\`${paths.shippedPresets ? `; shipped presets (read-only baseline): \`${paths.shippedPresets}\`` : ''}
- Session logs: \`${join(paths.home, 'sessions')}\` (zstd-compressed, append-only; never rewrite); session summaries: \`${paths.sessionIndex}\`
- Recovery backups: \`${join(paths.home, 'recovery')}\`

## Logs
- Full startup log: \`${log}\`. It accumulates across launches; its tail is usually Safe Mode's own launch.
- Do not read it whole. Use grep/tail to find the most recent \`[desktop] launch requested (web profile)\` before the last \`[desktop] launch requested (safe mode)\`; that section is the failed normal launch.
- Lines starting \`[harness-log]\` are Harness runtime warnings and errors; \`[harness-log] session-error\` is a session that failed to open. A launch without the \`[harness-log] info dsh-desktop-log-bridge\` line predates this recording, so a quiet log there proves nothing.
${finding}
${evidence}

## Known failures and fixes
0. If the offline diagnosis names a plugin, that name comes from loader provenance or startup recovery; treat it as authoritative instead of re-deriving it from stack traces.
${playbooks}

## How to work
- Read the evidence before concluding, and quote the log line or file content your conclusion rests on.
- Before changing any file, say which file, what change, and how to roll back, and wait for the user's explicit confirmation. Back the file up first as \`<name>.bak-<time>\` in the same folder.
- Change only the normal profile and the user data listed above. Never edit the Safe Mode profile, shipped presets, session logs, or package contents under \`node_modules\`.
- Disable, upgrade, or remove plugins through the UI: "Disable selected plugins" (re-enable any time) and "Upgrade" in Safe Mode; a broken package is removed on the Startup Recovery page or in the plugin market.
- When done, ask the user to "Exit Safe Mode and restart" to verify.

## Reply style
1. Lead with a one- or two-sentence conclusion: which plugin, file, or setting caused it.
2. Then give the smallest reversible steps they can take now.
3. If you cannot find the exact cause, say so and ask for what you still need.`
}

export class RepairAgentService {
  private harnessCookie?: { base: string; cookie: string }
  private activeSessionId?: string
  /** Launch token of the Harness process that owns `activeSessionId`. */
  private sessionOwner?: string
  /** Sessions whose first turn already carried the diagnosis. */
  private readonly briefedSessions = new Set<string>()

  constructor(private readonly options: RepairAgentServiceOptions) {}

  private async harnessSession(base: string): Promise<string | undefined> {
    if (this.harnessCookie?.base === base) return this.harnessCookie.cookie
    const token = this.options.harnessAuthToken?.()
    if (token === undefined) return undefined
    const url = new URL('/', base)
    url.searchParams.set('token', token)
    try {
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'manual',
        signal: AbortSignal.timeout(10_000)
      })
      const cookie = cookiePair(response.headers.getSetCookie())
      if (cookie === undefined) return undefined
      this.harnessCookie = { base, cookie }
      return cookie
    } catch (err) {
      console.warn('[repair-agent] harnessSession auth handshake failed', err)
      return undefined
    }
  }

  private async harnessFetch(url: URL, init: RequestInit, base: string): Promise<Response> {
    const send = async (cookie: string | undefined): Promise<Response> =>
      fetch(url, {
        ...init,
        headers: { ...init.headers, ...(cookie === undefined ? {} : { cookie }) }
      })

    let response: Response
    try {
      response = await send(await this.harnessSession(base))
      if (response.status === 401) {
        this.harnessCookie = undefined
        const retry = await this.harnessSession(base)
        if (retry !== undefined) response = await send(retry)
      }
      return response
    } catch (err: any) {
      const isConnectionRefused = err?.cause?.code === 'ECONNREFUSED' || err?.code === 'ECONNREFUSED'
      const isTimeout = err?.cause?.code === 'ETIMEDOUT' || err?.name === 'TimeoutError'
      const isZh = this.options.locale() === 'zh'
      let message = err instanceof Error ? err.message : String(err)

      if (isConnectionRefused) {
        message = isZh
          ? '安全模式核心尚未启动就绪或本地端口被阻断 (ECONNREFUSED)。请稍候片刻重试。'
          : 'Safe mode Harness core is not ready yet (ECONNREFUSED). Please wait a moment and retry.'
      } else if (isTimeout) {
        message = isZh
          ? '与安全模式核心通信超时。'
          : 'Communication with Safe mode Harness timed out.'
      }
      throw new Error(message)
    }
  }

  private async invokeHarness(
    endpoint: string,
    args: Record<string, unknown>
  ): Promise<any> {
    const base = this.options.harnessUrl()
    if (!base) throw new Error('Harness is not ready.')
    const rpcId = randomUUID()
    const response = await this.harnessFetch(
      new URL(`/api/${endpoint}`, base),
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'client-request', rpcId, method: endpoint, payload: { args } }),
        signal: AbortSignal.timeout(30_000)
      },
      base
    )
    if (!response.ok) {
      throw new Error(`Harness RPC ${endpoint} failed with HTTP ${response.status}`)
    }
    const envelope = (await response.json()) as {
      rpcId?: unknown
      result?: { ok?: unknown; value?: unknown; error?: { message?: unknown } }
      payload?: any
      error?: any
    }
    if (envelope.result?.ok !== true && envelope.result?.error) {
      const message = envelope.result.error.message || 'Harness rejected the request.'
      throw new Error(String(message))
    }
    return envelope.result?.value ?? envelope.payload?.result ?? envelope.payload
  }

  /**
   * The offline diagnosis and system prompt, built only from the failed normal
   * launch. Without one the user entered Safe Mode on purpose, and Safe Mode's
   * own healthy logs would only mislead the diagnosis.
   */
  private repairContext(): { finding?: DiagnosticFinding; systemRepairPrompt: string } {
    const locale = this.options.locale()
    const evidence = this.options.crashEvidence?.()
    const rawLogs = evidence?.logs ?? []
    const finding = evidence ? analyzeCrashContext(rawLogs, locale, evidence) : undefined
    const systemRepairPrompt = buildSystemRepairPrompt({
      locale,
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      desktopVersion: this.options.appVersion?.() || 'unknown',
      workspaceDirectory: this.options.workspaceDirectory,
      harnessLogPath: this.options.harnessLogPath,
      shippedPresetsDirectory: this.options.shippedPresetsDirectory,
      finding,
      logsSample: extractRelevantCrashLogs(rawLogs),
      crashCaptured: evidence !== undefined
    })
    return { finding, systemRepairPrompt }
  }

  /**
   * The Repair Agent session to talk to, creating one when needed.
   * @param options.fresh - always start a new session. Each Repair Agent card
   * click is a new diagnosis, and must not land in the previous conversation.
   */
  public async initSession(options: { fresh?: boolean } = {}): Promise<{
    ok: boolean
    sessionId?: string
    diagnosticFinding?: DiagnosticFinding
    error?: string
  }> {
    const isZh = this.options.locale() === 'zh'
    const { finding } = this.repairContext()

    try {
      if (!this.options.harnessUrl()) {
        await this.options.ensureHarnessReady()
      }
      const base = this.options.harnessUrl()
      if (!base) {
        return {
          ok: false,
          diagnosticFinding: finding,
          error: isZh ? '安全模式核心服务未能成功拉起。' : 'Failed to initialize Safe Mode core.'
        }
      }

      // A session belongs to the Harness process that created it; a relaunch
      // (new launch token) needs a fresh one.
      const owner = this.options.harnessAuthToken()
      if (options.fresh || (this.activeSessionId && this.sessionOwner !== owner)) {
        this.activeSessionId = undefined
      }
      if (!this.activeSessionId) {
        const workspace = await this.invokeHarness('workspace/create', {
          request: {
            path: this.options.workspaceDirectory,
            title: isZh ? '🛠️ Harness 智能诊断系统' : '🛠️ Harness Repair Agent'
          }
        })
        const workspaceId = workspace?.workspaceId ?? workspace?.workspace?.workspaceId

        // Use default preset so it inherits the working model route that answers in Harness
        const session = await this.invokeHarness('session/create', {
          request: { workspaceId }
        })
        const sessionId = session?.sessionId ?? session?.session?.sessionId
        if (!sessionId) throw new Error('Harness did not return a session id')
        this.activeSessionId = sessionId
        this.sessionOwner = owner
        await this.selectDefaultModel(sessionId)
      }

      return { ok: true, sessionId: this.activeSessionId, diagnosticFinding: finding }
    } catch (err) {
      return {
        ok: false,
        diagnosticFinding: finding,
        error: err instanceof Error ? err.message : String(err)
      }
    }
  }

  /** Select the catalog's current model so the session can answer immediately. */
  private async selectDefaultModel(sessionId: string): Promise<void> {
    let modelCatalog: any
    try {
      modelCatalog = await this.invokeHarness('session/modelCatalog', {})
    } catch (err) {
      console.warn('[repair-agent] could not load model catalog', err)
      return
    }
    const defaultEntry =
      modelCatalog?.current ||
      modelCatalog?.default ||
      (modelCatalog?.groups?.[0]?.models?.[0]
        ? { provider: modelCatalog.groups[0].id, model: modelCatalog.groups[0].models[0].id }
        : null)
    if (!defaultEntry?.provider || !defaultEntry?.model) return
    try {
      await this.invokeHarness('session/selectModel', {
        request: {
          sessionId,
          provider: defaultEntry.provider,
          model: defaultEntry.model,
          ...(defaultEntry.reasoningEffort ? { reasoningEffort: defaultEntry.reasoningEffort } : {})
        }
      })
    } catch (e) {
      console.warn('[repair-agent] auto selectModel failed', e)
    }
  }

  public async sendPrompt(sessionId: string, text: string): Promise<{ ok: boolean; error?: string }> {
    try {
      let promptText = (text || '').trim()
      if (promptText.length === 0) {
        return { ok: false, error: 'Cannot send empty prompt.' }
      }
      // The first turn carries the diagnosis, so the page only sends the request.
      const briefing = !this.briefedSessions.has(sessionId)
      if (briefing) {
        const { systemRepairPrompt } = this.repairContext()
        const [contextLabel, requestLabel] = this.options.locale() === 'zh'
          ? ['[系统背景与诊断事实]', '[用户输入]']
          : ['[System Context]', '[User Request]']
        promptText = `${contextLabel}\n${systemRepairPrompt}\n\n${requestLabel}\n${promptText}`
      }

      await this.invokeHarness('session/prompt', {
        request: {
          requestId: randomUUID(),
          sessionId,
          mode: 'queue',
          content: [{ type: 'text', text: promptText }],
          clientTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      })
      if (briefing) this.briefedSessions.add(sessionId)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  }

  public dispose(): void {
    this.harnessCookie = undefined
    this.activeSessionId = undefined
    this.sessionOwner = undefined
    this.briefedSessions.clear()
  }
}
