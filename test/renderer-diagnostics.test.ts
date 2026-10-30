import { describe, expect, it } from 'vitest'
import { rendererDiagnosticText, rendererDiagnosticUrl } from '../src/main/renderer-diagnostics'

describe('renderer diagnostic copies', () => {
  it('removes URL credentials, every query field and fragments', () => {
    expect(rendererDiagnosticUrl('http://user:password@127.0.0.1:3456/path?unknown=secret#secret'))
      .toBe('http://127.0.0.1:3456/path')
    expect(rendererDiagnosticUrl('file:///Users/private-name/application/splash.html?state=secret#secret'))
      .toBe('file:///[local]/splash.html')
  })
  it('does not echo malformed URLs or unsupported schemes', () => {
    expect(rendererDiagnosticUrl('garbage-token')).toBe('[invalid URL]')
    expect(rendererDiagnosticUrl('data:text/plain,secret')).toBe('[unsupported URL]')
  })
  it('sanitizes URLs embedded in Electron errors and existing credential formats', () => {
    const text = rendererDiagnosticText('ERR_FAILED loading "http://user:password@localhost/path?auth=hidden#hidden" token=hidden Bearer hidden')
    expect(text).toContain('http://localhost/path')
    expect(text).not.toMatch(/password|hidden|user:/)
  })
  it('bounds a verbose error without copying a file URL home directory', () => {
    const text = rendererDiagnosticText('file:///Users/private-name/app/splash.html?state=hidden ' + 'x'.repeat(20_000))
    expect(text.length).toBe(8_000)
    expect(text).not.toMatch(/private-name|hidden/)
  })
})
