import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import { hostInsertedPluginNames, prepareHostPluginSourcesPatch } from '../src/main/state/host-plugin-sources'
import { setHostPluginEnabled } from '../src/main/state/host-plugin-state'

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
    for (const name of names) {
      const directory = join(app, 'node_modules', name)
      await mkdir(directory, { recursive: true })
      await writeFile(join(directory, 'package.json'), JSON.stringify({ name, main: 'index.js' }))
      const entry = join(directory, 'index.js')
      await writeFile(entry, `module.exports = '${name}'\n`)
    }
    const source = `# Keep this comment\n- insert:\n    - id: first\n      name: host-first\n    - id: second\n      name: 'host-second'\n      config:\n        path: !!js dshHomePath('data')\n- id: another\n  name: profile-plugin\n`
    await writeFile(patchPath, source)
    expect(hostInsertedPluginNames(source)).toEqual(names)
    const outputPath = await prepareHostPluginSourcesPatch(home, patchPath, join(app, 'package.json'))
    const output = await readFile(outputPath, 'utf8')
    const rows = parse(output, { logLevel: 'silent' }) as { insert?: { name: string }[]; name?: string }[]
    const resolveHost = createRequire(join(app, 'package.json')).resolve
    expect(rows[0]?.insert?.map(row => row.name)).toEqual(names.map(name => pathToFileURL(resolveHost(name)).href))
    expect(rows[1]?.name).toBe('profile-plugin')
    expect(output).toContain("path: !!js dshHomePath('data')")
    expect(output).toContain('# Keep this comment')
    expect(await prepareHostPluginSourcesPatch(home, patchPath, join(app, 'package.json'))).toBe(outputPath)
    expect(await readFile(patchPath, 'utf8')).toBe(source)
  })

  it('loads host plugins from unpacked resources outside the installation cwd and preserves missing-package causes', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-installed-host-sources-'))
    directories.push(root)
    const resources = join(root, 'installation', 'resources')
    const runtime = join(resources, 'app.asar.unpacked')
    const home = join(root, 'profile')
    const launchRoot = join(root, 'launch-root')
    const anchor = join(runtime, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js')
    const plugin = join(runtime, 'node_modules', 'host-plugin')
    await mkdir(plugin, { recursive: true })
    await mkdir(home)
    await mkdir(launchRoot)
    await writeFile(join(plugin, 'package.json'), JSON.stringify({ name: 'host-plugin', type: 'module', exports: './entry.js' }))
    await writeFile(join(plugin, 'entry.js'), 'export default "installed-host"\n')
    const patchPath = join(resources, 'desktop.patch.yml')
    await writeFile(patchPath, '- insert:\n    - id: host\n      name: host-plugin\n')
    const output = await prepareHostPluginSourcesPatch(home, patchPath, anchor)
    const rows = parse(await readFile(output, 'utf8')) as { insert: { name: string }[] }[]
    const entry = rows[0]?.insert[0]?.name
    if (!entry) throw new Error('Missing resolved host plugin source')
    // Windows may preserve an 8.3 temp path in require.resolve's result.
    expect(await realpath(fileURLToPath(entry))).toBe(await realpath(join(plugin, 'entry.js')))
    const result = await promisify(execFile)(process.execPath, ['--input-type=module', '-e', `console.log((await import(${JSON.stringify(entry)})).default)`], { cwd: launchRoot })
    expect(result.stdout.trim()).toBe('installed-host')

    const previous = await readFile(output, 'utf8')
    await writeFile(patchPath, '- insert:\n    - id: missing\n      name: absent-host-plugin\n')
    await expect(prepareHostPluginSourcesPatch(home, patchPath, anchor)).rejects.toMatchObject({
      message: expect.stringContaining(`Desktop host plugin source resolution failed for absent-host-plugin from ${anchor}: Cannot find module`),
      cause: { code: 'MODULE_NOT_FOUND' }
    })
    expect(await readFile(output, 'utf8')).toBe(previous)
  })

  it('leaves patches without host package insertions untouched', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-host-sources-'))
    directories.push(root)
    const patchPath = join(root, 'patch.yml')
    await writeFile(patchPath, '- insert:\n    - id: local\n      name: file:///tmp/plugin.js\n')
    expect(await prepareHostPluginSourcesPatch(root, patchPath, join(root, 'package.json'))).toBe(patchPath)
  })

  it('omits a switched-off host insertion while retaining other host sources', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-host-sources-'))
    directories.push(root)
    const app = join(root, 'app')
    const home = join(root, 'home')
    const patchPath = join(app, 'build', 'dsh-desktop.patch.yml')
    await mkdir(join(app, 'build'), { recursive: true })
    await writeFile(join(app, 'package.json'), '{"name":"test-desktop"}\n')
    const other = join(app, 'node_modules', 'host-other')
    await mkdir(other, { recursive: true })
    await writeFile(join(other, 'package.json'), '{"name":"host-other","main":"index.js"}')
    await writeFile(join(other, 'index.js'), 'module.exports = {}\n')
    await writeFile(patchPath, '- insert:\n    - id: image\n      name: dsh-image-generation\n    - id: other\n      name: host-other\n')
    await setHostPluginEnabled(home, 'dsh-image-generation', false)
    const output = await readFile(await prepareHostPluginSourcesPatch(home, patchPath, join(app, 'package.json')), 'utf8')
    const rows = parse(output, { logLevel: 'silent' }) as { insert: { id: string; name: string }[] }[]
    const resolveHost = createRequire(join(app, 'package.json')).resolve
    expect(rows[0]?.insert).toEqual([{ id: 'other', name: pathToFileURL(resolveHost('host-other')).href }])
    expect(output).not.toContain('dsh-image-generation')
    expect(hostInsertedPluginNames(await readFile(patchPath, 'utf8'), ['dsh-image-generation'])).toEqual(['host-other'])
  })

  it('writes a derived patch when the only host insertion is disabled by default', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-host-sources-'))
    directories.push(root)
    const patchPath = join(root, 'desktop.patch.yml')
    await writeFile(patchPath, '- insert:\n    - id: image\n      name: dsh-image-generation\n')
    const outputPath = await prepareHostPluginSourcesPatch(root, patchPath, join(root, 'package.json'))
    expect(outputPath).not.toBe(patchPath)
    expect(parse(await readFile(outputPath, 'utf8'))).toEqual([])
    expect(await readFile(patchPath, 'utf8')).toContain('dsh-image-generation')
  })
})
