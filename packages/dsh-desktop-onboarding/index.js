/**
 * Host half of the DSH Desktop first-run onboarding notice.
 *
 * Publishes eligibility through Config and keeps the legacy wizardVersion
 * field readable. Desktop host entries are command-line overlay entries, so
 * Harness configForms cannot persist their config edits. The authenticated
 * acknowledgment route instead writes an install-scoped atomic state file.
 * Eligibility is derived from the immutable install marker and that record;
 * releases never re-prompt existing or acknowledged installations.
 */
import z from '@deepseek-ai/schemastery'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { mkdir, rename, rm, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'

export const inject = ['connection']
const ACK_FILE = '.desktop-onboarding-state.json'

function isAcknowledged(dshHome) {
  try {
    const value = JSON.parse(readFileSync(join(dshHome, ACK_FILE), 'utf8'))
    return value?.schemaVersion === 1 && value?.acknowledged === true &&
      typeof value?.acknowledgedAt === 'string' && Number.isFinite(Date.parse(value.acknowledgedAt))
  } catch {
    return false
  }
}

async function acknowledge(dshHome) {
  if (!dshHome) throw new Error('Desktop home is unavailable')
  await mkdir(dshHome, { recursive: true })
  const destination = join(dshHome, ACK_FILE)
  const temporary = `${destination}.${randomUUID()}.tmp`
  try {
    await writeFile(temporary, JSON.stringify({ schemaVersion: 1, acknowledged: true, acknowledgedAt: new Date().toISOString() }), { mode: 0o600, flag: 'wx' })
    await rename(temporary, destination)
  } finally {
    await rm(temporary, { force: true })
  }
}

export const Config = z.object({
  wizardVersion: z.string().required(false).volatile(),
  eligible: z.boolean().default(false).volatile()
})

function isFirstInstallEligible(dshHome = process.env.DSH_HOME) {
  if (!dshHome || isAcknowledged(dshHome)) return false
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

  const dshHome = process.env.DSH_HOME
  ctx.connection.fetch.register({
    path: '/api/desktop-onboarding/acknowledge',
    methods: ['POST'],
    requestBody: 'buffered',
    async fetch() {
      try {
        if (!dshHome) throw new Error('Desktop home is unavailable')
        if (!isAcknowledged(dshHome)) {
          if (!isFirstInstallEligible(dshHome)) {
            return Response.json({ error: 'Installation is not eligible' }, { status: 409, headers: { 'cache-control': 'no-store' } })
          }
          await acknowledge(dshHome)
        }
        config.eligible = false
        return Response.json({ acknowledged: true }, { headers: { 'cache-control': 'no-store' } })
      } catch {
        return Response.json({ error: 'Could not save onboarding acknowledgment' }, { status: 500, headers: { 'cache-control': 'no-store' } })
      }
    }
  })

  // The client owns the onboarding UI, so suppress the generated settings
  // page while keeping both volatile fields available through configForms.
  ctx.inject(['settings'], (settingsCtx) => {
    settingsCtx.effect(() => settingsCtx.settings.configure({ auto: false }, ctx.fiber))
  })
}
