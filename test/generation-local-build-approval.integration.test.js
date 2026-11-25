import { it, expect } from 'vitest'
import { cp, mkdtemp, mkdir, writeFile, readFile, realpath, rm, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { installGeneration } from '../packages/dsh-desktop-market-installer/generations/installer.mjs'

it('keeps local snapshot script consent exact across real pnpm retries', async () => {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'dsh-local-build-')))
  try {
    const source = join(root, 'local source with spaces')
    const profile = join(root, 'home/profiles/web')
    await mkdir(source)
    await mkdir(profile, { recursive: true })
    await writeFile(join(source, 'package.json'), JSON.stringify({
      name: 'dsh-test-local-build', version: '1.0.0',
      scripts: { install: `"${process.execPath}" build.cjs` }
    }))
    await writeFile(join(source, 'build.cjs'), "require('node:fs').writeFileSync('built.txt', 'approved')")
    const options = {
      dshHome: join(root, 'home'), pluginSpec: `file:${source}`, sourceDirectory: source,
      expectedPluginName: 'dsh-test-local-build', strictDepBuilds: true,
      nodeExecutablePath: process.execPath, pnpmEntryPath: join(process.cwd(), 'node_modules/pnpm/bin/pnpm.cjs')
    }
    const attempt = async (overrides = {}) => {
      let output = ''
      const result = await installGeneration({ ...options, ...overrides, onOutput: chunk => { output += chunk } })
      return { result, output }
    }
    const first = await attempt()
    expect(first.result.ok, first.output).toBe(false)
    expect(first.result.detail).toContain('ERR_PNPM_IGNORED_BUILDS')
    const require = createRequire(import.meta.url)
    const managerRoot = dirname(require.resolve('@deepseek-ai/dsh-plugin-manager/package.json'))
    const { recordPendingBuilds, approveBuilds } = await import(pathToFileURL(join(managerRoot, 'lib/types/build-approval.js')).href)
    const pending = await recordPendingBuilds(profile, first.output)
    expect(pending).toHaveLength(1)
    expect(pending[0]).toMatch(/^dsh-test-local-build@file:source\/[a-f0-9]{64}$/)
    expect(first.output).toContain('Ignored build scripts: ' + pending[0])
    const retry = await attempt()
    expect(retry.result.ok).toBe(false)
    expect(await recordPendingBuilds(profile, retry.output)).toEqual(pending)
    await approveBuilds(profile, pending)
    const approvedPolicy = await readFile(join(profile, 'pnpm-workspace.yaml'), 'utf8')
    const approved = await attempt()
    expect(approved.result.ok, approved.output).toBe(true)
    expect(await readFile(join(approved.result.generation.directory, 'node_modules/dsh-test-local-build/built.txt'), 'utf8')).toBe('approved')
    await writeFile(join(profile, 'pnpm-workspace.yaml'), `allowBuilds:\n  ${JSON.stringify(pending[0])}: false\n`)
    const denied = await attempt()
    expect(denied.result.ok, denied.output).toBe(true)
    expect(denied.result.generation.id).not.toBe(approved.result.generation.id)
    await expect(readFile(join(denied.result.generation.directory, 'node_modules/dsh-test-local-build/built.txt'))).rejects.toMatchObject({ code: 'ENOENT' })
    await writeFile(join(profile, 'pnpm-workspace.yaml'), approvedPolicy)
    const alias = join(root, 'source alias')
    await symlink(source, alias, process.platform === 'win32' ? 'junction' : 'dir')
    const aliased = await attempt({ sourceDirectory: alias })
    expect(aliased.result.ok, aliased.output).toBe(true)
    const otherSource = join(root, 'other source')
    await cp(source, otherSource, { recursive: true })
    const moved = await attempt({ sourceDirectory: otherSource })
    expect(moved.result.ok, moved.output).toBe(false)
    expect(moved.result.detail).toContain('ERR_PNPM_IGNORED_BUILDS')
    await writeFile(join(source, 'payload.txt'), 'changed even though scripts and version did not change')
    const changed = await attempt()
    expect(changed.result.ok, changed.output).toBe(false)
    expect(changed.result.detail).toContain('ERR_PNPM_IGNORED_BUILDS')
    const changedPending = await recordPendingBuilds(profile, changed.output)
    expect(changedPending).toHaveLength(1)
    expect(changedPending[0]).not.toBe(pending[0])
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}, 30_000)
