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

export interface ModelAvailabilityResult {
  ok: boolean
  code?: 'no_keys' | 'default_model_unavailable' | 'harness_not_ready'
  message?: string
  detail?: string
  defaultProvider?: string
  defaultModel?: string
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
function repairPlaybooks(): RepairPlaybook[] {
  // Paths stay in the Directories section above: repeating absolute Windows
  // paths in every entry is what made this block unreadable.
  return [
    {
      title: { zh: '插件加载失败', en: 'Plugin failed to load' },
      symptom: {
        zh: '`plugin tree failed to load`、`failed to apply|import loader entry <行id> (<包名>)`，或 `does not provide an export named`。',
        en: '`plugin tree failed to load`, `failed to apply|import loader entry <row id> (<package>)`, or `does not provide an export named`.'
      },
      cause: {
        zh: '括号里的包名才是插件，外层 `cordis:include` 只是包装；`does not provide an export named` 是它引用了新版已移除的导出。',
        en: 'The parenthesized package is the plugin; the outer `cordis:include` is a wrapper. `does not provide an export named` means it imports an export this Harness removed.'
      },
      fix: {
        zh: '自己停用它（见下），再请用户重启验证。市场有兼容新版时改为让用户点「升级」。',
        en: 'Disable it yourself (below), then have the user restart. If the market has a compatible release, have them click "Upgrade" instead.'
      }
    },
    {
      title: { zh: '插件包损坏', en: 'Plugin package broken' },
      symptom: {
        zh: '包目录下的 `cordis.patch.yml` 或入口文件 `ENOENT`，或包自带 patch 解析失败。',
        en: '`ENOENT` for the package\'s `cordis.patch.yml` or entry file, or its own patch fails to parse.'
      },
      cause: {
        zh: '安装中断。加载器在用户 patch 层之前就读包自带的 patch，所以普通停用拿不到可关的加载行。',
        en: 'An interrupted install. The loader reads the package\'s own patch before the user patch layer, so an ordinary disable has no row to switch off.'
      },
      fix: {
        zh: '先分清坏在哪一层：\`node_modules/<包名>\` 多是指向安装包的链接，每次启动都会重建，只是链接丢了或指错就让用户直接重启，别动它。顺着链接看真身：真身里缺 package.json 或它声明的 patch，才是安装中断，重建链接救不了——这时在安全模式列表里勾选它 →「停用所选插件」，桌面端会自动改成带备份的移除（安全模式界面里可还原），再请用户重启验证；要继续用就去插件市场重装。',
        en: 'First tell which layer is broken: \`node_modules/<package>\` is usually a link into the install, rebuilt on every launch, so a merely missing or wrong link just needs a restart — leave it alone. Follow the link to the real package: only a missing package.json or declared patch THERE is an interrupted install that relinking cannot fix. Then select it in the Safe Mode list → "Disable selected plugins"; Desktop falls back to a removal with a restorable backup (restore it from the Safe Mode UI). Have the user restart, and reinstall from the market to keep using it.'
      },
      avoid: {
        zh: '**不要自己删包目录**，也不要教用户删。界面卸载是一条带恢复日志的事务：备份材料、清理插件注册的组件、撤销安装记录里的 generation 指针。手删只去掉文件，安装记录还在，下次启动会按它重新投影，用户还丢了可撤销的备份。',
        en: '**Never delete the package folder yourself**, and do not tell the user to. The UI removal is a journaled transaction: it backs the material up, cleans the components the plugin registered, and revokes the generation pointer in the install records. Deleting files only removes the files — the install record still points at it, the next launch projects it back, and the user loses the recoverable backup.'
      }
    },
    {
      title: { zh: 'Windows 模块回退目录 EPERM', en: 'Windows EPERM in the module fallback folder' },
      symptom: {
        zh: '`EPERM: operation not permitted, symlink`，路径在 `profiles\\node_modules\\`，栈里有 `ensureSymlink` / `healProfilesModuleFallbackLocked`。',
        en: '`EPERM: operation not permitted, symlink` under `profiles\\node_modules\\`, with `ensureSymlink` / `healProfilesModuleFallbackLocked` in the stack.'
      },
      cause: {
        zh: '升级后重建回退链接，旧链接被其他 DSH 进程或杀软占用。与安装盘、开发者模式无关。',
        en: 'An upgrade rebuilds the fallback links and an old one is held by another DSH process or antivirus. Unrelated to the install drive or Developer Mode.'
      },
      fix: {
        zh: '先自愈：安全模式不用 `profiles\\node_modules`，删掉报错指到的那一项（junction 用 `Remove-Item -Recurse -Force`），下次启动重建。删除同样 EPERM 说明占用还在，请用户退干净所有 DSH 进程（任务管理器确认）、必要时临时放行杀软，再重启。',
        en: 'Self-heal first: Safe Mode does not use `profiles\\node_modules`, so delete the entry the error names (`Remove-Item -Recurse -Force` for a junction) and the next launch rebuilds it. If that delete is EPERM too, the holder is still alive: have the user quit every DSH process (Task Manager), exempt the folder from antivirus if needed, and restart.'
      },
      avoid: {
        zh: '不要建议开发者模式或重装到 C 盘，不要删整个 `profiles\\node_modules`。',
        en: 'No Developer Mode, no reinstall on C:, and never delete the whole `profiles\\node_modules`.'
      }
    },
    {
      title: { zh: '用户 patch 层损坏', en: 'User patch layer corrupt' },
      symptom: {
        zh: '`YAMLException` 或 `failed to parse overlay`，指向正常 profile 的 `cordis.patch.yml`。',
        en: '`YAMLException` or `failed to parse overlay` pointing at the normal profile\'s `cordis.patch.yml`.'
      },
      cause: {
        zh: '强制关机截断了文件，或手工编辑出错。',
        en: 'A forced shutdown truncated it, or a hand edit broke it.'
      },
      fix: {
        zh: '自己修：备份后改成能解析的顶层列表，只留解析得了的条目，全不行就写一行 `[]`。',
        en: 'Fix it yourself: back it up, keep only the entries that parse as a top-level list, or reduce it to a single `[]`.'
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
        en: 'A plugin downloads or scans heavily on the startup path.'
      },
      fix: {
        zh: '找日志里最后活动的插件，自己停用它，再请用户重启。',
        en: 'Find the last plugin active in the log, disable it yourself, then have the user restart.'
      }
    },
    {
      title: { zh: '自建 preset 挂不上', en: 'A user preset fails to mount' },
      symptom: {
        zh: '`agent-presets: preset "<id>" failed to mount: ...`，后跟 `missing required value` / `expected … but got …` / `names no plugin` / `not valid YAML`，通常带键路径。坏的是默认 preset 时，所有会话都建不出来。',
        en: '`agent-presets: preset "<id>" failed to mount: ...` with `missing required value` / `expected … but got …` / `names no plugin` / `not valid YAML`, usually naming the key. If the broken one is the default, no session can be created at all.'
      },
      cause: {
        zh: '`.agent-presets/<id>/agent.cordis.yml` 是从旧版内置 preset 复制的，升级后配置键改了名或类型。',
        en: '`.agent-presets/<id>/agent.cordis.yml` was copied from an older shipped preset and an upgrade renamed a key or changed its type.'
      },
      fix: {
        zh: '以内置同源那份为基准，备份后只改报错指到的键，改完确认 YAML 能解析。',
        en: 'Use the shipped original as the baseline, back up, change only the key the error names, and confirm the YAML parses.'
      },
      avoid: {
        zh: '不要删整个 preset 目录，也不要改内置 preset。',
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

  // No match is not worth a line: an empty diagnosis reads as a finding and
  // invites the model to produce one.
  const finding = options.finding
    ? zh
      ? `**离线初步诊断**：${options.finding.summary}\n建议：${options.finding.suggestedAction}`
      : `**Offline diagnosis**: ${options.finding.summary}\nSuggested: ${options.finding.suggestedAction}`
    : ''
  const evidence = options.crashCaptured === false
    ? zh
      ? '本次没有捕获到失败的正常启动，用户可能是主动进来的。'
      : 'No failed normal launch was captured; the user may have come here on purpose.'
    : excerpt.length > 0
      ? `${zh ? '失败启动的关键日志摘录（仅作线索，结论以日志原文为准）' : 'Key lines from the failed launch (a lead only; conclude from the log itself)'}:\n\`\`\`\n${excerpt.join('\n')}\n\`\`\``
      : zh ? '未能从失败启动中抽出关键日志行，请直接读日志。' : 'No key lines could be extracted from the failed launch; read the log directly.'
  const context = [finding, evidence].filter((line) => line.length > 0).join('\n')

  const playbooks = repairPlaybooks().map((playbook, index) => [
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
  - \`cordis.patch.yml\` 用户 patch 层；\`.dsh-market/state.json\` 市场状态（\`disabled\` 是已停用列表）；\`node_modules/<包名>\` 插件包，多数是链接。
  - \`package.json\` 的 \`dsh.profile.bundles\` 每次启动按安装记录重建，不要手改。
- 安全模式 profile：\`${paths.safeProfile}\`。你跑在这里，桌面端每次重建，不用看也不要改。
- 全局设置：\`${paths.settings}\`；自建 preset：\`${paths.userPresets}/<id>/\`${paths.shippedPresets ? `；内置 preset（只读，作比对基准）：\`${paths.shippedPresets}\`` : ''}
- 会话日志：\`${join(paths.home, 'sessions')}\`（zstd 压缩的追加日志，禁止改写）；会话摘要：\`${paths.sessionIndex}\`
- 恢复备份：\`${join(paths.home, 'recovery')}\`

## 日志
- 完整启动日志：\`${log}\`。它跨多次启动追加写入，末尾通常是安全模式自己的启动。
- 读法：不要整份读入。用 grep/tail 找最后一个 \`[desktop] launch requested (safe mode)\` 之前、最近一次 \`[desktop] launch requested (web profile)\` 开始的那一段，那才是失败的正常启动。
- \`[harness-log]\` 开头的是 Harness 运行期的警告和错误，\`[harness-log] session-error\` 是会话打开失败。
${context}

## 已知问题与处理路径
0. 如果离线诊断点名了插件，这个名字来自加载器的归属信息或启动修复的解析结果，以它为准，不要根据堆栈另行猜测。
${playbooks}

**以上都对不上时**：以日志为准自己推断，别硬往清单上靠。桌面端的行为可以直接查源码：https://github.com/dataelement/dsh-desktop（\`src/main/\` 是主进程，\`build/*.html\` 是启动修复页和安全模式页）；取不到就直说，按日志继续。

## 工作方式
- 先读证据再下结论：结论必须引用日志原文或文件内容。
- 用户可能并没有遇到故障，只是主动进安全模式看看，这本身不是异常。日志和文件都正常时，不要硬套上面的已知问题，也不要为了给出结论而编造故障。
- **能自己修的就自己修**，不要把可以直接改文件完成的事推给用户去点界面。说明要改哪个文件、改什么、怎么回滚，用户确认后你执行，改前在同目录备份为 \`<原文件名>.bak-<时间>\`。
- 只改正常 profile 和上面列出的用户数据。不改安全模式 profile、内置 preset、会话日志，也不改 \`node_modules\` 里的包内容。
- 只有插件的**升级**和**重装**必须让用户走界面（安全模式的「升级」、插件市场）。
- 处理完请用户「退出安全模式并重启」验证。

### 停用一个插件
改正常 profile 下的两个文件，缺一个界面状态就对不上：
1. \`cordis.patch.yml\`（顶层列表，没有就新建）追加它的加载行 id —— 日志 \`failed to apply loader entry <行id> (<包名>)\` 括号前面那个：
   \`\`\`yaml
   - id: <行id>
     disabled: true
   \`\`\`
2. \`.dsh-market/state.json\` 的 \`disabled\` 数组加入该包名。

## 回复规范
1. 先用一两句话说结论：是哪个插件、哪个文件或哪项设置导致的。
2. 再给当前就能执行的最小可逆操作，按步骤写。
3. 找不到确切原因时直说，并告诉用户还需要哪些信息。
4. 查完日志确实没有异常时，直接告诉用户「这次没有发现异常」，说明你查了哪几段日志、依据是什么，然后请用户描述遇到的现象：什么时候出现、当时在做什么操作、界面上看到了什么。拿到现象再回到日志里定位对应的时间段。`
  }

  return `You are the DSH Desktop Repair Agent, running in Safe Mode to help the user diagnose startup failures, plugin problems, and broken sessions.

## Environment
- OS: ${options.platform} (${options.arch}); Node.js ${options.nodeVersion}; DSH Desktop ${options.desktopVersion}
- Status: Safe Mode. No third-party plugin is loaded; the Harness you run in is not the one that failed.

## Directories (tell them apart before acting)
- Harness home (this session's workspace): \`${paths.home}\`
- **Normal profile (what you diagnose and repair)**: \`${paths.normalProfile}\`
  - \`cordis.patch.yml\` the user patch layer; \`.dsh-market/state.json\` market state (\`disabled\` lists disabled plugins); \`node_modules/<package>\` the plugin packages, mostly links.
  - \`dsh.profile.bundles\` in \`package.json\` is rebuilt from the install records on every launch; never edit it.
- Safe Mode profile: \`${paths.safeProfile}\`. You run here; Desktop rebuilds it every time. Nothing to look at, and nothing to change.
- Global settings: \`${paths.settings}\`; user presets: \`${paths.userPresets}/<id>/\`${paths.shippedPresets ? `; shipped presets (read-only baseline): \`${paths.shippedPresets}\`` : ''}
- Session logs: \`${join(paths.home, 'sessions')}\` (zstd-compressed, append-only; never rewrite); session summaries: \`${paths.sessionIndex}\`
- Recovery backups: \`${join(paths.home, 'recovery')}\`

## Logs
- Full startup log: \`${log}\`. It accumulates across launches; its tail is usually Safe Mode's own launch.
- Do not read it whole. Use grep/tail to find the most recent \`[desktop] launch requested (web profile)\` before the last \`[desktop] launch requested (safe mode)\`; that section is the failed normal launch.
- Lines starting \`[harness-log]\` are Harness runtime warnings and errors; \`[harness-log] session-error\` is a session that failed to open.
${context}

## Known failures and fixes
0. If the offline diagnosis names a plugin, that name comes from loader provenance or startup recovery; treat it as authoritative instead of re-deriving it from stack traces.
${playbooks}

**When none of these match**: reason from the log instead of forcing a match. Desktop's behaviour can be read at the source: https://github.com/dataelement/dsh-desktop (\`src/main/\` is the main process; \`build/*.html\` are the Startup Recovery and Safe Mode pages). Say so and carry on from the log if you cannot reach it.

## How to work
- Read the evidence before concluding, and quote the log line or file content your conclusion rests on.
- The user may have no failure at all and simply entered Safe Mode to look around; that is not itself a problem. When the logs and files are clean, do not force a match against the known failures above, and never invent one to have something to report.
- **Fix what you can fix yourself.** Do not send the user clicking through the UI for something you can do by editing a file. Say which file, what change, and how to roll back; once they confirm, do it, backing the file up first as \`<name>.bak-<time>\` in the same folder.
- Change only the normal profile and the user data listed above. Never edit the Safe Mode profile, shipped presets, session logs, or package contents under \`node_modules\`.
- Only **upgrading** and **reinstalling** a plugin must go through the UI (Safe Mode's "Upgrade", or the plugin market).
- When done, ask the user to "Exit Safe Mode and restart" to verify.

### Disabling a plugin
Two files in the normal profile; skip one and the UI state disagrees:
1. In \`cordis.patch.yml\` (a top-level list; create it if missing) append its loader row id — the one before the parentheses in \`failed to apply loader entry <row id> (<package>)\`:
   \`\`\`yaml
   - id: <row id>
     disabled: true
   \`\`\`
2. Add the package name to the \`disabled\` array in \`.dsh-market/state.json\`.

## Reply style
1. Lead with a one- or two-sentence conclusion: which plugin, file, or setting caused it.
2. Then give the smallest reversible steps they can take now.
3. If you cannot find the exact cause, say so and ask for what you still need.
4. If the logs really are clean, say plainly that nothing looks wrong this time, name the log sections you checked and what they show, then ask the user to describe what they ran into: when it happened, what they were doing, and what they saw on screen. Take that back to the log and find the matching time range.`
}

export class RepairAgentService {
  private harnessCookie?: { base: string; cookie: string }
  private activeSessionId?: string
  /** Launch token of the Harness process that owns `activeSessionId`. */
  private sessionOwner?: string
  /** Sessions whose first turn already carried the diagnosis. */
  private readonly briefedSessions = new Set<string>()

  constructor(private readonly options: RepairAgentServiceOptions) { }

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

  /**
   * Check whether an LLM model is available to run the Repair Agent.
   * Identifies:
   * 1. 'no_keys': No usable model providers or API keys configured.
   * 2. 'default_model_unavailable': The default model for new sessions is unroutable, failed, or missing.
   */
  public async checkModelAvailability(): Promise<ModelAvailabilityResult> {
    const isZh = this.options.locale() === 'zh'
    let modelCatalog: any
    try {
      if (!this.options.harnessUrl()) {
        await this.options.ensureHarnessReady()
      }
      modelCatalog = await this.invokeHarness('session/modelCatalog', {})
    } catch (err) {
      return {
        ok: false,
        code: 'harness_not_ready',
        message: isZh ? '安全模式核心服务尚未就绪。' : 'Safe mode core is not ready yet.',
        detail: err instanceof Error ? err.message : String(err)
      }
    }

    const routableProviders: string[] = Array.isArray(modelCatalog?.routableProviders)
      ? modelCatalog.routableProviders
      : []
    const groups: any[] = Array.isArray(modelCatalog?.groups) ? modelCatalog.groups : []
    const failures: any[] = Array.isArray(modelCatalog?.failures) ? modelCatalog.failures : []

    // 1. 没有可用的 Key（没有任何已配置且可路由的 Provider，或者既无可用模型组也无具体提供商报错）
    if (routableProviders.length === 0 || (groups.length === 0 && failures.length === 0)) {
      return {
        ok: false,
        code: 'no_keys',
        message: isZh
          ? '未检测到可用的模型或 API Key。'
          : 'No usable model or API Key detected.',
        detail: isZh
          ? '智能维修需要大模型协助分析日志并定位根因。请确保配置了可用的模型提供商与 API Key，在保证模型可用的前提下再进入维修。'
          : 'The Repair Agent requires an LLM to analyze logs and diagnose issues. Please ensure at least one model provider with a valid API Key is configured before entering repair.'
      }
    }

    // 2. 检查新建会话的默认模型是否可用
    const defaultSelection = modelCatalog?.default || modelCatalog?.current
    const defaultProvider = defaultSelection?.provider || groups[0]?.id || failures[0]?.id
    const defaultModel = defaultSelection?.model || groups[0]?.models?.[0]?.id || 'default'

    if (!defaultProvider || !defaultModel) {
      return {
        ok: false,
        code: 'default_model_unavailable',
        message: isZh
          ? '当前模型未配置'
          : 'Current model is not configured',
        detail: isZh
          ? '智能维修依赖默认模型，请先修复该模型配置或切换为其他可用模型并完成对话后再进入维修'
          : 'The Repair Agent relies on the default model. Please fix its configuration or switch to another working model and send a message before entering repair.'
      }
    }

    const isRoutable = routableProviders.includes(defaultProvider)
    const providerFailure = failures.find((f: any) => f?.id === defaultProvider)
    const group = groups.find((g: any) => g?.id === defaultProvider)
    const modelExists = group?.models?.some((m: any) => m?.id === defaultModel)

    if (!isRoutable || providerFailure || !group || !modelExists) {
      return {
        ok: false,
        code: 'default_model_unavailable',
        defaultProvider,
        defaultModel,
        message: isZh
          ? `当前模型 ${defaultModel} 不可用`
          : `Current model ${defaultModel} is unavailable`,
        detail: isZh
          ? '智能维修依赖默认模型，请先修复该模型配置或切换为其他可用模型并完成对话后再进入维修'
          : 'The Repair Agent relies on the default model. Please fix its configuration or switch to another working model and send a message before entering repair.'
      }
    }

    return { ok: true, defaultProvider, defaultModel }
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
