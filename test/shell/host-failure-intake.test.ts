import { describe, expect, it, vi } from 'vitest'
import { DesktopBackendController, type DesktopBackendHost } from '../../src/main/shell/backend/backend-controller'
import { continueAfterHostStartup, createHostFailureIntake } from '../../src/main/shell/host-failure-intake'

describe('host failure intake', () => {
  it('presents one published startup failure and does not continue normal startup', async () => {
    const failure = new Error('host failed')
    const presented: unknown[] = []
    const intake = createHostFailureIntake({
      quitting: () => false,
      handle: async current => { presented.push(current) },
      degrade: async () => { throw new Error('recovery should not fail') }
    })
    const controller = new DesktopBackendController(
      () => rejectingHost(failure),
      state => { if (state.phase === 'error') intake.enqueue(state.failure) }
    )
    let continued = false
    const started = await continueAfterHostStartup(controller.start(async () => {}))
    if (started) continued = true
    await intake.whenIdle()
    expect(started).toBe(false)
    expect(continued).toBe(false)
    expect(presented).toEqual([failure])
    expect(intake.enqueue(failure)).toBe(false)
  })

  it('queues a prepare failure from the published error without a second enqueue', async () => {
    const failure = new Error('prepare failed')
    const presented: unknown[] = []
    const intake = createHostFailureIntake({
      quitting: () => false,
      handle: async current => { presented.push(current) },
      degrade: async () => undefined
    })
    const controller = new DesktopBackendController(
      () => rejectingHost(new Error('unused')),
      state => { if (state.phase === 'error') intake.enqueue(state.failure) }
    )
    const started = await continueAfterHostStartup(controller.start(async () => { throw failure }))
    await intake.whenIdle()
    expect(started).toBe(false)
    expect(presented).toEqual([failure])
  })

  it('drops the same object while it is queued, in progress, and finished', async () => {
    const failure = new Error('same')
    let release: () => void = () => undefined
    const gate = new Promise<void>(resolve => { release = resolve })
    const presented: unknown[] = []
    const intake = createHostFailureIntake({
      quitting: () => false,
      handle: async current => {
        presented.push(current)
        await gate
      },
      degrade: async () => undefined
    })
    const queued = new Error('queued')
    expect(intake.enqueue(failure)).toBe(true)
    expect(intake.enqueue(failure)).toBe(false)
    expect(intake.enqueue(queued)).toBe(true)
    expect(intake.enqueue(queued)).toBe(false)
    release()
    await intake.whenIdle()
    expect(intake.enqueue(failure)).toBe(false)
    expect(intake.enqueue(queued)).toBe(false)
    expect(presented).toEqual([failure, queued])
  })

  it('presents a later failure that only shares the message', async () => {
    const first = new Error('same text')
    const second = new Error('same text')
    const presented: unknown[] = []
    const intake = createHostFailureIntake({
      quitting: () => false,
      handle: async current => { presented.push(current) },
      degrade: async () => undefined
    })
    intake.enqueue(first)
    await intake.whenIdle()
    expect(intake.enqueue(second)).toBe(true)
    await intake.whenIdle()
    expect(presented).toEqual([first, second])
  })

  it('degrades one failed presentation and still handles the next failure', async () => {
    const broken = new Error('page missing')
    const next = new Error('next')
    const handled: unknown[] = []
    const degraded: Array<[unknown, unknown]> = []
    const intake = createHostFailureIntake({
      quitting: () => false,
      handle: async current => {
        if (current === broken) throw new Error('The startup recovery page did not open')
        handled.push(current)
      },
      degrade: async (failure, recoveryError) => {
        degraded.push([failure, recoveryError])
      }
    })
    intake.enqueue(broken)
    intake.enqueue(next)
    await intake.whenIdle()
    expect(handled).toEqual([next])
    expect(degraded).toHaveLength(1)
    expect(degraded[0]?.[0]).toBe(broken)
  })

  it('records a failed fallback dialog and does not reject the queue', async () => {
    const unhandled: unknown[] = []
    const listener = (error: unknown): void => { unhandled.push(error) }
    process.on('unhandledRejection', listener)
    const errors: unknown[] = []
    vi.spyOn(console, 'error').mockImplementation((error: unknown) => { errors.push(error) })
    const next = new Error('next')
    const handled: unknown[] = []
    const intake = createHostFailureIntake({
      quitting: () => false,
      handle: async current => {
        if (current === next) handled.push(current)
        else throw new Error('page missing')
      },
      degrade: async () => { throw new Error('dialog failed') }
    })
    intake.enqueue(new Error('first'))
    intake.enqueue(next)
    await intake.whenIdle()
    await new Promise(resolve => { setImmediate(resolve) })
    process.off('unhandledRejection', listener)
    vi.restoreAllMocks()
    expect(handled).toEqual([next])
    expect(errors.map(error => error instanceof Error ? error.message : '')).toContain('dialog failed')
    expect(unhandled).toEqual([])
  })

  it('skips the fallback dialog after shutdown has started', async () => {
    let quitting = false
    let degraded = false
    const intake = createHostFailureIntake({
      quitting: () => quitting,
      handle: async () => {
        quitting = true
        throw new Error('page missing')
      },
      degrade: async () => { degraded = true }
    })
    intake.enqueue(new Error('closing'))
    await intake.whenIdle()
    expect(degraded).toBe(false)
  })

  it('handles an undefined failure and still handles the next error', async () => {
    const next = new Error('next')
    const presented: unknown[] = []
    const intake = createHostFailureIntake({
      quitting: () => false,
      handle: async current => { presented.push(current) },
      degrade: async () => undefined
    })
    expect(intake.enqueue(undefined)).toBe(true)
    expect(intake.enqueue(undefined)).toBe(false)
    expect(intake.enqueue(next)).toBe(true)
    await intake.whenIdle()
    expect(presented).toEqual([undefined, next])
  })

  it('publishes one prepare failure when prepare throws undefined', async () => {
    const presented: unknown[] = []
    const intake = createHostFailureIntake({
      quitting: () => false,
      handle: async current => { presented.push(current) },
      degrade: async () => undefined
    })
    const controller = new DesktopBackendController(
      () => rejectingHost(new Error('unused')),
      state => { if (state.phase === 'error') intake.enqueue(state.failure) }
    )
    const started = await continueAfterHostStartup(controller.start(async () => { throw undefined }))
    await intake.whenIdle()
    expect(started).toBe(false)
    expect(presented).toEqual([undefined])
    expect(intake.enqueue(undefined)).toBe(false)
  })

  it('drains a failure enqueued in the drain teardown microtask', async () => {
    const first = new Error('first')
    const second = new Error('second')
    const presented: unknown[] = []
    const intake = createHostFailureIntake({
      quitting: () => false,
      handle: async current => {
        presented.push(current)
        if (current === first) {
          await Promise.resolve()
          queueMicrotask(() => { queueMicrotask(() => { intake.enqueue(second) }) })
        }
      },
      degrade: async () => undefined
    })
    intake.enqueue(first)
    await intake.whenIdle()
    expect(presented).toEqual([first, second])
    expect(intake.enqueue(second)).toBe(false)
  })

  it('waits in whenIdle for the drain started during teardown', async () => {
    const first = new Error('first')
    const second = new Error('second')
    const presented: unknown[] = []
    let releaseSecond: () => void = () => undefined
    const gate = new Promise<void>(resolve => { releaseSecond = resolve })
    const intake = createHostFailureIntake({
      quitting: () => false,
      handle: async current => {
        presented.push(current)
        if (current === first) {
          await Promise.resolve()
          queueMicrotask(() => { queueMicrotask(() => { intake.enqueue(second) }) })
          return
        }
        await gate
      },
      degrade: async () => undefined
    })
    intake.enqueue(first)
    let idle = false
    const waiting = intake.whenIdle().then(() => { idle = true })
    await new Promise(resolve => { setImmediate(resolve) })
    expect(idle).toBe(false)
    expect(presented).toEqual([first, second])
    releaseSecond()
    await waiting
    expect(idle).toBe(true)
  })

  it('handles several failures one at a time', async () => {
    let active = 0
    let max = 0
    const presented: unknown[] = []
    const intake = createHostFailureIntake({
      quitting: () => false,
      handle: async current => {
        active += 1
        max = Math.max(max, active)
        await Promise.resolve()
        active -= 1
        presented.push(current)
      },
      degrade: async () => undefined
    })
    const failures = [new Error('a'), new Error('b'), new Error('c')]
    for (const failure of failures) intake.enqueue(failure)
    await intake.whenIdle()
    expect(max).toBe(1)
    expect(presented).toEqual(failures)
  })

  it('does not schedule or show a fallback after shutdown', async () => {
    let quitting = false
    const handled: unknown[] = []
    let degraded = false
    const first = new Error('first')
    const second = new Error('second')
    const intake = createHostFailureIntake({
      quitting: () => quitting,
      handle: async current => {
        handled.push(current)
        quitting = true
      },
      degrade: async () => { degraded = true }
    })
    intake.enqueue(first)
    intake.enqueue(second)
    await intake.whenIdle()
    expect(intake.enqueue(new Error('after quit'))).toBe(true)
    await intake.whenIdle()
    expect(handled).toEqual([first])
    expect(degraded).toBe(false)
  })
})

function rejectingHost(failure: Error): DesktopBackendHost {
  return {
    start: () => Promise.reject(failure),
    stop: () => Promise.resolve()
  }
}
