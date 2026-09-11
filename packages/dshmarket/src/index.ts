/**
 * dsh-market host entry: mounts the market's HTTP routes once the profile
 * composes the webServer and shell services.
 */

import type { Context } from '@deepseek-ai/cordis'
import { createDesktopPluginRuntime, type DesktopPnpmLike } from './dsh-cli.ts'
import { mountMarketRoutes, type MarketConfig, type MarketHost } from './routes.ts'
import { installMarketSettings } from './settings.ts'
import type { AgentsServiceLike } from './agents.ts'

export const name = 'dsh-market'

/** Optional cordis.yml configuration; profile defaults to `web`. */
export type Config = Partial<Pick<MarketConfig, 'profile' | 'allowRestart' | 'maxSnapshots'>>

/** Structural subset of DSH Desktop's public `desktopProfiles` contract. */
interface DesktopProfilesLike {
  readonly current: {
    readonly name: string
    readonly dir: string
  }
}

interface MarketEffectHost extends MarketHost {
  effect(
    callback: () => (() => void | Promise<void>),
    label: string,
  ): void
}

/**
 * Register the market against the host context.
 * @param ctx - Host context that may acquire webServer and shell services.
 * @param config - Optional profile override from the loader.
 */
/**
 * The profile this host process actually booted (`--profile <name>` on the
 * dsh CLI invocation). Without it the market would default to `web` and
 * installs from a test/secondary profile would mutate the real one.
 */
function argvProfile(): string | undefined {
  const argv = process.argv
  const flag = argv.indexOf('--profile')
  if (flag !== -1 && flag + 1 < argv.length && !argv[flag + 1].startsWith('-')) return argv[flag + 1]
  return undefined
}

/**
 * Resolve the host's `agents` inventory lazily — at request time, not at
 * market startup, so the guard sees whichever agents exist by the time an
 * update is asked for. Hosts without the service return undefined and the
 * update route stays open (see src/agents.ts).
 */
function agentsLookupOf(ctx: Context): () => AgentsServiceLike | undefined {
  return () => ctx.get('agents') as AgentsServiceLike | undefined
}

export function apply(ctx: Context, config?: Config): void {
  ctx.inject(['webServer', 'loader'], (hostCtx: Context) => {
    const host = hostCtx as unknown as MarketEffectHost
    const desktopProfiles = ctx.get('desktopProfiles') as DesktopProfilesLike | undefined
    if (desktopProfiles === undefined) {
      const resolved: MarketConfig = {
        profile: config?.profile ?? argvProfile() ?? 'web',
        // Left UNDEFINED when unconfigured, deliberately: `?? true` here
        // would turn "the operator said nothing" into "the operator said
        // yes", and restartAllowed() could no longer tell them apart — which
        // is exactly the distinction supervisor detection needs (#229).
        allowRestart: config?.allowRestart,
        maxSnapshots: config?.maxSnapshots,
      }
      // Offer allowRestart as a switch on the settings page. Deliberately
      // NOT in the Desktop branch below: there the shell owns the process
      // lifecycle and the value is forced false, so it is not the user's to
      // choose. No-ops on a host without a settings service.
      installMarketSettings(ctx, resolved)
      host.effect(() => mountMarketRoutes(host, resolved, undefined, agentsLookupOf(ctx)), 'dsh-market: http routes')
      return
    }

    // Desktop's supported cross-environment contract guarantees that
    // desktopProfiles exists before Loader entries mount, and prescribes this
    // presence check plus a nested desktopPnpm injection:
    // https://github.com/anywhere-labs/deepseek-harness-desktop/blob/4f68147091e585aaa1d815f99d30a657b3842d7c/dsh-plugin-desktop/docs/plugin-services.md#L190-L243
    // Ordinary DSH keeps the existing CLI path above.
    hostCtx.inject(['desktopPnpm'], (desktopCtx: Context) => {
      const current = desktopProfiles.current
      const service = (desktopCtx as unknown as { desktopPnpm: DesktopPnpmLike }).desktopPnpm
      const runtime = createDesktopPluginRuntime(service, current.dir)
      const resolved: MarketConfig = {
        profile: current.name,
        profileDirectory: current.dir,
        // Relaunching a raw Electron process would bypass Desktop's launcher
        // lifecycle. The shell remains responsible for restart in this mode.
        allowRestart: false,
        maxSnapshots: config?.maxSnapshots,
      }
      const desktopHost = desktopCtx as unknown as MarketEffectHost
      desktopHost.effect(() => {
        const disposeRoutes = mountMarketRoutes(host, resolved, runtime, agentsLookupOf(ctx))
        return async () => {
          disposeRoutes()
          await runtime.dispose()
        }
      }, 'dsh-market: Desktop http routes and package operations')
    })
  })
}
