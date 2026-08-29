import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { installGeneration } from '../packages/dsh-desktop-market-installer/generations/installer'
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
        await writeFile(join(staging, 'pnpm-lock.yaml'), 'x\n')
      })
    })

    expect(result.ok).toBe(true)
    expect(result.hoisted?.sort()).toEqual(['@deepseek-ai/schemastery', 'react'])

    const generationModules = join(result.generation!.directory, 'node_modules')
    expect(await readFile(join(generationModules, 'lodash', 'index.js'), 'utf8')).toBe('')
    await expect(readFile(join(generationModules, 'react', 'index.js'))).rejects.toThrow()
    await expect(
      readFile(join(generationModules, '@deepseek-ai', 'schemastery', 'index.js'))
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
})
