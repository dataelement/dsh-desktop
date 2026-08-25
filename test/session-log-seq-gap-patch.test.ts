import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { patchPath } from './patch-path'

const persistencePatch = patchPath('@deepseek-ai/dsh-session-persistence-jsonl')

describe('session log seq gap recovery patch', () => {
  it('keeps a torn committed log readable instead of throwing on the next turn', async () => {
    const patch = await readFile(persistencePatch, 'utf8')

    // Both historical throw sites in SessionLogScanner.consumeEventLine
    // must be neutralised: a torn write (e.g. crash mid-batch) used to make
    // every later `history` call fail with "history unavailable for session
    // ...", even when the events before the gap were perfectly valid.
    expect(patch).toContain('dsh-desktop patch: do not throw on a previously-recorded issue')
    expect(patch).toContain('dsh-desktop patch: do not throw on a seq gap')
    expect(patch).not.toMatch(/decoded\.some\(\(event\) => event\.type === "turn\/end"\) throw this\.issue/)
    expect(patch).not.toMatch(
      /decoded\.some\(\(candidate\) => candidate\.type === "turn\/end"\) throw this\.issue/
    )
  })

  it('still records the seq gap as an issue for the caller to diagnose', async () => {
    const patch = await readFile(persistencePatch, 'utf8')

    // The fix must not delete the diagnostic — the issue is what the caller's
    // logging will surface so the user can see the corruption even after the
    // scanner keeps the prefix.
    expect(patch).toContain(
      'corrupt session log: seq gap in committed region at line ${this.eventLine} (expected ${expected}, got ${event.seq})'
    )
  })
})
