import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { join } from 'node:path'
import { setTimeout } from 'node:timers/promises'
import { notarize } from '@electron/notarize'

const exec = promisify(execFile)

function transientStapleFailure(error) {
  // This SDK error is emitted only after notarytool accepted the submission.
  return error instanceof Error && /^Failed to staple your application with code: (65|68|69)\b/u.test(error.message)
}

function transientCommandFailure(error) {
  return error && typeof error === 'object' && (
    [65, 68, 69].includes(error.code)
    || (error.killed === true && error.signal === 'SIGTERM')
  )
}

/** Recover ticket propagation/network failures without submitting the app again. */
export async function notarizeWithStapleRetry(options, {
  submit = notarize, run = exec, wait = setTimeout, log = console.log
} = {}) {
  try {
    await submit(options)
  } catch (error) {
    if (!transientStapleFailure(error)) throw error
    for (let attempt = 1; attempt <= 5; attempt++) {
      log(`App ticket stapling failed; retrying in ${attempt * 10}s (${attempt}/5)`)
      await wait(attempt * 10_000)
      try {
        await run('xcrun', ['stapler', 'staple', options.appPath], { timeout: 60_000 })
        break
      } catch (retryError) {
        if (attempt === 5 || !transientCommandFailure(retryError)) throw retryError
      }
    }
  }
  // A build cannot proceed to archive creation with an unverified ticket.
  await run('xcrun', ['stapler', 'validate', options.appPath], { timeout: 60_000 })
}

/** electron-builder hook: completes before DMG/ZIP creation on both macOS architectures. */
export default async function afterSign(context) {
  if (context.electronPlatformName !== 'darwin') return
  const appleApiKey = process.env.APPLE_API_KEY
  const appleApiKeyId = process.env.APPLE_API_KEY_ID
  const appleApiIssuer = process.env.APPLE_API_ISSUER
  if (!appleApiKey && !appleApiKeyId && !appleApiIssuer) return
  if (!appleApiKey || !appleApiKeyId || !appleApiIssuer) throw new Error('All Apple API notarization credentials are required')
  const appPath = join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`)
  await notarizeWithStapleRetry({ appPath, appleApiKey, appleApiKeyId, appleApiIssuer })
}
