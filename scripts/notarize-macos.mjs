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

function transientNetworkFailure(error) {
  const detail = `${error?.message ?? ''} ${error?.stderr ?? ''} ${error?.stdout ?? ''}`
  return /NSURLErrorDomain Code=-(1001|1005|1009)\b|The request timed out|The network connection was lost|ETIMEDOUT|ECONNRESET/u.test(detail)
}

/** Resume an accepted upload; never retry submission when its outcome is unknown. */
async function resumeNotarization(error, options, { run, wait, log }) {
  if (!(error instanceof Error)) throw error
  const id = error.message.match(/\/submissions\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/iu)?.[1]
  if (!id || !transientNetworkFailure(error)) throw error
  const auth = ['--key', options.appleApiKey, '--key-id', options.appleApiKeyId, '--issuer', options.appleApiIssuer]
  if (auth.some(value => typeof value !== 'string' || !value)) throw error
  for (let attempt = 1; attempt <= 6; attempt++) {
    log(`Resuming Apple notarization ${id} in ${attempt * 10}s (${attempt}/6)`)
    await wait(attempt * 10_000)
    let result
    try {
      result = await run('xcrun', ['notarytool', 'wait', id, ...auth, '--output-format', 'json', '--timeout', '5m'], { timeout: 360_000 })
    } catch (retryError) {
      if (attempt === 6 || !transientNetworkFailure(retryError)) throw retryError
      continue
    }
    const response = JSON.parse(result.stdout)
    if (response.id !== id || response.status !== 'Accepted') {
      throw new Error(`Apple notarization ${id}: ${response.status ?? 'missing status'}`)
    }
    return
  }
}

/** Recover ticket propagation/network failures without submitting the app again. */
export async function notarizeWithStapleRetry(options, {
  submit = notarize, run = exec, wait = setTimeout, log = console.log
} = {}) {
  try {
    await submit(options)
  } catch (error) {
    if (!transientStapleFailure(error)) {
      await resumeNotarization(error, options, { run, wait, log })
    }
    for (let attempt = 1; attempt <= 6; attempt++) {
      log(`Stapling app ticket in ${attempt * 10}s (${attempt}/6)`)
      await wait(attempt * 10_000)
      try {
        await run('xcrun', ['stapler', 'staple', options.appPath], { timeout: 60_000 })
        break
      } catch (retryError) {
        if (attempt === 6 || !transientCommandFailure(retryError)) throw retryError
      }
    }
  }
  // A build cannot proceed to archive creation with an unverified ticket.
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      await run('xcrun', ['stapler', 'validate', options.appPath], { timeout: 60_000 })
      break
    } catch (validateError) {
      if (attempt === 6 || !transientCommandFailure(validateError)) throw validateError
      log(`App ticket validation failed; retrying in ${attempt * 10}s (${attempt}/6)`)
      await wait(attempt * 10_000)
    }
  }
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
