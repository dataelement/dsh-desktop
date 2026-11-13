import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import { describe, expect, it } from 'vitest'
import { emptyState } from '../packages/dsh-desktop-workbenches/state.mjs'

const code = await readFile(new URL('../packages/dsh-desktop-workbenches/client.js', import.meta.url), 'utf8')
let Workbenches
vm.runInNewContext(code, { window: { __ModuleLoader__: { load({ factory }) {
  Workbenches = factory(name => name === '@deepseek-ai/cordis' ? { Service: { tracker: Symbol('tracker') } } : name === 'react' ? { Component: class {} } : {}).Workbenches
} } } })

// Exercise the production attribution method without loading any application,
// profile, network inventory, storage or mutable user session state.
function attribution({ installed = [], listed = [], declared, evidence = {}, legacy = [], remembered = [] } = {}) {
  const source = 'fixture-deck'
  const service = Object.assign(Object.create(Workbenches.prototype), {
    state: emptyState(),
    installs: Object.fromEntries(installed.map(([id, extra]) => [id, { pluginName: source, ...extra }])),
    remoteCatalog: [...listed.map(id => ({ id, distribution: { name: source } })), ...legacy.map(id => ({ id, workbenchId: 'old-deck' }))],
    packageEvidence: { [source]: evidence },
    knownProviders: Object.fromEntries(remembered.map(id => [id, { sourcePackage: source }])),
    native: { status: 'ready', bundles: { [source]: { installed: true } } },
    applicationOutcomes: new Map()
  })
  const resolve = () => service.identityForSource(source, declared && `https://github.com/${declared}`, legacy.length ? 'old-deck' : undefined)
  resolve.service = service
  return resolve
}

describe('registration source attribution boundaries', () => {
  it('does not let conflicting declared and installed ownership silently rebind a workbench', () => {
    expect(attribution({ installed: [['old/deck']], declared: 'new/deck' })).toThrow('matches multiple workbenches')
  })

  it('selects an exact verified receipt despite stale same-package receipts and catalog entries', () => {
    const current = { fingerprint: 'v2:current', version: '1.0.0' }
    expect(attribution({ installed: [['old/deck', { fingerprint: 'v2:old', version: '1.0.0' }], ['new/deck', current]],
      listed: ['old/deck', 'new/deck'], evidence: { ...current, contentVerified: true } })()).toBe('new/deck')
  })

  it('keeps unverifiable historical receipt ambiguity closed rather than selecting the first', () => {
    expect(attribution({ installed: [['old/deck'], ['new/deck']], listed: ['new/deck'] })).toThrow('matches multiple workbenches')
  })

  it('allows a canonical declaration only when every populated attribution source agrees', () => {
    expect(attribution({ installed: [['new/deck']], listed: ['old/deck', 'new/deck'], declared: 'new/deck' })()).toBe('new/deck')
    expect(attribution({ installed: [['old/deck']], listed: ['old/deck', 'new/deck'], declared: 'new/deck' })).toThrow('matches multiple workbenches')
  })

  it('does not erase market attribution evidence merely because installed content is local', () => {
    const listed = ['one/deck', 'two/deck']
    const evidence = { origin: 'local' }
    expect(attribution({ listed, evidence, installed: [['one/deck']] })).toThrow('matches multiple workbenches')
    expect(attribution({ listed, evidence, remembered: ['one/deck'] })).toThrow('matches multiple workbenches')
    expect(attribution({ listed, evidence, legacy: ['one/deck'] })).toThrow('matches multiple workbenches')
    const historical = attribution({ listed, evidence })
    historical.service.state.sessionBindings.old = 'one/deck'
    expect(historical).toThrow('matches multiple workbenches')
  })

  it('keeps a fresh local install local even when multiple discovery-only market aliases reuse its package', () => {
    expect(attribution({ listed: ['one/deck', 'two/deck'], evidence: { origin: 'local' } })()).toBe('local:fixture-deck')
  })
})
