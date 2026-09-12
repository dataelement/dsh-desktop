import type {
  MigrationOutcome,
  MigrationRecoveryOutcome
} from './generation-migration'

export type ProfileStartupMaintenanceResult =
  | {
      outcome: 'normal-profile'
      migration: MigrationOutcome | { outcome: 'maintenance-deferred' }
      migrationRebuiltSharedTree: boolean
    }
  | { outcome: 'safe-recovery'; reason: string; allowedRestoreId?: string }

export interface ProfileStartupMaintenanceDeps {
  note: (line: string) => void
  recoverInterruptedMigration: () => Promise<MigrationRecoveryOutcome>
  incompletePluginRestoreId: () => Promise<string | undefined>
  preparePackageStore: () => Promise<void>
  demoteMarketGeneration: () => Promise<boolean>
  enforcePendingPluginRemovals: () => Promise<void>
  prepareGenerationsForLaunch: () => Promise<void>
  shouldDeferProfileMaintenance: () => Promise<boolean>
  migrateProfileToGenerations: () => Promise<MigrationOutcome>
  ensureMarketBaseline: () => Promise<void>
  reportProfileConsistency: () => Promise<void>
}

/**
 * The single fail-closed owner of startup Profile mutations.
 *
 * A recovery-required journal short-circuits every mutator. A deferred
 * migration launches the byte-for-byte legacy Profile without projection,
 * prune, or repair after the failure. Startup never performs destructive
 * package repair or declaration pruning; it only reports inconsistencies for
 * an explicit recovery flow to handle later.
 * The market's verified baseline is the targeted exception: dshmarket is a
 * core bundle, never a generation, and the app cannot boot without a working
 * one — so it is demoted out of any generation and brought to the baseline in
 * the shared tree ahead of projection and ahead of the removal-verification
 * gate, while Harness is stopped.
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

  /**
   * dshmarket is never a generation, and a stray generation for it is
   * re-linked by projection on *every* launch — so it is demoted back to the
   * shared tree and brought to the verified baseline before projection runs.
   *
   * This deliberately runs even when a pending plugin removal has deferred
   * the rest: a market that cannot load stops Harness from booting, and boot
   * is what marks the removal verified. Leaving it behind that gate is what
   * turned one incompatible market build into a permanent boot loop — the
   * repair needed a successful boot to be allowed, and the boot needed the
   * repair. A frozen migration still blocks it; that path keeps the legacy
   * profile byte-for-byte for rollback.
   */
  const establishMarketBaseline = async (): Promise<string | undefined> => {
    try {
      await deps.demoteMarketGeneration()
      await deps.ensureMarketBaseline()
      return undefined
    } catch (error) {
      return `market baseline could not be established: ${
        error instanceof Error ? error.message : String(error)
      }`
    }
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
    const marketFailure = await establishMarketBaseline()
    if (marketFailure !== undefined) {
      deps.note(`[desktop] normal profile maintenance blocked: ${marketFailure}`)
      return { outcome: 'safe-recovery', reason: marketFailure }
    }
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
    return {
      outcome: 'normal-profile',
      migration,
      migrationRebuiltSharedTree: false
    }
  }

  const marketFailure = await establishMarketBaseline()
  if (marketFailure !== undefined) {
    deps.note(`[desktop] normal profile maintenance blocked: ${marketFailure}`)
    return { outcome: 'safe-recovery', reason: marketFailure }
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
  return {
    outcome: 'normal-profile',
    migration,
    migrationRebuiltSharedTree: migration.outcome === 'migrated'
  }
}
