import { describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import { evaluatePluginCompatibility } from '@deepseek-ai/dsh-app-boot'

const core = JSON.parse(await readFile(new URL('../packages/ppt-runtime/core/package.json', import.meta.url), 'utf8'))
const adapter = JSON.parse(await readFile(new URL('../packages/ppt-runtime/adapter/package.json', import.meta.url), 'utf8'))
describe('PPT Web source compatibility against the installed rc.1 Harness checker', () => {
  it.each([core, adapter])('accepts $name on 0.2.2-rc.1 without an exemption or engines override', manifest => {
    expect(manifest.engines ?? {}).not.toHaveProperty('dsh')
    expect(manifest.peerDependencies).not.toHaveProperty('@deepseek-ai/dsh-scope')
    expect(evaluatePluginCompatibility(manifest, {}, '0.2.2-rc.1')).toBeUndefined()
  })
  it('keeps the public Agent dependency used by scoped workflow policy', () => {
    expect(core.peerDependencies['@deepseek-ai/dsh-agent']).toContain('0.2.2-rc.1')
    expect(core.files).toContain('lib')
  })
  it('rejects an incompatible future runtime for the core without an exemption', () => {
    const requirements = Object.fromEntries(Object.entries(core.peerDependencies).filter(([name]) => name === '@deepseek-ai/dsh' || name.startsWith('@deepseek-ai/dsh-')))
    expect(evaluatePluginCompatibility(core, {}, '0.3.0-alpha.1')).toEqual({ name: core.name, version: core.version, runtimeVersion: '0.3.0-alpha.1', requirements, exempted: false })
  })
})
