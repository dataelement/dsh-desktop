import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { resolveDesktopIdentity } from '../../src/main/shell/product-identity'

const appData = join('/temporary', 'app-data')
const downstream = {
  dshDesktopIdentity: {
    productName: 'BISHENG', userDataDirectory: 'bisheng', developmentUserDataDirectory: 'bisheng-dev'
  }
}
const resolve = (metadata: unknown, packaged = true, env: NodeJS.ProcessEnv = {}) => resolveDesktopIdentity(metadata, packaged, appData, env)

describe('explicit Desktop product identity', () => {
  it('preserves production and unpackaged DSH paths without metadata', () => {
    expect(resolve({})).toEqual({ name: 'DSH Desktop', userData: join(appData, 'dsh-desktop') })
    expect(resolve({}, false)).toEqual({ name: 'DSH Desktop Dev', userData: join(appData, 'dsh-desktop-dev') })
    expect(resolve({ dshDesktopChannel: 'development' })).toEqual(resolve({}, false))
  })

  it('does not infer identity from enterprise packages, names or build branding', () => {
    expect(resolve({
      name: 'bisheng', productName: 'BISHENG', build: { productName: 'BISHENG', appId: 'io.bisheng' },
      dependencies: { 'dsh-desktop-enterprise': '0.1.0' }
    })).toEqual(resolve({}))
  })

  it('preserves downstream legacy data paths only through explicit metadata', () => {
    expect(resolve(downstream)).toEqual({ name: 'BISHENG', userData: join(appData, 'bisheng') })
    expect(resolve(downstream, false)).toEqual({ name: 'BISHENG Dev', userData: join(appData, 'bisheng-dev') })
    expect(resolve({ ...downstream, dshDesktopChannel: 'development' })).toEqual(resolve(downstream, false))
  })

  it('uses generic worktree isolation, ignoring overrides in production', () => {
    expect(resolve(downstream, false, { DSH_DEV_PROFILE: 'bisheng-dev-agent' }).userData).toBe(join(appData, 'bisheng-dev-agent'))
    expect(resolve(downstream, true, { DSH_DEV_PROFILE: '../invalid' })).toEqual(resolve(downstream))
    expect(resolve(downstream, false, { BISHENG_DEV_USER_DATA: '/old/override' })).toEqual(resolve(downstream, false))
  })

  it('does not derive storage from a renamed product', () => {
    const renamed = { dshDesktopIdentity: { ...downstream.dshDesktopIdentity, productName: 'New Product' } }
    expect(resolve(renamed).userData).toBe(resolve(downstream).userData)
  })

  it.each([null, [], {}, { productName: 'Product' }])('rejects malformed configured identity %j', value => {
    expect(() => resolve({ dshDesktopIdentity: value })).toThrow('dshDesktopIdentity')
  })

  it.each(['', ' Product', 'A/B', 'A\\B', 'A\nB'])('rejects invalid product name %j', productName => {
    expect(() => resolve({ dshDesktopIdentity: { ...downstream.dshDesktopIdentity, productName } })).toThrow('productName')
  })

  it.each(['../profile', '/tmp/profile', 'a/b', 'a\\b', '..', 'name.', 'CON', 'nul.txt', ''])('rejects unsafe directory %j', value => {
    for (const field of ['userDataDirectory', 'developmentUserDataDirectory']) {
      expect(() => resolve({ dshDesktopIdentity: { ...downstream.dshDesktopIdentity, [field]: value } })).toThrow(field)
    }
    expect(() => resolve(downstream, false, { DSH_DEV_PROFILE: value || '../invalid' })).toThrow('DSH_DEV_PROFILE')
  })

  it('rejects production/development data collisions including case-only differences', () => {
    expect(() => resolve({ dshDesktopIdentity: { ...downstream.dshDesktopIdentity, developmentUserDataDirectory: 'BISHENG' } })).toThrow('separate')
    expect(() => resolve(downstream, false, { DSH_DEV_PROFILE: 'BISHENG' })).toThrow('separate')
  })
})
