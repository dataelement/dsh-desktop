import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * The version the user asked not to be told about again.
 *
 * Dismissing the update banner already silences one sitting; it does not
 * survive a restart, so a release the user has decided against comes back
 * every launch until they take it. Skipping is the durable answer to the same
 * question, and it is answered per version: a later release is a new question
 * and gets asked.
 *
 * A manual check is the user asking, so it ignores the skip — that is how they
 * take back a version they skipped, without needing a way to unskip.
 */

export function skippedVersionPath(userDataPath: string): string {
  return join(userDataPath, 'update-skip.json')
}

/** Whether an available version should stay silent. */
export function shouldOfferUpdate(
  version: string,
  skippedVersion: string | undefined,
  manual: boolean
): boolean {
  return manual || version !== skippedVersion
}

export function readSkippedVersion(path: string): string | undefined {
  try {
    const value = JSON.parse(readFileSync(path, 'utf8')) as { version?: unknown }
    return typeof value.version === 'string' && value.version ? value.version : undefined
  } catch {
    return undefined
  }
}

/**
 * Persist the skip.
 * @returns whether it was written; a failure here loses the skip rather than
 * the launch, and the banner simply asks again next time.
 */
export function writeSkippedVersion(path: string, version: string): boolean {
  try {
    writeFileSync(path, `${JSON.stringify({ version }, undefined, 2)}\n`, 'utf8')
    return true
  } catch {
    return false
  }
}
