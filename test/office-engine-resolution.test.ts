import { spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { packagedArchiveRoot, registerOfficeEngineResolution } from '../build/office-engine-resolution.mjs'

const ENGINE = '@deepseek-ai/libreoffice-kit-darwin-arm64'
const hookModule = join(process.cwd(), 'build', 'office-engine-resolution.mjs')
const electron = createRequire(import.meta.url)('electron') as string
const roots: string[] = []
afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

async function packagedLayout(): Promise<{ archive: string, entry: string }> {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'dsh-office-engine-')))
  roots.push(root)
  const archive = join(root, 'Resources', 'app.asar')
  for (const base of [archive, `${archive}.unpacked`]) {
    await mkdir(join(base, 'node_modules', ENGINE), { recursive: true })
    await writeFile(join(base, 'node_modules', ENGINE, 'package.json'), JSON.stringify({ name: ENGINE, version: '0.1.5' }))
  }
  await mkdir(join(archive, 'node_modules', '@deepseek-ai', 'libreoffice-kit', 'lib'), { recursive: true })
  return { archive, entry: join(archive, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js') }
}

describe('Office engine resolution', () => {
  it('shares one 0.1.5 kit across PPT, Office skills and PDF conversion', async () => {
    const host = createRequire(import.meta.url)
    const manifest = host.resolve('@deepseek-ai/libreoffice-kit/package.json')
    for (const consumer of ['dsh-ppt', '@deepseek-ai/dsh-skill-office', '@deepseek-ai/dsh-office-to-pdf']) {
      const require = createRequire(host.resolve(consumer))
      expect(require.resolve('@deepseek-ai/libreoffice-kit/package.json')).toBe(manifest)
    }
    const kit = JSON.parse(await readFile(manifest, 'utf8'))
    expect(kit.version).toBe('0.1.5')
    expect(new Set(Object.values(kit.optionalDependencies))).toEqual(new Set(['0.1.5']))
    const lock = JSON.parse(await readFile(join(process.cwd(), 'package-lock.json'), 'utf8'))
    const kits = Object.keys(lock.packages).filter(path => path.endsWith('node_modules/@deepseek-ai/libreoffice-kit'))
    expect(kits).toEqual(['node_modules/@deepseek-ai/libreoffice-kit'])
    expect(lock.packages['node_modules/@deepseek-ai/libreoffice-kit'].version).toBe('0.1.5')
  })

  it('finds the archive root only for an app.asar installation', () => {
    expect(packagedArchiveRoot('/App/Contents/Resources/app.asar/node_modules/@deepseek-ai/dsh/lib/bin.js'))
      .toBe('/App/Contents/Resources/app.asar')
    expect(packagedArchiveRoot('/repo/node_modules/@deepseek-ai/dsh/lib/bin.js')).toBeUndefined()
  })

  // Run on the Electron runtime Harness uses, in Node mode: hooks reach
  // require.resolve only on its Node version, and the test runner's own module
  // loader does not route through them.
  function resolveEngine(archive: string, entry: string | undefined): string {
    const script = [
      "import { createRequire } from 'node:module'",
      `import { registerOfficeEngineResolution } from ${JSON.stringify(pathToFileURL(hookModule).href)}`,
      entry === undefined ? '' : `if (!registerOfficeEngineResolution(${JSON.stringify(entry)})) throw new Error('no hook')`,
      `const kit = createRequire(${JSON.stringify(join(archive, 'node_modules', '@deepseek-ai', 'libreoffice-kit', 'lib', 'cli.js'))})`,
      `process.stdout.write(kit.resolve(${JSON.stringify(`${ENGINE}/package.json`)}))`
    ].join('\n')
    const result = spawnSync(electron, ['--input-type=module', '-e', script], {
      encoding: 'utf8',
      env: { PATH: process.env.PATH, ELECTRON_RUN_AS_NODE: '1' }
    })
    if (result.status !== 0) throw new Error(result.stderr)
    return result.stdout
  }

  it('leaves the engine inside the archive without the hook', async () => {
    const { archive } = await packagedLayout()
    expect(resolveEngine(archive, undefined)).toBe(join(archive, 'node_modules', ENGINE, 'package.json'))
  })

  it('resolves the engine package to app.asar.unpacked so the OS can spawn it', async () => {
    const { archive, entry } = await packagedLayout()
    expect(resolveEngine(archive, entry)).toBe(join(`${archive}.unpacked`, 'node_modules', ENGINE, 'package.json'))
  })

  it('matches when the entry path names the install directory through a link', async () => {
    // Resolved URLs are canonical; the entry path may not be (a symlinked or
    // junctioned install, Windows 8.3 names). Without canonicalizing the
    // archive the hook never matched and the engine stayed inside app.asar.
    const { archive } = await packagedLayout()
    const linked = join(dirname(dirname(archive)), 'Linked Resources')
    await symlink(dirname(archive), linked, process.platform === 'win32' ? 'junction' : 'dir')
    const linkedArchive = join(linked, 'app.asar')
    const entry = join(linkedArchive, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js')
    expect(resolveEngine(linkedArchive, entry)).toBe(join(`${archive}.unpacked`, 'node_modules', ENGINE, 'package.json'))
  })

  it('installs nothing outside an app.asar installation', () => {
    expect(registerOfficeEngineResolution('/repo/node_modules/@deepseek-ai/dsh/lib/bin.js')).toBeUndefined()
  })
})
