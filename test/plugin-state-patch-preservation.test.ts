import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parse } from 'yaml'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { recordPluginSwitch, removePatchRowOverrides, validatePluginSwitch } from 'dsh-desktop-market-installer/plugin-state'

vi.mock('node:fs/promises', async importOriginal => {
  const actual = await importOriginal<typeof import('node:fs/promises')>()
  return { ...actual, rename: vi.fn(actual.rename) }
})
const directories: string[] = []
afterEach(async () => {
  vi.mocked(rename).mockReset()
  vi.mocked(rename).mockImplementation((await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises')).rename)
  await Promise.all(directories.splice(0).map(directory => rm(directory, { recursive: true, force: true })))
})
async function fixture(patch: string, enabled = true) {
  const directory = await mkdtemp(join(tmpdir(), 'dsh-patch-preservation-'))
  directories.push(directory)
  const patchPath = join(directory, 'cordis.patch.yml')
  const statePath = join(directory, '.dsh-market', 'state.json')
  await mkdir(join(directory, '.dsh-market'))
  await writeFile(patchPath, patch)
  const state = JSON.stringify({ disabled: enabled ? ['community-package', 'other'] : ['other'], custom: 42 })
  await writeFile(statePath, state)
  return { directory, patchPath, statePath, state }
}
describe('package switch patch preservation', () => {
  it.each([true, false])('preserves configuration ownership through persistence (enabled=%s)', async enabled => {
    const patch = '- id: unrelated\n- id: community\n  disabled: ' + enabled + '\n  config:\n    retained: custom-value\n'
    const { directory, patchPath, statePath } = await fixture(patch, enabled)
    await recordPluginSwitch(directory, 'community-package', enabled, { rowIds: ['community'] })
    expect(parse(await readFile(patchPath, 'utf8'))).toEqual([{ id: 'unrelated' }, { id: 'community', config: { retained: 'custom-value' } }])
    expect(JSON.parse(await readFile(statePath, 'utf8'))).toEqual({ disabled: enabled ? ['other'] : ['other', 'community-package'], custom: 42 })
  })
  it.each(['false', '0', 'null', "''", '[]', '{}'])('retains config: %s', value => {
    const result = removePatchRowOverrides('- id: community\n  disabled: true\n  config: ' + value + '\n', ['community'], true)
    expect(parse(result.text)).toEqual([{ id: 'community', config: parse(value) }])
  })
  it.each([
    '- id: community\n  config: { retained: 1 }\n  disabled: true\n',
    '- disabled: true\n  name: community-package\n  id: "community"\n  config: false\n',
    '- id: "community"\n  disabled: true\n  insert: []\n',
    '- { id: community, disabled: true, config: false }\n',
    '- { disabled: true, id: community, config: null }\n',
    '- { id: community, config: 0, disabled: true }\n',
    '- { disabled: true, id: community, config: null, }\n',
    '- { id: community, disabled: true, config: false, }\n',
    '- { id: community, config: 0, disabled: true, }\n'
  ])('removes only the contradictory boolean: %s', before => {
    const expected = parse(before)
    delete expected[0].disabled
    expect(parse(removePatchRowOverrides(before, ['community'], true).text)).toEqual(expected)
  })
  it('preserves comments, boundaries, quotes and unrelated CRLF bytes', () => {
    const before = '---\r\n# header\r\n- id: "community"\r\n  disabled: true # keep flag comment\r\n  config: !!js "({ retained: true })"\r\n# untouched\r\n- { id: other, config: [1,  2] }\r\n...\r\n'
    expect(removePatchRowOverrides(before, ['community'], true).text).toBe(before.replace('disabled: true', ''))
  })
  it('preserves comments around a flow-map disabled property', () => {
    const before = '- { id: community, # keep before\n    disabled: true, # keep after\n    config: false }\n'
    const result = removePatchRowOverrides(before, ['community'], true)
    expect(parse(result.text)).toEqual([{ id: 'community', config: false }])
    expect(result.text).toContain('# keep before')
    expect(result.text).toContain('# keep after')
  })
  it('validates present input without writes even when no row ids are known', async () => {
    const { directory, patchPath, statePath, state } = await fixture('broken: [\n')
    await expect(validatePluginSwitch(directory, 'community-package', true)).rejects.toThrow()
    await expect(recordPluginSwitch(directory, 'community-package', true)).rejects.toThrow()
    expect(await readFile(patchPath, 'utf8')).toBe('broken: [\n')
    expect(await readFile(statePath, 'utf8')).toBe(state)
    expect(rename).not.toHaveBeenCalled()
  })
  it('validates a switch without committing a valid proposed patch', async () => {
    const before = '- id: community\n  disabled: true\n  config: 0\n'
    const { directory, patchPath, statePath, state } = await fixture(before)
    await validatePluginSwitch(directory, 'community-package', true, { rowIds: ['community'] })
    expect(await readFile(patchPath, 'utf8')).toBe(before)
    expect(await readFile(statePath, 'utf8')).toBe(state)
    expect(rename).not.toHaveBeenCalled()
  })
  it('never evaluates a Harness JavaScript expression while editing', () => {
    const marker = '__dshPatchEditorExecuted'
    const expression = '(() => { globalThis.__dshPatchEditorExecuted = true; throw new Error("executed") })()'
    const before = '- id: community\n  disabled: true\n  config: !!js ' + JSON.stringify(expression) + '\n'
    expect(Reflect.has(globalThis, marker)).toBe(false)
    const result = removePatchRowOverrides(before, ['community'], true)
    expect(result.text).toBe(before.replace('disabled: true', ''))
    expect(Reflect.has(globalThis, marker)).toBe(false)
  })
  it('does not descend into inserted rows or coerce string booleans', () => {
    const before = '- insert:\n    - id: community\n      disabled: true\n- id: community\n  disabled: "true"\n- id: other\n  disabled: true\n'
    expect(removePatchRowOverrides(before, ['community'], true)).toEqual({ text: before, changed: false })
  })
  it('handles all matching rows and keeps the other intent', () => {
    const before = '- id: community\n  disabled: true\n  config: 1\n- id: community\n  config: 2\n  disabled: true\n- id: community\n  disabled: false\n'
    expect(parse(removePatchRowOverrides(before, ['community'], true).text)).toEqual([{ id: 'community', config: 1 }, { id: 'community', config: 2 }, { id: 'community', disabled: false }])
  })
  it.each([
    '- # retain me\n  id: community\n  disabled: true\n',
    '-\n  # retain map lead\n  id: community\n  disabled: true\n',
    '- id: community\n  disabled: true\n  # retain map tail\n',
    '- !!map\n  id: community\n  disabled: true\n',
    '- !custom\n  id: community\n  disabled: true\n'
  ])('preserves mapping-level comments and tags through persistence: %s', async before => {
    const { directory, patchPath } = await fixture(before)
    await recordPluginSwitch(directory, 'community-package', true, { rowIds: ['community'] })
    const after = await readFile(patchPath, 'utf8')
    expect(after).toBe(before.replace('disabled: true', ''))
    expect(parse(after, { logLevel: 'silent' })).toEqual([{ id: 'community' }])
  })
  it('deletes only pure switch mappings into valid empty documents', () => {
    expect(removePatchRowOverrides('- id: community\n  disabled: true\n', ['community'], true)).toEqual({ text: '[]\n', changed: true })
    const result = removePatchRowOverrides('---\n# header\n- id: community\n  disabled: true\n...\n', ['community'], true)
    expect(parse(result.text)).toEqual([])
    expect(result.text).toContain('# header')
    expect(result.text).toContain('...')
  })
  it.each(['', '# comments only\n', '[]\n', '- id: community\n  disabled: false\n', '- id: "bad id"\n  disabled: true\n'])('keeps unchanged patch %j', before => {
    expect(removePatchRowOverrides(before, ['community', 'bad id'], true)).toEqual({ text: before, changed: false })
  })
  it('retains anchored rows and configuration aliases', () => {
    const before = '- &owned\n  id: community\n  disabled: true\n  config: &settings { retained: false }\n- id: other\n  config: *settings\n'
    const result = removePatchRowOverrides(before, ['community'], true)
    expect(result.text).toContain('&owned')
    expect(result.text).toContain('&settings')
    expect(result.text).toContain('*settings')
    expect(parse(result.text)).toEqual([{ id: 'community', config: { retained: false } }, { id: 'other', config: { retained: false } }])
    const pure = removePatchRowOverrides('- &owned\n  id: community\n  disabled: true\n- id: other\n  config: *owned\n', ['community'], true)
    expect(parse(pure.text)).toEqual([{ id: 'community' }, { id: 'other', config: { id: 'community' } }])
  })
  it('leaves unrelated merge mappings untouched', () => {
    const before = '- &other { id: other, disabled: true }\n- <<: *other\n  config: { retained: 1 }\n- id: community\n  disabled: true\n  config: 0\n'
    expect(removePatchRowOverrides(before, ['community'], true).text).toBe(before.replace('disabled: true\n  config: 0', '\n  config: 0'))
  })
  it.each([
    '- id: community\n  disabled: true\n  config: [broken\n',
    'id: community\ndisabled: true\n',
    '- id: community\n  id: other\n  disabled: true\n',
    '- id: community\n  disabled: true\n---\n[]\n',
    '- &owned { id: community, disabled: true }\n- *owned\n',
    '- &defaults { id: other, disabled: true }\n- <<: *defaults\n  id: community\n  disabled: false\n',
    '- &defaults { id: community, disabled: true }\n- <<: *defaults\n',
    '- id: community\n  disabled: &flag true\n- id: other\n  config: *flag\n',
    '- id: community\n  disabled: *missing\n',
    '- !custom id: community\n  disabled: true\n',
    '- id: community\n  !custom disabled: true\n'
  ])('rejects malformed or matching ambiguous input before writes: %s', async patch => {
    const { directory, patchPath, statePath, state } = await fixture(patch)
    await expect(recordPluginSwitch(directory, 'community-package', true, { rowIds: ['community'] })).rejects.toThrow()
    expect(await readFile(patchPath, 'utf8')).toBe(patch)
    expect(await readFile(statePath, 'utf8')).toBe(state)
    expect(rename).not.toHaveBeenCalled()
  })
  it.each([
    '- &key disabled: true\n  id: community\n- id: other\n  config: *key\n',
    '- { &key disabled: true, id: community }\n- id: other\n  config: *key\n',
    '- id: community\n  &key disabled: true\n- id: other\n  config: *key\n'
  ])('rejects anchored disabled keys without changing alias semantics: %s', async before => {
    const { directory, patchPath, statePath, state } = await fixture(before)
    expect(parse(before)[1].config).toBe('disabled')
    await expect(recordPluginSwitch(directory, 'community-package', true, { rowIds: ['community'] })).rejects.toThrow()
    const after = await readFile(patchPath, 'utf8')
    expect(after).toBe(before)
    expect(parse(after)[1].config).toBe('disabled')
    expect(await readFile(statePath, 'utf8')).toBe(state)
    expect(rename).not.toHaveBeenCalled()
  })
  it('does not replace a concurrent user edit during failed state publication', async () => {
    const { directory, patchPath, statePath, state } = await fixture('- id: community\n  disabled: true\n  config: false\n')
    const concurrent = '# concurrent edit\n- id: community\n  config: user-value\n'
    const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises')
    vi.mocked(rename).mockImplementation(async (source, target) => {
      if (target === statePath) { await writeFile(patchPath, concurrent); throw new Error('state publication failed') }
      return actual.rename(source, target)
    })
    await expect(recordPluginSwitch(directory, 'community-package', true, { rowIds: ['community'] })).rejects.toThrow('state publication failed')
    expect(await readFile(patchPath, 'utf8')).toBe(concurrent)
    expect(await readFile(statePath, 'utf8')).toBe(state)
  })
})
