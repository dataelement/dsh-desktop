import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import {
  HARNESS_APP_URL,
  HarnessRestartSessions,
  harnessResumeUrl,
  resumeHarnessRestart,
  runHarnessRestart,
  type HarnessRestartSteps
} from '../../src/main/shell/harness-restart'

function gate(): { promise: Promise<void>; release: () => void } {
  let release: () => void = () => undefined
  const promise = new Promise<void>(resolve => { release = resolve })
  return { promise, release }
}

function steps(sessions: HarnessRestartSessions, sessionId: number, overrides: Partial<HarnessRestartSteps> = {}): HarnessRestartSteps {
  return {
    sessionId,
    isCurrent: id => sessions.isCurrent(id),
    end: id => sessions.end(id),
    cancelled: () => false,
    blocked: () => false,
    showWaiting: async () => true,
    stop: async () => undefined,
    start: async () => undefined,
    resume: async () => true,
    recoverDocument: () => undefined,
    reportStopFailure: async () => undefined,
    ...overrides
  }
}

describe('harness restart navigation', () => {
  it('keeps the application path, query, and hash, and rejects a different origin', () => {
    expect(harnessResumeUrl('dsh-app://app/workspace/1?tab=files#section')).toBe('dsh-app://app/workspace/1?tab=files#section')
    expect(harnessResumeUrl('dsh-app://app:8443/workspace')).toBe(HARNESS_APP_URL)
    expect(harnessResumeUrl('dsh-app://user:secret@app/workspace')).toBe(HARNESS_APP_URL)
    expect(harnessResumeUrl('https://app/workspace')).toBe(HARNESS_APP_URL)
    expect(harnessResumeUrl('not a url')).toBe(HARNESS_APP_URL)
  })

  it('does not stop until the waiting page settles, or start until the stop settles', async () => {
    const sessions = new HarnessRestartSessions()
    const session = sessions.begin('dsh-app://app/chat?id=1#top')
    expect(session).toBeDefined()
    const waiting = gate()
    const stopping = gate()
    const calls: string[] = []
    const restart = runHarnessRestart(steps(sessions, session!.id, {
      showWaiting: () => {
        calls.push('waiting')
        return waiting.promise.then(() => true)
      },
      stop: () => {
        calls.push('stop')
        return stopping.promise
      },
      start: async () => { calls.push('start') }
    }))
    await Promise.resolve()
    expect(calls).toEqual(['waiting'])
    expect(sessions.begin('dsh-app://app/other')).toBeUndefined()
    expect(sessions.resumeUrl(session!.id)).toBe('dsh-app://app/chat?id=1#top')
    waiting.release()
    await Promise.resolve()
    await Promise.resolve()
    expect(calls).toEqual(['waiting', 'stop'])
    stopping.release()
    await restart
    expect(calls).toEqual(['waiting', 'stop', 'start'])
  })

  it('continues after an ordinary waiting-page failure', async () => {
    const sessions = new HarnessRestartSessions()
    const session = sessions.begin('dsh-app://app/')!
    const calls: string[] = []
    const resumed = await runHarnessRestart(steps(sessions, session.id, {
      showWaiting: async () => false,
      stop: async () => { calls.push('stop') },
      start: async () => { calls.push('start') }
    }))
    expect(resumed).toBe(true)
    expect(calls).toEqual(['stop', 'start'])
    expect(sessions.current()).toBeUndefined()
  })

  it('ends the session when stop fails and reports that failure without starting', async () => {
    const sessions = new HarnessRestartSessions()
    const session = sessions.begin('dsh-app://app/keep')!
    const calls: string[] = []
    let reported: unknown
    let openWhenReported = true
    const resumed = await runHarnessRestart(steps(sessions, session.id, {
      stop: async () => { throw new Error('stop failed') },
      start: async () => { calls.push('start') },
      resume: async () => { calls.push('resume'); return true },
      reportStopFailure: async error => {
        reported = error
        openWhenReported = sessions.isCurrent(session.id)
      }
    }))
    expect(resumed).toBe(false)
    expect(calls).toEqual([])
    expect(reported).toBeInstanceOf(Error)
    expect((reported as Error).message).toBe('stop failed')
    expect(openWhenReported).toBe(false)
    expect(sessions.current()).toBeUndefined()
  })

  it('keeps the session when start fails and does not load the application', async () => {
    const sessions = new HarnessRestartSessions()
    const session = sessions.begin('dsh-app://app/keep?x=1')!
    const calls: string[] = []
    const resumed = await runHarnessRestart(steps(sessions, session.id, {
      start: async () => { throw new Error('start failed') },
      resume: async () => { calls.push('resume'); return true },
      recoverDocument: () => { calls.push('recover') }
    }))
    expect(resumed).toBe(false)
    expect(calls).toEqual([])
    expect(sessions.resumeUrl(session.id)).toBe('dsh-app://app/keep?x=1')
    expect(sessions.begin('dsh-app://app/other')).toBeUndefined()
    expect(sessions.resumeUrl(session.id)).toBe('dsh-app://app/keep?x=1')
  })

  it('loads the same saved address when a later host retry succeeds', async () => {
    const sessions = new HarnessRestartSessions()
    const session = sessions.begin('dsh-app://app/keep?x=1#row')!
    await runHarnessRestart(steps(sessions, session.id, {
      start: async () => { throw new Error('start failed') }
    }))
    const loaded: string[] = []
    const resumed = await resumeHarnessRestart(steps(sessions, session.id, {
      resume: async () => {
        loaded.push(sessions.resumeUrl(session.id) ?? '')
        return true
      }
    }))
    expect(resumed).toBe(true)
    expect(loaded).toEqual(['dsh-app://app/keep?x=1#row'])
    expect(sessions.current()).toBeUndefined()
  })

  it('recovers the document when the saved page does not load', async () => {
    const sessions = new HarnessRestartSessions()
    const session = sessions.begin('dsh-app://app/')!
    let recovered = false
    const resumed = await runHarnessRestart(steps(sessions, session.id, {
      resume: async () => false,
      recoverDocument: () => { recovered = true }
    }))
    expect(resumed).toBe(false)
    expect(recovered).toBe(true)
    expect(sessions.current()).toBeUndefined()
  })

  it('does not recover the document while process recovery already owns the window', async () => {
    const sessions = new HarnessRestartSessions()
    const session = sessions.begin('dsh-app://app/')!
    let blocked = false
    let recovered = false
    const resumed = await runHarnessRestart(steps(sessions, session.id, {
      resume: async () => {
        blocked = true
        return false
      },
      blocked: () => blocked,
      recoverDocument: () => { recovered = true }
    }))
    expect(resumed).toBe(false)
    expect(recovered).toBe(false)
    expect(sessions.current()).toBeUndefined()
  })

  it('does not stop or navigate once the restart is cancelled', async () => {
    const sessions = new HarnessRestartSessions()
    const session = sessions.begin('dsh-app://app/')!
    const calls: string[] = []
    const resumed = await runHarnessRestart(steps(sessions, session.id, {
      showWaiting: async () => true,
      cancelled: () => true,
      stop: async () => { calls.push('stop') },
      start: async () => { calls.push('start') },
      resume: async () => { calls.push('resume'); return true }
    }))
    expect(resumed).toBe(false)
    expect(calls).toEqual([])
    expect(sessions.current()).toBeUndefined()
  })

  it('ignores a late resume after the session has been replaced', async () => {
    const sessions = new HarnessRestartSessions()
    const first = sessions.begin('dsh-app://app/first')!
    const waiting = gate()
    let recovered = false
    const pending = resumeHarnessRestart(steps(sessions, first.id, {
      resume: () => waiting.promise.then(() => true),
      recoverDocument: () => { recovered = true }
    }))
    sessions.end(first.id)
    const second = sessions.begin('dsh-app://app/second?y=2')!
    waiting.release()
    expect(await pending).toBe(false)
    expect(recovered).toBe(false)
    expect(sessions.resumeUrl(second.id)).toBe('dsh-app://app/second?y=2')
    expect(sessions.isCurrent(second.id)).toBe(true)
  })
})

describe('harness restart prepareStart', () => {
  it('runs prepareStart after the stop settles and before start', async () => {
    const sessions = new HarnessRestartSessions()
    const session = sessions.begin('dsh-app://app/')!
    const calls: string[] = []
    await runHarnessRestart(steps(sessions, session.id, {
      stop: async () => { calls.push('stop') },
      prepareStart: async () => { calls.push('prepareStart') },
      start: async () => { calls.push('start') }
    }))
    expect(calls).toEqual(['stop', 'prepareStart', 'start'])
  })

  it('does not run prepareStart when the stop fails', async () => {
    const sessions = new HarnessRestartSessions()
    const session = sessions.begin('dsh-app://app/')!
    const calls: string[] = []
    await runHarnessRestart(steps(sessions, session.id, {
      stop: async () => { calls.push('stop'); throw new Error('stop failed') },
      prepareStart: async () => { calls.push('prepareStart') },
      start: async () => { calls.push('start') },
      reportStopFailure: async () => { calls.push('report') }
    }))
    expect(calls).toEqual(['stop', 'report'])
  })

  it('continues into start when prepareStart fails', async () => {
    const sessions = new HarnessRestartSessions()
    const session = sessions.begin('dsh-app://app/')!
    const calls: string[] = []
    const reported: unknown[] = []
    const ok = await runHarnessRestart(steps(sessions, session.id, {
      stop: async () => { calls.push('stop') },
      prepareStart: async () => { calls.push('prepareStart'); throw new Error('projection failed') },
      reportPrepareStartFailure: error => { calls.push('report'); reported.push(error) },
      start: async () => { calls.push('start') },
      resume: async () => { calls.push('resume'); return true }
    }))
    expect(ok).toBe(true)
    expect(calls).toEqual(['stop', 'prepareStart', 'report', 'start', 'resume'])
    expect(reported[0]).toMatchObject({ message: 'projection failed' })
  })

  it('does not start when the restart is abandoned during prepareStart', async () => {
    const sessions = new HarnessRestartSessions()
    const session = sessions.begin('dsh-app://app/')!
    const calls: string[] = []
    let quitting = false
    const ok = await runHarnessRestart(steps(sessions, session.id, {
      cancelled: () => quitting,
      stop: async () => { calls.push('stop') },
      prepareStart: async () => { calls.push('prepareStart'); quitting = true },
      start: async () => { calls.push('start') }
    }))
    expect(ok).toBe(false)
    expect(calls).toEqual(['stop', 'prepareStart'])
    expect(sessions.isCurrent(session.id)).toBe(false)
  })

  it('works without prepareStart', async () => {
    const sessions = new HarnessRestartSessions()
    const session = sessions.begin('dsh-app://app/')!
    const calls: string[] = []
    const ok = await runHarnessRestart(steps(sessions, session.id, {
      stop: async () => { calls.push('stop') },
      start: async () => { calls.push('start') },
      resume: async () => true
    }))
    expect(ok).toBe(true)
    expect(calls).toEqual(['stop', 'start'])
  })

  it('writes restart projection notes to the harness log and skips safe mode', async () => {
    const source = await readFile(new URL('../../src/main/shell/app.ts', import.meta.url), 'utf8')
    const start = source.indexOf('function harnessRestartSteps')
    const end = source.indexOf('async function showHarnessRestartWaiting')
    const stepsSource = source.slice(start, end)
    expect(stepsSource).toContain('prepareStart:')
    expect(stepsSource).toContain('if (safeMode) return Promise.resolve()')
    expect(stepsSource).toContain("prepareGenerationsForLaunch(dshHome, line => {")
    expect(stepsSource).toContain('harnessLog.note(line)')
    expect(stepsSource).toContain('reportPrepareStartFailure:')
    expect(stepsSource).toContain('harness restart continued after projection failure')
  })
})
