import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const projectRoot = path.resolve(import.meta.dirname, '..')

async function readPatch(name: string): Promise<string> {
  return readFile(path.join(projectRoot, 'patches', name), 'utf8')
}

describe('provider error classification patches', () => {
  it('distinguishes quota, authentication, and forbidden failures', async () => {
    const deepseekPatch = await readPatch(
      '@deepseek-ai+dsh-llm-deepseek+0.1.0-rc.8.patch'
    )
    const piAiPatch = await readPatch('@deepseek-ai+dsh-llm-pi-ai+0.1.0-rc.8.patch')

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

  it('shows distinct English quota, forbidden, and authentication messages', async () => {
    const runtimePatch = await readPatch(
      '@deepseek-ai+dsh-client-runtime+0.1.0-rc.8.patch'
    )

    expect(runtimePatch).toContain('record.code === "QUOTA"')
    expect(runtimePatch).toContain(
      "Your account has insufficient quota or balance. Please add credits or check your provider's usage limits."
    )
    expect(runtimePatch).toContain('record.code === "FORBIDDEN"')
    expect(runtimePatch).toContain(
      'The model provider denied this request. Check your account permissions, region, or quota.'
    )
    expect(runtimePatch).toContain('record.code === "AUTH"')
    expect(runtimePatch).toContain('API key is invalid')
  })
})
