import { mkdtemp, open, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { isAbsolute, join } from 'node:path'
import { isLocalPackageName } from './identity.mjs'
import { MarketInstallError, MAX_PACKAGE_BYTES, readPackedManifest } from './market-install.mjs'

/**
 * Snapshot a bounded local archive so validation and installation use identical bytes.
 * @param {unknown} path Absolute archive path on the running Desktop host.
 * @returns {Promise<{spec: string, name: string, version: string, cleanup: () => Promise<void>}>}
 */
export async function prepareLocalInstall(path) {
  if (typeof path !== 'string' || !isAbsolute(path) || !path.endsWith('.tgz') || path.includes('\0')) {
    throw new MarketInstallError('An absolute local .tgz path is required.')
  }
  const file = await open(path, 'r')
  let bytes
  try {
    const info = await file.stat()
    if (!info.isFile() || info.size > MAX_PACKAGE_BYTES) throw new MarketInstallError('The local package must be a file of at most 8 MiB.')
    const buffer = Buffer.alloc(MAX_PACKAGE_BYTES + 1)
    let length = 0
    while (length < buffer.length) {
      const { bytesRead } = await file.read(buffer, length, buffer.length - length, null)
      if (!bytesRead) break
      length += bytesRead
    }
    if (length > MAX_PACKAGE_BYTES) throw new MarketInstallError('The local package is larger than 8 MiB.')
    bytes = buffer.subarray(0, length)
  } finally { await file.close() }
  const manifest = readPackedManifest(bytes)
  if (!isLocalPackageName(manifest?.name) || typeof manifest.version !== 'string' || !manifest.version
    || typeof manifest.dsh?.bundle?.patch !== 'string' || !manifest.dsh.bundle.patch
    || manifest.dsh?.client?.platform !== 'web' || !Array.isArray(manifest.dsh.client.inject) || !manifest.dsh.client.inject.includes('dsh-desktop-workbenches')
    || typeof manifest.exports?.['./client'] !== 'string') {
    throw new MarketInstallError('The archive must declare a named, versioned workbench with bundle and client entries.')
  }
  const directory = await mkdtemp(join(tmpdir(), 'dsh-workbench-local-'))
  try {
    const spec = join(directory, 'workbench.tgz')
    await writeFile(spec, bytes)
    return { spec, name: manifest.name, version: manifest.version, cleanup: () => rm(directory, { recursive: true, force: true }) }
  } catch (error) {
    await rm(directory, { recursive: true, force: true })
    throw error
  }
}
