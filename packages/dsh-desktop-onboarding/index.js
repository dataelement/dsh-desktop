/**
 * Host half of the DSH Desktop first-run onboarding notice.
 *
 * Exposes the first-run notice state as this plugin entry's Config form. The
 * browser stores the acknowledgement through the current settings service.
 * Eligibility comes from the immutable desktop install classification.
 *
 * The browser half (`./client.js`) does all the visible work — this file only
 * exists to provide that Config before the settings mirror reads it.
 */
import z from '@deepseek-ai/schemastery'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export function isFirstInstallEligible() {
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

export const Config = z.object({
  wizardVersion: z.string().default('').volatile(),
  eligible: z.boolean().default(isFirstInstallEligible()).volatile()
})

export const inject = ['settings']

export function apply(ctx) {
  // The onboarding state is internal; its Config form should not add a page.
  ctx.effect(() => ctx.settings.configure({ auto: false }))
}
