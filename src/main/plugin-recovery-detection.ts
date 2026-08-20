import { setTimeout as delay } from 'node:timers/promises'
import {
  extractDuplicateLoaderEntryId,
  extractPluginFailureReferences,
  extractSlotConflictName
} from './runtime/harness-runtime'
import { resolveProfileRecoveryPlugins } from './state/plugin-recovery'

export const PLUGIN_RECOVERY_EVIDENCE_TIMEOUT_MS = 1_500
export const PLUGIN_RECOVERY_EVIDENCE_POLL_MS = 100

export interface PluginRecoveryDetection {
  logs: string[]
  plugins: string[]
}

interface DetectPluginRecoveryOptions {
  dshHome: string
  initialLogs: readonly string[]
  readLatestLogs?: () => readonly string[]
  slotProviderNodeModulesPaths?: readonly string[]
  timeoutMs?: number
  pollIntervalMs?: number
  now?: () => number
  wait?: (milliseconds: number) => Promise<void>
}

function mergeLogs(...groups: readonly (readonly string[])[]): string[] {
  return [...new Set(groups.flat())]
}

/**
 * Resolve a recovery target from the evidence currently available. Frontend
 * failures can publish their detailed console error shortly after the boot
 * failure DOM appears, so unresolved detections briefly poll the live renderer
 * log buffer before falling back to the generic recovery page.
 */
export async function detectPluginRecovery(
  options: DetectPluginRecoveryOptions
): Promise<PluginRecoveryDetection> {
  const timeoutMs = Math.max(0, options.timeoutMs ?? 0)
  const pollIntervalMs = Math.max(1, options.pollIntervalMs ?? PLUGIN_RECOVERY_EVIDENCE_POLL_MS)
  const now = options.now ?? Date.now
  const wait = options.wait ?? ((milliseconds: number) => delay(milliseconds))
  const deadline = now() + timeoutMs

  while (true) {
    const logs = mergeLogs(options.initialLogs, options.readLatestLogs?.() ?? [])
    const plugins = await resolveProfileRecoveryPlugins(
      options.dshHome,
      extractPluginFailureReferences(logs),
      extractDuplicateLoaderEntryId(logs),
      extractSlotConflictName(logs),
      options.slotProviderNodeModulesPaths
    )

    if (plugins.length > 0 || now() >= deadline) {
      return { logs, plugins }
    }

    await wait(Math.min(pollIntervalMs, Math.max(1, deadline - now())))
  }
}
