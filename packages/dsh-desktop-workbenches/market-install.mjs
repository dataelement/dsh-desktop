// Turns one awesome-dsh-workbench index entry into exactly one install target,
// and remembers which workbenches this market installed.
//
// Each distribution type is handled on its own branch and never falls back to
// another source: a Release package whose checksum does not match is a failed
// install, not a reason to try npm or the repository instead.

import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { finished } from 'node:stream/promises'
import { gunzipSync } from 'node:zlib'

export const MAX_PACKAGE_BYTES = 8 * 1024 * 1024
const MAX_UNPACKED_BYTES = 64 * 1024 * 1024
const MAX_MANIFEST_BYTES = 1024 * 1024
const DOWNLOAD_TIMEOUT_MS = 60_000
const INSTALLS_FILE = 'market-installs.json'

export class MarketInstallError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.name = 'MarketInstallError'
    this.status = status
  }
}
const fail = (message, status) => { throw new MarketInstallError(message, status) }

async function download(url, { fetchImpl, maxBytes, what }) {
  let response
  try {
    response = await fetchImpl(url, { redirect: 'follow', signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) })
  } catch (error) {
    fail(`Could not download ${what}: ${error instanceof Error ? error.message : String(error)}`, 502)
  }
  if (!response.ok) fail(`Downloading ${what} returned HTTP ${response.status}.`, 502)
  const declared = Number(response.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > maxBytes) fail(`${what} is larger than ${maxBytes} bytes.`, 502)
  const reader = response.body?.getReader()
  if (!reader) fail(`${what} is empty.`, 502)
  const chunks = []
  let length = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      length += value.length
      if (length > maxBytes) {
        await reader.cancel()
        fail(`${what} is larger than ${maxBytes} bytes.`, 502)
      }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  return Buffer.concat(chunks)
}

/** Reads `package/package.json` from an npm-style `.tgz` without extracting anything to disk. */
export function readPackedManifest(tgz) {
  let tar
  try { tar = gunzipSync(tgz, { maxOutputLength: MAX_UNPACKED_BYTES }) } catch { fail('The Release package is not a valid .tgz file.', 502) }
  for (let offset = 0; offset + 512 <= tar.length;) {
    const header = tar.subarray(offset, offset + 512)
    if (header.every((byte) => byte === 0)) break
    const text = (start, length) => header.subarray(start, start + length).toString('utf8').replace(/\0[\s\S]*$/u, '')
    const size = Number.parseInt(text(124, 12).trim() || '0', 8)
    if (!Number.isSafeInteger(size) || size < 0) break
    const prefix = text(345, 155)
    const name = prefix ? `${prefix}/${text(0, 100)}` : text(0, 100)
    const type = text(156, 1)
    if ((type === '0' || type === '') && name.split('/').slice(1).join('/') === 'package.json' && !name.slice(0, name.indexOf('/')).includes('..')) {
      if (size > MAX_MANIFEST_BYTES) fail('package.json in the Release package is too large.', 502)
      try { return JSON.parse(tar.subarray(offset + 512, offset + 512 + size).toString('utf8')) } catch { fail('package.json in the Release package is not valid JSON.', 502) }
    }
    offset += 512 + Math.ceil(size / 512) * 512
  }
  fail('The Release package does not contain package/package.json.', 502)
}

function checkManifest(manifest, entry) {
  if (typeof manifest?.name !== 'string' || !manifest.name) fail('The package does not declare a name.', 502)
  if (manifest.version !== entry.distribution.version) {
    fail(`The package is version ${manifest.version}, but the workbench index lists ${entry.distribution.version}.`, 502)
  }
  return manifest.name
}

/**
 * Resolves the single install target for an index entry. The returned
 * `cleanup` removes any temporary download and must run after installing.
 */
export async function resolveInstallTarget(entry, { fetchImpl = fetch, temporaryRoot = tmpdir() } = {}) {
  const distribution = entry.distribution
  if (distribution.type === 'npm') {
    return {
      pluginSpec: `${distribution.name}@${distribution.version}`,
      expectedPluginName: distribution.name,
      expectedVersion: distribution.version,
      npmIntegrity: distribution.integrity,
      cleanup: async () => {}
    }
  }
  if (distribution.type === 'github-release') {
    const bytes = await download(distribution.url, { fetchImpl, maxBytes: MAX_PACKAGE_BYTES, what: 'the Release package' })
    const digest = createHash('sha256').update(bytes).digest('hex')
    if (digest !== distribution.sha256) fail('The downloaded Release package does not match the SHA-256 listed in the workbench index.', 502)
    const name = checkManifest(readPackedManifest(bytes), entry)
    const directory = await mkdtemp(join(temporaryRoot, 'dsh-workbench-release-'))
    const file = join(directory, 'workbench.tgz')
    await writeFile(file, bytes)
    return {
      pluginSpec: `file:${file}`,
      expectedPluginName: name,
      expectedVersion: distribution.version,
      cleanup: () => rm(directory, { recursive: true, force: true })
    }
  }
  if (distribution.type === 'github-source') {
    const match = /^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)\/?$/.exec(distribution.url)
    if (!match) fail('The source repository URL is invalid.', 502)
    const [, owner, repo] = match
    const manifestUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${distribution.commit}/package.json`
    let manifest
    try { manifest = JSON.parse((await download(manifestUrl, { fetchImpl, maxBytes: MAX_MANIFEST_BYTES, what: 'package.json from the repository' })).toString('utf8')) }
    catch (error) { if (error instanceof MarketInstallError) throw error; fail('package.json in the repository is not valid JSON.', 502) }
    return {
      pluginSpec: `github:${owner}/${repo}#${distribution.commit}`,
      expectedPluginName: checkManifest(manifest, entry),
      expectedVersion: distribution.version,
      cleanup: async () => {}
    }
  }
  fail(`Installing from ${distribution.type} is not supported by this Desktop version.`, 502)
}

/** Which workbenches this market installed, keyed by workbench ID. Separate from state.json on purpose. */
export function createMarketInstallStore(root) {
  const path = join(root, INSTALLS_FILE)
  let queue = Promise.resolve()
  const read = async () => {
    try {
      const saved = JSON.parse(await readFile(path, 'utf8'))
      return saved?.version === 1 && saved.installs && typeof saved.installs === 'object' ? saved.installs : {}
    } catch (error) {
      if (error?.code === 'ENOENT') return {}
      throw new MarketInstallError('Stored workbench market installs are invalid.', 500)
    }
  }
  const update = (change) => {
    const task = queue.then(async () => {
      const installs = await read()
      change(installs)
      await mkdir(root, { recursive: true })
      const temporary = `${path}.${process.pid}.${Date.now()}.tmp`
      await writeFile(temporary, `${JSON.stringify({ version: 1, installs }, null, 2)}\n`)
      await rename(temporary, path)
      return installs
    })
    queue = task.catch(() => {})
    return task
  }
  return {
    read,
    record: (id, value) => update((installs) => { installs[id] = value }),
    forget: (id) => update((installs) => { delete installs[id] })
  }
}

/** Awaits a desktopPnpm handle and returns the last useful output line on failure. */
export async function awaitHandle(handle) {
  let output = ''
  const append = (chunk) => { output = `${output}${chunk.toString('utf8')}`.slice(-8000) }
  handle.stdout?.on('data', append)
  handle.stderr?.on('data', append)
  // Output can still be buffered when `done` settles; read it to the end.
  const [exit] = await Promise.all([handle.done, ...[handle.stdout, handle.stderr].filter(Boolean).map((stream) => finished(stream).catch(() => {}))])
  if (exit.exitCode !== 0) {
    const detail = output.trim().split(/\r?\n/u).at(-1)
    fail(detail || `The install exited with code ${exit.exitCode}.`, 502)
  }
}
