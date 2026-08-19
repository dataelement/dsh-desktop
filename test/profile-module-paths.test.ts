import { describe, expect, it } from 'vitest'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { pathToFileURL } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

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

  it('prefers profile node_modules over default app-bundle resolution', async () => {
    const resolverUrl = pathToFileURL(join(process.cwd(), 'build', 'profile-esm-resolver.mjs')).href
    const mod = await import(resolverUrl)

    const profileNodeModules = '/fake/profiles/web/node_modules'
    mod.initialize({ profileNodeModules: [profileNodeModules] })

    const nextResolve = (specifier: string, context: { parentURL?: string }) => {
      if (context.parentURL?.startsWith(pathToFileURL(profileNodeModules).href)) {
        return Promise.resolve({ url: `file:///profile-version/${specifier}`, shortCircuit: true })
      }
      return Promise.resolve({ url: `file:///bundle-version/${specifier}`, shortCircuit: true })
    }

    const result = await mod.resolve(
      'shared-pkg',
      { parentURL: 'file:///app/bundle/module.js', conditions: ['import'] },
      nextResolve
    )

    expect(result.url).toBe('file:///profile-version/shared-pkg')
  })

  it('falls back to default resolution when no profile provides the package', async () => {
    const resolverUrl = pathToFileURL(join(process.cwd(), 'build', 'profile-esm-resolver.mjs')).href
    const mod = await import(resolverUrl)

    mod.initialize({ profileNodeModules: ['/fake/profiles/web/node_modules'] })

    const nextResolve = (specifier: string, context: { parentURL?: string }) => {
      if (context.parentURL?.includes('/fake/profiles/')) {
        return Promise.reject(new Error('not in profile'))
      }
      return Promise.resolve({ url: `file:///bundle-version/${specifier}`, shortCircuit: true })
    }

    const result = await mod.resolve(
      'bundle-only-pkg',
      { parentURL: 'file:///app/bundle/module.js', conditions: ['import'] },
      nextResolve
    )

    expect(result.url).toBe('file:///bundle-version/bundle-only-pkg')
  })

  it('resolves CJS requires from profile node_modules before the app bundle', async () => {
    const testDir = join(tmpdir(), `dsh-desktop-cjs-${Date.now()}`)
    const dshHome = join(testDir, 'home')
    const appDir = join(testDir, 'app')
    const profilePkgDir = join(dshHome, 'profiles', 'web', 'node_modules', 'test-cjs-pkg')
    const bundlePkgDir = join(appDir, 'node_modules', 'test-cjs-pkg')

    await mkdir(profilePkgDir, { recursive: true })
    await mkdir(bundlePkgDir, { recursive: true })
    await writeFile(
      join(profilePkgDir, 'package.json'),
      JSON.stringify({ name: 'test-cjs-pkg', version: '1.0.0', main: 'index.js' })
    )
    await writeFile(join(profilePkgDir, 'index.js'), "module.exports = { marker: 'profile' };\n")
    await writeFile(
      join(bundlePkgDir, 'package.json'),
      JSON.stringify({ name: 'test-cjs-pkg', version: '2.0.0', main: 'index.js' })
    )
    await writeFile(join(bundlePkgDir, 'index.js'), "module.exports = { marker: 'bundle' };\n")

    try {
      const setupPath = join(process.cwd(), 'build', 'profile-module-paths.mjs')
      const { stdout } = await execFileAsync(
        process.execPath,
        ['--import', setupPath, '-e', "process.stdout.write(require('test-cjs-pkg').marker)"],
        { cwd: appDir, env: { ...process.env, DSH_HOME: dshHome } }
      )

      expect(stdout).toBe('profile')
    } finally {
      await rm(testDir, { recursive: true, force: true })
    }
  })
})
