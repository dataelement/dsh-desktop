import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

const fsFaults = vi.hoisted(() => ({
  renameMatches: undefined as undefined | ((from: string, to: string) => boolean),
  rmMatches: undefined as undefined | ((path: string) => boolean),
  ledgerRenameCount: 0,
  failLedgerRenameAt: undefined as number | undefined
}))

vi.mock('node:fs/promises', async () => {
  const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises')
  return {
    ...actual,
    rename: async (from: string, to: string) => {
      if (to.endsWith('plugin-removals.json')) {
        fsFaults.ledgerRenameCount += 1
        if (fsFaults.ledgerRenameCount === fsFaults.failLedgerRenameAt) {
          throw Object.assign(new Error('fixture ledger rename EPERM'), { code: 'EPERM' })
        }
      }
      if (fsFaults.renameMatches?.(from, to)) {
        throw Object.assign(new Error('fixture rename EPERM'), { code: 'EPERM' })
      }
      return actual.rename(from, to)
    },
    rm: async (path: string, options?: Parameters<typeof actual.rm>[1]) => {
      if (fsFaults.rmMatches?.(path)) {
        throw Object.assign(new Error('fixture rm EBUSY'), { code: 'EBUSY' })
      }
      return actual.rm(path, options)
    }
  }
})
import {
  disableGeneration,
  ensureRegistryDirectories,
  readDesired,
  writeDesired,
  writeGenerationMeta
} from '../packages/dsh-desktop-market-installer/generations/registry'
import { projectGenerations } from '../packages/dsh-desktop-market-installer/generations/projection'
import { prepareGenerationsForLaunch } from '../src/main/state/generation-launch'
import type { PluginComponentRestoreOptions } from '../src/main/state/plugin-component-cleanup'
import {
  cleanupVerifiedRemovalBackup,
  confirmPluginRemovalsBooted,
  enforcePendingPluginRemovals,
  listPendingPluginRemovals,
  listVerifiedRemovalBackups,
  removePluginSafely,
  restorePluginRemovalBackup,
  shouldDeferProfileMaintenance,
  snapshotPluginRemovalLedger
} from '../src/main/state/plugin-removal'

describe('durable plugin removal', () => {
  const homes: string[] = []

  function launchAgentPlist(label: string, programArgument: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>${label}</string>
<key>ProgramArguments</key><array><string>/usr/bin/node</string><string>${programArgument}</string></array>
</dict></plist>
`
  }

  async function profile(pluginName = '@example/plugin-a'): Promise<{
    dshHome: string
    profileDirectory: string
  }> {
    const dshHome = await mkdtemp(join(tmpdir(), 'dsh-plugin-removal-'))
    homes.push(dshHome)
    const profileDirectory = join(dshHome, 'profiles', 'web')
    const packageDirectory = join(profileDirectory, 'node_modules', pluginName)
    await mkdir(packageDirectory, { recursive: true })
    await writeFile(
      join(packageDirectory, 'package.json'),
      JSON.stringify({ name: pluginName, version: '1.0.0', dsh: { bundle: { patch: 'cordis.patch.yml' } } })
    )
    await writeFile(join(packageDirectory, 'cordis.patch.yml'), '[]\n')
    await writeFile(
      join(profileDirectory, 'package.json'),
      JSON.stringify({
        dependencies: { [pluginName]: '1.0.0', '@example/plugin-b': '1.0.0' },
        dsh: { profile: { bundles: [pluginName, '@example/plugin-b'] } }
      })
    )
    await writeFile(join(profileDirectory, 'pnpm-lock.yaml'), 'lockfileVersion: 9\n')
    await writeFile(join(profileDirectory, 'cordis.patch.yml'), '[]\n')
    return { dshHome, profileDirectory }
  }

  async function removedGeneration(pluginName: string, suffix: string): Promise<{
    dshHome: string
    profileDirectory: string
    generationId: string
    generationDirectory: string
    removalId: string
    backupDirectory: string
  }> {
    const { dshHome, profileDirectory } = await profile(pluginName)
    const layout = await ensureRegistryDirectories(dshHome)
    const generationId = `${pluginName.replaceAll('/', '+')}+1.0.0+${suffix}`
    const generationDirectory = join(layout.generations, generationId)
    const packageDirectory = join(generationDirectory, 'node_modules', pluginName)
    await mkdir(packageDirectory, { recursive: true })
    await writeGenerationMeta(generationDirectory, { pluginName, version: '1.0.0' })
    await writeFile(
      join(packageDirectory, 'package.json'),
      JSON.stringify({ name: pluginName, version: '1.0.0', dsh: { bundle: { patch: 'cordis.patch.yml' } } })
    )
    await writeFile(join(packageDirectory, 'cordis.patch.yml'), '[]\n')
    await writeFile(join(packageDirectory, 'payload.js'), 'export const intact = true\n')
    await writeDesired(dshHome, [generationId])
    await projectGenerations(dshHome)
    const removed = await removePluginSafely({
      dshHome,
      pluginName,
      cleanupOwnedComponents: async () => ({ ok: true, failures: [] }),
      uninstallGeneration: async () => {
        await disableGeneration(dshHome, pluginName)
        await projectGenerations(dshHome)
        return true
      },
      now: () => new Date('2026-08-29T15:00:00.000Z')
    })
    expect(removed).toMatchObject({ removed: true })
    return {
      dshHome,
      profileDirectory,
      generationId,
      generationDirectory,
      removalId: removed.removalId as string,
      backupDirectory: removed.backupDirectory as string
    }
  }

  async function legacyRemovalWithComponent(pluginName: string, label: string): Promise<{
    dshHome: string
    profileDirectory: string
    backupDirectory: string
    legacyPath: string
    fileName: string
    removalId: string
  }> {
    const { dshHome, profileDirectory } = await profile(pluginName)
    await rm(join(profileDirectory, 'node_modules', pluginName), { recursive: true, force: true })
    await writeFile(
      join(profileDirectory, 'package.json'),
      JSON.stringify({ dependencies: {}, dsh: { profile: { bundles: [] } } })
    )
    const backupDirectory = join(
      dshHome,
      'recovery',
      'plugin-removals',
      '2026-08-29T15-00-00-000Z',
      pluginName
    )
    const sourcePackage = join(backupDirectory, 'profile-packages', 'node_modules', pluginName)
    await mkdir(sourcePackage, { recursive: true })
    await writeFile(join(sourcePackage, 'package.json'), JSON.stringify({
      name: pluginName,
      version: '1.0.0',
      dsh: { bundle: { patch: 'cordis.patch.yml' } }
    }))
    await writeFile(join(sourcePackage, 'cordis.patch.yml'), '[]\n')
    await writeFile(join(backupDirectory, 'package.json'), JSON.stringify({
      dependencies: { [pluginName]: '1.0.0' },
      dsh: { profile: { bundles: [pluginName] } }
    }))
    await writeFile(join(backupDirectory, 'cordis.patch.yml'), '[]\n')
    await mkdir(join(dshHome, 'recovery'), { recursive: true })
    await writeFile(join(dshHome, 'recovery', 'plugin-removals.json'), JSON.stringify({
      protocol: 1,
      removals: {
        [pluginName]: {
          pluginName,
          status: 'removed',
          disabledAt: '2026-08-29T15:00:00.000Z',
          updatedAt: '2026-08-29T15:30:00.000Z',
          backupDirectory,
          failures: []
        }
      }
    }))
    const fileName = `${label}.plist`
    const legacyDirectory = join(
      dshHome,
      'recovery',
      'uninstalled-components',
      '2026-08-29T15-21-00-000Z'
    )
    const legacyPath = join(legacyDirectory, fileName)
    await mkdir(legacyDirectory, { recursive: true })
    await writeFile(legacyPath, launchAgentPlist(label, `/old/node_modules/${pluginName}/agent.mjs`))
    const removalId = (await snapshotPluginRemovalLedger(dshHome)).backups[0]!.removalId
    return { dshHome, profileDirectory, backupDirectory, legacyPath, fileName, removalId }
  }

  afterEach(async () => {
    fsFaults.renameMatches = undefined
    fsFaults.rmMatches = undefined
    fsFaults.ledgerRenameCount = 0
    fsFaults.failLedgerRenameAt = undefined
    await Promise.all(homes.map((home) => rm(home, { recursive: true, force: true })))
    homes.length = 0
  })

  it('backs up, quarantines, and reconciles one exact legacy plugin', async () => {
    const { dshHome, profileDirectory } = await profile()
    const uninstallGeneration = vi.fn(async () => false)
    const staleDependency = join(profileDirectory, 'node_modules', '@deepseek-ai', 'stale-core')
    await mkdir(staleDependency, { recursive: true })
    const reconcileLegacyProfile = vi.fn(async () => {
      const manifest = JSON.parse(await readFile(join(profileDirectory, 'package.json'), 'utf8'))
      expect(manifest.dependencies).not.toHaveProperty('@example/plugin-a')
      expect(manifest.dsh.profile.bundles).not.toContain('@example/plugin-a')
      expect(existsSync(join(profileDirectory, 'pnpm-lock.yaml'))).toBe(false)
      await rm(staleDependency, { recursive: true, force: true })
      return { ok: true }
    })

    const result = await removePluginSafely({
      dshHome,
      pluginName: '@example/plugin-a',
      cleanupOwnedComponents: async () => ({ ok: true, failures: [] }),
      uninstallGeneration,
      reconcileLegacyProfile,
      now: () => new Date('2026-08-29T12:00:00.000Z')
    })

    expect(result).toMatchObject({ disabled: true, removed: true, pending: false })
    expect(uninstallGeneration).not.toHaveBeenCalled()
    expect(reconcileLegacyProfile).toHaveBeenCalledOnce()
    const manifest = JSON.parse(await readFile(join(profileDirectory, 'package.json'), 'utf8'))
    expect(manifest.dependencies).toEqual({ '@example/plugin-b': '1.0.0' })
    expect(manifest.dsh.profile.bundles).toEqual(['@example/plugin-b'])
    expect(existsSync(join(profileDirectory, 'node_modules', '@example', 'plugin-a'))).toBe(false)
    expect(existsSync(join(profileDirectory, 'pnpm-lock.yaml'))).toBe(false)
    expect(existsSync(staleDependency)).toBe(false)
    expect(existsSync(join(result.backupDirectory as string, 'package.json'))).toBe(true)
    expect(existsSync(join(
      result.backupDirectory as string,
      'profile-packages',
      'node_modules',
      'example__plugin-a',
      'package.json'
    ))).toBe(true)
    expect(await shouldDeferProfileMaintenance(dshHome)).toBe(true)
    await confirmPluginRemovalsBooted(dshHome)
    expect(await shouldDeferProfileMaintenance(dshHome)).toBe(false)
    // The verified backup is kept after the first boot.
    expect(existsSync(result.backupDirectory as string)).toBe(true)
    const pending = await snapshotPluginRemovalLedger(dshHome)
    expect(pending.pendingDeletion).toHaveLength(1)
    const firstPending = pending.pendingDeletion[0]
    expect(firstPending).toBeDefined()
    expect(firstPending?.pluginName).toBe('@example/plugin-a')
    expect(firstPending?.bootVerifiedAt).toBeDefined()
    // A second confirmPluginRemovalsBooted automatically cleans the verified backup.
    await confirmPluginRemovalsBooted(dshHome)
    expect(existsSync(result.backupDirectory as string)).toBe(false)
    const verified = await listVerifiedRemovalBackups(dshHome)
    expect(verified).toEqual([])
  })

  it('keeps a detached legacy plugin disabled when profile reconciliation fails', async () => {
    const { dshHome, profileDirectory } = await profile('plugin-one')
    const reconcileLegacyProfile = vi.fn(async () => ({
      ok: false,
      detail: 'ERR_PNPM_FETCH_404'
    }))

    const result = await removePluginSafely({
      dshHome,
      pluginName: 'plugin-one',
      cleanupOwnedComponents: async () => ({ ok: true, failures: [] }),
      uninstallGeneration: async () => false,
      reconcileLegacyProfile,
      now: () => new Date('2026-08-29T12:02:00.000Z')
    })

    expect(result).toMatchObject({
      disabled: true,
      removed: false,
      pending: true,
      failures: ['profile rebuild failed: ERR_PNPM_FETCH_404']
    })
    const manifest = JSON.parse(await readFile(join(profileDirectory, 'package.json'), 'utf8'))
    expect(manifest.dependencies).not.toHaveProperty('plugin-one')
    expect(manifest.dsh.profile.bundles).not.toContain('plugin-one')
    expect(existsSync(join(profileDirectory, 'node_modules', 'plugin-one'))).toBe(false)
    expect(await listPendingPluginRemovals(dshHome)).toEqual(['plugin-one'])
  })

  it('keeps a failed cleanup disabled and preserves its package for a later retry', async () => {
    const { dshHome, profileDirectory } = await profile('plugin-one')

    const result = await removePluginSafely({
      dshHome,
      pluginName: 'plugin-one',
      cleanupOwnedComponents: async () => ({ ok: false, failures: ['service is still running'] }),
      uninstallGeneration: async () => false,
      now: () => new Date('2026-08-29T12:05:00.000Z')
    })

    expect(result).toMatchObject({ disabled: true, removed: false, pending: true })
    const manifest = JSON.parse(await readFile(join(profileDirectory, 'package.json'), 'utf8'))
    expect(manifest.dependencies['plugin-one']).toBe('1.0.0')
    expect(manifest.dsh.profile.bundles).not.toContain('plugin-one')
    expect(existsSync(join(profileDirectory, 'node_modules', 'plugin-one'))).toBe(true)
    expect(existsSync(join(result.backupDirectory as string, 'package.json'))).toBe(true)
    expect(await listPendingPluginRemovals(dshHome)).toEqual(['plugin-one'])
    expect(await shouldDeferProfileMaintenance(dshHome)).toBe(true)
    await confirmPluginRemovalsBooted(dshHome)
    expect(await shouldDeferProfileMaintenance(dshHome)).toBe(true)

    const retried = await removePluginSafely({
      dshHome,
      pluginName: 'plugin-one',
      cleanupOwnedComponents: async () => ({ ok: true, failures: [] }),
      uninstallGeneration: async () => false,
      now: () => new Date('2026-08-29T12:06:00.000Z')
    })
    expect(retried).toMatchObject({ disabled: true, removed: true, pending: false })
    const originalBackup = JSON.parse(
      await readFile(join(result.backupDirectory as string, 'package.json'), 'utf8')
    )
    expect(originalBackup.dsh.profile.bundles).toContain('plugin-one')
    expect(await listPendingPluginRemovals(dshHome)).toEqual([])
  })

  it('uses the durable tombstone to remove a failed generation pointer before launch', async () => {
    const { dshHome, profileDirectory } = await profile('generation-plugin')
    const layout = await ensureRegistryDirectories(dshHome)
    const generationId = 'generation-plugin+1.0.0+fixture'
    const generationDirectory = join(layout.generations, generationId)
    await mkdir(generationDirectory, { recursive: true })
    await writeGenerationMeta(generationDirectory, {
      pluginName: 'generation-plugin',
      version: '1.0.0'
    })
    await mkdir(join(generationDirectory, 'node_modules', 'generation-plugin'), { recursive: true })
    await writeFile(
      join(generationDirectory, 'node_modules', 'generation-plugin', 'package.json'),
      JSON.stringify({ name: 'generation-plugin', version: '1.0.0' })
    )
    await writeDesired(dshHome, [generationId])

    const result = await removePluginSafely({
      dshHome,
      pluginName: 'generation-plugin',
      cleanupOwnedComponents: async () => ({ ok: true, failures: [] }),
      uninstallGeneration: async () => false,
      now: () => new Date('2026-08-29T12:10:00.000Z')
    })

    expect(result).toMatchObject({ disabled: true, removed: false, pending: true })
    expect(await readDesired(dshHome)).toEqual([generationId])
    await enforcePendingPluginRemovals(dshHome)
    expect(await readDesired(dshHome)).toEqual([])
    const manifest = JSON.parse(await readFile(join(profileDirectory, 'package.json'), 'utf8'))
    expect(manifest.dsh.profile.bundles).not.toContain('generation-plugin')
  })

  it('commits a generation removal only after its desired pointer and projection are detached', async () => {
    const { dshHome } = await profile('generation-plugin')
    const layout = await ensureRegistryDirectories(dshHome)
    const generationId = 'generation-plugin+1.0.0+complete'
    const generationDirectory = join(layout.generations, generationId)
    await mkdir(generationDirectory, { recursive: true })
    await writeGenerationMeta(generationDirectory, {
      pluginName: 'generation-plugin',
      version: '1.0.0'
    })
    await mkdir(join(generationDirectory, 'node_modules', 'generation-plugin'), { recursive: true })
    await writeFile(
      join(generationDirectory, 'node_modules', 'generation-plugin', 'package.json'),
      JSON.stringify({ name: 'generation-plugin', version: '1.0.0' })
    )
    await writeDesired(dshHome, [generationId])
    const reconcileLegacyProfile = vi.fn(async () => ({ ok: true }))

    const result = await removePluginSafely({
      dshHome,
      pluginName: 'generation-plugin',
      cleanupOwnedComponents: async () => ({ ok: true, failures: [] }),
      uninstallGeneration: async () => {
        await disableGeneration(dshHome, 'generation-plugin')
        await projectGenerations(dshHome)
        return true
      },
      reconcileLegacyProfile,
      now: () => new Date('2026-08-29T12:15:00.000Z')
    })

    expect(result).toMatchObject({ disabled: true, removed: true, pending: false })
    expect(await readDesired(dshHome)).toEqual([])
    expect(await listPendingPluginRemovals(dshHome)).toEqual([])
    expect(reconcileLegacyProfile).not.toHaveBeenCalled()
  })
})
