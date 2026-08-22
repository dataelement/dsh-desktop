import { describe, expect, it } from 'vitest'
import { bundleEntryIds, prunePatchLayer } from '../src/main/state/patch-layer'
import { patchLayerInsertedPackages } from '../src/main/state/profile-consistency'

const LAYER = `# Your patch layer for this dsh profile, applied after every bundle layer.
- id: storage
  config:
    backend: sqlite
- id: theme
  config:
    accent: violet
- insert:
    - id: doudizhu
      name: dsh-doudizhu
    - id: my-own
      name: dsh-my-own
- insert:
    - id: doudizhu-ui
      name: dsh-doudizhu/ui
`

describe('user patch layer', () => {
  it('reads the entry ids a bundle declares', () => {
    expect(
      bundleEntryIds(`- insert:
    - id: doudizhu
      name: dsh-doudizhu
    - id: storage
      name: dsh-doudizhu-storage
`)
    ).toEqual(['doudizhu', 'storage'])
    expect(bundleEntryIds('not: a list')).toEqual([])
    expect(bundleEntryIds(':::')).toEqual([])
  })

  it('drops only the rows aimed at the plugin being removed', () => {
    const { text, removed } = prunePatchLayer(LAYER, 'dsh-doudizhu', ['storage'])

    // The plugin's own id-targeted row and both of its inserts go.
    expect(removed).toEqual(['id: storage', 'insert: dsh-doudizhu', 'insert: dsh-doudizhu/ui'])
    // The user's unrelated override survives, and so does their own insert.
    expect(text).toContain('id: theme')
    expect(text).toContain('accent: violet')
    expect(text).toContain('name: dsh-my-own')
    expect(text).not.toContain('sqlite')
    expect(text).not.toContain('dsh-doudizhu')
    // The header the user reads is part of the file, not noise to rewrite away.
    expect(text).toContain('# Your patch layer')
  })

  it('leaves the file byte-identical when nothing names the plugin', () => {
    const { text, removed } = prunePatchLayer(LAYER, 'dsh-unrelated', ['nothing'])
    expect(removed).toEqual([])
    expect(text).toBe(LAYER)
  })

  it('survives a layer that is empty, malformed, or not a list', () => {
    for (const input of ['[]\n', '', 'key: value\n', ':::']) {
      expect(prunePatchLayer(input, 'dsh-doudizhu', ['storage']).removed).toEqual([])
      expect(patchLayerInsertedPackages(input)).toEqual([])
    }
  })

  it('names the packages a layer inserts', () => {
    expect(patchLayerInsertedPackages(LAYER)).toEqual(['dsh-doudizhu', 'dsh-my-own', 'dsh-doudizhu/ui'])
  })
})
