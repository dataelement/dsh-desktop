import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { patchPath, projectRoot } from './patch-path'

const packages = [
  '@deepseek-ai/dsh-session-title-first-prompt-llm',
  '@deepseek-ai/dsh-session-title-all-prompts-llm'
] as const

async function titleFromOutput(packageName: string): Promise<(text: string) => string> {
  const source = await readFile(path.join(projectRoot, 'node_modules', ...packageName.split('/'), 'lib', 'index.js'), 'utf8')
  const start = source.indexOf('const EMPHASIS_WRAPPER')
  const end = source.indexOf('function titleFromResponse')
  expect(start).toBeGreaterThan(-1)
  expect(end).toBeGreaterThan(start)
  return new Function(`${source.slice(start, end)}\nreturn titleFromOutput;`)() as (text: string) => string
}

describe('session title think tags', () => {
  it.each(packages)('keeps the title after a leaked think block in %s', async (packageName) => {
    const readTitle = await titleFromOutput(packageName)
    expect(readTitle('<think>The user wants a title.</think>\n工作目录路径')).toBe('工作目录路径')
    expect(readTitle('<think>The user wants a title.</think>工作目录路径')).toBe('工作目录路径')
    expect(readTitle('<think>reasoning only, no title')).toBe('')
    expect(readTitle('**问候**')).toBe('问候')
    expect(await readFile(patchPath(packageName), 'utf8')).toContain('replace(/<think>[\\s\\S]*?<\\/think>/giu, "")')
  })
})
