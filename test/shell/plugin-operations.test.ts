import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ protocol: { registerSchemesAsPrivileged: vi.fn(), handle: vi.fn() } }))

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parsePluginOperationRecord, type PluginOperationRecord } from '@deepseek-ai/dsh-plugin-manager/diagnostic'
import { OperationJournal } from '../../src/main/shell/operation-journal'
import { formatPluginOperation, pluginOperationDirectory, readRecentPluginOperations } from '../../src/main/shell/plugin-operations'
import { startupRecoveryViewModel } from '../../src/main/shell/startup-recovery'

const temporary: string[] = []

afterEach(async () => {
  await Promise.all(temporary.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

function record(target: string): PluginOperationRecord {
  const parsed = parsePluginOperationRecord({
    runId: '11111111-1111-4111-8111-111111111111',
    transportDropped: 0,
    operation: {
      id: '22222222-2222-4222-8222-222222222222',
      time: '2026-11-06T00:00:00.000Z',
      reason: 'install',
      target,
      stage: 'install',
      phase: 'settled',
      application: 'failed',
      changed: false,
      version: '1.2.3'
    }
  })
  if (parsed === undefined) throw new Error('operation fixture was rejected')
  return parsed
}

describe('plugin operation journal', () => {
  it('keeps a recent line without placing it on the recovery page', async () => {
    const userData = await mkdtemp(join(tmpdir(), 'dsh-plugin-operations-'))
    temporary.push(userData)
    const directory = pluginOperationDirectory(userData)
    const journal = new OperationJournal(directory, {
      segmentBytes: 256 * 1024,
      recordBytes: 4096,
      queuedBytes: 64 * 1024
    })
    expect(journal.enqueue(JSON.stringify(record('example-plugin')))).toBe(true)
    expect(journal.enqueue('{"secret":"not-an-operation"}')).toBe(true)
    await journal.close()
    const lines = await readRecentPluginOperations(directory, 12)
    expect(lines).toEqual([formatPluginOperation(record('example-plugin'))])
    expect(lines[0]).toContain('example-plugin@1.2.3')
    expect(lines[0]).not.toContain('secret')
    const model = startupRecoveryViewModel({
      message: 'example-plugin failed',
      plugins: ['example-plugin'],
      launchDirectory: '/tmp/profile',
      locale: 'zh',
      logs: lines
    })
    expect(model.repairDetails?.some(line => line.includes('example-plugin@1.2.3'))).toBe(false)
    expect(model.rawError).toBe('example-plugin failed')
    expect(model.summary).not.toContain('插件操作')
  })
})