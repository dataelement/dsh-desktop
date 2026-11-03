import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import SessionStore, { SESSION_FORMAT_VERSION, SessionId, SessionSeq } from '@deepseek-ai/dsh-session'
import * as JsonlSessionPersistence from '@deepseek-ai/dsh-session-persistence-jsonl'
import '@deepseek-ai/dsh-session-persistence'

describe('Corrupt session log tolerance', () => {
  it('gracefully skips and renames corrupt session logs during listArtifacts', async () => {
    const rootDir = await mkdtemp(join(tmpdir(), 'dsh-corrupt-session-test-'))
    const otherDir = await mkdtemp(join(tmpdir(), 'dsh-other-workspace-'))
    try {
      const sessionsDir = join(rootDir, 'sessions')
      const ctx = new Context()
      await ctx.plugin(SessionStore)
      await ctx.plugin(JsonlSessionPersistence, { root: sessionsDir, compression: 'none' })

      const handle = await ctx.sessionPersistence.create({
        version: SESSION_FORMAT_VERSION,
        id: SessionId('session-valid-1'),
        createdAt: Date.now(),
        isSeeded: false,
        cwd: otherDir
      })
      await handle.append([{ type: 'turn/start', seq: SessionSeq(0), time: 1, data: { turn: 1 } }])
      await handle.flush()
      await handle.close()

      interface JsonlArtifactPersistence {
        listGenerations(): Promise<{ sourcePath: string }[]>
        listArtifacts(): Promise<{ header: { id: string } }[]>
      }
      const persistence = ctx.sessionPersistence as unknown as JsonlArtifactPersistence

      const gens = await persistence.listGenerations()
      const content = await readFile(gens[0]!.sourcePath, 'utf8')

      // Place a duplicate/corrupt copy in a mismatched workspace folder
      const mismatchedDir = join(sessionsDir, '--fake-project--', 'session-valid-1')
      await mkdir(mismatchedDir, { recursive: true })
      const corruptFile = join(mismatchedDir, 'session.v4.jsonl')
      await writeFile(corruptFile, content)

      // listArtifacts must not throw; it should cleanly skip the corrupt session log
      const artifacts = await persistence.listArtifacts()
      expect(artifacts).toHaveLength(1)
      expect(artifacts[0]!.header.id).toBe('session-valid-1')
    } finally {
      await rm(rootDir, { recursive: true, force: true })
      await rm(otherDir, { recursive: true, force: true })
    }
  })
})
