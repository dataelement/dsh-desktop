import { describe, expect, it, vi } from 'vitest'
import { PluginManager } from '@deepseek-ai/dsh-plugin-manager'

// Exercise the patched manager's real install entry/settlement and query methods.
// The transaction is a controllable boundary: no package, Profile or user data is mutated.
function fixture() {
  let finish
  const transaction = new Promise(resolve => { finish = resolve })
  const manager = Object.assign(Object.create(PluginManager.prototype), {
    installs: new Map(),
    change: vi.fn(() => transaction),
    ownerContext: { emit: vi.fn() }
  })
  return { manager, finish }
}

describe('Plugin Manager bounded terminal installation receipts', () => {
  it.each(['applied', 'failed', 'cancelled', 'restart-required'])('recovers a lost terminal %s reply without reinstalling', async application => {
    const { manager, finish } = fixture()
    const install = manager.installBundle('/fixture/workbench.tgz', { requestId: 'lost-reply' })
    const outcome = { application, bundle: 'fixture-workbench', version: '1.0.0' }
    finish(outcome)
    await install // The transport discards this reply after the actual task settles.
    expect(manager.installs.size).toBe(0)
    expect(await manager.waitForInstall('lost-reply')).toBe(outcome)
    expect(await manager.waitForInstall('lost-reply')).toBe(outcome)
    expect(await manager.cancelInstall('lost-reply')).toEqual({ status: 'not-running' })
    expect(manager.change).toHaveBeenCalledOnce()
  })

  it('waits for an active task and does not manufacture a receipt for unknown requests', async () => {
    const { manager, finish } = fixture()
    const install = manager.installBundle('/fixture/workbench.tgz', { requestId: 'active' })
    const query = manager.waitForInstall('active')
    finish({ application: 'cancelled' })
    expect(await query).toEqual({ application: 'cancelled' })
    await install
    expect(await manager.waitForInstall('unknown')).toBeNull()
  })

  it('bounds completed receipts by count without dropping active tasks', async () => {
    const { manager, finish } = fixture()
    finish({ application: 'applied' })
    for (let index = 0; index < 65; index++) {
      await manager.installBundle('/fixture/workbench.tgz', { requestId: `receipt-${index}` })
    }
    expect(manager.completedInstalls.size).toBe(64)
    expect(await manager.waitForInstall('receipt-0')).toBeNull()
    expect(await manager.waitForInstall('receipt-64')).toEqual({ application: 'applied' })
  })

  it('expires receipts after ten minutes and keeps manager instances isolated', async () => {
    const clock = vi.spyOn(Date, 'now').mockReturnValue(1_000)
    try {
      const { manager, finish } = fixture()
      finish({ application: 'failed' })
      await manager.installBundle('/fixture/workbench.tgz', { requestId: 'receipt' })
      expect(await fixture().manager.waitForInstall('receipt')).toBeNull()
      clock.mockReturnValue(1_000 + 10 * 60 * 1_000)
      expect(await manager.waitForInstall('receipt')).toBeNull()
      expect(manager.completedInstalls.size).toBe(0)
    } finally { clock.mockRestore() }
  })

  it.each(['applied', 'rejected'])('rejects a duplicate active id without stealing the original control (%s)', async settlement => {
    let resolve, reject
    const transaction = new Promise((done, fail) => { resolve = done; reject = fail })
    const { manager } = fixture()
    manager.change.mockReturnValue(transaction)
    const first = manager.installBundle('/fixture/first.tgz', { requestId: 'overlap' })
    const control = manager.installs.get('overlap')
    await expect(manager.installBundle('/fixture/other.tgz', { requestId: 'overlap' })).rejects.toThrow('already active')
    expect(manager.installs.get('overlap')).toBe(control)
    expect(manager.change).toHaveBeenCalledOnce()
    if (settlement === 'applied') {
      const outcome = { application: 'applied', bundle: 'first' }
      resolve(outcome)
      await first
      expect(await manager.waitForInstall('overlap')).toBe(outcome)
    } else {
      reject(new Error('original lock timeout'))
      await expect(first).rejects.toThrow('original lock timeout')
      expect(await manager.waitForInstall('overlap')).toBeNull()
    }
    expect(manager.installs.has('overlap')).toBe(false)
  })

  it('invalidates an older receipt when a reused request id rejects', async () => {
    const { manager, finish } = fixture()
    finish({ application: 'applied', bundle: 'old-package' })
    await manager.installBundle('/fixture/old.tgz', { requestId: 'reused' })
    manager.change.mockReturnValue(Promise.reject(new Error('lock timeout')))
    await expect(manager.installBundle('/fixture/new.tgz', { requestId: 'reused' })).rejects.toThrow('lock timeout')
    expect(await manager.waitForInstall('reused')).toBeNull()
  })

  it('does not retain rejected transactions as successful results', async () => {
    const { manager } = fixture()
    manager.change.mockReturnValue(Promise.reject(new Error('manager disposed')))
    await expect(manager.installBundle('/fixture/workbench.tgz', { requestId: 'rejected' })).rejects.toThrow('manager disposed')
    expect(manager.installs.size).toBe(0)
    expect(await manager.waitForInstall('rejected')).toBeNull()
  })
})
