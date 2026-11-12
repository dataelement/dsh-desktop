import type {
  MigrationOutcome,
  MigrationRecoveryOutcome
} from './generation-migration'
import type { ProfileBootInputProblem } from './profile-boot-preflight'

export type ProfileStartupMaintenanceResult =
  | {
      outcome: 'normal-profile'
      migration: MigrationOutcome | { outcome: 'maintenance-deferred' }
      migrationRebuiltSharedTree: boolean
    }
  | {
      outcome: 'safe-recovery'
      reason: string
      allowedRestoreId?: string
      repairable?: boolean
      /** The bundle the failure named, so Safe Mode can point at it. */
      repairTarget?: string
    }

export interface ProfileStartupMaintenanceDeps {
  note: (line: string) => void
  recoverInterruptedMigration: () => Promise<MigrationRecoveryOutcome>
  incompletePluginRestoreId: () => Promise<string | undefined>
  preparePackageStore: () => Promise<void>
  /** @deprecated Legacy injection accepted for callers; startup never demotes market generations. */
  demoteMarketGeneration?: () => Promise<boolean>
  enforcePendingPluginRemovals: () => Promise<void>
  prepareGenerationsForLaunch: () => Promise<void>
  shouldDeferProfileMaintenance: () => Promise<boolean>
  migrateProfileToGenerations: () => Promise<MigrationOutcome>
  /** @deprecated Legacy injection accepted for callers; startup never installs a market baseline. */
  ensureMarketBaseline?: () => Promise<void>
  /** @deprecated Market health is inspected through ordinary plugin recovery. */
  marketUsableWithoutBaseline?: () => Promise<boolean>
  reportProfileConsistency: () => Promise<void>
  inspectProfileBootInputs: () => Promise<ProfileBootInputProblem | undefined>
  /**
   * Remove unresolvable third-party bundle declarations before giving up on the
   * normal Profile; resolves to the names whose declaration was removed.
   */
  pruneUnresolvableBundles: () => Promise<string[]>
}

/**
 * The single fail-closed owner of startup Profile mutations.
 *
 * A recovery-required journal short-circuits every mutator. A deferred
 * migration keeps the legacy installation without projection,
 * prune, or repair after the failure. Startup leaves destructive package
 * repair to the explicit recovery flow, with one declaration-only exception:
 * when the boot preflight fails, third-party bundles that are declared but no
 * longer installed have their declaration dropped once and the check retried,
 * because the Safe Mode plugin controls cannot clear that fault themselves.
 * No package files, user patch rows or plugin data are removed.
 * Bundle reconciliation still runs: missing installed layers are added and
 * duplicate PPT layers owned by Desktop are removed from the
 * manifest only. Package files, user patches and plugin data remain intact.
 */
export async function runProfileStartupMaintenance(
  deps: ProfileStartupMaintenanceDeps
): Promise<ProfileStartupMaintenanceResult> {
  const reportConsistency = async (): Promise<void> => {
    try {
      await deps.reportProfileConsistency()
    } catch (error) {
      deps.note(
        `[desktop] profile consistency inspection failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    }
  }

  const inspectBootInputs = async (): Promise<ProfileBootInputProblem | undefined> => {
    try {
      return await deps.inspectProfileBootInputs()
    } catch (error) {
      return { message: error instanceof Error ? error.message : String(error) }
    }
  }

  const checkBootInputs = async (): Promise<ProfileStartupMaintenanceResult | undefined> => {
    let problem = await inspectBootInputs()
    if (problem === undefined) return undefined

    // A bundle declared but no longer installed is the one startup fault the
    // Safe Mode plugin controls cannot clear — disabling writes a patch row,
    // while the failure comes from the manifest. Drop those declarations once
    // and re-check, so an uninstalled plugin does not cost the normal Profile.
    let pruned: string[] = []
    try {
      pruned = await deps.pruneUnresolvableBundles()
    } catch (error) {
      deps.note(
        `[desktop] could not prune unresolvable bundle declarations: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    }
    if (pruned.length > 0) {
      deps.note(
        `[desktop] removed unresolvable bundle declaration(s): ${pruned.join(', ')}; package files, user patches and plugin data kept, pnpm-lock.yaml dropped for re-resolution`
      )
      const remaining = await inspectBootInputs()
      if (remaining === undefined) return undefined
      problem = remaining
    }

    const reason = `normal Profile startup inputs are invalid: ${problem.message}`
    deps.note(`[desktop] ${reason}`)
    // An invalid bundle/config is repairable; it is not an incomplete restore
    // transaction that must lock the Safe Mode plugin controls.
    return {
      outcome: 'safe-recovery',
      reason,
      repairable: true,
      ...(problem.packageName !== undefined ? { repairTarget: problem.packageName } : {})
    }
  }

  const recovery = await deps.recoverInterruptedMigration()
  if (recovery.outcome === 'recovery-required') {
    deps.note(`[desktop] normal profile maintenance blocked: ${recovery.reason}`)
    return { outcome: 'safe-recovery', reason: recovery.reason }
  }

  let incompleteRestoreId: string | undefined
  try {
    incompleteRestoreId = await deps.incompletePluginRestoreId()
  } catch (error) {
    const reason = `plugin restore recovery state is unreadable: ${
      error instanceof Error ? error.message : String(error)
    }`
    deps.note(`[desktop] normal profile maintenance blocked: ${reason}`)
    return { outcome: 'safe-recovery', reason }
  }
  if (incompleteRestoreId !== undefined) {
    const reason = `plugin restore ${incompleteRestoreId} is incomplete and must be retried in Safe Mode`
    deps.note(`[desktop] normal profile maintenance blocked: ${reason}`)
    return {
      outcome: 'safe-recovery',
      reason,
      allowedRestoreId: incompleteRestoreId
    }
  }

  try {
    await deps.preparePackageStore()
  } catch (error) {
    const reason = `profile package store preparation failed: ${
      error instanceof Error ? error.message : String(error)
    }`
    deps.note(`[desktop] normal profile maintenance blocked: ${reason}`)
    return { outcome: 'safe-recovery', reason }
  }

  let deferRemovalMaintenance: boolean
  try {
    await deps.enforcePendingPluginRemovals()
    deferRemovalMaintenance = await deps.shouldDeferProfileMaintenance()
  } catch (error) {
    const reason = `plugin removal recovery state is unreadable: ${
      error instanceof Error ? error.message : String(error)
    }`
    deps.note(`[desktop] normal profile maintenance blocked: ${reason}`)
    return { outcome: 'safe-recovery', reason }
  }
  if (deferRemovalMaintenance) {
    // Projection is required to make a durable generation tombstone visible,
    // but migration/repair/prune remain blocked until removal is verified.
    try {
      await deps.prepareGenerationsForLaunch()
      await deps.enforcePendingPluginRemovals()
    } catch (error) {
      const reason = `pending plugin removal projection failed: ${
        error instanceof Error ? error.message : String(error)
      }`
      deps.note(`[desktop] normal profile maintenance blocked: ${reason}`)
      return { outcome: 'safe-recovery', reason }
    }
    deps.note(
      '[desktop] profile package maintenance deferred while plugin removal is pending verification'
    )
    await reportConsistency()
    const invalid = await checkBootInputs()
    if (invalid) return invalid
    return {
      outcome: 'normal-profile',
      migration: { outcome: 'maintenance-deferred' },
      migrationRebuiltSharedTree: false
    }
  }

  const migration = await deps.migrateProfileToGenerations()
  if (migration.outcome === 'deferred-failure') {
    deps.note(`[desktop] profile maintenance frozen: migration deferred (${migration.reason})`)
    if (migration.profileState === 'recovery-required') {
      return { outcome: 'safe-recovery', reason: migration.reason }
    }
    await reportConsistency()
    const invalid = await checkBootInputs()
    if (invalid) return invalid
    return {
      outcome: 'normal-profile',
      migration,
      migrationRebuiltSharedTree: false
    }
  }

  try {
    await deps.prepareGenerationsForLaunch()
    await deps.enforcePendingPluginRemovals()
  } catch (error) {
    const reason = `profile maintenance transaction failed: ${
      error instanceof Error ? error.message : String(error)
    }`
    deps.note(`[desktop] normal profile maintenance blocked: ${reason}`)
    return { outcome: 'safe-recovery', reason }
  }
  await reportConsistency()
  // A rebuilt tree is verified by the existing real launch + rollback flow.
  // Preflight reused trees here, where legacy-intact alone cannot prove that
  // their bundles or patch files are readable by this installation.
  if (migration.outcome !== 'migrated') {
    const invalid = await checkBootInputs()
    if (invalid) return invalid
  }
  return {
    outcome: 'normal-profile',
    migration,
    migrationRebuiltSharedTree: migration.outcome === 'migrated'
  }
}
