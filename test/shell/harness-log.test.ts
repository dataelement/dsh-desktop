import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { tailLog } from '../../src/main/desktop-service/service'
import { latestHarnessAttemptLogs } from '../../src/main/recovery/harness-log'
import { HarnessLog } from '../../src/main/shell/harness-log'

const temporary: string[] = []

afterEach(async () => {
  await Promise.all(temporary.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

describe('harness log', () => {
  it('keeps a child process tail that parsers and crash upload can read', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'harness-log-'))
    temporary.push(directory)
    const path = join(directory, 'harness.log')
    const log = new HarnessLog(path)
    log.beginLaunch('startup')
    log.note('[desktop] starting 2020-01-01T00:00:00.000Z')
    log.note('[desktop] older noise')
    log.note('[desktop] starting 2026-11-16T00:00:00.000Z')
    const child = spawn(process.execPath, ['-e', [
      "process.stdout.write('hello stdout\\npartial')",
      "process.stderr.write('boom stderr\\nhttp://127.0.0.1:9/?token=secret\\n')"
    ].join('\n')])
    child.stdout?.setEncoding('utf8')
    child.stderr?.setEncoding('utf8')
    child.stdout?.on('data', (chunk: string) => { log.writeProcessOutput('stdout', chunk) })
    child.stderr?.on('data', (chunk: string) => { log.writeProcessOutput('stderr', chunk) })
    await once(child, 'close')
    log.finishProcessOutput()
    await log.flush()

    const text = await readFile(path, 'utf8')
    expect(text).toContain('[stdout] hello stdout')
    expect(text).toContain('[stdout] partial')
    expect(text).toContain('[stderr] boom stderr')
    expect(text).toContain('token=[redacted]')
    expect(text.includes('token=secret')).toBe(false)
    const attempt = latestHarnessAttemptLogs(log.recentLines())
    expect(attempt.some(line => line.includes('older noise'))).toBe(false)
    expect(attempt.some(line => line.includes('[stdout] hello stdout'))).toBe(true)
    const tailed = tailLog(path)
    expect(tailed.logStatus).toBe('ok')
    expect(tailed.lines.some(line => line.includes('hello stdout'))).toBe(true)

    const appended = new HarnessLog(path)
    appended.note('[desktop] appended')
    await appended.flush()
    const again = await readFile(path, 'utf8')
    expect(again).toContain('hello stdout')
    expect(again).toContain('[desktop] appended')
  })

  it('keeps a host diagnostic in the tail crash upload reads', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'harness-log-'))
    temporary.push(directory)
    const path = join(directory, 'harness.log')
    const log = new HarnessLog(path)
    log.beginLaunch('startup')
    log.writeProcessOutput('stderr', 'partial without newline')
    log.finishProcessOutput()
    log.noteHostDiagnostic([
      'Configuration file: startup.yml',
      '--- startup entries ---',
      'http://127.0.0.1/?token=secret',
      'x'.repeat(1800)
    ].join('\n'))
    await log.flush()

    const text = await readFile(path, 'utf8')
    expect(text).toContain('[stderr] partial without newline')
    expect(text).toContain('[desktop] host diagnostic:')
    expect(text).toContain('Configuration file: startup.yml')
    expect(text).toContain('token=[redacted]')
    expect(text.includes('token=secret')).toBe(false)
    const tailed = tailLog(path)
    expect(tailed.logStatus).toBe('ok')
    expect(tailed.lines.some(line => line.includes('partial without newline'))).toBe(true)
    expect(tailed.lines.some(line => line.includes('startup entries'))).toBe(true)
    expect(tailed.lines.some(line => line.includes('token=secret'))).toBe(false)
    expect(tailed.lines.some(line => line.includes('x'.repeat(1800)))).toBe(true)
  })
})
