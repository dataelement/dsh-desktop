import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const projectRoot = path.resolve(import.meta.dirname, '..')

describe('assistant local path links', () => {
  it('links Codex-style path references even when they are not turn deliverables', async () => {
    const patch = await readFile(
      path.join(
        projectRoot,
        'patches',
        '@deepseek-ai+dsh-client-ui-deliverables+0.1.0-rc.6.patch'
      ),
      'utf8'
    )

    expect(patch).toContain('localPathReference(value)')
    expect(patch).toContain('paths ?? []')
    expect(patch).toContain('#L\\d+')
    expect(patch).toContain('[A-Za-z]:[\\\\/]')
    expect(patch).toContain('owner.openFile')
  })
})
