import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { patchPath, projectRoot } from './patch-path'

const commandCompact = path.join(
  projectRoot,
  'node_modules',
  '@deepseek-ai',
  'dsh-command-compact',
  'lib',
  'index.js'
)

const compactionBasic = path.join(
  projectRoot,
  'node_modules',
  '@deepseek-ai',
  'dsh-compaction-basic',
  'lib',
  'index.js'
)

interface Outcome {
  kind: string
  text: string
}

/**
 * The `/compact` command is refused through `ManualCompactionError` codes. Two
 * very different situations used to share one code and one sentence: the agent
 * still finishing its turn (clears by itself in seconds) and the shared durable
 * compaction lock (does not). A user who ran `/compact` right after watching the
 * agent answer saw a message claiming the agent was not idle and could not tell
 * which situation they were in.
 */
describe('DSH Desktop manual compaction refusals', () => {
  async function classifier(): Promise<(error: { code: string }) => Outcome> {
    const module = (await import(commandCompact)) as {
      expectedFailure(error: { code: string }): Outcome
    }
    if (typeof module.expectedFailure !== 'function') {
      throw new Error('dsh-command-compact exports no failure classifier')
    }
    return module.expectedFailure
  }

  it('tells the user to wait when the agent is still working', async () => {
    const expectedFailure = await classifier()
    const outcome = expectedFailure({ code: 'agent-busy' })

    expect(outcome.kind).toBe('error')
    expect(outcome.text).toContain('still working')
    expect(outcome.text).toContain('/compact again')
  })

  it('keeps the lock wording for an active compaction or held lock', async () => {
    const expectedFailure = await classifier()
    const outcome = expectedFailure({ code: 'busy' })

    expect(outcome.kind).toBe('error')
    expect(outcome.text).toContain('compaction lock')
    // The agent-idle claim belongs to the agent-busy case alone.
    expect(outcome.text).not.toContain('agent is not idle')
  })

  it('still classifies every other compaction failure', async () => {
    const expectedFailure = await classifier()

    for (const code of ['cancelled', 'changed', 'summary', 'commit', 'persistence']) {
      const outcome = expectedFailure({ code })
      expect(outcome.kind).toBe('error')
      expect(outcome.text.length).toBeGreaterThan(0)
    }
  })

  it('separates a running agent from the durable lock at the refusal boundary', async () => {
    const client = await readFile(compactionBasic, 'utf8')

    expect(client).toContain('function isAgentWorkingError(error)')
    expect(client).toContain('if (isAgentWorkingError(error)) throw new ManualCompactionError("agent-busy"')
    // The other maintenance refusal stays on the generic code.
    expect(client).toContain('throw new ManualCompactionError("busy", "manual compaction requires an idle agent')
  })

  it('recognizes the agent-loop maintenance refusal and nothing else', async () => {
    const client = await readFile(compactionBasic, 'utf8')
    const literal = client.match(/function isAgentWorkingError\(error\) \{\n\treturn (.*)\n\}/u)?.[1]

    expect(literal).toBeDefined()
    const pattern = literal?.slice(literal.indexOf('/'), literal.lastIndexOf('/u') + 2)
    const matches = (message: string) =>
      new RegExp(pattern?.slice(1, -2) ?? '', 'u').test(message)

    // This is the exact text AgentLoop.runMaintenance raises for a busy phase.
    expect(matches('agent "session-1" already has active work')).toBe(true)
    // A durability refusal from the compaction lock must not be captured here.
    expect(matches('compaction: compaction already in progress; the session compaction lock is already active')).toBe(false)
    expect(matches('manual compaction: the session already has an open turn')).toBe(false)
  })

  it('carries both refusals in the reproducible dependency patches', async () => {
    const compactionPatch = await readFile(patchPath('@deepseek-ai/dsh-compaction-basic'), 'utf8')
    const commandPatch = await readFile(patchPath('@deepseek-ai/dsh-command-compact'), 'utf8')

    expect(compactionPatch).toContain('"agent-busy"')
    expect(compactionPatch).toContain('isAgentWorkingError')
    expect(commandPatch).toContain('case "agent-busy"')
    expect(commandPatch).toContain('export { apply, expectedFailure, inject, name };')
  })
})
