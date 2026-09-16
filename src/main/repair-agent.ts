import { randomUUID } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { WebContents } from 'electron'
import WebSocket from 'ws'
import { parse, stringify } from 'yaml'
import { cookiePair } from './mobile/lan-mobile-bridge'

export interface RepairAgentServiceOptions {
  harnessUrl: () => string | undefined
  harnessAuthToken: () => string | undefined
  ensureHarnessReady: () => Promise<void>
  launchDirectory: string
  locale: () => 'en' | 'zh'
  readLogs?: () => readonly string[]
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
  type: 'syntax_export_mismatch' | 'symlink_eperm' | 'overlay_yaml_corrupt' | 'startup_timeout' | 'generic'
  summary: string
  culprit?: string
  suggestedAction: string
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
 * Fast offline diagnostic parser based on known 0.9.0 error patterns.
 */
export function analyzeCrashContext(
  logs: readonly string[] = [],
  locale: 'en' | 'zh' = 'zh'
): DiagnosticFinding | undefined {
  const isZh = locale === 'zh'
  const logText = logs.join('\n')

  // 1. ESM export mismatch (Top crash cause)
  const exportMatch = logText.match(/does not provide an export named ['"]([^'"]+)['"]/)
  const pluginMatch = logText.match(/failed to import loader entry ([^\s(]+)/) || logText.match(/loader entry ([^\s(]+)/)
  if (exportMatch || (pluginMatch && logText.includes('SyntaxError'))) {
    const missingExport = exportMatch ? exportMatch[1] : 'unknown export'
    const culprit = pluginMatch ? pluginMatch[1] : 'third-party plugin'
    return {
      type: 'syntax_export_mismatch',
      culprit,
      summary: isZh
        ? `检测到插件「${culprit}」存在底层接口断裂，因缺少导出「${missingExport}」引发 SyntaxError 闪退。`
        : `Plugin "${culprit}" crashed due to missing export "${missingExport}".`,
      suggestedAction: isZh
        ? `建议在安全模式中停用或卸载插件「${culprit}」，然后重启桌面端。`
        : `Disable or uninstall plugin "${culprit}" in Safe Mode, then restart.`
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

  // 4. Watchdog Timeout
  if (logText.includes('waiting for Harness') && logText.includes('SIGTERM')) {
    return {
      type: 'startup_timeout',
      summary: isZh
        ? '检测到启动过程严重超时 (>60s)，被系统看门狗终止。通常由于插件在启动时执行网络大文件下载或深度全盘扫描导致。'
        : 'Startup timed out (>60s) and was terminated by the watchdog. Often caused by heavy plugins downloading files or scanning disk.',
      suggestedAction: isZh
        ? '在安全模式中检查近期新增或更新的大型插件，建议先行禁用以恢复正常启动。'
        : 'Check recently added or updated plugins in Safe Mode and disable them.'
    }
  }

  return undefined
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
1. 缺少导出语法错误 (SyntaxError: does not provide an export named):
   - 根因：新版本移除了底层已废弃的导出项，存量插件直接引用导致语法解析崩退。
   - 解决方案：明确指出引发冲突的插件名称，指导用户在安全模式列表中点击禁用或升级。
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

      // Ensure 'repair' preset exists
      try {
        const roster = await this.invokeHarness('agentPresets/list', {})
        const presets = Array.isArray(roster?.presets) ? roster.presets : []
        if (!presets.some((p: { id?: string }) => p.id === 'repair')) {
          await this.invokeHarness('agentPresets/copy', {
            from: 'standard',
            id: 'repair',
            name: isZh ? '系统维修 Agent' : 'System Repair Agent'
          })
        }
      } catch (err) {
        console.warn('[repair-agent] could not ensure repair preset', err)
      }

      // Create workspace and session if not already created
      if (!this.activeSessionId) {
        const workspace = await this.invokeHarness('workspace/create', {
          request: { path: this.options.launchDirectory }
        })
        const workspaceId = workspace?.workspaceId ?? workspace?.workspace?.workspaceId
        this.activeWorkspaceId = workspaceId

        const session = await this.invokeHarness('session/create', {
          request: { workspaceId, agentPreset: 'repair' }
        })
        const sessionId = session?.sessionId ?? session?.session?.sessionId
        if (!sessionId) throw new Error('Harness did not return a session id')
        this.activeSessionId = sessionId

        try {
          await this.invokeHarness('agentPresets/select', {
            agentId: sessionId,
            agentPreset: 'repair'
          })
        } catch {
          // Best effort preset selection
        }

        // Initialize session with the custom system prompt if possible
        try {
          await this.invokeHarness('session/prompt', {
            request: {
              requestId: randomUUID(),
              sessionId,
              mode: 'steer',
              content: [{ type: 'text', text: `[SYSTEM CONTEXT]\n${systemRepairPrompt}` }],
              clientTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            }
          })
        } catch {
          // Best effort context delivery
        }
      }

      // Fetch model catalog
      let modelCatalog: any = null
      try {
        modelCatalog = await this.invokeHarness('session/modelCatalog', {})
      } catch (err) {
        console.warn('[repair-agent] could not load model catalog', err)
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
        socket.addEventListener('error', () => {})

        socket.addEventListener('open', () => {
          socket.send(
            JSON.stringify({
              type: 'open',
              streamId,
              endpoint: 'session/follow',
              payload: {
                args: {
                  request: { address: { kind: 'session', sessionId }, maxMessages: 100 }
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
            if (!sender.isDestroyed()) {
              sender.send('repair-agent:stream', frame.value)
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
      if (text && text.trim().length > 0) {
        content.push({ type: 'text', text: text.trim() })
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
          mode: 'steer',
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
      const provider = (payload.provider || 'deepseek').toLowerCase().trim()
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

      // Key name normalization
      const keyName = provider === 'deepseek' ? 'DEEPSEEK_API_KEY' : provider === 'openai' ? 'OPENAI_API_KEY' : `${provider.toUpperCase()}_API_KEY`
      credDoc.refs[keyName] = apiKey
      writeFileSync(credPath, stringify(credDoc), 'utf8')

      // Save baseUrl if specified
      if (payload.baseUrl && payload.baseUrl.trim()) {
        const settingsPath = join(dshHome, 'settings.yaml')
        let settingsDoc: any = {}
        if (existsSync(settingsPath)) {
          try {
            settingsDoc = parse(readFileSync(settingsPath, 'utf8')) || {}
          } catch {
            // recreate on corrupt
          }
        }
        settingsDoc.providers ||= {}
        settingsDoc.providers[provider] ||= {}
        settingsDoc.providers[provider].baseUrl = payload.baseUrl.trim()
        writeFileSync(settingsPath, stringify(settingsDoc), 'utf8')
      }

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
