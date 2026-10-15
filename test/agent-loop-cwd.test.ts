import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { patchPath, projectRoot } from './patch-path'

describe('agent loop working directory variable', () => {
  it('fills {{cwd}} from the session header', async () => {
    const source = await readFile(
      path.join(projectRoot, 'node_modules', '@deepseek-ai', 'dsh-agent-loop', 'lib', 'index.js'),
      'utf8'
    )
    const marker = 'ctx.systemPrompt.variable("cwd", '
    const start = source.indexOf(marker)
    expect(start).toBeGreaterThan(-1)
    const end = source.indexOf(');', start)
    const readCwd = new Function(`return ${source.slice(start + marker.length, end)}`)() as (
      context: { agent?: { session: { header: { cwd?: string } } } }
    ) => string | undefined

    expect(readCwd({ agent: { session: { header: { cwd: '/tmp/work' } } } })).toBe('/tmp/work')
    expect(readCwd({})).toBeUndefined()
    expect(await readFile(patchPath('@deepseek-ai/dsh-agent-loop'), 'utf8')).toContain(marker.trim())
  })
})
