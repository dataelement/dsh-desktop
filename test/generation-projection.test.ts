import { existsSync } from 'node:fs'
import { lstat, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { projectGenerations } from '../src/main/state/generation-projection'
import {
  ensureRegistryDirectories,
  registryLayout,
  writeDesired,
  writeGenerationMeta
} from '../src/main/state/plugin-registry'

describe('generation projection onto the app-boot contract', () => {
  const homes: string[] = []

  async function freshHome(): Promise<string> {
    const home = await mkdtemp(join(tmpdir(), 'dsh-projection-'))
    homes.push(home)
    return home
  }

  async function fakeGeneration(
    home: string,
    id: string,
    pluginName: string,
    version: string
  ): Promise<void> {
    const dir = join(registryLayout(home).generations, id)
    const pkg = join(dir, 'node_modules', pluginName)
    await mkdir(pkg, { recursive: true })
    await writeFile(
      join(pkg, 'package.json'),
      JSON.stringify({ name: pluginName, version, dsh: { bundle: { patch: 'cordis.patch.yml' } } })
    )
    await writeFile(join(pkg, 'cordis.patch.yml'), '[]\n')
    await writeGenerationMeta(dir, { pluginName, version })
  }

  async function initProfile(home: string): Promise<void> {
    const dir = join(home, 'profiles', 'web')
    await mkdir(dir, { recursive: true })
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({
        name: 'dsh-profile-web',
        private: true,
        dependencies: { dshmarket: '^1.35.0' },
        dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', 'dshmarket'] } }
      })
    )
  }

  afterEach(async () => {
    await Promise.all(homes.map((home) => rm(home, { recursive: true, force: true })))
    homes.length = 0
  })

  it('links enabled generations into the profile node_modules and lists them as bundles', async () => {
    const home = await freshHome()
    await ensureRegistryDirectories(home)
    await initProfile(home)
    await fakeGeneration(home, 'sidebar+0.17.1+aaaa', 'dsh-better-sidebar', '0.17.1')
    await fakeGeneration(home, 'pet+1.0.0+bbbb', '@linxin666/dsh-pet', '1.0.0')
    await writeDesired(home, ['sidebar+0.17.1+aaaa', 'pet+1.0.0+bbbb'])

    const result = await projectGenerations(home)

    expect(result.linked.sort()).toEqual(['@linxin666/dsh-pet', 'dsh-better-sidebar'])

    const link = join(home, 'profiles', 'web', 'node_modules', 'dsh-better-sidebar')
    expect((await lstat(link)).isSymbolicLink()).toBe(true)
    const linkedManifest = JSON.parse(
      await readFile(join(link, 'package.json'), 'utf8')
    )
    expect(linkedManifest.dsh.bundle.patch).toBe('cordis.patch.yml')

    const manifest = JSON.parse(
      await readFile(join(home, 'profiles', 'web', 'package.json'), 'utf8')
    )
    // in-box bundles stay in front, enabled plugins follow
    expect(manifest.dsh.profile.bundles).toEqual([
      '@deepseek-ai/dsh-base',
      '@deepseek-ai/dsh-web-app',
      '@linxin666/dsh-pet',
      'dsh-better-sidebar'
    ])
    expect(manifest.dependencies['dsh-better-sidebar']).toBe('^0.17.1')
    expect(manifest.dependencies.dshmarket).toBe('^1.35.0')
  })

  it('drops the link and the bundle entry when a plugin stops being desired', async () => {
    const home = await freshHome()
    await ensureRegistryDirectories(home)
    await initProfile(home)
    await fakeGeneration(home, 'a+1+x', 'plugin-a', '1.0.0')
    await fakeGeneration(home, 'b+2+y', 'plugin-b', '2.0.0')

    await writeDesired(home, ['a+1+x', 'b+2+y'])
    await projectGenerations(home)

    // user removes plugin-b
    await writeDesired(home, ['a+1+x'])
    const result = await projectGenerations(home)

    expect(result.unlinked).toEqual(['plugin-b'])
    expect(existsSync(join(home, "profiles", "web", "node_modules", "plugin-b"))).toBe(false)
    const manifest = JSON.parse(
      await readFile(join(home, 'profiles', 'web', 'package.json'), 'utf8')
    )
    expect(manifest.dsh.profile.bundles).not.toContain('plugin-b')
    expect(manifest.dependencies['plugin-b']).toBeUndefined()
  })

  it('never touches a real pnpm-managed directory in node_modules', async () => {
    const home = await freshHome()
    await ensureRegistryDirectories(home)
    await initProfile(home)
    const realDir = join(home, 'profiles', 'web', 'node_modules', 'dshmarket')
    await mkdir(realDir, { recursive: true })
    await writeFile(join(realDir, 'package.json'), JSON.stringify({ name: 'dshmarket', version: '1.35.0' }))

    await writeDesired(home, [])
    await projectGenerations(home)

    // still a real directory, still readable
    expect((await lstat(realDir)).isDirectory()).toBe(true)
    expect((await lstat(realDir)).isSymbolicLink()).toBe(false)
  })
})
