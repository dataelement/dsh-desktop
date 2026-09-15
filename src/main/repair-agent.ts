import { randomUUID } from 'node:crypto'
import type { WebContents } from 'electron'
import WebSocket from 'ws'
import { cookiePair } from './mobile/lan-mobile-bridge'

export interface RepairAgentServiceOptions {
  harnessUrl: () => string | undefined
  harnessAuthToken: () => string | undefined
  ensureHarnessReady: () => Promise<void>
  launchDirectory: string
  locale: () => 'en' | 'zh'
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
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(10_000)
    })
    const cookie = cookiePair(response.headers.getSetCookie())
    if (cookie === undefined) return undefined
    this.harnessCookie = { base, cookie }
    return cookie
  }

  private async harnessFetch(url: URL, init: RequestInit, base: string): Promise<Response> {
    const send = async (cookie: string | undefined): Promise<Response> =>
      fetch(url, {
        ...init,
        headers: { ...init.headers, ...(cookie === undefined ? {} : { cookie }) }
      })
    let response = await send(await this.harnessSession(base))
    if (response.status === 401) {
      this.harnessCookie = undefined
      const retry = await this.harnessSession(base)
      if (retry !== undefined) response = await send(retry)
    }
    return response
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
    error?: string
  }> {
    if (sender) this.senderWebContents = sender
    try {
      if (!this.options.harnessUrl()) {
        await this.options.ensureHarnessReady()
      }
      const base = this.options.harnessUrl()
      if (!base) {
        return { ok: false, error: 'Harness failed to initialize.' }
      }

      // Ensure 'repair' preset exists
      try {
        const roster = await this.invokeHarness('agentPresets/list', {})
        const presets = Array.isArray(roster?.presets) ? roster.presets : []
        if (!presets.some((p: { id?: string }) => p.id === 'repair')) {
          await this.invokeHarness('agentPresets/copy', {
            from: 'standard',
            id: 'repair',
            name: this.options.locale() === 'zh' ? '系统维修 Agent' : 'System Repair Agent'
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
        modelCatalog
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { ok: false, error: message }
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
