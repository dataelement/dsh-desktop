import { createHash, randomUUID } from 'node:crypto'
import { inflateRawSync } from 'node:zlib'
import { lstat, mkdir, readFile, readdir, rename, rm, statfs, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { generationId, writeGenerationMeta } from 'dsh-desktop-market-installer/generations/registry'
import { verifyGenerationPeers } from 'dsh-desktop-market-installer/generations/installer'

export const MAX_ARCHIVE = 256 * 1024 * 1024
const MAX_EXPANDED = 1024 * 1024 * 1024
export const sha256 = data => createHash('sha256').update(data).digest('hex')
export const safePath = value => typeof value === 'string' && value.length > 0 &&
  !/[\\:\0]/u.test(value) && value.split('/').every(part => part && part !== '.' && part !== '..' && !/[. ]$/u.test(part) && !/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\..*)?$/iu.test(part))
const fail = message => { throw new Error(message) }

/** Read bounded ZIP entries without extracting paths or executing build scripts. */
export function readBundleZip(bytes) {
  if (bytes.length > MAX_ARCHIVE) fail('Bundle exceeds 256 MiB.')
  let end = -1
  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65557); offset--) {
    if (bytes.readUInt32LE(offset) === 0x06054b50 && offset + 22 + bytes.readUInt16LE(offset + 20) === bytes.length) { end = offset; break }
  }
  if (end < 0) fail('Invalid ZIP directory.')
  const count = bytes.readUInt16LE(end + 10)
  if (count > 50000 || bytes.readUInt16LE(end + 4) || bytes.readUInt16LE(end + 6)) fail('Unsupported ZIP layout.')
  let cursor = bytes.readUInt32LE(end + 16)
  const directoryEnd = cursor + bytes.readUInt32LE(end + 12)
  if (directoryEnd !== end) fail('Invalid ZIP directory length.')
  const files = new Map(), folded = new Set()
  let expanded = 0
  for (let n = 0; n < count; n++) {
    if (cursor + 46 > end || bytes.readUInt32LE(cursor) !== 0x02014b50) fail('Invalid ZIP entry.')
    const flags = bytes.readUInt16LE(cursor + 8), method = bytes.readUInt16LE(cursor + 10)
    const compressed = bytes.readUInt32LE(cursor + 20), length = bytes.readUInt32LE(cursor + 24)
    const nameLength = bytes.readUInt16LE(cursor + 28), extra = bytes.readUInt16LE(cursor + 30), comment = bytes.readUInt16LE(cursor + 32)
    const offset = bytes.readUInt32LE(cursor + 42), mode = bytes.readUInt32LE(cursor + 38) >>> 16
    const rawName = bytes.subarray(cursor + 46, cursor + 46 + nameLength).toString('utf8')
    const directory = rawName.endsWith('/'), name = directory ? rawName.slice(0, -1) : rawName
    if (!safePath(name) || folded.has(name.toLowerCase()) || (flags & 1) || ![0, 8].includes(method) ||
        ![0, 0x8000, 0x4000].includes(mode & 0xf000)) fail('Unsafe ZIP entry.')
    folded.add(name.toLowerCase())
    expanded += length
    if (expanded > MAX_EXPANDED || offset + 30 > cursor || bytes.readUInt32LE(offset) !== 0x04034b50) fail('Invalid ZIP size.')
    const localNameLength = bytes.readUInt16LE(offset + 26), localExtra = bytes.readUInt16LE(offset + 28)
    if (bytes.subarray(offset + 30, offset + 30 + localNameLength).toString('utf8') !== rawName) fail('ZIP path mismatch.')
    const start = offset + 30 + localNameLength + localExtra
    if (start + compressed > bytes.readUInt32LE(end + 16)) fail('ZIP entry overlaps directory.')
    if (!directory) {
      const input = bytes.subarray(start, start + compressed)
      const data = method === 0 ? input : inflateRawSync(input, { maxOutputLength: Math.max(1, length) })
      if (data.length !== length) fail('ZIP expanded size mismatch.')
      files.set(name, { data, executable: Boolean(mode & 0o111) })
    }
    cursor += 46 + nameLength + extra + comment
  }
  if (cursor !== end) fail('ZIP directory count mismatch.')
  return files
}

export function validateOfflineBundle(bytes, expected, target) {
  if (sha256(bytes) !== expected.digest) fail('Plugin artifact checksum mismatch.')
  const files = readBundleZip(bytes)
  const manifestBytes = files.get('manifest.json')?.data
  if (!manifestBytes || manifestBytes.length > 8 * 1024 * 1024) fail('Missing bundle manifest.')
  const manifest = JSON.parse(manifestBytes.toString('utf8'))
  const plugin = manifest.plugin
  if (manifest.schema_version !== 1 || plugin?.name !== expected.name || plugin?.version !== expected.version ||
      !/^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/u.test(plugin.name) ||
      plugin.name.startsWith('@deepseek-ai/') || plugin.name.startsWith('dsh-desktop-') || plugin.name === 'dshmarket') fail('Invalid plugin identity.')
  if (!manifest.targets?.[target]) fail('Plugin does not support this platform.')
  const seen = new Set(['manifest.json'])
  for (const [platform, inventory] of Object.entries(manifest.targets)) {
    if (!/^(darwin|linux|win32)-(arm64|x64)$/u.test(platform)) fail('Invalid bundle target.')
    for (const [path, hash] of Object.entries(inventory)) {
      if (!safePath(path) || !path.startsWith('node_modules/')) fail('Invalid bundle path.')
      const full = `bundles/${platform}/${path}`, file = files.get(full)
      if (!file || sha256(file.data) !== hash) fail('Bundled file checksum mismatch.')
      seen.add(full)
    }
  }
  if (seen.size !== files.size) fail('Bundle contains unlisted files.')
  const pkg = JSON.parse(files.get(`bundles/${target}/node_modules/${plugin.name}/package.json`)?.data.toString('utf8') || '{}')
  if (pkg.name !== plugin.name || pkg.version !== plugin.version) fail('Plugin package identity mismatch.')
  return { manifest, files }
}

export async function installOfflineBundle(home, bytes, expected, target) {
  const { files, manifest } = validateOfflineBundle(bytes, expected, target)
  // Keep host peer resolution through profiles/node_modules, with an enterprise-owned lifecycle.
  const layout = { staging: join(home, 'profiles', '.enterprise-staging'), generations: join(home, 'profiles', '.enterprise-generations') }
  await mkdir(layout.staging, { recursive: true })
  await mkdir(layout.generations, { recursive: true })
  const free = await statfs(layout.staging)
  const required = [...files.values()].reduce((size, file) => size + file.data.length, 0) + bytes.length
  if (free.bavail * free.bsize < required * 1.2) fail('Insufficient disk space for plugin installation.')
  const id = generationId(expected.name, expected.version, `${expected.digest}:${randomUUID()}`)
  const staging = join(layout.staging, id), directory = join(layout.generations, id)
  await mkdir(staging, { recursive: true })
  try {
    const prefix = `bundles/${target}/`
    for (const [path, file] of files) {
      if (!path.startsWith(prefix)) continue
      const relative = path.slice(prefix.length), destination = join(staging, relative)
      await mkdir(join(destination, '..'), { recursive: true })
      await writeFile(destination, file.data, { flag: 'wx', mode: file.executable ? 0o755 : 0o644 })
    }
    const generation = { id, directory: staging, pluginName: expected.name, version: expected.version, sourceSpec: `bisheng:${expected.digest}` }
    const peers = await verifyGenerationPeers(home, generation)
    if (!peers.ok) fail(peers.problems.join('; '))
    await writeFile(join(staging, 'enterprise-bundle.zip'), bytes, { flag: 'wx', mode: 0o600 })
    await writeGenerationMeta(staging, generation)
    await rename(staging, directory)
    return { ...generation, directory, manifest }
  } catch (error) { await rm(staging, { recursive: true, force: true }); throw error }
}

export async function verifyInstalledBundle(generation, target) {
  if (!(await lstat(generation.directory)).isDirectory() || (await lstat(generation.directory)).isSymbolicLink()) fail('Invalid generation directory.')
  const bytes = await readFile(join(generation.directory, 'enterprise-bundle.zip'))
  const { files, manifest } = validateOfflineBundle(bytes, generation, target)
  const observed = new Set()
  const walk = async relative => {
    const metadata = await lstat(join(generation.directory, relative))
    if (metadata.isSymbolicLink()) fail('Installed bundles must contain regular files.')
    if (metadata.isDirectory()) {
      for (const name of await readdir(join(generation.directory, relative))) await walk(`${relative}/${name}`)
    } else if (metadata.isFile()) observed.add(relative)
    else fail('Invalid installed bundle file.')
  }
  await walk('node_modules')
  if (observed.size !== Object.keys(manifest.targets[target]).length) fail('Installed bundle has unexpected files.')
  for (const [path, hash] of Object.entries(manifest.targets[target])) {
    const data = await readFile(join(generation.directory, path))
    if (sha256(data) !== hash) fail('Installed plugin files changed; reinstall the approved release.')
  }
  return { manifest, files }
}
