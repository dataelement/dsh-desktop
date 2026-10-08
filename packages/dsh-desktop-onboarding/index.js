/**
 * Host half of the DSH Desktop first-run onboarding notice.
 *
 * Exposes the durable `desktop-onboarding` plugin config that the browser half
 * uses to remember the user has already seen (and acknowledged) the notice.
 * Harness 0.1.7 projects volatile plugin Config fields into `ctx.settings`, so
 * this plugin must not call the removed 0.1.6 `settings.register()` API.
 * Eligibility is derived from the immutable desktop install classification;
 * releases never re-prompt existing users.
 *
 * The browser half (`./client.js`) does all the visible work — this file only
 * exists to publish the Config schema before the settings mirror reads it.
 */
import z from '@deepseek-ai/schemastery'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export const Config = z.object({
  wizardVersion: z.string().required(false).volatile(),
  eligible: z.boolean().default(false).volatile()
})

function isFirstInstallEligible() {
  const dshHome = process.env.DSH_HOME
  if (!dshHome) return false
  try {
    const marker = JSON.parse(readFileSync(join(dshHome, '.desktop-install-state.json'), 'utf8'))
    return marker?.schemaVersion === 1 &&
      marker?.classification === 'new' &&
      typeof marker?.firstSeenVersion === 'string' && marker.firstSeenVersion.length > 0 &&
      typeof marker?.classifiedAt === 'string' && Number.isFinite(Date.parse(marker.classifiedAt))
  } catch {
    return false
  }
}

export function apply(ctx, config) {
  // The install marker is machine-owned state, not an editable preference.
  // Re-derive it whenever the plugin mounts instead of trusting a profile
  // override that may have been copied from another installation.
  config.eligible = isFirstInstallEligible()

  // The client owns the onboarding UI, so suppress the generated settings
  // page while keeping both volatile fields available through settingsScope.
  ctx.inject(['settings'], (settingsCtx) => {
    settingsCtx.effect(() => settingsCtx.settings.configure({ auto: false }, ctx.fiber))
  })
}
