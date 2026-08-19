import { afterEach, describe, expect, it } from 'vitest'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'
import { isBareSpecifier, listProfileNodeModules, parseProfileNames } from '../build/profile-node-modules.mjs'

const execFileAsync = promisify(execFile)
const setupUrl = pathToFileURL(join(process.cwd(), 'build', 'profile-module-paths.mjs')).href

const workspaces: string[] = []

afterEach(async () => {
  await Promise.all(workspaces.splice(0).map((directory) => rm(directory, { recursive: true, force: true })))
})

async function createWorkspace(): Promise<{ home: string; app: string }> {
  const root = await mkdtemp(join(tmpdir(), 'dsh-desktop-resolution-'))
  workspaces.push(root)
  const app = join(root, 'app')
  await mkdir(app, { recursive: true })
  return { home: join(root, 'home'), app }
}

async function writePackage(
  nodeModules: string,
  name: string,
  marker: string,
  options: { module?: boolean } = {}
): Promise<string> {
  const directory = join(nodeModules, ...name.split('/'))
  await mkdir(directory, { recursive: true })
  const module = options.module ?? true
  await writeFile(
    join(directory, 'package.json'),
    JSON.stringify({
      name,
      version: '1.0.0',
      main: 'index.js',
      ...(module ? { type: 'module' } : {})
    })
  )
  await writeFile(
    join(directory, 'index.js'),
    module ? `export const marker = ${JSON.stringify(marker)}\n` : `module.exports = ${JSON.stringify(marker)}\n`
  )
  return directory
}

/** Runs `script` the way the desktop app launches the harness: with the shim preloaded. */
async function runWithShim(
  app: string,
  home: string,
  script: string,
  environment: NodeJS.ProcessEnv = {}
): Promise<string> {
  const entry = join(app, `entry-${Math.random().toString(36).slice(2)}.mjs`)
  await writeFile(entry, script)
  const { stdout } = await execFileAsync(process.execPath, ['--import', setupUrl, entry], {
    cwd: app,
    env: { ...process.env, DSH_HOME: home, DSH_DESKTOP_PROFILES: 'web', ...environment }
  })
  return stdout.trim()
}

describe('profile plugin resolution', () => {
  it('resolves a plugin that only exists in the profile', async () => {
    const { home, app } = await createWorkspace()
    await writePackage(join(home, 'profiles', 'web', 'node_modules'), '@liustack/modlens', 'profile')

    const output = await runWithShim(
      app,
      home,
      "const { marker } = await import('@liustack/modlens')\nprocess.stdout.write(marker)\n"
    )

    expect(output).toBe('profile')
  }, 20_000)

  it('keeps resolving app bundle packages once a profile exists', async () => {
    const { home, app } = await createWorkspace()
    await writePackage(join(home, 'profiles', 'web', 'node_modules'), 'installed-plugin', 'profile')
    await writePackage(join(app, 'node_modules'), 'bundled-only', 'bundle')

    const output = await runWithShim(
      app,
      home,
      "const { marker } = await import('bundled-only')\nprocess.stdout.write(marker)\n"
    )

    expect(output).toBe('bundle')
  }, 20_000)

  it('never lets a profile shadow the app bundle dependency tree', async () => {
    const { home, app } = await createWorkspace()
    await writePackage(join(home, 'profiles', 'web', 'node_modules'), 'shared', 'profile')
    const bundled = await writePackage(join(app, 'node_modules'), 'bundled', 'bundle')
    await writePackage(join(bundled, 'node_modules'), 'shared', 'bundle-nested')
    await writeFile(join(bundled, 'index.js'), "export { marker } from 'shared'\n")

    const output = await runWithShim(
      app,
      home,
      "const { marker } = await import('bundled')\nprocess.stdout.write(marker)\n"
    )

    expect(output).toBe('bundle-nested')
  }, 20_000)

  it('picks up a profile node_modules created after the harness started', async () => {
    const { home, app } = await createWorkspace()
    const profileNodeModules = join(home, 'profiles', 'web', 'node_modules')
    await mkdir(home, { recursive: true })

    const output = await runWithShim(
      app,
      home,
      [
        "import { mkdir, writeFile } from 'node:fs/promises'",
        `const nodeModules = ${JSON.stringify(profileNodeModules)}`,
        "const directory = nodeModules + '/late-plugin'",
        'await mkdir(directory, { recursive: true })',
        `await writeFile(directory + '/package.json', ${JSON.stringify(
          JSON.stringify({ name: 'late-plugin', version: '1.0.0', type: 'module', main: 'index.js' })
        )})`,
        "await writeFile(directory + '/index.js', 'export const marker = \\'late\\'\\n')",
        "const { marker } = await import('late-plugin')",
        'process.stdout.write(marker)'
      ].join('\n')
    )

    expect(output).toBe('late')
  }, 20_000)

  // pnpm is what the market installer runs, so a profile's top level is a set of
  // symlinks into .pnpm and a plugin's own dependencies live beside its real path.
  it('resolves a plugin through the pnpm store layout', async () => {
    const { home, app } = await createWorkspace()
    const nodeModules = join(home, 'profiles', 'web', 'node_modules')
    const store = join(nodeModules, '.pnpm')

    const plugin = await writePackage(join(store, 'plugin@1.0.0', 'node_modules'), 'plugin', 'unused')
    await writeFile(join(plugin, 'package.json'), JSON.stringify({
      name: 'plugin',
      version: '1.0.0',
      type: 'module',
      exports: { '.': './index.js' }
    }))
    await writeFile(join(plugin, 'index.js'), "export { marker } from 'dependency'\n")
    const dependency = await writePackage(
      join(store, 'dependency@1.0.0', 'node_modules'),
      'dependency',
      'pnpm-store'
    )

    await symlink(plugin, join(nodeModules, 'plugin'), 'junction')
    await symlink(dependency, join(store, 'plugin@1.0.0', 'node_modules', 'dependency'), 'junction')

    const output = await runWithShim(
      app,
      home,
      "const { marker } = await import('plugin')\nprocess.stdout.write(marker)\n"
    )

    expect(output).toBe('pnpm-store')
  }, 20_000)

  it('only consults the profiles the harness actually runs', async () => {
    const { home, app } = await createWorkspace()
    await writePackage(join(home, 'profiles', 'other', 'node_modules'), 'other-plugin', 'other')

    const output = await runWithShim(
      app,
      home,
      [
        "let outcome = 'resolved'",
        "try { await import('other-plugin') } catch (error) { outcome = error.code }",
        'process.stdout.write(outcome)'
      ].join('\n')
    )

    expect(output).toBe('ERR_MODULE_NOT_FOUND')
  }, 20_000)

  it('reports the original error when no profile provides the package', async () => {
    const { home, app } = await createWorkspace()
    await writePackage(join(home, 'profiles', 'web', 'node_modules'), 'installed-plugin', 'profile')

    const output = await runWithShim(
      app,
      home,
      [
        "let message = 'resolved'",
        "try { await import('missing-everywhere') } catch (error) { message = error.message }",
        'process.stdout.write(message)'
      ].join('\n')
    )

    expect(output).toContain('missing-everywhere')
    expect(output).not.toContain('anchor')
  }, 20_000)

  it('surfaces a broken profile package instead of a generic not-found', async () => {
    const { home, app } = await createWorkspace()
    const plugin = await writePackage(join(home, 'profiles', 'web', 'node_modules'), 'strict-plugin', 'profile')
    await writeFile(
      join(plugin, 'package.json'),
      JSON.stringify({ name: 'strict-plugin', version: '1.0.0', type: 'module', exports: { '.': './index.js' } })
    )

    const output = await runWithShim(
      app,
      home,
      [
        "let code = 'resolved'",
        "try { await import('strict-plugin/hidden') } catch (error) { code = error.code }",
        'process.stdout.write(code)'
      ].join('\n')
    )

    expect(output).toBe('ERR_PACKAGE_PATH_NOT_EXPORTED')
  }, 20_000)

  it('applies the same fallback to CommonJS requires', async () => {
    const { home, app } = await createWorkspace()
    const profileNodeModules = join(home, 'profiles', 'web', 'node_modules')
    await writePackage(profileNodeModules, 'cjs-plugin', 'profile', { module: false })
    await writePackage(profileNodeModules, 'cjs-shared', 'profile', { module: false })
    await writePackage(join(app, 'node_modules'), 'cjs-shared', 'bundle', { module: false })
    await writePackage(join(app, 'node_modules'), 'cjs-bundled', 'bundle', { module: false })

    const output = await runWithShim(
      app,
      home,
      [
        "import { createRequire } from 'node:module'",
        'const require = createRequire(import.meta.url)',
        "process.stdout.write([require('cjs-plugin'), require('cjs-shared'), require('cjs-bundled')].join(','))"
      ].join('\n')
    )

    expect(output).toBe('profile,bundle,bundle')
  }, 20_000)

  it('leaves explicit require.resolve paths alone', async () => {
    const { home, app } = await createWorkspace()
    await writePackage(join(home, 'profiles', 'web', 'node_modules'), 'scoped', 'profile', { module: false })
    const bundled = await writePackage(join(app, 'node_modules'), 'bundled', 'bundle', { module: false })
    await writePackage(join(bundled, 'node_modules'), 'scoped', 'bundle-nested', { module: false })

    const output = await runWithShim(
      app,
      home,
      [
        "import { createRequire } from 'node:module'",
        'const require = createRequire(import.meta.url)',
        `const resolved = require.resolve('scoped', { paths: [${JSON.stringify(bundled)}] })`,
        'process.stdout.write(require(resolved))'
      ].join('\n')
    )

    expect(output).toBe('bundle-nested')
  }, 20_000)
})

describe('profile discovery', () => {
  it('treats only node_modules lookups as redirectable', () => {
    expect(isBareSpecifier('@liustack/modlens')).toBe(true)
    expect(isBareSpecifier('cordis')).toBe(true)
    expect(isBareSpecifier('./relative.js')).toBe(false)
    expect(isBareSpecifier('/absolute/path.js')).toBe(false)
    expect(isBareSpecifier('#internal')).toBe(false)
    expect(isBareSpecifier('node:path')).toBe(false)
    expect(isBareSpecifier('file:///app/module.js')).toBe(false)
    expect(isBareSpecifier('data:text/javascript,export default 1')).toBe(false)
    expect(isBareSpecifier('C:\\app\\module.js')).toBe(false)
  })

  it('ignores profile names that could escape the profiles directory', () => {
    expect(parseProfileNames('web, staging ')).toEqual(['web', 'staging'])
    expect(parseProfileNames('../../etc,web')).toEqual(['web'])
    expect(parseProfileNames(undefined)).toEqual([])
  })

  it('skips profiles that have no node_modules yet', async () => {
    const { home } = await createWorkspace()
    await mkdir(join(home, 'profiles', 'empty'), { recursive: true })
    const populated = join(home, 'profiles', 'web', 'node_modules')
    await mkdir(populated, { recursive: true })

    expect(listProfileNodeModules(home)).toEqual([populated])
    expect(listProfileNodeModules(home, ['empty'])).toEqual([])
    expect(listProfileNodeModules(undefined)).toEqual([])
  })
})
