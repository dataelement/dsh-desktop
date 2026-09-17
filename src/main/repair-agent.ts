import { randomUUID } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { WebContents } from 'electron'
import WebSocket from 'ws'
import { parse, stringify } from 'yaml'
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
  launchDirectory: string
  locale: () => 'en' | 'zh'
  readLogs?: () => readonly string[]
  /** Evidence of the last failed normal launch; Safe Mode replaces the live runtime logs. */
  crashEvidence?: () => CrashEvidence | undefined
  appVersion?: () => string
  dshHome?: string
}

export interface ConfigureProviderPayload {
  provider: string
  apiKey: string
  baseUrl?: string
}

export interface PromptImageAttachment {
  mediaType: string
  data: string
  name?: string
}

export interface PromptContentPart {
  type: 'text' | 'image'
  text?: string
  mediaType?: string
  data?: string
  name?: string
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
        ? `建议在安全模式中停用、升级或卸载${named}，然后重启桌面端。`
        : `Disable, upgrade, or uninstall ${culprit} in Safe Mode, then restart.`
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

/**
 * System prompt designed from real production 0.9.0 incident data.
 */
export function buildSystemRepairPrompt(options: {
  locale: 'en' | 'zh'
  platform: string
  arch: string
  nodeVersion: string
  desktopVersion: string
  finding?: DiagnosticFinding
  logsSample: string[]
}): string {
  const isZh = options.locale === 'zh'
  const findingText = options.finding
    ? isZh
      ? `【本地离线初步诊断】：${options.finding.summary}\n建议措施：${options.finding.suggestedAction}`
      : `[Local Diagnostic Finding]: ${options.finding.summary}\nRecommended: ${options.finding.suggestedAction}`
    : ''

  const logsText = options.logsSample.length > 0
    ? options.logsSample.join('\n')
    : (isZh ? '暂无异常日志' : 'No logs captured')

  if (isZh) {
    return `你是 DSH Desktop 专属的系统维修诊断专家 (System Repair Agent)。
你当前运行在轻量隔离的【安全模式 (Safe Mode)】沙箱中，正在协助用户排查桌面端启动崩溃或插件异常。

### 系统物理环境与上下文：
- 操作系统：${options.platform} (${options.arch})
- 运行时：Node.js ${options.nodeVersion}, DSH Desktop ${options.desktopVersion}
- 当前运行状态：安全模式 (所有第三方插件已被系统安全拦截)
${findingText}

### 最近异常启动日志（已做降噪提取）：
\`\`\`
${logsText}
\`\`\`

### 你的诊断知识库（覆盖 95% 以上已知故障）：
0. 若上方给出了【本地离线初步诊断】且点名了插件，该插件名来自加载器的归属信息或恢复流程的解析结果，以它为准，不要根据堆栈另行猜测。
1. 插件加载失败 (plugin tree failed to load / failed to apply|import loader entry <入口> (<插件包名>))：
   - 根因：括号内的包名才是插件；外层的 include (cordis:include) 只是包装入口，不是元凶。若同时出现 does not provide an export named，说明插件引用了新版本已移除的导出。
   - 解决方案：明确指出插件包名，指导用户在安全模式列表中禁用、升级或卸载该插件。
2. Windows 跨卷软链接权限拒绝 (EPERM: operation not permitted, symlink):
   - 根因：安装盘与数据盘不一致，且 Windows 未开启开发者模式。
   - 解决方案：指导用户开启 Windows“开发人员模式”，或重新安装在默认系统盘。
3. 补丁配置文件损坏 (YAMLException in cordis.patch.yml):
   - 根因：强行关机或掉电导致配置文件被截断损坏。
   - 解决方案：指导用户重置为干净出厂配置。
4. 启动超时强杀 (waiting for Harness 超时后触发 SIGTERM):
   - 根因：插件在启动主链路中下载大体积文件（如内置浏览器）或扫描大量账本。
   - 解决方案：指导用户暂时关闭该插件以快速进入系统。

### 回复规范：
1. 结论明确直接：先说人话，直接指出是哪个插件或哪项设置引起；
2. 步骤可立刻执行：给出在当前安全模式页面能直接操作的最小可逆动作；
3. 保持专业沉稳，结构清晰。`
  }

  return `You are the DSH Desktop System Repair Agent.
You are running inside the clean [Safe Mode] sandbox to help the user diagnose startup failures.

### System Facts:
- OS: ${options.platform} (${options.arch})
- Runtime: Node.js ${options.nodeVersion}, DSH Desktop ${options.desktopVersion}
- Status: Safe Mode (Third-party plugins isolated)
${findingText}

### Recent Error Logs:
\`\`\`
${logsText}
\`\`\`

### Guidelines:
- If the Local Diagnostic Finding names a plugin, it comes from loader provenance or plugin recovery; treat it as authoritative rather than re-deriving it from stack traces.
- In "failed to apply/import loader entry <entry> (<package>)", the parenthesized package is the plugin; the outer include (cordis:include) wrapper is never the culprit.
- State the root-cause plugin or configuration directly.
- Provide immediate, executable actions that can be done right in Safe Mode.
- Keep the response clear, calm, and structured.`
}

export class RepairAgentService {
  private harnessCookie?: { base: string; cookie: string }
  private activeSessionId?: string
  private activeWorkspaceId?: string
  private activeSocket?: WebSocket
  private senderWebContents?: WebContents
  private hasSentFirstPrompt = false

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

  public async initSession(
    sender?: WebContents
  ): Promise<{
    ok: boolean
    sessionId?: string
    workspaceId?: string
    modelCatalog?: any
    diagnosticFinding?: DiagnosticFinding
    systemRepairPrompt?: string
    error?: string
  }> {
    if (sender) this.senderWebContents = sender
    const isZh = this.options.locale() === 'zh'
    const evidence = this.options.crashEvidence?.()
    const rawLogs = evidence?.logs ?? this.options.readLogs?.() ?? []
    const relevantLogs = extractRelevantCrashLogs(rawLogs)
    const finding = analyzeCrashContext(rawLogs, this.options.locale(), evidence)
    const systemRepairPrompt = buildSystemRepairPrompt({
      locale: this.options.locale(),
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      desktopVersion: this.options.appVersion?.() || '0.9.0',
      finding,
      logsSample: relevantLogs
    })

    try {
      if (!this.options.harnessUrl()) {
        await this.options.ensureHarnessReady()
      }
      const base = this.options.harnessUrl()
      if (!base) {
        return {
          ok: false,
          diagnosticFinding: finding,
          systemRepairPrompt,
          error: isZh ? '安全模式核心服务未能成功拉起。' : 'Failed to initialize Safe Mode core.'
        }
      }

      // Create workspace and session if not already created
      if (!this.activeSessionId) {
        const workspace = await this.invokeHarness('workspace/create', {
          request: { path: this.options.launchDirectory }
        })
        const workspaceId = workspace?.workspaceId ?? workspace?.workspace?.workspaceId
        this.activeWorkspaceId = workspaceId

        // Use default preset so it inherits the working model route that answers in Harness
        const session = await this.invokeHarness('session/create', {
          request: { workspaceId }
        })
        const sessionId = session?.sessionId ?? session?.session?.sessionId
        if (!sessionId) throw new Error('Harness did not return a session id')
        this.activeSessionId = sessionId
        this.hasSentFirstPrompt = false
      }

      // Fetch model catalog
      let modelCatalog: any = null
      try {
        modelCatalog = await this.invokeHarness('session/modelCatalog', {})
      } catch (err) {
        console.warn('[repair-agent] could not load model catalog', err)
      }

      // Automatically select default model on the session so it can answer immediately
      const defaultEntry =
        modelCatalog?.current ||
        modelCatalog?.default ||
        (modelCatalog?.groups?.[0]?.models?.[0]
          ? { provider: modelCatalog.groups[0].id, model: modelCatalog.groups[0].models[0].id }
          : null)

      if (this.activeSessionId && defaultEntry?.provider && defaultEntry?.model) {
        try {
          await this.invokeHarness('session/selectModel', {
            request: {
              sessionId: this.activeSessionId,
              provider: defaultEntry.provider,
              model: defaultEntry.model,
              ...(defaultEntry.reasoningEffort ? { reasoningEffort: defaultEntry.reasoningEffort } : {})
            }
          })
        } catch (e) {
          console.warn('[repair-agent] auto selectModel failed', e)
        }
      }

      // Connect session follow stream
      if (this.senderWebContents && this.activeSessionId) {
        this.connectStream(base, this.activeSessionId, this.senderWebContents)
      }

      return {
        ok: true,
        sessionId: this.activeSessionId,
        workspaceId: this.activeWorkspaceId,
        modelCatalog,
        diagnosticFinding: finding,
        systemRepairPrompt
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return {
        ok: false,
        diagnosticFinding: finding,
        systemRepairPrompt,
        error: message
      }
    }
  }

  private normalizeStreamValue(val: any): any {
    if (!val || typeof val !== 'object') return val

    // 1. Assistant-stream chunk / start / end
    if (val.type === 'assistant-stream' && val.frame) {
      const f = val.frame
      if (f.type === 'start') {
        return { type: 'step-start', turn: f.turn, step: f.step, raw: val }
      }
      if (f.type === 'chunk' && f.chunk) {
        const c = f.chunk
        if (c.type === 'text-delta') {
          return { type: 'chunk', delta: c.text || '', raw: val }
        }
        if (c.type === 'reasoning-delta') {
          return { type: 'chunk', reasoning: c.text || '', raw: val }
        }
      } else if (f.type === 'end') {
        return { type: 'step-end', outcome: f.outcome, raw: val }
      }
    }

    // 2. Durable event frames
    if (val.type === 'event' && val.event) {
      const ev = val.event
      if (ev.type === 'agent/request-error' || ev.type === 'agent/error') {
        const err = ev.data?.error || ev.data?.message || ev.data || 'Model request failed'
        const message = typeof err === 'object' ? (err.message || JSON.stringify(err)) : String(err)
        return { type: 'error', error: message, raw: val }
      }
      if (ev.type === 'turn/start') {
        return { type: 'turn-start', turn: ev.data?.turn, raw: val }
      }
      if (ev.type === 'step/start') {
        return { type: 'step-start', turn: ev.data?.turn, step: ev.data?.step, raw: val }
      }
      if (ev.type === 'step/end') {
        return { type: 'step-end', turn: ev.data?.turn, step: ev.data?.step, raw: val }
      }
      if (ev.type === 'tool/call') {
        return {
          type: 'tool-call',
          name: ev.data?.name || 'tool',
          args: ev.data?.arguments,
          turn: ev.data?.turn,
          step: ev.data?.step,
          raw: val
        }
      }
      if (ev.type === 'tool/result') {
        return {
          type: 'tool-result',
          turn: ev.data?.turn,
          step: ev.data?.step,
          raw: val
        }
      }
      if (ev.type === 'turn/end' || ev.type === 'agent/turn-end') {
        return { type: 'turn-end', reason: ev.data?.reason, raw: val }
      }
      if (ev.type === 'assistant/message') {
        const content = ev.data?.message?.content || ev.data?.content || []
        const text = Array.isArray(content)
          ? content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('')
          : ''
        return { type: 'message', text, raw: val }
      }
    }

    return val
  }

  private connectStream(base: string, sessionId: string, sender: WebContents): void {
    if (this.activeSocket) {
      try {
        this.activeSocket.close()
      } catch {
        // ignore
      }
      this.activeSocket = undefined
    }

    void (async () => {
      try {
        const cookie = await this.harnessSession(base)
        const url = new URL('/api/remote.mux', base)
        url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
        const streamId = `repair-session-${randomUUID()}`

        const socket = new WebSocket(url, { headers: cookie ? { cookie } : {} })
        this.activeSocket = socket
        socket.addEventListener('error', (err) => {
          console.warn('[repair-agent] socket error', err)
          if (!sender.isDestroyed()) {
            sender.send('repair-agent:stream', {
              type: 'error',
              error: 'WebSocket connection error'
            })
          }
        })

        socket.addEventListener('open', () => {
          socket.send(
            JSON.stringify({
              type: 'open',
              streamId,
              endpoint: 'session/follow',
              payload: {
                args: {
                  request: {
                    address: { kind: 'session', sessionId },
                    maxMessages: 100,
                    assistantStream: true
                  }
                }
              }
            })
          )
        })

        socket.addEventListener('message', (event) => {
          const text =
            typeof event.data === 'string'
              ? event.data
              : Buffer.isBuffer(event.data)
                ? event.data.toString('utf8')
                : undefined
          if (!text) return
          let frame: any
          try {
            frame = JSON.parse(text)
          } catch {
            return
          }
          if (typeof frame !== 'object' || frame === null || frame.streamId !== streamId) return
          if (frame.type === 'item') {
            if (!sender.isDestroyed() && frame.value) {
              const normalized = this.normalizeStreamValue(frame.value)
              sender.send('repair-agent:stream', normalized)
            }
          } else if (frame.type === 'error') {
            if (!sender.isDestroyed()) {
              sender.send('repair-agent:stream', {
                type: 'error',
                error: frame.error?.message || frame.error || 'Remote session stream error'
              })
            }
          }
        })
      } catch (err) {
        console.warn('[repair-agent] session follow stream error', err)
      }
    })()
  }

  public async selectModel(
    sessionId: string,
    provider: string,
    model: string,
    reasoningEffort?: string
  ): Promise<{ ok: boolean; selected?: any; error?: string }> {
    try {
      const res = await this.invokeHarness('session/selectModel', {
        request: {
          sessionId,
          provider,
          model,
          ...(reasoningEffort ? { reasoningEffort } : {})
        }
      })
      return { ok: true, selected: res?.selected }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  }

  public async sendPrompt(
    sessionId: string,
    text: string,
    images?: PromptImageAttachment[]
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const content: PromptContentPart[] = []
      let promptText = (text || '').trim()
      if (!this.hasSentFirstPrompt && promptText.length > 0) {
        this.hasSentFirstPrompt = true
        const rawLogs = this.options.readLogs?.() ?? []
        const relevantLogs = extractRelevantCrashLogs(rawLogs)
        const finding = analyzeCrashContext(relevantLogs, this.options.locale())
        const systemRepairPrompt = buildSystemRepairPrompt({
          locale: this.options.locale(),
          platform: process.platform,
          arch: process.arch,
          nodeVersion: process.version,
          desktopVersion: this.options.appVersion?.() || '0.9.0',
          finding,
          logsSample: relevantLogs
        })
        promptText = `[系统背景与诊断事实]\n${systemRepairPrompt}\n\n[用户输入]\n${promptText}`
      }

      if (promptText.length > 0) {
        content.push({ type: 'text', text: promptText })
      }
      if (Array.isArray(images)) {
        for (const img of images) {
          if (img.data && img.mediaType) {
            content.push({
              type: 'image',
              mediaType: img.mediaType,
              data: img.data,
              name: img.name
            })
          }
        }
      }
      if (content.length === 0) {
        return { ok: false, error: 'Cannot send empty prompt.' }
      }

      await this.invokeHarness('session/prompt', {
        request: {
          requestId: randomUUID(),
          sessionId,
          mode: 'queue',
          content,
          clientTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      })
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  }

  public async cancel(sessionId: string): Promise<{ ok: boolean; error?: string }> {
    try {
      await this.invokeHarness('session/cancel', {
        request: { sessionId }
      })
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  }

  public async configureProvider(payload: ConfigureProviderPayload): Promise<{ ok: boolean; error?: string }> {
    try {
      if (!payload.apiKey || !payload.apiKey.trim()) {
        return { ok: false, error: this.options.locale() === 'zh' ? 'API 密钥不能为空' : 'API Key cannot be empty' }
      }
      const rawProvider = (payload.provider || 'deepseek').trim()
      const apiKey = payload.apiKey.trim()
      const dshHome = this.options.dshHome
      if (!dshHome) {
        return { ok: false, error: 'DSH_HOME path is not configured' }
      }

      const credPath = join(dshHome, '.credentials.yaml')
      let credDoc: any = { version: 1, refs: {} }
      if (existsSync(credPath)) {
        try {
          const content = readFileSync(credPath, 'utf8')
          credDoc = parse(content) || { version: 1, refs: {} }
        } catch {
          // recreate on corrupt
        }
      }
      credDoc.version ||= 1
      credDoc.refs ||= {}

      const settingsPath = join(dshHome, 'settings.yaml')
      let settingsDoc: any = {}
      if (existsSync(settingsPath)) {
        try {
          settingsDoc = parse(readFileSync(settingsPath, 'utf8')) || {}
        } catch {
          // recreate on corrupt
        }
      }

      // Route and model mapping according to DSH system standards
      let routeId = rawProvider.toLowerCase()
      let keyName = ''
      let defaultModel = ''

      if (routeId === 'deepseek' || routeId === 'deepseek-official') {
        routeId = 'deepseek-official'
        keyName = 'DEEPSEEK_API_KEY'
        defaultModel = 'deepseek-chat'
        if (payload.baseUrl && payload.baseUrl.trim()) {
          settingsDoc['llm-deepseek'] ||= {}
          settingsDoc['llm-deepseek'].baseURL = payload.baseUrl.trim()
        }
        settingsDoc['agent-default-model'] = {
          provider: routeId,
          model: defaultModel
        }
      } else {
        // Third-party and OpenAI compatible providers live in llm-pi-ai
        let baseURL = (payload.baseUrl || '').trim()
        if (routeId === 'openai') {
          keyName = 'OPENAI_API_KEY'
          baseURL = baseURL || 'https://api.openai.com/v1'
          defaultModel = 'gpt-4o'
        } else if (routeId === 'siliconflow') {
          keyName = 'SILICONFLOW_API_KEY'
          baseURL = baseURL || 'https://api.siliconflow.cn/v1'
          defaultModel = 'deepseek-ai/DeepSeek-V3'
        } else if (routeId === 'openrouter') {
          keyName = 'OPENROUTER_API_KEY'
          baseURL = baseURL || 'https://openrouter.ai/api/v1'
          defaultModel = 'deepseek/deepseek-chat'
        } else if (routeId === 'moonshotai-cn' || routeId === 'moonshot') {
          routeId = 'moonshotai-cn'
          keyName = 'MOONSHOT_API_KEY'
          baseURL = baseURL || 'https://api.moonshot.cn/v1'
          defaultModel = 'moonshot-v1-auto'
        } else if (routeId === 'zai-coding-cn' || routeId === 'zhipu') {
          routeId = 'zai-coding-cn'
          keyName = 'ZHIPU_API_KEY'
          baseURL = baseURL || 'https://open.bigmodel.cn/api/paas/v4'
          defaultModel = 'glm-4-flash'
        } else {
          // Custom route
          routeId = routeId.replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'custom'
          keyName = `${routeId.toUpperCase().replace(/-/g, '_')}_API_KEY`
          baseURL = baseURL || 'https://api.openai.com/v1'
          defaultModel = 'default-model'
        }

        settingsDoc['llm-pi-ai'] ||= {}
        settingsDoc['llm-pi-ai'].providers ||= {}
        settingsDoc['llm-pi-ai'].providers[routeId] = {
          apiKeyEnv: keyName,
          api: 'openai-completions',
          baseURL,
          models: [
            { id: defaultModel, name: defaultModel }
          ]
        }
        settingsDoc['agent-default-model'] = {
          provider: routeId,
          model: defaultModel
        }
      }

      // Persist to .credentials.yaml and settings.yaml
      credDoc.refs[keyName] = apiKey
      writeFileSync(credPath, stringify(credDoc), 'utf8')
      writeFileSync(settingsPath, stringify(settingsDoc), 'utf8')

      // Sync to live Harness runtime if running
      try {
        await this.invokeHarness('credentials/set', {
          ref: keyName,
          value: apiKey
        })
      } catch {
        // Fallback to file persistence if Harness credentials RPC rejects direct ref
      }

      // Invalidate active session so next message uses new configuration
      this.activeSessionId = undefined

      return { ok: true }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  }

  public dispose(): void {
    if (this.activeSocket) {
      try {
        this.activeSocket.close()
      } catch {
        // ignore
      }
      this.activeSocket = undefined
    }
    this.senderWebContents = undefined
    this.activeSessionId = undefined
    this.activeWorkspaceId = undefined
  }
}
