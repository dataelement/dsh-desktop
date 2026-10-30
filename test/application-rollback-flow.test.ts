import { expect, it, vi } from 'vitest'
import { ApplicationRollbackFlow, type RollbackPageState } from '../src/main/application-rollback-flow'
const state = { locale: 'zh', currentVersion: '0.13.0', targetVersion: '0.12.0', simulation: true }
it('requires explicit confirmation, rejects duplicate/progress actions and waits for continue', async () => {
  const states: RollbackPageState[] = []
  const flow = new ApplicationRollbackFlow(async page => { states.push(page) })
  const execute = vi.fn(async (progress: (text: string) => Promise<void>) => {
    expect(flow.action('confirm')).toBe(false)
    await progress('验证正常启动')
  })
  const run = flow.run(state, execute)
  expect(execute).not.toHaveBeenCalled()
  expect(flow.action('continue')).toBe(false)
  expect(flow.action('confirm')).toBe(true)
  await vi.waitFor(() => expect(states.at(-1)?.stage).toBe('success'))
  expect(execute).toHaveBeenCalledOnce()
  expect(flow.action('cancel')).toBe(false)
  expect(flow.action('continue')).toBe(true)
  expect(await run).toBe('completed')
  expect(flow.action('continue')).toBe(false)
})
it('cancellation has no installer side effects and exceptions never produce success', async () => {
  const states: RollbackPageState[] = []
  const flow = new ApplicationRollbackFlow(async page => { states.push(page) })
  const execute = vi.fn(async () => { throw new Error('installation failed') })
  const cancelled = flow.run(state, execute)
  flow.action('cancel')
  expect(await cancelled).toBe('cancelled')
  expect(execute).not.toHaveBeenCalled()
  const failed = flow.run(state, execute)
  const check = expect(failed).rejects.toThrow('installation failed')
  flow.action('confirm')
  await check
  expect(states.some(page => page.stage === 'success')).toBe(false)
  expect(flow.action('confirm')).toBe(false)
})
it('closing confirmation releases the wait and a later run can open normally', async () => {
  const show = vi.fn(async () => {})
  const flow = new ApplicationRollbackFlow(show)
  const execute = vi.fn(async () => {})
  const run = flow.run(state, execute)
  flow.abort()
  expect(await run).toBe('closed')
  expect(execute).not.toHaveBeenCalled()
  expect(flow.action('confirm')).toBe(false)
  const reopened = flow.run(state, execute)
  flow.action('cancel')
  expect(await reopened).toBe('cancelled')
})
it('closing progress suppresses late result pages even if execution later fails', async () => {
  for (const failure of [false, true]) {
    const pages: RollbackPageState[] = []
    const flow = new ApplicationRollbackFlow(async page => { pages.push(page) })
    let finish: (() => void) | undefined
    const run = flow.run(state, async progress => {
      await new Promise<void>(resolve => { finish = resolve })
      if (failure) throw new Error('late installation failure')
      await progress('late restart')
    })
    flow.action('confirm')
    await vi.waitFor(() => expect(finish).toBeDefined())
    const count = pages.length
    flow.abort()
    finish?.()
    expect(await run).toBe('closed')
    expect(pages).toHaveLength(count)
    expect(flow.action('continue')).toBe(false)
  }
})
it('closing the success page cannot reopen normal use automatically', async () => {
  const pages: RollbackPageState[] = []
  const flow = new ApplicationRollbackFlow(async page => { pages.push(page) })
  const run = flow.run(state, async () => {})
  flow.action('confirm')
  await vi.waitFor(() => expect(pages.at(-1)?.stage).toBe('success'))
  flow.abort()
  expect(await run).toBe('closed')
  expect(flow.action('continue')).toBe(false)
})
