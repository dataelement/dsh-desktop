import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'
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

  it('configures providers adhering to DSH system standards (llm-deepseek vs llm-pi-ai)', async () => {
    const testDir = await mkdtemp(join(tmpdir(), 'dsh-repair-agent-test-'))
    try {
      const service = new RepairAgentService({
        harnessUrl: () => undefined,
        harnessAuthToken: () => undefined,
        ensureHarnessReady: async () => {},
        launchDirectory: testDir,
        locale: () => 'zh',
        dshHome: testDir
      })

      // 1. DeepSeek official
      const dsRes = await service.configureProvider({
        provider: 'deepseek',
        apiKey: 'sk-deepseek-test',
        baseUrl: 'https://api.deepseek.com'
      })
      expect(dsRes.ok).toBe(true)

      const creds1 = parse(await readFile(join(testDir, '.credentials.yaml'), 'utf8'))
      expect(creds1.refs.DEEPSEEK_API_KEY).toBe('sk-deepseek-test')

      const settings1 = parse(await readFile(join(testDir, 'settings.yaml'), 'utf8'))
      expect(settings1['agent-default-model']).toEqual({
        provider: 'deepseek-official',
        model: 'deepseek-chat'
      })

      // 2. OpenAI / compatible third-party provider (llm-pi-ai)
      const oaRes = await service.configureProvider({
        provider: 'openai',
        apiKey: 'sk-openai-test'
      })
      expect(oaRes.ok).toBe(true)

      const creds2 = parse(await readFile(join(testDir, '.credentials.yaml'), 'utf8'))
      expect(creds2.refs.OPENAI_API_KEY).toBe('sk-openai-test')

      const settings2 = parse(await readFile(join(testDir, 'settings.yaml'), 'utf8'))
      expect(settings2['llm-pi-ai'].providers.openai).toBeDefined()
      expect(settings2['llm-pi-ai'].providers.openai.apiKeyEnv).toBe('OPENAI_API_KEY')
      expect(settings2['llm-pi-ai'].providers.openai.api).toBe('openai-completions')
      expect(settings2['agent-default-model']).toEqual({
        provider: 'openai',
        model: 'gpt-4o'
      })

      // 3. Custom provider route (SiliconFlow / custom)
      const sfRes = await service.configureProvider({
        provider: 'siliconflow',
        apiKey: 'sk-sf-test'
      })
      expect(sfRes.ok).toBe(true)

      const creds3 = parse(await readFile(join(testDir, '.credentials.yaml'), 'utf8'))
      expect(creds3.refs.SILICONFLOW_API_KEY).toBe('sk-sf-test')

      const settings3 = parse(await readFile(join(testDir, 'settings.yaml'), 'utf8'))
      expect(settings3['llm-pi-ai'].providers.siliconflow.baseURL).toBe('https://api.siliconflow.cn/v1')
      expect(settings3['agent-default-model']).toEqual({
        provider: 'siliconflow',
        model: 'deepseek-ai/DeepSeek-V3'
      })
    } finally {
      await rm(testDir, { recursive: true, force: true })
    }
  })

  it('normalizes stream frames for assistant-stream, turn-end, and agent/request-error', () => {
    const service = new RepairAgentService({
      harnessUrl: () => undefined,
      harnessAuthToken: () => undefined,
      ensureHarnessReady: async () => {},
      launchDirectory: '/tmp',
      locale: () => 'zh'
    })
    const normalize = (service as any).normalizeStreamValue.bind(service)

    // 1. Text chunk
    const textFrame = {
      type: 'assistant-stream',
      frame: {
        type: 'chunk',
        chunk: { type: 'text-delta', text: 'Hello from LLM' }
      }
    }
    expect(normalize(textFrame)).toEqual({
      type: 'chunk',
      delta: 'Hello from LLM',
      raw: textFrame
    })

    // 2. Reasoning chunk
    const reasoningFrame = {
      type: 'assistant-stream',
      frame: {
        type: 'chunk',
        chunk: { type: 'reasoning-delta', text: 'Thinking step' }
      }
    }
    expect(normalize(reasoningFrame)).toEqual({
      type: 'chunk',
      reasoning: 'Thinking step',
      raw: reasoningFrame
    })

    // 3. Step start marker
    const startFrame = {
      type: 'assistant-stream',
      frame: {
        type: 'start',
        turn: 1,
        step: 1
      }
    }
    expect(normalize(startFrame)).toEqual({
      type: 'step-start',
      turn: 1,
      step: 1,
      raw: startFrame
    })

    // 4. Step end marker (attempt ends, not turn end)
    const endFrame = {
      type: 'assistant-stream',
      frame: {
        type: 'end',
        outcome: { kind: 'committed' }
      }
    }
    expect(normalize(endFrame)).toEqual({
      type: 'step-end',
      outcome: { kind: 'committed' },
      raw: endFrame
    })

    // 5. Tool call event
    const toolCallEvent = {
      type: 'event',
      event: {
        type: 'tool/call',
        data: { turn: 1, step: 1, name: 'fs_read', arguments: '{"path":"/app"}' }
      }
    }
    expect(normalize(toolCallEvent)).toEqual({
      type: 'tool-call',
      name: 'fs_read',
      args: '{"path":"/app"}',
      turn: 1,
      step: 1,
      raw: toolCallEvent
    })

    // 6. Tool result event
    const toolResultEvent = {
      type: 'event',
      event: {
        type: 'tool/result',
        data: { turn: 1, step: 1 }
      }
    }
    expect(normalize(toolResultEvent)).toEqual({
      type: 'tool-result',
      turn: 1,
      step: 1,
      raw: toolResultEvent
    })

    // 7. True turn end event
    const turnEndEvent = {
      type: 'event',
      event: {
        type: 'turn/end',
        data: { turn: 1, reason: 'completed' }
      }
    }
    expect(normalize(turnEndEvent)).toEqual({
      type: 'turn-end',
      reason: 'completed',
      raw: turnEndEvent
    })

    // 8. Request error event
    const errEvent = {
      type: 'event',
      event: {
        type: 'agent/request-error',
        data: { error: { message: 'Invalid API Key' } }
      }
    }
    expect(normalize(errEvent)).toEqual({
      type: 'error',
      error: 'Invalid API Key',
      raw: errEvent
    })
  })
})
