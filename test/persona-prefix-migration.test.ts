import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Config } from '@deepseek-ai/dsh-persona'
import { isMap, isSeq, parseDocument } from 'yaml'
import { describe, expect, it } from 'vitest'
import { migratePersonaPrefix as migratePersonaPrefixJs } from '../packages/dsh-desktop-preset-transfer/persona-prefix.js'
import {
  migrateUserPresetPersonaPrefixes,
  writeTextAtomically
} from '../src/main/state/persona-prefix-migration'
import { migratePersonaPrefix } from '../src/shared/persona-prefix'

const legacy = `# keep this header
- id: persona # row comment
  name: '@deepseek-ai/dsh-persona'
  config:
    # prompt stays folded
    text: >-
      You are a coding agent.
      text: still prose
    suffix: Your working directory is {{cwd}}.

- id: tool-bash
  name: '@deepseek-ai/dsh-tool-bash'
  disabled: !!js process.platform === 'win32'
  config:
    text: do not touch this plugin

- name: cordis:group
  group: true
  config:
    - name: "@deepseek-ai/dsh-persona"
      config:
        "text": 'nested prompt'
`

function implementations(): Array<typeof migratePersonaPrefix> {
  return [migratePersonaPrefix, migratePersonaPrefixJs]
}

function personaConfigs(source: string): Array<Record<string, unknown>> {
  const document = parseDocument(source, {
    customTags: [{ tag: 'tag:yaml.org,2002:js', resolve: (value: string) => value }]
  })
  const found: Array<Record<string, unknown>> = []
  const visit = (node: unknown): void => {
    if (!isSeq(node)) return
    for (const item of node.items) {
      if (!isMap(item)) continue
      const config = item.get('config', true)
      if (item.get('name') === '@deepseek-ai/dsh-persona' && isMap(config)) {
        found.push(config.toJSON() as Record<string, unknown>)
      }
      if (isSeq(config)) visit(config)
    }
  }
  visit(document.contents)
  return found
}

describe('persona prefix rewrite', () => {
  it('renames only persona text keys and leaves the rest of the file byte-for-byte', () => {
    for (const migrate of implementations()) {
      const rewritten = migrate(legacy)
      expect(rewritten.changed).toBe(true)
      expect(rewritten.missingPrompt).toBe(false)
      expect(rewritten.text).toBe(legacy
        .replace('    text: >-', '    prefix: >-')
        .replace('        "text":', '        "prefix":'))
      expect(rewritten.text).toContain('!!js process.platform === \'win32\'')
      expect(rewritten.text).toContain('    text: do not touch this plugin')
      expect(rewritten.text).toContain('text: still prose')
      expect(rewritten.text).toContain('# keep this header')
    }
  })

  it('leaves a file unchanged when prefix is already present, including beside a leftover text key', () => {
    const cases = [
      legacy.replace('    text: >-', '    prefix: >-').replace('        "text":', '        "prefix":'),
      [
        '- name: \'@deepseek-ai/dsh-persona\'',
        '  config:',
        '    prefix: kept',
        '    text: also kept',
        ''
      ].join('\n'),
      [
        '- name: other',
        '  config:',
        '    text: not a persona',
        ''
      ].join('\n')
    ]
    for (const migrate of implementations()) {
      for (const source of cases) {
        expect(migrate(source)).toEqual({ text: source, changed: false, missingPrompt: false })
      }
    }
  })

  it('renames a usable persona without inventing a prompt for another row', () => {
    const source = [
      '- name: \'@deepseek-ai/dsh-persona\'',
      '  config:',
      '    suffix: only',
      '- name: \'@deepseek-ai/dsh-persona\'',
      '  config:',
      '    text: would have been renamed',
      ''
    ].join('\n')
    const rewritten = source.replace('    text: would have been renamed', '    prefix: would have been renamed')
    for (const migrate of implementations()) {
      expect(migrate(source)).toEqual({ text: rewritten, changed: true, missingPrompt: true })
    }
  })

  it('ignores a literally disabled empty persona and does not overwrite a bad prefix', () => {
    const disabled = [
      '- name: \'@deepseek-ai/dsh-persona\'',
      '  disabled: true',
      '  config:',
      '    suffix: unused',
      '- name: \'@deepseek-ai/dsh-persona\'',
      '  config:',
      '    text: kept',
      ''
    ].join('\n')
    const badPrefix = [
      '- name: \'@deepseek-ai/dsh-persona\'',
      '  config:',
      '    prefix: 1',
      '    text: do not copy over',
      ''
    ].join('\n')
    for (const migrate of implementations()) {
      expect(migrate(disabled)).toEqual({
        text: disabled.replace('    text: kept', '    prefix: kept'),
        changed: true,
        missingPrompt: false
      })
      expect(migrate(badPrefix)).toEqual({ text: badPrefix, changed: false, missingPrompt: true })
    }
  })

  it('keeps a leading BOM and still renames the persona key', () => {
    const source = `\uFEFF- name: '@deepseek-ai/dsh-persona'\n  config:\n    text: hello\n`
    for (const migrate of implementations()) {
      const rewritten = migrate(source)
      expect(rewritten.missingPrompt).toBe(false)
      expect(rewritten.changed).toBe(true)
      expect(rewritten.text.charCodeAt(0)).toBe(0xfeff)
      expect(rewritten.text.slice(1)).toBe(source.slice(1).replace('    text:', '    prefix:'))
    }
  })

  it('renames a persona-only anchor once and refuses an anchor shared with another plugin', () => {
    const exclusive = [
      '- name: \'@deepseek-ai/dsh-persona\'',
      '  config: &prompt',
      '    text: hello',
      '- name: \'@deepseek-ai/dsh-persona\'',
      '  config: *prompt',
      ''
    ].join('\n')
    const shared = [
      '- name: \'@deepseek-ai/dsh-tool-bash\'',
      '  config: &shared',
      '    text: do not touch',
      '- name: \'@deepseek-ai/dsh-persona\'',
      '  config: *shared',
      ''
    ].join('\n')
    const named = [
      '- name: &pkg \'@deepseek-ai/dsh-persona\'',
      '  config:',
      '    text: one',
      '- name: *pkg',
      '  config:',
      '    text: two',
      ''
    ].join('\n')
    for (const migrate of implementations()) {
      expect(migrate(exclusive)).toEqual({
        text: exclusive.replace('    text: hello', '    prefix: hello'),
        changed: true,
        missingPrompt: false
      })
      expect(migrate(shared)).toEqual({ text: shared, changed: false, missingPrompt: true })
      expect(migrate(named)).toEqual({
        text: named.replace('    text: one', '    prefix: one').replace('    text: two', '    prefix: two'),
        changed: true,
        missingPrompt: false
      })
    }
  })

  it('renames one anchored row and stops on a config sequence that aliases itself', () => {
    const row = [
      '- &who',
      '  name: \'@deepseek-ai/dsh-persona\'',
      '  config:',
      '    text: from-row',
      '- *who',
      ''
    ].join('\n')
    const loop = [
      '- name: cordis:group',
      '  group: true',
      '  config: &kids',
      '    - name: \'@deepseek-ai/dsh-persona\'',
      '      config:',
      '        text: nested',
      '    - *kids',
      ''
    ].join('\n')
    for (const migrate of implementations()) {
      expect(migrate(row)).toEqual({
        text: row.replace('    text: from-row', '    prefix: from-row'),
        changed: true,
        missingPrompt: false
      })
      expect(migrate(loop)).toEqual({
        text: loop.replace('        text: nested', '        prefix: nested'),
        changed: true,
        missingPrompt: false
      })
    }
  })

  it('treats static truthy disabled rows as skipped and still renames a usable text key', () => {
    const cases = ['true', 'yes', '1', '"false"', '!!js true', '!!js 1', '!!js \'"x"\'']
    for (const migrate of implementations()) {
      for (const disabled of cases) {
        const source = [
          '- name: \'@deepseek-ai/dsh-persona\'',
          `  disabled: ${disabled}`,
          '  config:',
          '    suffix: unused',
          ''
        ].join('\n')
        expect(migrate(source), disabled).toEqual({ text: source, changed: false, missingPrompt: false })
      }
      const renamed = [
        '- name: other',
        '  disabled: &off true',
        '- name: \'@deepseek-ai/dsh-persona\'',
        '  disabled: *off',
        '  config:',
        '    text: later',
        ''
      ].join('\n')
      expect(migrate(renamed)).toEqual({
        text: renamed.replace('    text: later', '    prefix: later'),
        changed: true,
        missingPrompt: false
      })
      const badPrefix = [
        '- name: \'@deepseek-ai/dsh-persona\'',
        '  disabled: true',
        '  config:',
        '    prefix: 1',
        '    text: do not copy',
        ''
      ].join('\n')
      expect(migrate(badPrefix)).toEqual({ text: badPrefix, changed: false, missingPrompt: false })
    }
  })

  it('still requires a prompt when disablement is not statically true', () => {
    const sources = [
      [
        '- name: \'@deepseek-ai/dsh-persona\'',
        '  disabled: !!js process.platform === \'win32\'',
        '  config:',
        '    suffix: only',
        ''
      ].join('\n'),
      [
        '- name: \'@deepseek-ai/dsh-persona\'',
        '  disabled: false',
        '  config:',
        '    suffix: only',
        ''
      ].join('\n'),
      [
        '- name: \'@deepseek-ai/dsh-persona\'',
        '  disabled: 0',
        '  config:',
        '    suffix: only',
        ''
      ].join('\n')
    ]
    for (const migrate of implementations()) {
      for (const source of sources) {
        expect(migrate(source)).toEqual({ text: source, changed: false, missingPrompt: true })
      }
    }
  })

  it('inherits a statically disabled ancestor group and still renames text there', () => {
    const empty = [
      '- name: cordis:group',
      '  group: true',
      '  disabled: true',
      '  config:',
      '    - name: \'@deepseek-ai/dsh-persona\'',
      '      config:',
      '        suffix: only',
      ''
    ].join('\n')
    const renamed = [
      '- name: cordis:group',
      '  group: true',
      '  disabled: true',
      '  config:',
      '    - name: \'@deepseek-ai/dsh-persona\'',
      '      config:',
      '        text: inside',
      ''
    ].join('\n')
    for (const migrate of implementations()) {
      expect(migrate(empty)).toEqual({ text: empty, changed: false, missingPrompt: false })
      expect(migrate(renamed)).toEqual({
        text: renamed.replace('        text: inside', '        prefix: inside'),
        changed: true,
        missingPrompt: false
      })
    }
  })

  it('does not read a merge key as a persona prompt', () => {
    const source = [
      '- name: \'@deepseek-ai/dsh-persona\'',
      '  config:',
      '    <<: {text: hello}',
      '    suffix: x',
      ''
    ].join('\n')
    for (const migrate of implementations()) {
      expect(migrate(source)).toEqual({ text: source, changed: false, missingPrompt: true })
    }
  })

  it('declares yaml as a direct preset-transfer dependency and keeps the helper private', async () => {
    const manifest = JSON.parse(await readFile(
      new URL('../packages/dsh-desktop-preset-transfer/package.json', import.meta.url),
      'utf8'
    )) as { dependencies?: Record<string, string>; exports?: Record<string, unknown> }
    expect(manifest.dependencies?.yaml).toMatch(/2\.8\.3/)
    expect(manifest.exports?.['./persona-prefix.js']).toBeUndefined()
  })

  it('makes a legacy persona config pass the real prefix schema and fail before that', () => {
    const validate = Config as unknown as (value: unknown) => { prefix: string }
    expect(() => validate({ text: 'You are a coding agent.' })).toThrow(/prefix/)
    const rewritten = migratePersonaPrefix(legacy)
    const configs = personaConfigs(rewritten.text)
    expect(configs.length).toBeGreaterThan(0)
    for (const config of configs) {
      expect(validate(config).prefix.length).toBeGreaterThan(0)
    }
    const first = configs[0]
    if (first === undefined) throw new Error('missing persona config')
    expect(validate(first).prefix).toContain('You are a coding agent.')
  })
})

describe('startup persona prefix migration', () => {
  it('backs up once, rewrites user presets, and skips the backup directory', async () => {
    const home = await mkdtemp(join(tmpdir(), 'dsh-persona-home-'))
    const root = join(home, '.agent-presets')
    const notes: string[] = []
    try {
      await mkdir(join(root, 'writer'), { recursive: true })
      await writeFile(join(root, 'writer', 'agent.cordis.yml'), legacy)
      await mkdir(join(root, '.persona-prefix-backups', 'decoy'), { recursive: true })
      await writeFile(join(root, '.persona-prefix-backups', 'decoy', 'agent.cordis.yml'), 'text: not a preset\n')
      await mkdir(join(root, 'NotAPreset'), { recursive: true })
      const mixed = [
        '- name: \'@deepseek-ai/dsh-persona\'',
        '  config:',
        '    suffix: missing',
        '- name: \'@deepseek-ai/dsh-persona\'',
        '  config:',
        '    text: usable',
        ''
      ].join('\n')
      await mkdir(join(root, 'mixed'), { recursive: true })
      await writeFile(join(root, 'mixed', 'agent.cordis.yml'), mixed)

      await migrateUserPresetPersonaPrefixes(home, (line) => notes.push(line))
      const migrated = await readFile(join(root, 'writer', 'agent.cordis.yml'), 'utf8')
      expect(await readFile(join(root, 'mixed', 'agent.cordis.yml'), 'utf8'))
        .toBe(mixed.replace('    text: usable', '    prefix: usable'))
      expect(notes.some((line) => line.includes('mixed') && line.includes('without a usable prompt'))).toBe(true)
      const backup = await readFile(join(root, '.persona-prefix-backups', 'writer', 'agent.cordis.yml'), 'utf8')
      expect(migrated).toBe(migratePersonaPrefix(legacy).text)
      expect(backup).toBe(legacy)
      expect(await readFile(join(root, '.persona-prefix-backups', 'decoy', 'agent.cordis.yml'), 'utf8'))
        .toBe('text: not a preset\n')

      await writeFile(join(root, 'writer', 'agent.cordis.yml'), 'tampered\n')
      await migrateUserPresetPersonaPrefixes(home, (line) => notes.push(line))
      expect(await readFile(join(root, '.persona-prefix-backups', 'writer', 'agent.cordis.yml'), 'utf8')).toBe(legacy)
      expect(notes.some((line) => line.includes('writer'))).toBe(true)
    } finally {
      await rm(home, { recursive: true, force: true })
    }
  })

  it('removes the temporary file and keeps the original when the replace fails', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dsh-persona-atomic-'))
    const target = join(dir, 'agent.cordis.yml')
    const temps: string[] = []
    try {
      await writeFile(target, 'original')
      await expect(writeTextAtomically(target, 'next', {
        writeFile: async (path, text) => {
          temps.push(path)
          await writeFile(path, text, 'utf8')
        },
        rename: async () => {
          throw new Error('rename failed')
        },
        rm: async (path) => {
          await rm(path, { force: true })
        }
      })).rejects.toThrow('rename failed')
      expect(await readFile(target, 'utf8')).toBe('original')
      expect(temps).toHaveLength(1)
      await expect(readFile(temps[0]!)).rejects.toThrow()
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})

describe('persona prefix migration runs before harness start', () => {
  it('rewrites user presets after profile maintenance is allowed and before runtime.start', async () => {
    const source = await readFile(new URL('../src/main/index.ts', import.meta.url), 'utf8')
    const launch = source.slice(source.indexOf('function launchHarness'), source.indexOf('function launchSafeHarness'))
    const safe = source.slice(source.indexOf('function launchSafeHarness'), source.indexOf('function startRepairAgentPrompt'))
    expect(launch.indexOf('runProfileStartupMaintenance')).toBeGreaterThan(-1)
    expect(launch.indexOf('migratePersonaPrefixesBeforeStart')).toBeGreaterThan(launch.indexOf('runProfileStartupMaintenance'))
    expect(launch.indexOf('migratePersonaPrefixesBeforeStart')).toBeLessThan(launch.indexOf('await runtime.start'))
    expect(safe.indexOf('migratePersonaPrefixesBeforeStart')).toBeLessThan(safe.indexOf('await runtime.start'))
  })
})
