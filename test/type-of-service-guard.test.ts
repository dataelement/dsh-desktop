import { describe, expect, it } from 'vitest'
import { installTypeOfServiceGuard } from '../build/type-of-service-guard.mjs'

// The guarded-version matrix mirrors build/type-of-service-guard.mjs: 7.x below
// 7.30.2 and 8.0.0–8.7.x call setTypeOfService without a try/catch (verified by
// diffing lib/dispatcher/client-h1.js of each released package on npm); 7.30.2
// (undici#6076 backport) and 8.8.0 carry the fix.
describe('type-of-service guard (issue #821)', () => {
  it('swallows EINVAL from setTypeOfService and warns once', () => {
    let calls = 0
    const proto = {
      setTypeOfService(_value: number) {
        calls += 1
        throw Object.assign(new Error('setTypeOfService EINVAL'), { code: 'EINVAL' })
      }
    }
    const warnings: string[] = []
    const installed = installTypeOfServiceGuard(
      { Socket: { prototype: proto } },
      '7.29.1',
      (m: string) => warnings.push(m)
    )
    expect(installed).toBe(true)
    expect(proto.setTypeOfService(0)).toBeUndefined()
    expect(proto.setTypeOfService(0)).toBeUndefined()
    expect(calls).toBe(2)
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('undici#5544')
  })

  it('rethrows errors other than EINVAL', () => {
    const proto = {
      setTypeOfService(_value: number) {
        throw Object.assign(new Error('setTypeOfService EPERM'), { code: 'EPERM' })
      }
    }
    installTypeOfServiceGuard({ Socket: { prototype: proto } }, '7.29.1', () => {})
    expect(() => proto.setTypeOfService(0)).toThrowError('EPERM')
  })

  it.each(['7.29.1', '7.30.1', '8.0.0', '8.4.0', '8.7.0'])(
    'installs on undici %s, which lacks the fix',
    (undiciVersion) => {
      const original = () => 1
      const proto = { setTypeOfService: original }
      expect(
        installTypeOfServiceGuard({ Socket: { prototype: proto } }, undiciVersion, () => {})
      ).toBe(true)
      expect(proto.setTypeOfService).not.toBe(original)
    }
  )

  it.each(['7.30.2', '8.8.0', '9.0.0', 'garbage', undefined])(
    'does not install on undici %s, which has or postdates the fix',
    (undiciVersion) => {
      const original = () => 1
      const proto = { setTypeOfService: original }
      expect(
        installTypeOfServiceGuard({ Socket: { prototype: proto } }, undiciVersion as string | undefined, () => {})
      ).toBe(false)
      expect(proto.setTypeOfService).toBe(original)
    }
  )

  it('does not install when the runtime has no setTypeOfService (Node 22 and older)', () => {
    expect(installTypeOfServiceGuard({ Socket: { prototype: {} } }, '7.29.1', () => {})).toBe(false)
    // The real net module on this test runner: the guard must be a no-op there too.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const net = require('node:net') as typeof import('node:net')
    const before = (net.Socket.prototype as { setTypeOfService?: unknown }).setTypeOfService
    const installed = installTypeOfServiceGuard(net, process.versions.undici, () => {})
    expect(installed).toBe(false)
    expect((net.Socket.prototype as { setTypeOfService?: unknown }).setTypeOfService).toBe(before)
  })
})
