import { describe, expect, it } from 'vitest'

describe('enterprise contract package export', () => {
  it('can dynamically import the pure contract functions', async () => {
    const contract = await import('dsh-desktop-enterprise/contract')
    expect(contract.CLIENT_ID).toBe('dsh-desktop')
    expect(contract.CONTRACT_VERSION).toBe('0.5.0')
    expect(typeof contract.createPkceTransaction).toBe('function')
    expect(typeof contract.parseToken).toBe('function')
    expect(typeof contract.parseModels).toBe('function')
    const pkce = contract.createPkceTransaction()
    expect(contract.pkceChallenge(pkce.codeVerifier)).toBe(pkce.codeChallenge)
  })

  it('can dynamically import deep-link helpers from the package export', async () => {
    const deepLink = await import('dsh-desktop-enterprise/deep-link')
    expect(deepLink.ENTERPRISE_LOGIN_PROTOCOL).toBe('dsh-desktop')
    expect(deepLink.ENTERPRISE_LOGIN_DEV_PROTOCOL).toBe('dsh-desktop-dev')
    expect(deepLink.normalizeEnterpriseServerUrl('https://bisheng.example.com')).toBe(
      'https://bisheng.example.com'
    )
  })
})
