/** Version-sensitive Harness calls used by the desktop host. */
import type { Context } from '@deepseek-ai/cordis'
import { runProfile } from '@deepseek-ai/dsh/profile-boot'
import { SAFE_MODE_PROFILE } from '../shared/safe-mode-profile'
import { readInstallationPlugins } from './installation-plugins'
import { readPluginInventory } from '@deepseek-ai/dsh-host-plugin-inventory'
import { parseFileAddress } from '@deepseek-ai/dsh-util-workspace-path'
import { SessionId, type SessionId as SessionIdentity } from '@deepseek-ai/dsh-session/types'

/** Keep the patched 0.2.2-rc.5 resolved-profile extension at the upstream boundary. */
export function runHostProfile(
  runtimeDir: string,
  options: Omit<Parameters<typeof runProfile>[0], 'resolvedProfile'>,
  resolvedProfile: Omit<NonNullable<Parameters<typeof runProfile>[0]['resolvedProfile']>, 'installationPlugins'>
): ReturnType<typeof runProfile> {
  return runProfile({
    ...options,
    resolvedProfile: {
      ...resolvedProfile,
      installationPlugins: readInstallationPlugins(runtimeDir, options.profile === SAFE_MODE_PROFILE)
    }
  })
}

/** The profile context methods this host uses for operation diagnostics. */
export interface PluginOperationHost {
  on(name: 'plugin-manager/operation', listener: (operation: unknown) => void): void
  effect(execute: () => () => Promise<void>): void
}

/** Subscribe to one manager invocation. The event payload is validated by the caller. */
export function subscribePluginOperations(ctx: PluginOperationHost, listener: (operation: unknown) => void): void {
  ctx.on('plugin-manager/operation', listener)
}

/** Run the disposer when the profile context stops. */
export function disposeWithContext(ctx: PluginOperationHost, dispose: () => Promise<void>): void {
  ctx.effect(() => async () => { await dispose() })
}

/** A session file address. Absolute addresses are not draggable. */
export function sessionDragAddress(address: string): { readonly sessionId: SessionIdentity, readonly path: string } | undefined {
  const parsed = parseFileAddress(address)
  if (parsed?.scope !== 'session') return undefined
  return { sessionId: SessionId(parsed.sessionId), path: parsed.path }
}

const UNSTABLE_ENTRY_ID = /^[0-9a-f]{8}$/u

/** Enabled plugin ids after disabled expressions run. Anonymous Loader ids are replaced by their module name. */
export async function enabledPluginIds(ctx: Context): Promise<string[]> {
  const snapshot = await readPluginInventory(ctx)
  return snapshot.entries.flatMap(entry => {
    if (!entry.enabled) return []
    return [UNSTABLE_ENTRY_ID.test(entry.entryId) ? entry.moduleName : entry.entryId]
  }).sort()
}

/** The running profile context satisfies the diagnostic host surface. */
export function pluginOperationHost(ctx: Context): PluginOperationHost {
  return {
    on(name, listener) {
      ctx.on(name, listener)
    },
    effect(execute) {
      ctx.effect(execute)
    }
  }
}
