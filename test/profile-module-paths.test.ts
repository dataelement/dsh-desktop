import { describe, expect, it } from 'vitest'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'

describe('Profile module paths resolution', () => {
  it('resolves bare specifiers from profile node_modules via synthetic parent', async () => {
    const testDir = join(tmpdir(), `dsh-desktop-resolver-${Date.now()}`)
    const profileNodeModules = join(testDir, 'profiles', 'web', 'node_modules')
    const packageDir = join(profileNodeModules, 'test-profile-pkg')

    await mkdir(packageDir, { recursive: true })
    await writeFile(
      join(packageDir, 'package.json'),
      JSON.stringify({ name: 'test-profile-pkg', version: '1.0.0', main: 'index.js', type: 'module' })
    )
    await writeFile(join(packageDir, 'index.js'), 'export const value = 42;\n')

    try {
      const resolverUrl = pathToFileURL(join(process.cwd(), 'build', 'profile-esm-resolver.mjs')).href
      const mod = await import(resolverUrl)

      mod.initialize({ profileNodeModules: [profileNodeModules] })

      const fakeParent = 'file:///app/somewhere/module.js'
      const nextResolve = (specifier: string, _context: unknown) => {
        if (specifier.includes('test-profile-pkg')) {
          return Promise.resolve({ url: pathToFileURL(join(packageDir, 'index.js')).href, shortCircuit: true })
        }
        return Promise.reject(new Error(`not found: ${specifier}`))
      }

      const result = await mod.resolve(
        'test-profile-pkg',
        { parentURL: fakeParent, conditions: ['import'] },
        nextResolve
      )

      expect(result.url).toContain('test-profile-pkg')
      expect(result.url).toContain('index.js')
    } finally {
      await rm(testDir, { recursive: true, force: true })
    }
  })

  it('passes through non-bare specifiers unchanged', async () => {
    const resolverUrl = pathToFileURL(join(process.cwd(), 'build', 'profile-esm-resolver.mjs')).href
    const mod = await import(resolverUrl)

    mod.initialize({ profileNodeModules: ['/fake/profile/node_modules'] })

    const fakeParent = 'file:///app/module.js'
    let capturedSpecifier = ''
    const nextResolve = (specifier: string, _context: unknown) => {
      capturedSpecifier = specifier
      return Promise.resolve({ url: `file:///resolved/${specifier}`, shortCircuit: true })
    }

    await mod.resolve('./relative.js', { parentURL: fakeParent }, nextResolve)
    expect(capturedSpecifier).toBe('./relative.js')

    await mod.resolve('/absolute/path.js', { parentURL: fakeParent }, nextResolve)
    expect(capturedSpecifier).toBe('/absolute/path.js')

    await mod.resolve('node:path', { parentURL: fakeParent }, nextResolve)
    expect(capturedSpecifier).toBe('node:path')

    await mod.resolve('file:///some/file.js', { parentURL: fakeParent }, nextResolve)
    expect(capturedSpecifier).toBe('file:///some/file.js')
  })
})
