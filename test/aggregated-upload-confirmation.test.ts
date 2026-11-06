import { describe, expect, it, vi } from 'vitest'
import { createAggregatedUploadConfirmation } from '../src/main/desktop-service'
import { attachDiagnostics } from '../src/main/desktop-service/diagnostics'
import { EventEmitter } from 'node:events'

describe('createAggregatedUploadConfirmation', () => {
  it('shows exactly one dialog for a batch of pending reports when user approves', async () => {
    const showMessageBox = vi.fn().mockResolvedValue({ response: 1 })
    let pendingCount = 3
    const confirmation = createAggregatedUploadConfirmation({
      showMessageBox,
      getPendingCount: () => pendingCount,
      maxReportsPerLaunch: 5,
      getLocale: () => 'zh'
    })

    const body1 = JSON.stringify({ version: '0.13.1', kind: 'startup-failure', lines: ['err1'] })
    const body2 = JSON.stringify({ version: '0.13.1', kind: 'startup-failure', lines: ['err2'] })
    const body3 = JSON.stringify({ version: '0.13.1', kind: 'startup-failure', lines: ['err3'] })

    const res1 = await confirmation.confirmUpload(body1)
    pendingCount = 2
    const res2 = await confirmation.confirmUpload(body2)
    pendingCount = 1
    const res3 = await confirmation.confirmUpload(body3)

    expect(showMessageBox).toHaveBeenCalledTimes(1)
    expect(res1).toBe(true)
    expect(res2).toBe(true)
    expect(res3).toBe(true)
    expect(confirmation.getStatus()).toBe('approved')
    expect(confirmation.getUploadedCount()).toBe(3)
  })

  it('shows exactly one dialog and discards all reports when user rejects', async () => {
    const showMessageBox = vi.fn().mockResolvedValue({ response: 0 })
    const confirmation = createAggregatedUploadConfirmation({
      showMessageBox,
      getPendingCount: () => 2,
      getLocale: () => 'zh'
    })

    const body1 = JSON.stringify({ version: '0.13.1', kind: 'startup-failure', lines: ['err1'] })
    const body2 = JSON.stringify({ version: '0.13.1', kind: 'startup-failure', lines: ['err2'] })

    const res1 = await confirmation.confirmUpload(body1)
    const res2 = await confirmation.confirmUpload(body2)

    expect(showMessageBox).toHaveBeenCalledTimes(1)
    expect(res1).toBe(false)
    expect(res2).toBe(false)
    expect(confirmation.getStatus()).toBe('rejected')
  })

  it('never pops up a second time in the same launch session even if new errors arrive later', async () => {
    const showMessageBox = vi.fn().mockResolvedValue({ response: 1 })
    const confirmation = createAggregatedUploadConfirmation({
      showMessageBox,
      maxReportsPerLaunch: 2,
      getLocale: () => 'zh'
    })

    const body1 = JSON.stringify({ version: '0.13.1', kind: 'startup-failure', lines: ['err1'] })
    const res1 = await confirmation.confirmUpload(body1)
    expect(showMessageBox).toHaveBeenCalledTimes(1)
    expect(res1).toBe(true)

    // Later in the same launch, another error happens
    const body2 = JSON.stringify({ version: '0.13.1', kind: 'renderer-crash', lines: ['err2'] })
    const res2 = await confirmation.confirmUpload(body2)
    expect(showMessageBox).toHaveBeenCalledTimes(1) // Still 1!
    expect(res2).toBe(true)

    // Exceeding max reports per launch caps uploads without prompting
    const body3 = JSON.stringify({ version: '0.13.1', kind: 'gpu-crash', lines: ['err3'] })
    const res3 = await confirmation.confirmUpload(body3)
    expect(showMessageBox).toHaveBeenCalledTimes(1) // Still 1!
    expect(res3).toBe(false)
  })

  it('aggregates count in detail message when multiple failures are pending', async () => {
    let capturedOptions: any
    const showMessageBox = vi.fn().mockImplementation(async opts => {
      capturedOptions = opts
      return { response: 1 }
    })
    const confirmation = createAggregatedUploadConfirmation({
      showMessageBox,
      getPendingCount: () => 2,
      getLocale: () => 'zh'
    })

    const body = JSON.stringify({ version: '0.13.1', kind: 'harness-crash', lines: ['err'] })
    await confirmation.confirmUpload(body)

    expect(capturedOptions.detail).toContain('本次聚合 3 项故障报告')
  })

  it('renders the consent dialog in English for non-Chinese locales (#855)', async () => {
    let capturedOptions: Electron.MessageBoxOptions | undefined
    const showMessageBox = vi.fn().mockImplementation(async opts => {
      capturedOptions = opts
      return { response: 1 }
    })
    const confirmation = createAggregatedUploadConfirmation({
      showMessageBox,
      getPendingCount: () => 2,
      getLocale: () => 'en'
    })

    const body = JSON.stringify({ version: '0.13.1', kind: 'harness-crash', lines: ['err'] })
    await confirmation.confirmUpload(body)

    expect(capturedOptions, 'the consent dialog was shown').toBeDefined()
    expect(capturedOptions?.title).toBe('Send crash report')
    expect(capturedOptions?.message).toBe('Send this crash report to help diagnose the problem?')
    expect(capturedOptions?.buttons).toEqual(["Don't send", 'Send once'])
    // Every interpolated value is present and the aggregation clause follows
    // the active locale; no CJK text may leak into the dialog — the ranges
    // cover punctuation blocks and ideographs, not just Han characters.
    expect(capturedOptions?.detail).toContain('Version: 0.13.1')
    expect(capturedOptions?.detail).toContain('Failure type: harness-crash (3 crash reports aggregated this time)')
    expect(capturedOptions?.detail).toContain('1 line(s) this time')
    expect(capturedOptions?.detail).not.toMatch(/[\u3000-\u30ff\u4e00-\u9fff\uff00-\uffef]/u)
  })

  it('resolves the locale per prompt so a mid-session language switch is honored (#855)', async () => {
    const seen: string[] = []
    let locale: 'en' | 'zh' = 'zh'
    const confirmation = createAggregatedUploadConfirmation({
      showMessageBox: async opts => {
        seen.push(opts.title as string)
        return { response: 0 }
      },
      getLocale: () => locale
    })

    const body = JSON.stringify({ version: '0.13.1', kind: 'startup-failure', lines: ['e'] })
    await confirmation.confirmUpload(body)
    // Rejected: no second prompt in this session, so switch sessions to observe again.
    confirmation.resetForTesting()
    locale = 'en'
    await confirmation.confirmUpload(body)
    expect(seen).toEqual(['发送故障报告', 'Send crash report'])
  })
})

describe('diagnostics rapid error deduplication', () => {
  it('deduplicates identical error events occurring within dedupe window', () => {
    const app = new EventEmitter()
    const capture = vi.fn()
    const mockService = {
      beginSession: vi.fn(),
      capture,
      flush: vi.fn().mockResolvedValue(undefined),
      markCleanExit: vi.fn()
    } as any

    const diagnostics = attachDiagnostics(app, mockService, { dedupeWindowMs: 5000 })

    // Emit identical GPU crash twice rapidly
    app.emit('child-process-gone', {}, { type: 'GPU', reason: 'crashed', exitCode: 1 })
    app.emit('child-process-gone', {}, { type: 'GPU', reason: 'crashed', exitCode: 1 })

    // Only captured once
    expect(capture).toHaveBeenCalledTimes(1)

    // Different exit code is captured
    app.emit('child-process-gone', {}, { type: 'GPU', reason: 'crashed', exitCode: 2 })
    expect(capture).toHaveBeenCalledTimes(2)

    diagnostics.dispose()
  })

  it('defaults to 10-minute deduplication window when dedupeWindowMs is omitted', () => {
    vi.useFakeTimers()
    try {
      const app = new EventEmitter()
      const capture = vi.fn()
      const mockService = {
        beginSession: vi.fn(),
        capture,
        flush: vi.fn().mockResolvedValue(undefined),
        markCleanExit: vi.fn()
      } as any

      const diagnostics = attachDiagnostics(app, mockService)

      app.emit('child-process-gone', {}, { type: 'GPU', reason: 'crashed', exitCode: 1 })
      expect(capture).toHaveBeenCalledTimes(1)

      // 9 minutes later: still within 10-minute window, suppressed
      vi.advanceTimersByTime(9 * 60 * 1000)
      app.emit('child-process-gone', {}, { type: 'GPU', reason: 'crashed', exitCode: 1 })
      expect(capture).toHaveBeenCalledTimes(1)

      // Advance past 10 minutes (total 10.5 minutes): allowed again
      vi.advanceTimersByTime(1.5 * 60 * 1000)
      app.emit('child-process-gone', {}, { type: 'GPU', reason: 'crashed', exitCode: 1 })
      expect(capture).toHaveBeenCalledTimes(2)

      diagnostics.dispose()
    } finally {
      vi.useRealTimers()
    }
  })
})

