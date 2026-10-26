import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { RepairSessionStore } from './state/repair-agent-sessions'
import { cookiePair } from './mobile/lan-mobile-bridge'
import {
  extractDshEntryFailureCause,
  extractOffendingPlugins,
  latestHarnessAttemptLogs
} from './runtime/harness-runtime'
import type { RuntimeSnapshot } from '../shared/contracts'
import { parsePluginStartupFailures, type PluginStartupFailure } from '../shared/plugin-startup-failure'

export type RepairEnvironment = 'normal' | 'safe'
export const REPAIR_PRESET_ID = 'desktop-repair'

export interface RepairAgentServiceOptions {
  /** The running Harness; opening repair never changes this environment. */
  environment?: () => RepairEnvironment
  /** Dedicated Desktop state directory; persists repair addresses across app restarts. */
  sessionStateDirectory?: string
  /** Startup repair attempts for the current incident, never credentials or full configuration. */
  repairHistory?: () => Promise<readonly { action: string; status: string; plugins: readonly string[] }[]>
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

/** Per-incident facts only. Instructions and troubleshooting manuals live in desktop-repair. */
export function buildSystemRepairPrompt(options: {
  locale: 'en' | 'zh'
  environment?: RepairEnvironment
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
  const home = options.workspaceDirectory ?? (zh ? '<Harness 数据目录>' : '<Harness home>')
  const normal = options.environment === 'normal'
  const facts = [
    zh ? '## 本次维修环境与事实' : '## This repair: environment and facts',
    zh
      ? `当前环境：${normal ? '正常运行（非安全模式）' : '安全模式（尚未验证正常启动）'}。`
      : `Current environment: ${normal ? 'normal application (not Safe Mode)' : 'Safe Mode (normal startup has not been verified)'}.`,
    `${options.platform} (${options.arch}); Node.js ${options.nodeVersion}; DSH Desktop ${options.desktopVersion}`,
    zh ? `Harness 数据目录（当前会话的工作区）：\`${home}\`` : `Harness home (this session's workspace): \`${home}\``,
    `${zh ? '正常 Profile' : 'Normal profile'}: \`${join(home, 'profiles', 'web')}\``,
    `${zh ? '安全模式 Profile' : 'Safe Mode profile'}: \`${join(home, 'profiles', 'desktop-safe-mode')}\``,
    `${zh ? '全局设置' : 'Global settings'}: \`${join(home, 'settings.yaml')}\``,
    `${zh ? '会话日志' : 'Session logs'}: \`${join(home, 'sessions')}\``,
    `${zh ? '会话摘要' : 'Session summaries'}: \`${join(home, 'storages', 'session_projcache', 'sessions')}\``,
    `${zh ? '恢复备份' : 'Recovery backups'}: \`${join(home, 'recovery')}\``,
    zh ? `完整启动日志：\`${options.harnessLogPath ?? 'harness.log'}\`` : `Full startup log: \`${options.harnessLogPath ?? 'harness.log'}\``
  ]
  if (options.shippedPresetsDirectory) facts.push(`${zh ? '内置模式基准' : 'Bundled preset baseline'}: \`${options.shippedPresetsDirectory}\``)
  if (!normal && options.finding) facts.push(`${zh ? '离线诊断' : 'Offline diagnosis'}: ${options.finding.summary}`)
  if (!normal && options.crashCaptured !== false && options.logsSample.length) {
    facts.push(`${zh ? '失败启动日志摘录' : 'Failed launch excerpt'}:\n\`\`\`\n${options.logsSample.slice(-20).join('\n')}\n\`\`\``)
  } else {
    facts.push(zh ? '本次没有附带失败启动证据。' : 'No failed startup evidence was attached to this repair.')
  }
  return facts.join('\n')
}

export class RepairAgentService {
  private harnessCookie?: { base: string; token?: string; cookie: string }
  private readonly sessionStore?: RepairSessionStore
  private readonly sessionsByEnvironment = new Map<RepairEnvironment, { sessionId: string; briefed: boolean }>()
  private activeSessionId?: string
  /** Launch token of the Harness process that owns `activeSessionId`. */
  private sessionOwner?: string
  private sessionEnvironment?: RepairEnvironment
  private initialization?: Promise<{ ok: boolean; sessionId?: string; created?: boolean; needsBriefing?: boolean; diagnosticFinding?: DiagnosticFinding; error?: string }>
  /** Sessions whose first turn already carried the diagnosis. */
  private readonly briefedSessions = new Set<string>()

  constructor(private readonly options: RepairAgentServiceOptions) {
    if (options.sessionStateDirectory) this.sessionStore = new RepairSessionStore(options.sessionStateDirectory)
  }

  private async harnessSession(base: string): Promise<string | undefined> {
    const token = this.options.harnessAuthToken?.()
    if (this.harnessCookie?.base === base && this.harnessCookie.token === token) return this.harnessCookie.cookie
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
      this.harnessCookie = { base, token, cookie }
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
          ? '维修核心尚未启动就绪或本地端口被阻断 (ECONNREFUSED)。请稍候片刻重试。'
          : 'Repair Harness core is not ready yet (ECONNREFUSED). Please wait a moment and retry.'
      } else if (isTimeout) {
        message = isZh
          ? '与维修核心通信超时。'
          : 'Communication with Repair Harness timed out.'
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
    if (envelope.result?.ok === true) return envelope.result.value
    return envelope.payload?.result ?? envelope.payload
  }

  /**
   * The offline diagnosis and system prompt, built only from the failed normal
   * launch. Without one the user entered Safe Mode on purpose, and Safe Mode's
   * own healthy logs would only mislead the diagnosis.
   */
  private repairContext(): { finding?: DiagnosticFinding; systemRepairPrompt: string } {
    const locale = this.options.locale()
    const evidence = (this.options.environment?.() ?? 'safe') === 'safe' ? this.options.crashEvidence?.() : undefined
    const rawLogs = evidence?.logs ?? []
    const finding = evidence ? analyzeCrashContext(rawLogs, locale, evidence) : undefined
    const systemRepairPrompt = buildSystemRepairPrompt({
      locale,
      environment: this.options.environment?.() ?? 'safe',
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
    created?: boolean
    needsBriefing?: boolean
    diagnosticFinding?: DiagnosticFinding
    error?: string
  }> {
    if (this.initialization) return this.initialization
    const operation = this.initializeSession(options)
    this.initialization = operation
    try { return await operation } finally { this.initialization = undefined }
  }

  private async initializeSession(options: { fresh?: boolean }): Promise<{ ok: boolean; sessionId?: string; created?: boolean; needsBriefing?: boolean; diagnosticFinding?: DiagnosticFinding; error?: string }> {
    const isZh = this.options.locale() === 'zh'
    const environment = this.options.environment?.() ?? 'safe'
    const { finding } = this.repairContext()

    try {
      if (!this.options.harnessUrl()) {
        if ((this.options.environment?.() ?? 'safe') === 'safe') await this.options.ensureHarnessReady()
      }
      const base = this.options.harnessUrl()
      if (!base) {
        return {
          ok: false,
          diagnosticFinding: finding,
          error: isZh ? '维修核心服务未能成功拉起。' : 'Failed to initialize repair core.'
        }
      }

      const owner = this.options.harnessAuthToken()
      const needsRestore = !this.activeSessionId || this.sessionOwner !== owner || this.sessionEnvironment !== environment
      if (options.fresh) {
        this.activeSessionId = undefined
      } else if (needsRestore) {
        const candidate = this.sessionsByEnvironment.get(environment) ?? await this.sessionStore?.load(environment)
        this.activeSessionId = undefined
        if (candidate) {
          // Exact projections are cold-safe in Harness 0.2.1; list rows may
          // omit projection hints for persisted sessions. Prompt admission
          // explicitly resumes the cold Agent when the user next sends.
          const projection: unknown = await this.invokeHarness('session/projections', { request: { sessionId: candidate.sessionId } })
          if (projection && typeof projection === 'object' && 'kind' in projection && projection.kind === 'migration-required') {
            throw new Error('The repair session requires migration before it can be resumed')
          }
          if (projection !== null && (typeof projection !== 'object' || !('values' in projection))) {
            throw new Error('Harness returned invalid repair session projections')
          }
          const exists = projection && typeof projection === 'object' && 'values' in projection &&
            projection.values !== null && typeof projection.values === 'object' &&
            'agentPreset' in projection.values && projection.values.agentPreset === REPAIR_PRESET_ID
          if (exists) {
            this.activeSessionId = candidate.sessionId
            if (candidate.briefed) this.briefedSessions.add(candidate.sessionId)
          }
        }
        this.sessionOwner = owner
        this.sessionEnvironment = environment
      }
      let created = false
      if (!this.activeSessionId) {
        const workspace = await this.invokeHarness('workspace/create', {
          request: {
            path: this.options.workspaceDirectory,
            title: isZh ? 'DSH 维修' : 'DSH Repair'
          }
        })
        const workspaceId = workspace?.workspaceId ?? workspace?.workspace?.workspaceId

        // Explicitly select the bundled repair mode, independently of the user default.
        const session = await this.invokeHarness('session/create', {
          request: { workspaceId, agentPreset: REPAIR_PRESET_ID }
        })
        const sessionId = session?.sessionId ?? session?.session?.sessionId
        if (!sessionId) throw new Error('Harness did not return a session id')
        this.activeSessionId = sessionId
        this.sessionOwner = owner
        this.sessionEnvironment = environment
        await this.selectDefaultModel(sessionId)
        created = true
        const saved = { sessionId, briefed: false }
        this.sessionsByEnvironment.set(environment, saved)
        await this.sessionStore?.save(environment, saved)
      }

      return { ok: true, sessionId: this.activeSessionId, created, needsBriefing: this.activeSessionId !== undefined && !this.briefedSessions.has(this.activeSessionId), diagnosticFinding: finding }
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
        if ((this.options.environment?.() ?? 'safe') === 'safe') await this.options.ensureHarnessReady()
      }
      modelCatalog = await this.invokeHarness('session/modelCatalog', {})
    } catch (err) {
      return {
        ok: false,
        code: 'harness_not_ready',
        message: isZh ? '维修核心服务尚未就绪。' : 'Repair core is not ready yet.',
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
        let { systemRepairPrompt } = this.repairContext()
        if ((this.options.environment?.() ?? 'safe') === 'safe' && this.options.repairHistory) {
          const history = await this.options.repairHistory()
          const attempts = history.slice(-10).map(attempt => ({
            action: attempt.action, status: attempt.status, plugins: attempt.plugins.slice(0, 20)
          }))
          if (attempts.length) systemRepairPrompt += `\n${this.options.locale() === 'zh' ? '已尝试的修复措施' : 'Previous repair attempts'}: ${JSON.stringify(attempts)}`
        }
        const [contextLabel, requestLabel] = this.options.locale() === 'zh'
          ? ['[维修环境与诊断事实]', '[用户输入]']
          : ['[Repair Environment and Facts]', '[User Request]']
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
      if (briefing) {
        this.briefedSessions.add(sessionId)
        if (sessionId === this.activeSessionId && this.sessionEnvironment) {
          const saved = { sessionId, briefed: true }
          this.sessionsByEnvironment.set(this.sessionEnvironment, saved)
          await this.sessionStore?.save(this.sessionEnvironment, saved)
        }
      }
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  }

  /** Stable normal startup completes the blocking incident; preserve its history in Harness. */
  public async completeStartupRepair(): Promise<void> {
    await this.initialization
    const saved = this.sessionsByEnvironment.get('safe')
    if (saved) this.briefedSessions.delete(saved.sessionId)
    this.sessionsByEnvironment.delete('safe')
    if (this.sessionEnvironment === 'safe') {
      this.activeSessionId = undefined
      this.sessionOwner = undefined
      this.sessionEnvironment = undefined
    }
    await this.sessionStore?.clear('safe')
  }

  public dispose(): void {
    this.harnessCookie = undefined
    this.activeSessionId = undefined
    this.sessionOwner = undefined
    this.sessionEnvironment = undefined
    this.briefedSessions.clear()
    this.sessionsByEnvironment.clear()
  }
}
