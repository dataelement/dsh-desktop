import { describe, expect, it, vi } from 'vitest'
import { readFile } from 'node:fs/promises'
import afterSign, { notarizeWithStapleRetry } from '../scripts/notarize-macos.mjs'

const options = { appPath: '/fixture/DSH Desktop.app' }
const stapleError = new Error('Failed to staple your application with code: 68\nThe network connection was lost.')
const commandError = code => Object.assign(new Error('stapler failed'), { code })
const dependencies = () => ({ submit: vi.fn(), run: vi.fn(), wait: vi.fn(), log: vi.fn() })

describe('macOS app notarization', () => {
  it('retries transient stapling in fresh commands without submitting again and validates before returning', async () => {
    const deps = dependencies()
    deps.submit.mockRejectedValue(stapleError)
    deps.run.mockRejectedValueOnce(commandError(68))
      .mockRejectedValueOnce(Object.assign(new Error('timeout'), { killed: true, signal: 'SIGTERM' }))
      .mockResolvedValue({})
    await notarizeWithStapleRetry(options, deps)
    expect(deps.submit).toHaveBeenCalledTimes(1)
    expect(deps.wait.mock.calls).toEqual([[10_000], [20_000], [30_000]])
    expect(deps.run.mock.calls).toEqual([
      ...Array.from({ length: 3 }, () => ['xcrun', ['stapler', 'staple', options.appPath], { timeout: 60_000 }]),
      ['xcrun', ['stapler', 'validate', options.appPath], { timeout: 60_000 }]
    ])
  })

  it('validates a successful initial submission without retries', async () => {
    const deps = dependencies()
    await notarizeWithStapleRetry(options, deps)
    expect(deps.wait).not.toHaveBeenCalled()
    expect(deps.run).toHaveBeenCalledExactlyOnceWith('xcrun', ['stapler', 'validate', options.appPath], { timeout: 60_000 })
  })

  it('fails after the bounded number of transient retries', async () => {
    const deps = dependencies()
    deps.submit.mockRejectedValue(stapleError)
    const error = commandError(65)
    deps.run.mockRejectedValue(error)
    await expect(notarizeWithStapleRetry(options, deps)).rejects.toBe(error)
    expect(deps.submit).toHaveBeenCalledTimes(1)
    expect(deps.run).toHaveBeenCalledTimes(5)
  })

  it('never retries rejected notarization, permanent stapling errors or failed validation', async () => {
    for (const error of [new Error('Notarization status: Invalid'), new Error('Failed to staple your application with code: 64')]) {
      const deps = dependencies()
      deps.submit.mockRejectedValue(error)
      await expect(notarizeWithStapleRetry(options, deps)).rejects.toBe(error)
      expect(deps.run).not.toHaveBeenCalled()
      expect(deps.wait).not.toHaveBeenCalled()
    }
    for (const initial of [undefined, stapleError]) {
      const deps = dependencies()
      if (initial) deps.submit.mockRejectedValue(initial)
      const error = commandError(64)
      deps.run.mockRejectedValue(error)
      await expect(notarizeWithStapleRetry(options, deps)).rejects.toBe(error)
      expect(deps.run).toHaveBeenCalledTimes(1)
    }
  })

  it('skips non-macOS and unsigned development builds and rejects partial credentials', async () => {
    await afterSign({ electronPlatformName: 'win32' })
    const saved = { ...process.env }
    try {
      delete process.env.APPLE_API_KEY
      delete process.env.APPLE_API_KEY_ID
      delete process.env.APPLE_API_ISSUER
      await afterSign({ electronPlatformName: 'darwin' })
      process.env.APPLE_API_KEY_ID = 'fixture'
      await expect(afterSign({ electronPlatformName: 'darwin' })).rejects.toThrow('All Apple API')
    } finally {
      process.env = saved
    }
  })

  it('uses the explicit hook with built-in notarization disabled to avoid duplicate submissions', async () => {
    const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
    expect(pkg.build.mac.notarize).toBe(false)
    expect(pkg.build.afterSign).toBe('scripts/notarize-macos.mjs')
    expect(pkg.devDependencies['@electron/notarize']).toBe('2.5.0')
  })
})
