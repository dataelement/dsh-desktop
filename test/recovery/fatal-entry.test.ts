import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { clearFatalReport, FATAL_REPORT_NAME, readFatalReport, recordFatalFailure } from '../../src/main/recovery/fatal-entry'

const temporary: string[] = []

afterEach(async () => {
  await Promise.all(temporary.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

describe('fatal report', () => {
  it('stores a redacted failure and reads it back', async () => {
    const home = await mkdtemp(join(tmpdir(), 'dsh-fatal-'))
    temporary.push(home)
    const error = Object.assign(new Error('http://127.0.0.1:9/?token=secret'), {
      diagnostic: 'url http://127.0.0.1:9/?token=secret&x=1'
    })
    const stored = await recordFatalFailure(home, error)
    expect(stored.message).toBe('http://127.0.0.1:9/?token=[redacted]')
    expect(stored.diagnostic).toBe('url http://127.0.0.1:9/?token=[redacted]&x=1')
    expect(stored.version).toBe(1)
    expect(await readFatalReport(home)).toEqual(stored)
    const text = await readFile(join(home, FATAL_REPORT_NAME), 'utf8')
    expect(text.includes('secret')).toBe(false)
    await clearFatalReport(home)
    expect(await readFatalReport(home)).toBeUndefined()
  })

  it('accepts a partial or unreadable report', async () => {
    const home = await mkdtemp(join(tmpdir(), 'dsh-fatal-'))
    temporary.push(home)
    expect(await readFatalReport(home)).toBeUndefined()
    await writeFile(join(home, FATAL_REPORT_NAME), '{')
    expect(await readFatalReport(home)).toBeUndefined()
    await writeFile(join(home, FATAL_REPORT_NAME), JSON.stringify({ message: 'kept', extra: 1 }))
    expect(await readFatalReport(home)).toEqual({ message: 'kept' })
  })
})

describe('recovery boundaries', () => {
  it('keeps the fatal entry off Electron and the shell off the official dialog', async () => {
    const entry = await readFile(join(import.meta.dirname, '../../src/main/recovery/fatal-entry.ts'), 'utf8')
    const shell = await readFile(join(import.meta.dirname, '../../src/main/shell/app.ts'), 'utf8')
    const host = await readFile(join(import.meta.dirname, '../../src/host/index.ts'), 'utf8')
    expect(entry.includes("from 'electron'")).toBe(false)
    expect(entry.includes("from '../shell/")).toBe(false)
    expect(shell.includes('recordFatalFailure')).toBe(true)
    expect(shell.includes('DesktopFatalRecovery')).toBe(false)
    expect(shell.includes('../update/update-manager')).toBe(true)
    expect(shell.includes('mandatory-update')).toBe(false)
    expect(shell.includes('../index')).toBe(false)
    expect(host.includes("from 'electron'")).toBe(false)
    expect(host.includes("from '../main/")).toBe(false)
  })
})
