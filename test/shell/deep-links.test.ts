import { describe, expect, it, vi } from 'vitest'
import { DesktopDeepLinks, desktopDeepLinkRoutes } from '../../src/main/shell/deep-links'

const routes = [
  { scheme: 'sample-dev', hostname: 'callback', pathname: '/receive', target: 'native-a' },
  { scheme: 'sample-dev', hostname: 'other', pathname: '/', target: 'native-b' }
]
const metadata = { dshDesktopDeepLinks: routes }
const link = 'sample-dev://callback/receive?ticket=secret'
const settle = async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve() }

describe('Desktop deep link main-process seam', () => {
  it('defaults to disabled and rejects malformed or ambiguous declarations', () => {
    expect(desktopDeepLinkRoutes({})).toEqual([])
    expect(new DesktopDeepLinks({}).accept(link)).toBe('rejected')
    for (const value of [null, {}, [null], [...routes, routes[0]], [{ ...routes[0], scheme: 'https' }], [{ ...routes[0], pathname: '/../' }]]) {
      expect(() => desktopDeepLinkRoutes({ dshDesktopDeepLinks: value })).toThrow('dshDesktopDeepLinks')
    }
  })

  it('queues before ready and sends only to the exact registered target in order', async () => {
    const router = new DesktopDeepLinks(metadata)
    const a = vi.fn()
    const b = vi.fn()
    router.acceptArgv(['electron', '--flag', link, 'sample-dev://callback/receive?ticket=second'])
    expect(a).not.toHaveBeenCalled()
    router.registerTarget('native-b', b)
    expect(b).not.toHaveBeenCalled()
    router.registerTarget('native-a', a)
    await settle()
    expect(a.mock.calls.map(call => call[0])).toEqual([link, 'sample-dev://callback/receive?ticket=second'])
    expect(b).not.toHaveBeenCalled()
    expect(() => router.registerTarget('native-a', a)).toThrow()
    expect(() => router.registerTarget('untrusted', b)).toThrow()
  })

  it.each([
    null, {}, 'other://callback/receive', 'sample-dev://unknown/receive',
    'sample-dev://callback/unknown', 'sample-dev://user:pass@callback/receive',
    'sample-dev://callback:123/receive', 'sample-dev:callback/receive',
    'sample-dev://callback/x/../receive', 'sample-dev://callback/%72eceive',
    link + String.fromCharCode(10), link + String.fromCharCode(92) + 'x', 'sample-dev://callback/receive?' + 'x'.repeat(8192)
  ])('rejects untrusted input %j', value => {
    expect(new DesktopDeepLinks(metadata).accept(value)).toBe('rejected')
  })

  it('bounds queued input and deduplicates OS/argv redelivery after success', async () => {
    const router = new DesktopDeepLinks(metadata)
    expect(router.accept(link)).toBe('queued')
    expect(router.accept(link)).toBe('duplicate')
    for (let i = 1; i < 32; i++) expect(router.accept(link + i)).toBe('queued')
    expect(router.accept(link + 'overflow')).toBe('full')
    const a = vi.fn()
    router.registerTarget('native-a', a)
    for (let i = 0; i < 40; i++) await settle()
    expect(a).toHaveBeenCalledTimes(32)
    expect(router.accept(link)).toBe('duplicate')
  })

  it('expires queued links and duplicate hashes without persisting secrets', () => {
    let now = 0
    const router = new DesktopDeepLinks(metadata, undefined, () => now)
    router.accept(link)
    now = 60_000
    const a = vi.fn()
    router.registerTarget('native-a', a)
    expect(a).not.toHaveBeenCalled()
    expect(router.accept(link)).toBe('queued')
    expect(a).toHaveBeenCalledWith(link)
  })

  it('isolates receiver failures, reports only target and never automatically retries', async () => {
    const failures = vi.fn()
    const router = new DesktopDeepLinks(metadata, failures)
    router.accept(link)
    router.accept('sample-dev://other/?code=private')
    router.registerTarget('native-a', () => { throw new Error(link) })
    const b = vi.fn()
    router.registerTarget('native-b', b)
    await settle()
    expect(failures.mock.calls).toEqual([['native-a']])
    expect(b).toHaveBeenCalledWith('sample-dev://other/?code=private')
    expect(router.accept(link)).toBe('duplicate')
  })

  it('serializes asynchronous receivers, supports disposal, and clears on shutdown', async () => {
    const router = new DesktopDeepLinks(metadata)
    let finish: (() => void) | undefined
    const a = vi.fn(() => new Promise<void>(resolve => { finish = resolve }))
    const dispose = router.registerTarget('native-a', a)
    router.accept(link)
    router.accept(link + '2')
    expect(a).toHaveBeenCalledTimes(1)
    dispose()
    finish?.()
    await settle()
    expect(a).toHaveBeenCalledTimes(1)
    router.close()
    const replacement = vi.fn()
    expect(router.accept(link + '3')).toBe('closed')
    expect(() => router.registerTarget('native-a', replacement)).toThrow()
    expect(replacement).not.toHaveBeenCalled()
  })
})
