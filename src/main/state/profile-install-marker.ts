import { createHash } from 'node:crypto'
import { readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { profilePackageJsonPath } from './plugin-recovery'

/**
 * Whether the profile's packages were last installed to completion.
 *
 * `node_modules` cannot answer this. An install killed partway leaves a tree
 * that looks plausible — directories carrying the right names, a manifest
 * still declaring everything — and the packages that never arrived only
 * surface later as a service waiting on a provider. Worse, the launch path
 * reads that tree as "nothing damaged" and skips the install that would have
 * finished the job, so a profile can sit half-built indefinitely.
 *
 * The marker is written only after an install exits zero, and cleared before
 * the next one starts. An interrupted install therefore leaves no valid
 * marker, which is the whole point: absence means unfinished, never "fine".
 * It records a fingerprint rather than a flag so that a manifest or lockfile
 * edited since the last install also reads as unfinished.
 */

const MARKER_NAME = '.install-complete'

/** Files whose content defines what a complete install would contain. */
const FINGERPRINTED = ['package.json', 'pnpm-lock.yaml']

function profileDirectory(dshHome: string): string {
  return dirname(profilePackageJsonPath(dshHome))
}

export function profileInstallMarkerPath(dshHome: string): string {
  return join(profileDirectory(dshHome), MARKER_NAME)
}

/**
 * A digest of what the profile declares.
 * @returns undefined when a declaring file is missing or unreadable — with
 * nothing to compare against, no install can be called complete.
 */
async function installFingerprint(dshHome: string): Promise<string | undefined> {
  const directory = profileDirectory(dshHome)
  const digest = createHash('sha256')
  for (const name of FINGERPRINTED) {
    try {
      digest.update(await readFile(join(directory, name)))
      digest.update('\0')
    } catch {
      return undefined
    }
  }
  return digest.digest('hex')
}

/** Whether the packages on disk match the profile's current declarations. */
export async function isProfileInstallComplete(dshHome: string): Promise<boolean> {
  const fingerprint = await installFingerprint(dshHome)
  if (fingerprint === undefined) return false
  try {
    const recorded = await readFile(profileInstallMarkerPath(dshHome), 'utf8')
    return recorded.trim() === fingerprint
  } catch {
    return false
  }
}

/** Record that an install finished. Call only after the install exits zero. */
export async function markProfileInstallComplete(dshHome: string): Promise<void> {
  const fingerprint = await installFingerprint(dshHome)
  if (fingerprint === undefined) return
  await writeFile(profileInstallMarkerPath(dshHome), `${fingerprint}\n`, 'utf8')
}

/** Withdraw the claim. Call before an install starts, so a kill leaves nothing. */
export async function clearProfileInstallMarker(dshHome: string): Promise<void> {
  await rm(profileInstallMarkerPath(dshHome), { force: true })
}
