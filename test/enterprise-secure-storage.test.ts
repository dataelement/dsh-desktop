import { afterEach, describe, expect, it, vi } from 'vitest'
import { inspectSecureStorage } from '../src/main/enterprise/secure-storage'

describe('enterprise secure storage inspection', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('disables enterprise login when encryption is unavailable', () => {
    expect(inspectSecureStorage({
      isEncryptionAvailable: () => false
    })).toEqual({
      available: false,
      reason: 'Operating-system secure storage is unavailable.'
    })
  })

  it('disables Linux basic_text backends', () => {
    vi.stubGlobal('process', { ...process, platform: 'linux' })
    expect(inspectSecureStorage({
      isEncryptionAvailable: () => true,
      getSelectedStorageBackend: () => 'basic_text'
    })).toMatchObject({
      available: false,
      backend: 'basic_text'
    })
  })

  it('accepts DPAPI and Keychain backends', () => {
    expect(inspectSecureStorage({
      isEncryptionAvailable: () => true,
      getSelectedStorageBackend: () => 'dpapi'
    })).toEqual({
      available: true,
      backend: 'dpapi'
    })
  })
})
