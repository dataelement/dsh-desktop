import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  analyzeCrashContext,
  extractRelevantCrashLogs,
  RepairAgentService
} from '../src/main/repair-agent'

describe('RepairAgentService', () => {
  it('extracts relevant crash logs and diagnoses export mismatch correctly', () => {
    const logs = [
      '[desktop] launch requested',
      '[stderr] info: loading cordis plugins',
      '[stderr] file:///app/plugin-a.js:10 SyntaxError: The requested module \'lib\' does not provide an export named \'missingFn\'',
      '[stderr] failed to import loader entry plugin-a (plugin-a)',
      '[stderr] Error: startup aborted'
    ]
    const extracted = extractRelevantCrashLogs(logs)
    expect(extracted.length).toBeGreaterThan(0)

    const finding = analyzeCrashContext(extracted, 'zh')
    expect(finding).toBeDefined()
    expect(finding?.type).toBe('syntax_export_mismatch')
    expect(finding?.culprit).toBe('plugin-a')
  })

  it('builds the first prompt from the failed launch, not from Safe Mode logs', async () => {
    const prompts: string[] = []
    const workspacePaths: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: URL | string, init?: RequestInit) => {
      const target = new URL(String(url))
      if (target.pathname === '/') {
        return new Response(null, { status: 302, headers: { 'set-cookie': 'sid=1; Path=/' } })
      }
      const endpoint = target.pathname.replace('/api/', '')
      if (endpoint === 'session/prompt') {
        const body = JSON.parse(String(init?.body))
        prompts.push(body.payload.args.request.content[0].text)
      }
      if (endpoint === 'workspace/create') {
        workspacePaths.push(JSON.parse(String(init?.body)).payload.args.request.path)
      }
      const value = endpoint === 'workspace/create'
        ? { workspaceId: 'w1' }
        : endpoint === 'session/create'
          ? { sessionId: 's1' }
          : {}
      return Response.json({ result: { ok: true, value } })
    }))
    const service = new RepairAgentService({
      harnessUrl: () => 'http://127.0.0.1:1',
      harnessAuthToken: () => 'token-1',
      ensureHarnessReady: async () => {},
      workspaceDirectory: '/data/harness',
      harnessLogPath: '/logs/harness.log',
      locale: () => 'en',
      crashEvidence: () => ({ logs: ['[desktop] starting web'], plugins: ['broken-plugin'] })
    })

    const session = await service.initSession()
    expect(session).toMatchObject({ ok: true, sessionId: 's1' })
    expect(session.diagnosticFinding?.culprit).toBe('broken-plugin')
    expect(workspacePaths).toEqual(['/data/harness'])

    expect(await service.sendPrompt('s1', 'help')).toEqual({ ok: true })
    expect(await service.sendPrompt('s1', 'again')).toEqual({ ok: true })
    expect(prompts[0]).toContain('broken-plugin')
    expect(prompts[0]).not.toContain('safe mode ready')
    expect(prompts[0]).toContain("Harness home (this session's workspace): `/data/harness`")
    expect(prompts[0]).toContain('Full startup log: `/logs/harness.log`')
    expect(prompts[0]).toMatch(/\[User Request\]\nhelp$/)
    expect(prompts[1]).toBe('again')
  })

  it('opens a new, briefed session for every card click in the same Harness', async () => {
    let created = 0
    const prompts: Array<{ sessionId: string; text: string }> = []
    vi.stubGlobal('fetch', vi.fn(async (url: URL | string, init?: RequestInit) => {
      const target = new URL(String(url))
      if (target.pathname === '/') {
        return new Response(null, { status: 302, headers: { 'set-cookie': 'sid=1; Path=/' } })
      }
      const endpoint = target.pathname.replace('/api/', '')
      if (endpoint === 'session/prompt') {
        const request = JSON.parse(String(init?.body)).payload.args.request
        prompts.push({ sessionId: request.sessionId, text: request.content[0].text })
      }
      const value = endpoint === 'session/create' ? { sessionId: `s${++created}` } : { workspaceId: 'w1' }
      return Response.json({ result: { ok: true, value } })
    }))
    const service = new RepairAgentService({
      harnessUrl: () => 'http://127.0.0.1:1',
      harnessAuthToken: () => 'token-1',
      ensureHarnessReady: async () => {},
      workspaceDirectory: '/data/harness',
      locale: () => 'en'
    })

    const first = await service.initSession({ fresh: true })
    await service.sendPrompt(first.sessionId!, 'diagnose')
    const second = await service.initSession({ fresh: true })
    await service.sendPrompt(second.sessionId!, 'diagnose')
    await service.sendPrompt(first.sessionId!, 'follow up')

    expect([first.sessionId, second.sessionId]).toEqual(['s1', 's2'])
    expect(prompts.map((prompt) => prompt.sessionId)).toEqual(['s1', 's2', 's1'])
    expect(prompts[0]!.text).toContain('[System Context]')
    expect(prompts[1]!.text).toContain('[System Context]')
    expect(prompts[2]!.text).toBe('follow up')
  })

  it('starts a new session after the Harness process changes', async () => {
    let created = 0
    vi.stubGlobal('fetch', vi.fn(async (url: URL | string) => {
      const target = new URL(String(url))
      if (target.pathname === '/') {
        return new Response(null, { status: 302, headers: { 'set-cookie': 'sid=1; Path=/' } })
      }
      const endpoint = target.pathname.replace('/api/', '')
      const value = endpoint === 'session/create' ? { sessionId: `s${++created}` } : { workspaceId: 'w1' }
      return Response.json({ result: { ok: true, value } })
    }))
    let token = 'token-1'
    const service = new RepairAgentService({
      harnessUrl: () => 'http://127.0.0.1:1',
      harnessAuthToken: () => token,
      ensureHarnessReady: async () => {},
      workspaceDirectory: '/data/harness',
      locale: () => 'en'
    })
    expect((await service.initSession()).sessionId).toBe('s1')
    expect((await service.initSession()).sessionId).toBe('s1')
    token = 'token-2'
    expect((await service.initSession()).sessionId).toBe('s2')
  })

  describe('checkModelAvailability', () => {
    it('identifies no_keys when routableProviders is empty', async () => {
      vi.stubGlobal('fetch', vi.fn(async (url: URL | string) => {
        const target = new URL(String(url))
        if (target.pathname === '/') {
          return new Response(null, { status: 302, headers: { 'set-cookie': 'sid=1; Path=/' } })
        }
        return Response.json({
          result: {
            ok: true,
            value: {
              default: { provider: 'deepseek', model: 'deepseek-chat' },
              routableProviders: [],
              groups: [],
              failures: []
            }
          }
        })
      }))

      const service = new RepairAgentService({
        harnessUrl: () => 'http://127.0.0.1:1',
        harnessAuthToken: () => 'token-1',
        ensureHarnessReady: async () => {},
        workspaceDirectory: '/data/harness',
        locale: () => 'zh'
      })

      const res = await service.checkModelAvailability()
      expect(res.ok).toBe(false)
      expect(res.code).toBe('no_keys')
      expect(res.message).toContain('未检测到可用的模型或 API Key')
    })

    it('identifies default_model_unavailable when default provider is not routable', async () => {
      vi.stubGlobal('fetch', vi.fn(async (url: URL | string) => {
        const target = new URL(String(url))
        if (target.pathname === '/') {
          return new Response(null, { status: 302, headers: { 'set-cookie': 'sid=1; Path=/' } })
        }
        return Response.json({
          result: {
            ok: true,
            value: {
              default: { provider: 'openai', model: 'gpt-4o' },
              routableProviders: ['deepseek'],
              groups: [
                { id: 'deepseek', name: 'DeepSeek', models: [{ id: 'deepseek-chat', name: 'DeepSeek Chat' }] }
              ],
              failures: []
            }
          }
        })
      }))

      const service = new RepairAgentService({
        harnessUrl: () => 'http://127.0.0.1:1',
        harnessAuthToken: () => 'token-1',
        ensureHarnessReady: async () => {},
        workspaceDirectory: '/data/harness',
        locale: () => 'zh'
      })

      const res = await service.checkModelAvailability()
      expect(res.ok).toBe(false)
      expect(res.code).toBe('default_model_unavailable')
      expect(res.message).toBe('当前模型 gpt-4o 不可用')
      expect(res.detail).toBe('智能维修依赖默认模型，请先修复该模型配置或切换为其他可用模型并完成对话后再进入维修')
    })

    it('identifies default_model_unavailable when default provider has failure', async () => {
      vi.stubGlobal('fetch', vi.fn(async (url: URL | string) => {
        const target = new URL(String(url))
        if (target.pathname === '/') {
          return new Response(null, { status: 302, headers: { 'set-cookie': 'sid=1; Path=/' } })
        }
        return Response.json({
          result: {
            ok: true,
            value: {
              default: { provider: 'deepseek', model: 'deepseek-chat' },
              routableProviders: ['deepseek'],
              groups: [],
              failures: [{ id: 'deepseek', name: 'DeepSeek', message: 'API key expired' }]
            }
          }
        })
      }))

      const service = new RepairAgentService({
        harnessUrl: () => 'http://127.0.0.1:1',
        harnessAuthToken: () => 'token-1',
        ensureHarnessReady: async () => {},
        workspaceDirectory: '/data/harness',
        locale: () => 'zh'
      })

      const res = await service.checkModelAvailability()
      expect(res.ok).toBe(false)
      expect(res.code).toBe('default_model_unavailable')
      expect(res.message).toBe('当前模型 deepseek-chat 不可用')
      expect(res.detail).toBe('智能维修依赖默认模型，请先修复该模型配置或切换为其他可用模型并完成对话后再进入维修')
    })

    it('returns ok: true when default model is routable and exists in provider group', async () => {
      vi.stubGlobal('fetch', vi.fn(async (url: URL | string) => {
        const target = new URL(String(url))
        if (target.pathname === '/') {
          return new Response(null, { status: 302, headers: { 'set-cookie': 'sid=1; Path=/' } })
        }
        return Response.json({
          result: {
            ok: true,
            value: {
              default: { provider: 'deepseek', model: 'deepseek-chat' },
              routableProviders: ['deepseek'],
              groups: [
                { id: 'deepseek', name: 'DeepSeek', models: [{ id: 'deepseek-chat', name: 'DeepSeek Chat' }] }
              ],
              failures: []
            }
          }
        })
      }))

      const service = new RepairAgentService({
        harnessUrl: () => 'http://127.0.0.1:1',
        harnessAuthToken: () => 'token-1',
        ensureHarnessReady: async () => {},
        workspaceDirectory: '/data/harness',
        locale: () => 'zh'
      })

      const res = await service.checkModelAvailability()
      expect(res.ok).toBe(true)
      expect(res.defaultModel).toBe('deepseek-chat')
      expect(res.defaultProvider).toBe('deepseek')
    })
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})
