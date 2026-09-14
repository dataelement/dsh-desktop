import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { patchPath } from './patch-path'

async function readPatch(packageName: string): Promise<string> {
  return readFile(patchPath(packageName), 'utf8')
}

describe('provider error classification patches', () => {
  it('distinguishes quota, authentication, and forbidden failures', async () => {
    const deepseekPatch = await readPatch('@deepseek-ai/dsh-llm-deepseek')
    const piAiPatch = await readPatch('@deepseek-ai/dsh-llm-pi-ai')

    expect(deepseekPatch).toContain('+\tif (status === 401) return "AUTH";')
    expect(deepseekPatch).toContain(
      '+\tif (status === 403) return "FORBIDDEN";'
    )
    expect(deepseekPatch.indexOf('isQuotaExceededError(detail)')).toBeLessThan(
      deepseekPatch.lastIndexOf('status === 401')
    )
    expect(piAiPatch).toContain(
      '+\tif (/\\b401\\b/.test(message)) return "AUTH";'
    )
    expect(piAiPatch).toContain(
      '+\tif (/\\b403\\b/.test(message)) return "FORBIDDEN";'
    )
    expect(piAiPatch.indexOf('isQuotaExceededError(message)')).toBeLessThan(
      piAiPatch.lastIndexOf('\\b401\\b')
    )
  })

  it('surfaces quota and forbidden failures in both client surfaces', async () => {
    // Upstream moved failure display out of dsh-client-runtime (deleted in
    // 0.1.2-alpha.1) into the chat and trajectory surfaces, and made the copy
    // i18n-driven. The desktop customization follows that shape rather than
    // reinstating hardcoded English.
    for (const [packageName, prefix] of [
      ['@deepseek-ai/dsh-client-ui-chat', 'message'],
      ['@deepseek-ai/dsh-client-ui-trajectory', 'details']
    ] as const) {
      const patch = await readPatch(packageName)

      expect(patch).toContain(`"${prefix}.failure.quota"`)
      expect(patch).toContain(`"${prefix}.failure.forbidden"`)
      expect(patch).toContain('账户额度或余额不足')
      expect(patch).toContain('模型服务商拒绝了本次请求')
      expect(patch).toContain(
        "Your account has insufficient quota or balance. Add credits or check your provider's usage limits."
      )
      expect(patch).toContain(
        'The model provider denied this request. Check your account permissions, region, or model access.'
      )
    }
  })

  it('recovers a provider terminal message that omits its content array', async () => {
    const patch = await readPatch('@deepseek-ai/dsh-llm-pi-ai')
    const additions = patch
      .split('\n')
      .filter((line) => line.startsWith('+') && !line.startsWith('+++'))
      .map((line) => line.slice(1))
      .join('\n')
    const helper = additions.match(
      /function completeTerminalMessage\(message, completed\) \{[\s\S]*?^\}/m
    )?.[0]

    expect(helper).toBeDefined()
    const completeTerminalMessage = new Function(
      `${helper}; return completeTerminalMessage`
    )() as (
      message: Record<string, unknown>,
      completed: Map<number, Record<string, unknown>>
    ) => Record<string, unknown>
    const completed = new Map([
      [1, { type: 'text', text: 'second' }],
      [0, { type: 'reasoning', text: 'first' }]
    ])
    const malformed = { model: 'custom-model', stopReason: 'stop' }

    expect(completeTerminalMessage(malformed, completed)).toEqual({
      ...malformed,
      content: [
        { type: 'reasoning', text: 'first' },
        { type: 'text', text: 'second' }
      ]
    })
    const valid = { ...malformed, content: [] }
    expect(completeTerminalMessage(valid, completed)).toBe(valid)
    expect(patch).toContain(
      '+\tconst message = completeTerminalMessage(event.message, completed);'
    )
    expect(patch).toContain('+\t\t\treplayState: toPiReplayState(message)')
  })
})
