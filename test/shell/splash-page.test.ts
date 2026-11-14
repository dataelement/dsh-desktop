import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'
import { isSplashPageUrl } from '../../src/main/shell/splash-page'

describe('whale splash page', () => {
  it('recognizes the splash file and rejects the application document', () => {
    const page = join(tmpdir(), 'splash.html')
    const url = new URL(pathToFileURL(page))
    url.searchParams.set('theme', 'dark')
    expect(isSplashPageUrl(url.href, page)).toBe(true)
    expect(isSplashPageUrl('dsh-app://app/', page)).toBe(false)
    expect(isSplashPageUrl(pathToFileURL(join(tmpdir(), 'web-import.html')).href, page)).toBe(false)
  })
})
