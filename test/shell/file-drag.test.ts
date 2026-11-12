import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it } from 'vitest'
import { localDragResource } from '../../src/host/file-drag'
import { DragFiles } from '../../src/main/shell/file-drag-files'
import { sessionFileAddress } from '@deepseek-ai/dsh-util-workspace-path'

const temporary: string[] = []

afterEach(async () => {
  await Promise.all(temporary.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

describe('file drag', () => {
  it('writes a temporary copy and removes it on release', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-file-drag-'))
    temporary.push(root)
    const files = new DragFiles(root)
    const handle = await files.prepare(Buffer.from('hello'), { mediaType: 'text/plain', name: 'note.txt' })
    const path = files.take(handle, false)
    expect(path).toBeDefined()
    if (path === undefined) return
    expect(await readFile(path, 'utf8')).toBe('hello')
    await files.release(handle)
    await expect(readFile(path, 'utf8')).rejects.toThrow()
    await files.dispose()
  })

  it('refuses an address that is not a session file', async () => {
    const ctx = new Context()
    await expect(localDragResource(ctx, 'dsh-resource://file/absolute/tmp/secret')).rejects.toThrow('Session')
    await expect(localDragResource(ctx, sessionFileAddress('session-1', 'notes/a.txt'))).rejects.toThrow('File access unavailable')
  })
})