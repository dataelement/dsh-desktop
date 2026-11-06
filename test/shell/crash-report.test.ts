import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { parsePluginOperationRecord } from '@deepseek-ai/dsh-plugin-manager/diagnostic'
import {
  crashReportFileName,
  pruneCrashReports,
  RendererConsoleTail,
  writeCrashReport
} from '../../src/main/shell/crash-report'
import { appendOperationReport } from '../../src/main/shell/operation-report'
import { runOperationReportJob } from '../../src/main/shell/operation-report-job'

const temporary: string[] = []

afterEach(async () => {
  await Promise.all(temporary.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

const appFacts = {
  name: 'DSH Desktop Shell',
  version: '0.0.0',
  platform: 'darwin',
  arch: 'arm64',
  electron: '0',
  node: '0',
  locale: 'zh-CN'
}

describe('crash reports', () => {
  it('writes a private log and removes token query parameters', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'dsh-crash-'))
    temporary.push(directory)
    const time = new Date('2026-11-06T07:08:09.010Z')
    const path = await writeCrashReport(directory, {
      source: 'host',
      phase: 'startup',
      error: new Error('failed http://example.test/?token=secret&next=1'),
      rendererConsole: [],
      app: appFacts,
      time
    })
    expect(path).toBe(join(directory, crashReportFileName(time, 'host')))
    const text = await readFile(path ?? '', 'utf8')
    expect(text).toContain('token=[redacted]')
    expect(text).not.toContain('secret')
    expect(text).toContain('source: host')
    expect((await stat(path ?? '')).mode & 0o777).toBe(0o600)
  })

  it('prunes only aged crash logs', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'dsh-crash-prune-'))
    temporary.push(directory)
    const names = Array.from({ length: 12 }, (_, index) => `crash-2026-11-06T00-00-00-${String(index).padStart(3, '0')}Z-host.log`)
    await Promise.all(names.map(name => writeFile(join(directory, name), 'report\n')))
    await writeFile(join(directory, 'notes.txt'), 'keep\n')
    await pruneCrashReports(directory, 10)
    await expect(readFile(join(directory, names[0] ?? ''), 'utf8')).rejects.toThrow()
    await expect(readFile(join(directory, names[1] ?? ''), 'utf8')).rejects.toThrow()
    expect(await readFile(join(directory, names[2] ?? ''), 'utf8')).toBe('report\n')
    expect(await readFile(join(directory, 'notes.txt'), 'utf8')).toBe('keep\n')
  })

  it('drops the oldest renderer console lines once the byte cap is exceeded', () => {
    const tail = new RendererConsoleTail(8)
    tail.push('12345')
    tail.push('67890')
    expect(tail.snapshot()).toEqual(['67890'])
  })

  it('appends a bounded operation history after the basic report', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'dsh-crash-ops-'))
    temporary.push(directory)
    const report = join(directory, 'crash.log')
    await writeFile(report, 'basic\n')
    const history = join(directory, 'history')
    await mkdir(history)
    const record = parsePluginOperationRecord({
      runId: '11111111-1111-4111-8111-111111111111',
      transportDropped: 0,
      operation: {
        id: '22222222-2222-4222-8222-222222222222',
        time: '2026-11-06T00:00:00.000Z',
        reason: 'install',
        target: 'example-plugin',
        stage: 'install',
        phase: 'settled',
        application: 'failed',
        changed: false,
        version: '1.2.3'
      }
    })
    expect(record).toBeDefined()
    await writeFile(join(history, 'operations.jsonl'), `${JSON.stringify(record)}\n`)
    const limits = { bytes: 64 * 1024, recordBytes: 4096, records: 100, outputBytes: 64 * 1024 }
    const appended = await appendOperationReport(report, history, limits, new AbortController().signal, null)
    expect(appended).toBe(true)
    const text = await readFile(report, 'utf8')
    expect(text.startsWith('basic\n')).toBe(true)
    expect(text).toContain('example-plugin')
    expect(text).toContain('operation history collection complete')
    expect(await appendOperationReport(report, history, { ...limits, outputBytes: 8 }, new AbortController().signal, null)).toBe(false)
    expect(await appendOperationReport(report, history, limits, AbortSignal.abort(), null)).toBe(false)
  })

  it('does not start collection after the caller has already cancelled', async () => {
    await expect(runOperationReportJob({
      reportPath: 'missing.log',
      directory: 'missing',
      limits: { bytes: 64 * 1024, recordBytes: 4096, records: 100, outputBytes: 64 * 1024 },
      journal: null
    }, { timeoutMs: 500, cancellationGraceMs: 100 }, AbortSignal.abort())).resolves.toEqual({
      appended: false,
      timedOut: false,
      cancelled: true
    })
    await expect(runOperationReportJob({
      reportPath: 'missing.log',
      directory: 'missing',
      limits: { bytes: 1, recordBytes: 1, records: 1, outputBytes: 1 },
      journal: null
    }, { timeoutMs: 100, cancellationGraceMs: 100 }, new AbortController().signal)).rejects.toThrow(RangeError)
  })
})