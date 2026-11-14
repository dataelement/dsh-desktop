import { afterEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash, X509Certificate } from 'node:crypto'
import { developerIdG2Fallback, developerIdG2CertificateSha256, prepareAppleIntermediateCertificate } from '../scripts/release/apple-intermediate-certificate.mjs'

const certificate = new X509Certificate(await readFile(developerIdG2Fallback)).raw
const temporary = []
afterEach(async () => {
  await Promise.all(temporary.splice(0).map(root => rm(root, { recursive: true, force: true })))
})
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'dsh-apple-intermediate-'))
  temporary.push(root)
  return { root, destination: join(root, 'intermediate.cer'), wait: vi.fn(), log: vi.fn() }
}
const success = () => new Response(certificate)

describe('verified Apple intermediate certificate', () => {
  it('pins the bundled public certificate to the existing DER digest', () => {
    expect(createHash('sha256').update(certificate).digest('hex')).toBe(developerIdG2CertificateSha256)
    expect(new X509Certificate(certificate).subject).toContain('Developer ID Certification Authority')
  })

  it('uses a verified remote response without reading a missing fallback', async () => {
    const options = await fixture()
    const fetchImpl = vi.fn(async () => success())
    await prepareAppleIntermediateCertificate(options.destination, { ...options, fetchImpl, fallbackPath: join(options.root, 'missing.pem') })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(fetchImpl.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal)
    expect(await readFile(options.destination)).toEqual(certificate)
    if (process.platform !== 'win32') expect((await stat(options.destination)).mode & 0o777).toBe(0o600)
    expect(options.wait).not.toHaveBeenCalled()
  })

  it.each([408, 429, 500, 502, 503, 504])('retries transient HTTP %s and accepts a subsequent verified response', async status => {
    const options = await fixture()
    const fetchImpl = vi.fn().mockResolvedValueOnce(new Response('temporary failure', { status })).mockImplementationOnce(success)
    await prepareAppleIntermediateCertificate(options.destination, { ...options, fetchImpl })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(options.wait).toHaveBeenCalledExactlyOnceWith(1000)
    expect(await readFile(options.destination)).toEqual(certificate)
  })

  it('bounds network retries before using the verified local fallback', async () => {
    const options = await fixture()
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('fetch failed'))
    await prepareAppleIntermediateCertificate(options.destination, { ...options, fetchImpl })
    expect(fetchImpl).toHaveBeenCalledTimes(3)
    expect(options.wait.mock.calls).toEqual([[1000], [2000]])
    expect(new Set(fetchImpl.mock.calls.map(call => call[1].signal)).size).toBe(3)
    expect(await readFile(options.destination)).toEqual(certificate)
  })

  it.each([403, 404])('uses the verified local fallback without retrying HTTP %s', async status => {
    const options = await fixture()
    const fetchImpl = vi.fn(async () => new Response('blocked', { status }))
    await prepareAppleIntermediateCertificate(options.destination, { ...options, fetchImpl })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(options.wait).not.toHaveBeenCalled()
    expect(await readFile(options.destination)).toEqual(certificate)
    expect(options.log).toHaveBeenLastCalledWith('Using local Apple intermediate certificate after SHA-256 verification.')
  })

  it.each(['headers', 'body'])('times out stalled response %s and falls back after bounded retries', async phase => {
    const options = await fixture()
    const signals = []
    const fetchImpl = vi.fn((_url, { signal }) => {
      signals.push(signal)
      const pending = () => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true }))
      return phase === 'headers' ? pending() : Promise.resolve({ ok: true, arrayBuffer: pending })
    })
    await prepareAppleIntermediateCertificate(options.destination, { ...options, fetchImpl, timeoutMs: 5 })
    expect(fetchImpl).toHaveBeenCalledTimes(3)
    expect(signals.every(signal => signal.aborted)).toBe(true)
    expect(await readFile(options.destination)).toEqual(certificate)
  })

  it('rejects incorrect remote bytes and verifies the fallback instead of retrying a checksum mismatch', async () => {
    const options = await fixture()
    const fetchImpl = vi.fn(async () => new Response('not the pinned certificate'))
    await prepareAppleIntermediateCertificate(options.destination, { ...options, fetchImpl })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect(options.wait).not.toHaveBeenCalled()
    expect(await readFile(options.destination)).toEqual(certificate)
  })

  it('fails without replacing the destination when neither certificate passes checksum verification', async () => {
    const options = await fixture()
    const fallbackPath = join(options.root, 'modified.cer')
    const altered = Buffer.from(certificate)
    altered[altered.length - 1] ^= 1
    await writeFile(fallbackPath, altered)
    await writeFile(options.destination, 'previous output')
    const fetchImpl = vi.fn(async () => new Response('wrong remote bytes'))
    const error = await prepareAppleIntermediateCertificate(options.destination, { ...options, fetchImpl, fallbackPath }).catch(error => error)
    expect(error).toBeInstanceOf(AggregateError)
    expect(error.errors).toHaveLength(2)
    expect(error.errors.every(cause => cause.message.includes('checksum mismatch'))).toBe(true)
    expect(await readFile(options.destination, 'utf8')).toBe('previous output')
  })

  it.each(['missing', 'malformed'])('fails without creating an import file when fallback is %s and remote is blocked', async kind => {
    const options = await fixture()
    const fallbackPath = join(options.root, 'bad.pem')
    if (kind === 'malformed') await writeFile(fallbackPath, 'not a certificate')
    const fetchImpl = vi.fn(async () => new Response('blocked', { status: 403 }))
    await expect(prepareAppleIntermediateCertificate(options.destination, { ...options, fetchImpl, fallbackPath })).rejects.toThrow('neither remote nor local source passed verification')
    await expect(stat(options.destination)).rejects.toMatchObject({ code: 'ENOENT' })
  })
})
