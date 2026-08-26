import { describe, expect, it } from 'vitest'
import { appVersionArgument, appVersionFromArguments } from '../src/shared/app-info'

describe('Sherlock app info renderer argument', () => {
  it('passes the packaged app version into the isolated renderer', () => {
    expect(appVersionArgument('0.6.6')).toBe('--sherlock-app-version=0.6.6')
    expect(appVersionFromArguments([
      '/path/to/renderer',
      '--sherlock-app-version=0.6.6'
    ])).toBe('0.6.6')
  })

  it('uses an unavailable marker when no version was provided', () => {
    expect(appVersionFromArguments(['/path/to/renderer'])).toBe('—')
  })
})
