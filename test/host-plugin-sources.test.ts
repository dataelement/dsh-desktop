import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import { hostInsertedPluginNames, prepareHostPluginSourcesPatch } from '../src/main/state/host-plugin-sources'

const directories: string[] = []
afterEach(async () => { await Promise.all(directories.splice(0).map(path => rm(path, { recursive: true, force: true }))) })

describe('Desktop host plugin sources', () => {
  it('pins every inserted package to the current Desktop and preserves other patch content', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-host-sources-'))
    directories.push(root)
    const app = join(root, 'app')
    const home = join(root, 'home')
    const patchPath = join(app, 'build', 'dsh-desktop.patch.yml')
    await mkdir(join(app, 'build'), { recursive: true })
    await mkdir(home)
    await writeFile(join(app, 'package.json'), '{"name":"test-desktop"}\n')
    const names = ['host-first', 'host-second']
    const entries: string[] = []
    for (const name of names) {
      const directory = join(app, 'node_modules', name)
      await mkdir(directory, { recursive: true })
      await writeFile(join(directory, 'package.json'), JSON.stringify({ name, main: 'index.js' }))
      const entry = join(directory, 'index.js')
      entries.push(entry)
      await writeFile(entry, `module.exports = '${name}'\n`)
    }
    const source = `# Keep this comment\n- insert:\n    - id: first\n      name: host-first\n    - id: second\n      name: 'host-second'\n      config:\n        path: !!js dshHomePath('data')\n- id: another\n  name: profile-plugin\n`
    await writeFile(patchPath, source)
    expect(hostInsertedPluginNames(source)).toEqual(names)
    const outputPath = await prepareHostPluginSourcesPatch(home, patchPath)
    const output = await readFile(outputPath, 'utf8')
    const rows = parse(output, { logLevel: 'silent' }) as { insert?: { name: string }[]; name?: string }[]
    expect(rows[0]?.insert?.map(row => row.name)).toEqual(await Promise.all(entries.map(async path => pathToFileURL(await realpath(path)).href)))
    expect(rows[1]?.name).toBe('profile-plugin')
    expect(output).toContain("path: !!js dshHomePath('data')")
    expect(output).toContain('# Keep this comment')
    expect(await prepareHostPluginSourcesPatch(home, patchPath)).toBe(outputPath)
    expect(await readFile(patchPath, 'utf8')).toBe(source)
  })

  it('leaves patches without host package insertions untouched', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-host-sources-'))
    directories.push(root)
    const patchPath = join(root, 'patch.yml')
    await writeFile(patchPath, '- insert:\n    - id: local\n      name: file:///tmp/plugin.js\n')
    expect(await prepareHostPluginSourcesPatch(root, patchPath)).toBe(patchPath)
  })
})
