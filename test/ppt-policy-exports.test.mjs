import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const packageJson = JSON.parse(await readFile(new URL('../packages/ppt-runtime/core/package.json', import.meta.url), 'utf8'))

describe('PPT policy package exports', () => {
  it('publishes the policy entry points and declarations', async () => {
    expect(packageJson.exports['./web-mode-policy']).toEqual({
      types: './lib/web-mode-policy.d.ts',
      default: './lib/web-mode-policy.js'
    })
    expect(packageJson.exports['./office-pptx-scope-policy']).toEqual({
      types: './lib/office-pptx-scope-policy.d.ts',
      default: './lib/office-pptx-scope-policy.js'
    })
    const indexSource = await readFile(new URL('../packages/ppt-runtime/core/lib/index.js', import.meta.url), 'utf8')
    expect(indexSource).toContain("export { installWebModePolicy } from './web-mode-policy.js'")
    expect(indexSource).toContain("export { createOfficePptxScopePolicyController, registerOfficePptxScopePolicy } from './office-pptx-scope-policy.js'")
    const webPolicy = await import('../packages/ppt-runtime/core/lib/web-mode-policy.js')
    const officePolicy = await import('../packages/ppt-runtime/core/lib/office-pptx-scope-policy.js')
    expect(typeof webPolicy.installWebModePolicy).toBe('function')
    expect(typeof officePolicy.createOfficePptxScopePolicyController).toBe('function')
    expect(typeof officePolicy.registerOfficePptxScopePolicy).toBe('function')
  })
})
