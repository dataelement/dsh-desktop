import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { parse as parseYaml } from 'yaml'
import { readInstallationPlugins } from '../src/host/installation-plugins'
import { patchPath, projectRoot } from './patch-path'

interface Manifest {
  dependencies: Record<string, string>
  dshDesktopHostPlugins?: unknown
  build?: { extraMetadata?: { dshDesktopHostPlugins?: unknown } }
}

const profileConfigTags = [{ tag: 'tag:yaml.org,2002:js', resolve: (value: string) => value }]

async function readProfilePatch(): Promise<{ name?: string; insert?: { name?: string }[] }[]> {
  return parseYaml(await readFile(path.join(projectRoot, 'build/dsh-desktop.patch.yml'), 'utf8'), {
    customTags: profileConfigTags
  }) as { name?: string; insert?: { name?: string }[] }[]
}

function assertClosure(mounted: string[], manifest: Manifest, installation: readonly string[], upstream: readonly string[]): void {
  expect(mounted.length).toBeGreaterThan(0)
  for (const name of installation) {
    expect(manifest.dependencies[name], name + ' must be a production dependency').toMatch(/^file:packages\//u)
  }
  for (const name of mounted) {
    expect(manifest.dependencies[name], name).toMatch(/^file:packages\//u)
    expect(installation.includes(name) || upstream.includes(name), name + ' has no installation or upstream anchor').toBe(true)
  }
}

// Core plugins may use the patched Harness closure. Product plugins may instead
// use the application's explicit installation anchor; neither Profile nor cwd grants it.
describe('desktop plugin closure', () => {
  it('anchors mounted packages in the upstream closure or explicit application metadata', async () => {
    const manifest = JSON.parse(await readFile(path.join(projectRoot, 'package.json'), 'utf8')) as Manifest
    const mounted = (await readProfilePatch()).flatMap(row => row.insert ?? [])
      .map(entry => entry.name).filter((name): name is string => typeof name === 'string')
    const dshPatch = await readFile(patchPath('@deepseek-ai/dsh'), 'utf8')
    const upstream = [...dshPatch.matchAll(/^\+    "([^"]+)":/gm)].map(match => match[1]).filter((name): name is string => name !== undefined)
    const installation = readInstallationPlugins(projectRoot, false)
    if (installation) {
      expect(installation.anchor).toBe(path.join(projectRoot, 'package.json'))
      expect(manifest.build?.extraMetadata?.dshDesktopHostPlugins).toEqual(manifest.dshDesktopHostPlugins)
    } else {
      expect(manifest.dependencies['dsh-desktop-enterprise']).toBeUndefined()
      expect(upstream).not.toContain('dsh-desktop-enterprise')
    }
    assertClosure(mounted, manifest, installation?.names ?? [], upstream)
    expect(readInstallationPlugins(projectRoot, true)).toBeUndefined()
  })

  it('ships each mounted or installation-scoped plugin as a local production package', async () => {
    const manifest = JSON.parse(await readFile(path.join(projectRoot, 'package.json'), 'utf8')) as Manifest
    const lock = JSON.parse(await readFile(path.join(projectRoot, 'package-lock.json'), 'utf8')) as {
      packages: Record<string, { dependencies?: Record<string, string> }>
    }
    const mounted = (await readProfilePatch()).flatMap(row => row.insert ?? [])
      .map(row => row.name).filter((name): name is string => typeof name === 'string')
    const names = new Set([...mounted, ...(readInstallationPlugins(projectRoot, false)?.names ?? [])])
    for (const name of names) {
      const dependency = manifest.dependencies[name]
      expect(dependency, name).toMatch(/^file:packages\//u)
      expect(lock.packages['']?.dependencies?.[name], name).toBe(dependency)
      if (!dependency) throw new Error('Missing production dependency: ' + name)
      const directory = dependency.slice('file:'.length)
      expect(directory.split('/')).not.toContain('..')
      const plugin = JSON.parse(await readFile(path.join(projectRoot, directory, 'package.json'), 'utf8')) as { name: string }
      expect(plugin.name).toBe(name)
    }
  })

  it('accepts a product-only installation plugin without patching Harness and rejects missing anchors/dependencies', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'desktop-closure-'))
    const manifest: Manifest = { dependencies: { 'sample-plugin': 'file:packages/sample-plugin' }, dshDesktopHostPlugins: ['sample-plugin'] }
    try {
      await writeFile(path.join(root, 'package.json'), JSON.stringify(manifest))
      const installation = readInstallationPlugins(root, false)
      expect(installation?.anchor).toBe(path.join(root, 'package.json'))
      expect(() => assertClosure(['sample-plugin'], manifest, installation?.names ?? [], [])).not.toThrow()
      expect(() => assertClosure(['sample-plugin'], manifest, [], [])).toThrow()
      expect(() => assertClosure(['sample-plugin'], { dependencies: {} }, ['sample-plugin'], [])).toThrow()
      expect(() => assertClosure(['sample-plugin'], manifest, [], ['sample-plugin'])).not.toThrow()
      expect(readInstallationPlugins(root, true)).toBeUndefined()
      for (const invalid of [['../sample-plugin'], ['sample-plugin/subpath'], 'sample-plugin', [false]]) {
        await writeFile(path.join(root, 'package.json'), JSON.stringify({ ...manifest, dshDesktopHostPlugins: invalid }))
        expect(() => readInstallationPlugins(root, false)).toThrow('bare package names')
      }
      await writeFile(path.join(root, 'package.json'), JSON.stringify({ dependencies: manifest.dependencies }))
      expect(readInstallationPlugins(root, false)).toBeUndefined()
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})
