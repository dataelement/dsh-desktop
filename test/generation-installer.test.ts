import { mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  generationBuildApprovals,
  installGeneration,
  pinnedGitBuildApproval,
  verifyGenerationPeers
} from '../packages/dsh-desktop-market-installer/generations/installer'
import { listGenerations, registryLayout } from '../packages/dsh-desktop-market-installer/generations/registry'

/**
 * These exercise the promotion and hoist logic with a stubbed install, so they
 * run anywhere. The real pnpm path is covered by scripts/generation-poc.mjs
 * against live Market plugins on Windows.
 */
describe('the generation installer', () => {
  const homes: string[] = []

  async function freshHome(): Promise<string> {
    const home = await mkdtemp(join(tmpdir(), 'dsh-geninstall-'))
    homes.push(home)
    return home
  }

  afterEach(async () => {
    await Promise.all(homes.map((home) => rm(home, { recursive: true, force: true })))
    homes.length = 0
  })

  /** Populate a staging node_modules the way pnpm would, then hand back success. */
  function stubInstall(
    layout: (dir: string) => Promise<void>
  ): (stagingDir: string) => Promise<{ code: number; output: string }> {
    return async (stagingDir: string) => {
      await layout(stagingDir)
      return { code: 0, output: 'Done in 4.2s' }
    }
  }

  it('accepts only explicit safe build approvals from the Profile workspace', () => {
    const sha = 'a'.repeat(40)
    expect(generationBuildApprovals([
      'packages:',
      '  - .',
      'allowBuilds:',
      '  cloudflared: true',
      '  ignored-package: false',
      "  '@linxin666/dsh-remote-web-ui@git+https://github.com/zhu1090093659/dsh-web.git': true",
      `  "@linxin666/dsh-remote-web-ui@https://codeload.github.com/zhu1090093659/dsh-web/tar.gz/${sha}": true`,
      '  ../../outside: true',
      '  arbitrary key: true',
      '  placeholder: set this to true or false',
      ''
    ].join('\r\n'))).toEqual([
      'cloudflared',
      '@linxin666/dsh-remote-web-ui@git+https://github.com/zhu1090093659/dsh-web.git',
      `@linxin666/dsh-remote-web-ui@https://codeload.github.com/zhu1090093659/dsh-web/tar.gz/${sha}`
    ])
  })

  it('derives pnpm 10 git prepare keys only from a matching repository approval', () => {
    const sha = 'a'.repeat(40)
    const spec = `github:zhu1090093659/dsh-web#${sha}&path:/packages/dsh-remote-web-ui`
    const stable = '@linxin666/dsh-remote-web-ui@git+https://github.com/zhu1090093659/dsh-web.git'
    const exact = `@linxin666/dsh-remote-web-ui@git+ssh://git@github.com/zhu1090093659/dsh-web.git#${sha}&path:/packages/dsh-remote-web-ui`

    expect(pinnedGitBuildApproval('@linxin666/dsh-remote-web-ui', spec, [stable])).toBe(exact)
    expect(pinnedGitBuildApproval('@linxin666/dsh-remote-web-ui', spec, [
      '@linxin666/dsh-remote-web-ui'
    ])).toBeUndefined()
    expect(pinnedGitBuildApproval('@linxin666/dsh-remote-web-ui', spec, [
      '@linxin666/dsh-remote-web-ui@git+https://github.com/other/repo.git'
    ])).toBeUndefined()
  })

  it('forwards Profile build approvals into the isolated pnpm staging workspace', async () => {
    const home = await freshHome()
    const profile = join(home, 'profiles', 'web')
    await mkdir(profile, { recursive: true })
    await writeFile(
      join(profile, 'pnpm-workspace.yaml'),
      [
        'packages:',
        '  - .',
        'allowBuilds:',
        '  cloudflared: true',
        "  '@linxin666/dsh-remote-web-ui@git+https://github.com/zhu1090093659/dsh-web.git': true",
        '  esbuild: false',
        'patchedDependencies:',
        '  unsafe: ./outside.patch',
        ''
      ].join('\n')
    )

    const result = await installGeneration({
      dshHome: home,
      pluginSpec: 'github:zhu1090093659/dsh-web#path:/packages/dsh-remote-web-ui',
      expectedPluginName: '@linxin666/dsh-remote-web-ui',
      nodeExecutablePath: 'node',
      pnpmEntryPath: 'pnpm',
      runInstall: stubInstall(async (staging) => {
        const stagedPolicy = await readFile(join(staging, 'pnpm-workspace.yaml'), 'utf8')
        expect(stagedPolicy).toContain('"cloudflared": true')
        expect(stagedPolicy).toContain(
          '"@linxin666/dsh-remote-web-ui@git+https://github.com/zhu1090093659/dsh-web.git": true'
        )
        expect(stagedPolicy).not.toContain('git+ssh://')
        expect(stagedPolicy).not.toContain('esbuild')
        expect(stagedPolicy).not.toContain('patchedDependencies')

        const pkg = join(staging, 'node_modules', '@linxin666', 'dsh-remote-web-ui')
        await mkdir(pkg, { recursive: true })
        await writeFile(
          join(pkg, 'package.json'),
          JSON.stringify({ name: '@linxin666/dsh-remote-web-ui', version: '0.3.11' })
        )
        await writeFile(join(staging, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n')
      })
    })

    expect(result.ok).toBe(true)
  })

  it('promotes a clean install into a generation and records its metadata', async () => {
    const home = await freshHome()
    const result = await installGeneration({
      dshHome: home,
      pluginSpec: 'demo-plugin@2.1.0',
      nodeExecutablePath: 'node',
      pnpmEntryPath: 'pnpm',
      runInstall: stubInstall(async (staging) => {
        const pkg = join(staging, 'node_modules', 'demo-plugin')
        await mkdir(pkg, { recursive: true })
        await writeFile(
          join(pkg, 'package.json'),
          JSON.stringify({ name: 'demo-plugin', version: '2.1.0' })
        )
        await writeFile(join(staging, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n')
      })
    })

    expect(result.ok).toBe(true)
    expect(result.generation?.pluginName).toBe('demo-plugin')
    expect(result.generation?.version).toBe('2.1.0')
    expect(result.generation?.id).toMatch(/^demo-plugin\+2\.1\.0\+[0-9a-f]{12}$/u)

    const onDisk = await listGenerations(home)
    expect(onDisk.map((generation) => generation.pluginName)).toEqual(['demo-plugin'])
  })

  it('hoists every host singleton out of the generation, declared or not', async () => {
    const home = await freshHome()
    const result = await installGeneration({
      dshHome: home,
      pluginSpec: '@scope/widget',
      nodeExecutablePath: 'node',
      pnpmEntryPath: 'pnpm',
      runInstall: stubInstall(async (staging) => {
        const modules = join(staging, 'node_modules')
        // the plugin itself
        await mkdir(join(modules, '@scope', 'widget'), { recursive: true })
        await writeFile(
          join(modules, '@scope', 'widget', 'package.json'),
          JSON.stringify({ name: '@scope/widget', version: '1.0.0' })
        )
        // a private dep it legitimately owns — must survive
        await mkdir(join(modules, 'lodash'), { recursive: true })
        await writeFile(join(modules, 'lodash', 'index.js'), '')
        // an unmet peer pnpm dropped in — must be hoisted
        await mkdir(join(modules, 'react'), { recursive: true })
        await writeFile(join(modules, 'react', 'index.js'), '')
        // a transitive @deepseek-ai package pnpm installed privately — hoisted
        await mkdir(join(modules, '@deepseek-ai', 'schemastery'), { recursive: true })
        await writeFile(join(modules, '@deepseek-ai', 'schemastery', 'index.js'), '')
        // Conflicting hoisted installs can leave private host packages inside a
        // dependency's own node_modules. Those must be removed too, not hidden
        // from a top-level-only scan.
        await mkdir(join(modules, 'lodash', 'node_modules', 'react-dom'), { recursive: true })
        await writeFile(join(modules, 'lodash', 'node_modules', 'react-dom', 'index.js'), '')
        await mkdir(
          join(modules, 'lodash', 'node_modules', '@deepseek-ai', 'cordis'),
          { recursive: true }
        )
        await writeFile(
          join(modules, 'lodash', 'node_modules', '@deepseek-ai', 'cordis', 'index.js'),
          ''
        )
        await writeFile(join(staging, 'pnpm-lock.yaml'), 'x\n')
      })
    })

    expect(result.ok).toBe(true)
    expect(result.hoisted?.sort()).toEqual([
      '@deepseek-ai/cordis',
      '@deepseek-ai/schemastery',
      'react',
      'react-dom'
    ])

    const generationModules = join(result.generation!.directory, 'node_modules')
    expect(await readFile(join(generationModules, 'lodash', 'index.js'), 'utf8')).toBe('')
    await expect(readFile(join(generationModules, 'react', 'index.js'))).rejects.toThrow()
    await expect(
      readFile(join(generationModules, '@deepseek-ai', 'schemastery', 'index.js'))
    ).rejects.toThrow()
    await expect(
      readFile(join(generationModules, 'lodash', 'node_modules', 'react-dom', 'index.js'))
    ).rejects.toThrow()
    await expect(
      readFile(
        join(
          generationModules,
          'lodash',
          'node_modules',
          '@deepseek-ai',
          'cordis',
          'index.js'
        )
      )
    ).rejects.toThrow()
  })

  it('fails without promoting when pnpm exits non-zero', async () => {
    const home = await freshHome()
    const result = await installGeneration({
      dshHome: home,
      pluginSpec: 'broken',
      nodeExecutablePath: 'node',
      pnpmEntryPath: 'pnpm',
      runInstall: async () => ({ code: 1, output: 'ERR_PNPM_FETCH_404  GET https://... 404' })
    })

    expect(result.ok).toBe(false)
    expect(result.detail).toContain('ERR_PNPM_FETCH_404')
    expect(await listGenerations(home)).toEqual([])
    // staging is cleaned, not left behind
    const staging = registryLayout(home).staging
    const { readdir } = await import('node:fs/promises')
    expect(await readdir(staging).catch(() => [])).toEqual([])
  })

  it('reuses an existing generation when the inputs are identical', async () => {
    const home = await freshHome()
    const install = () =>
      installGeneration({
        dshHome: home,
        pluginSpec: 'stable@1.0.0',
        nodeExecutablePath: 'node',
        pnpmEntryPath: 'pnpm',
        runInstall: stubInstall(async (staging) => {
          const pkg = join(staging, 'node_modules', 'stable')
          await mkdir(pkg, { recursive: true })
          await writeFile(join(pkg, 'package.json'), JSON.stringify({ name: 'stable', version: '1.0.0' }))
          await writeFile(join(staging, 'pnpm-lock.yaml'), 'identical\n')
        })
      })

    const first = await install()
    const second = await install()
    expect(first.generation?.id).toBe(second.generation?.id)
    expect(await listGenerations(home)).toHaveLength(1)
  })

  it('rejects a linked package tree without following or deleting its external target', async () => {
    const home = await freshHome()
    const external = join(home, 'outside-generation')
    await mkdir(external, { recursive: true })
    await writeFile(join(external, 'sentinel.txt'), 'keep me\n', 'utf8')

    const result = await installGeneration({
      dshHome: home,
      pluginSpec: 'linked-tree@1.0.0',
      nodeExecutablePath: 'node',
      pnpmEntryPath: 'pnpm',
      runInstall: stubInstall(async (staging) => {
        const modules = join(staging, 'node_modules')
        const plugin = join(modules, 'linked-tree')
        await mkdir(plugin, { recursive: true })
        await writeFile(
          join(plugin, 'package.json'),
          JSON.stringify({ name: 'linked-tree', version: '1.0.0' })
        )
        await symlink(
          external,
          join(modules, 'linked-dependency'),
          process.platform === 'win32' ? 'junction' : 'dir'
        )
        await writeFile(join(staging, 'pnpm-lock.yaml'), 'linked\n')
      })
    })

    expect(result.ok).toBe(false)
    expect(result.detail).toMatch(/generation package tree is not self-contained/u)
    expect(await readFile(join(external, 'sentinel.txt'), 'utf8')).toBe('keep me\n')
    expect(await listGenerations(home)).toEqual([])
  })

  it('fails peer validation when a required host singleton cannot resolve', async () => {
    const home = await freshHome()
    const directory = join(home, 'profiles', '.generations', 'live', 'missing-peer')
    const plugin = join(directory, 'node_modules', 'peer-plugin')
    await mkdir(plugin, { recursive: true })
    await writeFile(
      join(plugin, 'package.json'),
      JSON.stringify({
        name: 'peer-plugin',
        version: '1.0.0',
        peerDependencies: { '@deepseek-ai/cordis': '*' }
      })
    )

    const result = await verifyGenerationPeers(home, {
      id: 'missing-peer',
      pluginName: 'peer-plugin',
      version: '1.0.0',
      directory
    })
    expect(result.ok).toBe(false)
    expect(result.problems).toContain('@deepseek-ai/cordis does not resolve from the installation closure')
  })

  it('fails peer validation when the root package identity does not match generation metadata', async () => {
    const home = await freshHome()
    const directory = join(home, 'profiles', '.generations', 'live', 'wrong-root')
    const plugin = join(directory, 'node_modules', 'expected-plugin')
    await mkdir(plugin, { recursive: true })
    await writeFile(
      join(plugin, 'package.json'),
      JSON.stringify({ name: 'different-plugin', version: '1.0.0' })
    )

    const result = await verifyGenerationPeers(home, {
      id: 'wrong-root',
      pluginName: 'expected-plugin',
      version: '1.0.0',
      directory
    })

    expect(result.ok).toBe(false)
    expect(result.problems).toContain(
      'plugin package manifest name does not match generation metadata: different-plugin != expected-plugin'
    )
  })

  it('accepts host singletons inside the closure, rejects private copies, and permits optional missing dependencies', async () => {
    const home = await freshHome()
    const closureReact = join(home, 'profiles', 'node_modules', 'react')
    await mkdir(closureReact, { recursive: true })
    await writeFile(join(closureReact, 'package.json'), JSON.stringify({ name: 'react', main: 'index.js' }))
    await writeFile(join(closureReact, 'index.js'), 'export default {}\n')

    const goodDirectory = join(home, 'profiles', '.generations', 'live', 'good-peer')
    const goodPlugin = join(goodDirectory, 'node_modules', 'good-plugin')
    await mkdir(goodPlugin, { recursive: true })
    await writeFile(
      join(goodPlugin, 'package.json'),
      JSON.stringify({
        name: 'good-plugin',
        version: '1.0.0',
        dependencies: { react: '*' },
        optionalDependencies: { 'missing-optional-dependency': '*' },
        peerDependencies: { '@deepseek-ai/optional': '*' },
        peerDependenciesMeta: { '@deepseek-ai/optional': { optional: true } }
      })
    )
    const good = await verifyGenerationPeers(home, {
      id: 'good-peer',
      pluginName: 'good-plugin',
      version: '1.0.0',
      directory: goodDirectory
    })
    expect(good).toEqual({ ok: true, problems: [] })

    const badDirectory = join(home, 'profiles', '.generations', 'live', 'bad-peer')
    const badPlugin = join(badDirectory, 'node_modules', 'bad-plugin')
    const privateReact = join(badDirectory, 'node_modules', 'react')
    await mkdir(badPlugin, { recursive: true })
    await mkdir(privateReact, { recursive: true })
    await writeFile(
      join(badPlugin, 'package.json'),
      JSON.stringify({ name: 'bad-plugin', version: '1.0.0', dependencies: { react: '*' } })
    )
    await writeFile(join(privateReact, 'package.json'), JSON.stringify({ name: 'react', main: 'index.js' }))
    await writeFile(join(privateReact, 'index.js'), 'module.exports = {}\n')
    const bad = await verifyGenerationPeers(home, {
      id: 'bad-peer',
      pluginName: 'bad-plugin',
      version: '1.0.0',
      directory: badDirectory
    })
    expect(bad.ok).toBe(false)
    expect(bad.problems).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/private host singleton react is present/u),
        expect.stringMatching(/react resolves outside the installation closure/u)
      ])
    )
  })

  it('validates host singletons declared by a transitive package, not only the root plugin', async () => {
    const home = await freshHome()
    const directory = join(home, 'profiles', '.generations', 'live', 'transitive-peer')
    const modules = join(directory, 'node_modules')
    await mkdir(join(modules, 'root-plugin'), { recursive: true })
    await mkdir(join(modules, 'root-plugin', 'node_modules', 'transitive-package'), {
      recursive: true
    })
    await writeFile(
      join(modules, 'root-plugin', 'package.json'),
      JSON.stringify({
        name: 'root-plugin',
        version: '1.0.0',
        dependencies: { 'transitive-package': '1.0.0' }
      })
    )
    await writeFile(
      join(modules, 'root-plugin', 'node_modules', 'transitive-package', 'package.json'),
      JSON.stringify({
        name: 'transitive-package',
        version: '1.0.0',
        main: 'index.js',
        dependencies: { '@deepseek-ai/cordis': '*' }
      })
    )
    await writeFile(
      join(modules, 'root-plugin', 'node_modules', 'transitive-package', 'index.js'),
      'module.exports = {}\n'
    )

    const result = await verifyGenerationPeers(home, {
      id: 'transitive-peer',
      pluginName: 'root-plugin',
      version: '1.0.0',
      directory
    })
    expect(result.ok).toBe(false)
    expect(result.problems).toContain(
      'transitive-package: @deepseek-ai/cordis does not resolve from the installation closure'
    )
  })

  it('fails validation when a required ordinary dependency is missing', async () => {
    const home = await freshHome()
    const directory = join(home, 'profiles', '.generations', 'live', 'missing-dependency')
    const plugin = join(directory, 'node_modules', 'ordinary-plugin')
    await mkdir(plugin, { recursive: true })
    await writeFile(
      join(plugin, 'package.json'),
      JSON.stringify({
        name: 'ordinary-plugin',
        version: '1.0.0',
        dependencies: { 'missing-ordinary-dependency': '1.0.0' }
      })
    )

    const result = await verifyGenerationPeers(home, {
      id: 'missing-dependency',
      pluginName: 'ordinary-plugin',
      version: '1.0.0',
      directory
    })

    expect(result.ok).toBe(false)
    expect(result.problems).toContain(
      'missing-ordinary-dependency does not resolve from the generation or installation closure'
    )
  })

  it('rejects an ordinary dependency that a nested package resolves outside the allowed roots', async () => {
    const home = await freshHome()
    const directory = join(home, 'profiles', '.generations', 'live', 'external-dependency')
    const modules = join(directory, 'node_modules')
    const plugin = join(modules, 'external-plugin')
    const nested = join(plugin, 'node_modules', 'nested-package')
    const external = join(home, 'profiles', '.generations', 'node_modules', 'external-package')
    await mkdir(nested, { recursive: true })
    await mkdir(external, { recursive: true })
    await writeFile(
      join(plugin, 'package.json'),
      JSON.stringify({
        name: 'external-plugin',
        version: '1.0.0',
        dependencies: { 'nested-package': '1.0.0' }
      })
    )
    await writeFile(
      join(nested, 'package.json'),
      JSON.stringify({
        name: 'nested-package',
        version: '1.0.0',
        main: 'index.js',
        dependencies: { 'external-package': '1.0.0' }
      })
    )
    await writeFile(join(nested, 'index.js'), 'module.exports = {}\n')
    await writeFile(
      join(external, 'package.json'),
      JSON.stringify({ name: 'external-package', version: '1.0.0', main: 'index.js' })
    )
    await writeFile(join(external, 'index.js'), 'module.exports = {}\n')

    const result = await verifyGenerationPeers(home, {
      id: 'external-dependency',
      pluginName: 'external-plugin',
      version: '1.0.0',
      directory
    })

    expect(result.ok).toBe(false)
    const externalEntry = await realpath(join(external, 'index.js'))
    expect(result.problems).toContain(
      `nested-package: external-package resolves outside the generation and installation closure: ${externalEntry}`
    )
  })
})
