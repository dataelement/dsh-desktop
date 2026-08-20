import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const projectRoot = path.resolve(import.meta.dirname, '..')

describe('DSH Desktop available-model picker', () => {
  it('retains the rc.8 state-driven select-all toggle', async () => {
    const installed = await readFile(
      path.join(
        projectRoot,
        'node_modules',
        '@deepseek-ai',
        'dsh-client-ui-settings-models',
        'lib',
        'client.js'
      ),
      'utf8'
    )

    expect(installed).toContain('const allCandidatesPicked =')
    expect(installed).toContain(
      'activeCandidates.every((candidate) => picked.has(candidate.id))'
    )
    expect(installed).toContain(
      'children: t(allCandidatesPicked ? "fetchDeselectAll" : "fetchSelectAll")'
    )
    expect(installed).toContain(
      'new Set(activeCandidates.map((candidate) => candidate.id))'
    )
  })

  it('includes English and Chinese copy for both toggle states', async () => {
    const installed = await readFile(
      path.join(
        projectRoot,
        'node_modules',
        '@deepseek-ai',
        'dsh-client-ui-settings-models',
        'lib',
        'client.js'
      ),
      'utf8'
    )

    expect(installed).toContain('fetchSelectAll: "Select all"')
    expect(installed).toContain('fetchDeselectAll: "Deselect all"')
    expect(installed).toContain('fetchSelectAll: "全选"')
    expect(installed).toContain('fetchDeselectAll: "取消全选"')
  })
})
