import { spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, realpath, rm, unlink, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const electron = require('electron') as string
const asar = require('@electron/asar') as {
  createPackageWithOptions(source: string, destination: string, options: { unpack: string }): Promise<void>
}
const roots: string[] = []
afterEach(async () => {
  await Promise.all(roots.splice(0).map(async root => {
    // Electron fs treats .asar as a directory during recursive rm.
    await unlink(join(root, 'app.asar'))
    await rm(root, { recursive: true, force: true })
  }))
})

// Exercise the installed kit's unchanged selection functions, not a duplicate
// resolver or mocked fs. Extract this self-contained bundled region to avoid
// packing unrelated converter dependencies and multi-hundred-MB WASM payloads.
async function selectionFixture(bundle: 'index.js' | 'cli.js', native: 'absent' | 'incomplete' | 'invalid-manifest') {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'dsh-office-asar-')))
  roots.push(root)
  const app = join(root, 'app')
  const archive = join(root, 'app.asar')
  const kit = join(app, 'node_modules', '@deepseek-ai', 'libreoffice-kit')
  const installed = await readFile(join(require.resolve('@deepseek-ai/libreoffice-kit/package.json'), '..', 'lib', bundle), 'utf8')
  const start = installed.indexOf('const require = createRequire(import.meta.url);')
  const end = installed.indexOf('//#endregion', start)
  expect(start).toBeGreaterThan(0)
  expect(end).toBeGreaterThan(start)
  await mkdir(join(kit, 'lib'), { recursive: true })
  await writeFile(join(kit, 'package.json'), JSON.stringify({ type: 'module' }))
  await writeFile(join(kit, 'lib', 'selection.mjs'), [
    "import { createRequire } from 'node:module'",
    "import { lstatSync } from 'node:fs'",
    "import { readFile, stat } from 'node:fs/promises'",
    "import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'",
    installed.slice(start, end),
    'export { resolveEngine }',
  ].join('\n'))
  const wasm = join(app, 'node_modules', '@deepseek-ai', 'libreoffice-kit-wasm')
  await mkdir(wasm, { recursive: true })
  await writeFile(join(wasm, 'package.json'), JSON.stringify({ name: '@deepseek-ai/libreoffice-kit-wasm', version: '0.1.5' }))
  await writeFile(join(wasm, 'prebuilds.json'), JSON.stringify({
    schemaVersion: 1, version: '0.1.5', status: 'built', platform: 'wasm',
    engine: { kind: 'wasm', loader: 'loader.js', wasm: 'engine.wasm', data: 'engine.data', metadata: 'metadata.json', programDirectory: 'program' },
  }))
  for (const asset of ['loader.js', 'engine.wasm', 'engine.data', 'metadata.json']) await writeFile(join(wasm, asset), '')
  if (native !== 'absent') {
    const directory = join(app, 'node_modules', '@deepseek-ai', 'libreoffice-kit-linux-x64-glibc')
    await mkdir(directory, { recursive: true })
    // ASAR preserves the damaged package even when its manifest was lost.
    await writeFile(join(directory, 'leftover'), 'installed but damaged')
    if (native === 'invalid-manifest') {
      await writeFile(join(directory, 'package.json'), JSON.stringify({ name: '@deepseek-ai/libreoffice-kit-linux-x64-glibc', version: '0.1.1' }))
      await writeFile(join(directory, 'prebuilds.json'), '{}')
    }
  }
  await asar.createPackageWithOptions(app, archive, { unpack: '**/libreoffice-kit-*/**' })
  return archive
}

function select(archive: string) {
  const script = [
    "import { lstatSync } from 'node:fs'",
    'import { registerOfficeEngineResolution } from ' + JSON.stringify(pathToFileURL(join(process.cwd(), 'build/office-engine-resolution.mjs')).href),
    'import { resolveEngine } from ' + JSON.stringify(pathToFileURL(join(archive, 'node_modules/@deepseek-ai/libreoffice-kit/lib/selection.mjs')).href),
    'registerOfficeEngineResolution(' + JSON.stringify(join(archive, 'node_modules/@deepseek-ai/dsh/lib/bin.js')) + ')',
    'console.log("missing-stat", lstatSync(' + JSON.stringify(join(archive, 'missing')) + ', { throwIfNoEntry: false }) === null ? "null" : "other")',
    'try { const engine = await resolveEngine(undefined, undefined, { platform: "linux", arch: "x64", report: () => ({header: {glibcVersionRuntime: "2.31"}}) }); console.log(engine.backend, engine.root) } catch (error) { console.error(error); process.exitCode = 1 }',
  ].join('\n')
  return spawnSync(electron, ['--input-type=module', '-e', script], {
    encoding: 'utf8', timeout: 30_000,
    env: { PATH: process.env.PATH, ELECTRON_RUN_AS_NODE: '1' },
  })
}

describe.each(['index.js', 'cli.js'] as const)('LibreOfficeKit %s selection through a real Electron ASAR', bundle => {
  it('falls back to physical WASM resources for an absent native package', async () => {
    const archive = await selectionFixture(bundle, 'absent')
    const result = select(archive)
    expect(result.stderr).toBe('')
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('missing-stat null')
    expect(result.stdout).toContain('wasm ' + join(archive + '.unpacked', 'node_modules/@deepseek-ai/libreoffice-kit-wasm'))
  })

  it('fails closed for an installed native directory missing its manifest', async () => {
    const result = select(await selectionFixture(bundle, 'incomplete'))
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Installed LibreOfficeKit package is incomplete: @deepseek-ai/libreoffice-kit-linux-x64-glibc')
    expect(result.stderr).toContain('MODULE_NOT_FOUND')
    expect(result.stdout).not.toContain('wasm ')
  })

  it('fails closed for an installed native package with an invalid manifest', async () => {
    const result = select(await selectionFixture(bundle, 'invalid-manifest'))
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('incompatible or incomplete manifest')
    expect(result.stdout).not.toContain('wasm ')
  })
})
