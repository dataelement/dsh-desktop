import { homedir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { LocalFileSystem } from '@deepseek-ai/dsh-fs-local'
import { runRipgrep } from '@deepseek-ai/dsh-tool-fs-search'

describe('filesystem tool recovery', () => {
  it('resolves a leading home shorthand outside the session workspace', async () => {
    const filesystem = new LocalFileSystem(new Context(), {
      cwd: '/tmp/sherlock-empty-workspace',
      diffBasisMaxBytes: 1024
    })

    const target = await filesystem.resolve('~/.agents/skills/example/SKILL.md')

    expect(target.displayPath).toBe(
      path.join(homedir(), '.agents/skills/example/SKILL.md')
    )
  })

  it('treats an empty ripgrep search scope as a successful zero-match result', async () => {
    const workdir = '/tmp/sherlock-empty-workspace'
    const stream = (text: string) => ({
      readFrom: () => ({ text, lossy: false })
    })
    const ctx = {
      subprocess: {
        spawn: () => ({
          done: Promise.resolve({ exitCode: 2, signal: null }),
          collected: {
            stdout: stream(''),
            stderr: stream(
              'rg: No files were searched, which means ripgrep probably applied a filter you did not expect.\n'
            )
          }
        })
      }
    }
    const exec = {
      signal: new AbortController().signal,
      agent: { session: { header: { cwd: workdir } } }
    }

    await expect(
      runRipgrep(
        ctx as never,
        exec as never,
        'grep',
        ['--json', '--regexp=version'],
        20_000_000,
        3_000,
        64 * 1024
      )
    ).resolves.toEqual({
      stdout: '',
      noMatches: true,
      workdir
    })
  })
})
