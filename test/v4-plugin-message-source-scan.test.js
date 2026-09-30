import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { scanGenerationV4MessageSources } from '../packages/dsh-desktop-market-installer/generations/v4-message-source-scan.mjs'

const roots = []

async function generation() {
  const directory = await mkdtemp(join(tmpdir(), 'dsh-v4-source-scan-'))
  roots.push(directory)
  const packageRoot = join(directory, 'node_modules', 'sample-plugin')
  await mkdir(packageRoot, { recursive: true })
  return { directory, pluginName: 'sample-plugin', packageRoot }
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

describe('generation V4 source preflight', () => {
  it('finds a literal old source in the installed plugin with a relative location', async () => {
    const installed = await generation()
    await mkdir(join(installed.packageRoot, 'lib'), { recursive: true })
    await writeFile(join(installed.packageRoot, 'lib', 'index.js'), [
      'export function inject(session) {',
      "  session.append('user/message', { source: { kind: 'plugin', plugin: 'sample-plugin' } })",
      '}'
    ].join('\n'))

    expect(await scanGenerationV4MessageSources(installed)).toEqual({
      matches: [{ file: 'lib/index.js', line: 2 }], incomplete: false
    })
  })

  it('ignores documentation strings, comments, tests and private dependencies', async () => {
    const installed = await generation()
    await writeFile(join(installed.packageRoot, 'index.js'), [
      "// source: { kind: 'plugin' } is obsolete",
      "const example = \"source: { kind: 'plugin' }\"",
      'export const source = { kind: "plugin:sample-plugin" }'
    ].join('\n'))
    await mkdir(join(installed.packageRoot, 'test'), { recursive: true })
    await writeFile(join(installed.packageRoot, 'test', 'fixture.js'), "source: { kind: 'plugin' }")
    await mkdir(join(installed.packageRoot, 'node_modules', 'dependency'), { recursive: true })
    await writeFile(join(installed.packageRoot, 'node_modules', 'dependency', 'index.js'), "source: { kind: 'plugin' }")

    expect(await scanGenerationV4MessageSources(installed)).toEqual({ matches: [], incomplete: false })
  })
})
