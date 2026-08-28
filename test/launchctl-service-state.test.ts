import { describe, expect, it, vi } from 'vitest'
import { launchServiceIsStoppedAfterBootout } from '../src/main/state/launchctl-service-state'

const serviceTarget = 'gui/501/com.example.worker'
const domainTarget = 'gui/501'

describe('launchctl service state verification', () => {
  it('accepts a successful bootout without an extra inspection', async () => {
    const inspect = vi.fn()

    await expect(launchServiceIsStoppedAfterBootout(
      { code: 0, stdout: '', stderr: '' },
      serviceTarget,
      domainTarget,
      inspect
    )).resolves.toBe(true)
    expect(inspect).not.toHaveBeenCalled()
  })

  it('accepts only an absent service in an accessible parent domain', async () => {
    const inspect = vi.fn(async (target: string) => ({
      code: target === domainTarget ? 0 : 113,
      stdout: '',
      stderr: 'diagnostic text is deliberately irrelevant'
    }))

    await expect(launchServiceIsStoppedAfterBootout(
      { code: 5, stdout: '', stderr: 'any message' },
      serviceTarget,
      domainTarget,
      inspect
    )).resolves.toBe(true)
  })

  it('rejects a service that is still present', async () => {
    const inspect = vi.fn(async () => ({ code: 0, stdout: 'service = { }', stderr: '' }))

    await expect(launchServiceIsStoppedAfterBootout(
      { code: 5, stdout: '', stderr: 'any message' },
      serviceTarget,
      domainTarget,
      inspect
    )).resolves.toBe(false)
    expect(inspect).toHaveBeenCalledTimes(1)
  })

  it('rejects an absent service when its parent domain cannot be verified', async () => {
    const inspect = vi.fn(async () => ({ code: 113, stdout: '', stderr: 'unavailable' }))

    await expect(launchServiceIsStoppedAfterBootout(
      { code: 5, stdout: '', stderr: 'any message' },
      serviceTarget,
      domainTarget,
      inspect
    )).resolves.toBe(false)
    expect(inspect).toHaveBeenCalledTimes(2)
  })

  it('fails closed when inspection itself throws', async () => {
    const inspect = vi.fn(async () => { throw new Error('spawn failed') })

    await expect(launchServiceIsStoppedAfterBootout(
      { code: 5, stdout: '', stderr: 'any message' },
      serviceTarget,
      domainTarget,
      inspect
    )).resolves.toBe(false)
  })
})
