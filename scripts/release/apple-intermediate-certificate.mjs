import { readFile, writeFile } from 'node:fs/promises'
import { createHash, X509Certificate } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'

export const developerIdG2CertificateUrl = 'https://www.apple.com/certificateauthority/DeveloperIDG2CA.cer'
export const developerIdG2CertificateSha256 = 'f16cd3c54c7f83cea4bf1a3e6a0819c8aaa8e4a1528fd144715f350643d2df3a'
export const developerIdG2Fallback = new URL('./certificates/developer-id-g2.pem', import.meta.url)

function verify(certificate) {
  const actual = createHash('sha256').update(certificate).digest('hex')
  if (actual !== developerIdG2CertificateSha256) {
    throw new Error(`Apple intermediate certificate checksum mismatch: ${actual}`)
  }
  return certificate
}

function transient(error) {
  return error?.name === 'AbortError' || error?.name === 'TimeoutError' ||
    error instanceof TypeError || error?.status === 408 || error?.status === 429 ||
    (error?.status >= 500 && error?.status <= 599)
}

async function download({ fetchImpl, timeoutMs, wait, log }) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const controller = new AbortController()
    // Keep the deadline active until the response body has also been consumed.
    const timer = setTimeout(() => controller.abort(
      new DOMException(`Apple intermediate download timed out after ${timeoutMs}ms`, 'TimeoutError')
    ), timeoutMs)
    let failure
    try {
      const response = await fetchImpl(developerIdG2CertificateUrl, { signal: controller.signal })
      if (!response.ok) {
        await response.body?.cancel()
        throw Object.assign(new Error(`Unable to download Apple intermediate certificate: HTTP ${response.status}`), { status: response.status })
      }
      return verify(Buffer.from(await response.arrayBuffer()))
    } catch (error) {
      failure = error
    } finally {
      clearTimeout(timer)
    }
    if (!transient(failure) || attempt === 3) throw failure
    const backoffMs = attempt * 1000
    log(`Apple intermediate download attempt ${attempt}/3 failed: ${failure.message}; retrying in ${backoffMs}ms.`)
    await wait(backoffMs)
  }
}

export async function prepareAppleIntermediateCertificate(destination, {
  fetchImpl = globalThis.fetch,
  timeoutMs = 15_000,
  fallbackPath = developerIdG2Fallback,
  wait = delay,
  log = console.warn
} = {}) {
  let certificate
  try {
    certificate = await download({ fetchImpl, timeoutMs, wait, log })
  } catch (downloadError) {
    log(`Apple intermediate download unavailable: ${downloadError.message}; checking local fallback.`)
    try {
      // Hash the DER bytes, exactly as for Apple's downloaded .cer, even though
      // the reviewed public fallback is stored as text PEM in the repository.
      certificate = verify(new X509Certificate(await readFile(fallbackPath)).raw)
    } catch (fallbackError) {
      throw new AggregateError([downloadError, fallbackError],
        'Unable to prepare Apple intermediate certificate: neither remote nor local source passed verification')
    }
    log('Using local Apple intermediate certificate after SHA-256 verification.')
  }
  // Never create or replace the import file with unverified bytes. Disk errors
  // remain fatal instead of being disguised as a download/fallback problem.
  await writeFile(destination, certificate, { mode: 0o600 })
}
