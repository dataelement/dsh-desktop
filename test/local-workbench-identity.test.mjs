import { describe, expect, it } from 'vitest'
import { validatePublishedCatalog } from '../packages/dsh-desktop-workbenches/catalog.mjs'
import { isLocalPackageName, isLocalWorkbenchId, isRepositoryWorkbenchId, localWorkbenchId } from '../packages/dsh-desktop-workbenches/identity.mjs'

describe('canonical local workbench identities', () => {
  it.each(['resume-review', '@team/resume-review', 'a'.repeat(214), '@a/' + 'b'.repeat(211)])('derives a stable identity from package %s only', name => {
    expect(isLocalPackageName(name)).toBe(true)
    expect(localWorkbenchId(name)).toBe(`local:${name}`)
    expect(isLocalWorkbenchId(`local:${name}`)).toBe(true)
    expect(isRepositoryWorkbenchId(`local:${name}`)).toBe(false)
  })
  it.each([undefined, null, '', 'Team/review', 'Resume', '@Team/review', '@team/Review', 'a'.repeat(215), '@a/' + 'b'.repeat(212),
    '.', '..', '_name', '.name', '@scope', '@scope/', '@scope/a/b', 'scope/name', 'name@1.0.0', 'name:1', 'file:name',
    'C:\\workbench', '/tmp/workbench', 'name name', 'name%20', 'name?query', 'name#hash', '__proto__', 'constructor', 'prototype',
    '@constructor/name', '@scope/prototype', 'node_modules', 'favicon.ico', 'name\n'])('rejects noncanonical or unsafe package input %j', name => {
    expect(isLocalPackageName(name)).toBe(false)
    expect(() => localWorkbenchId(name)).toThrow('Invalid local workbench package name')
    if (typeof name === 'string') expect(isLocalWorkbenchId(`local:${name}`)).toBe(false)
  })
  it('does not expand published market catalog identities to local workbenches', () => {
    const entry = { id: 'owner/repo', owner: 'owner', repository: 'repo', url: 'https://github.com/owner/repo', name: 'Review', category: 'hr',
      description: { zh: '简历', en: 'Resume' }, version: '1.0.0', license: 'MIT', distribution: { type: 'npm', name: 'review', version: '1.0.0' },
      screenshots: [{ url: 'https://example.com/screen.png', alt: 'Screen', sha256: 'a'.repeat(64), width: 1, height: 1, bytes: 1 }] }
    const catalog = { schemaVersion: 2, kind: 'catalog', categories: [{ id: 'hr', name: { zh: '人事' } }], workbenches: [entry] }
    expect(validatePublishedCatalog(catalog)).toEqual(catalog)
    expect(() => validatePublishedCatalog({ ...catalog, workbenches: [{ ...entry, id: 'local:review' }] })).toThrow('catalog identity')
  })
  it('keeps repository syntax separate from local names', () => {
    expect(isRepositoryWorkbenchId('owner/repo')).toBe(true)
    expect(isLocalWorkbenchId('owner/repo')).toBe(false)
    expect(isLocalWorkbenchId('local:owner/repo')).toBe(false)
    expect(isLocalWorkbenchId('LOCAL:name')).toBe(false)
  })
})
