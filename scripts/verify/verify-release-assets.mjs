import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { open, readFile, stat } from 'node:fs/promises'
import { basename, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { parse } from 'yaml'

export function releaseAssetNames(artifactPrefix = 'dsh-desktop') {
  if (typeof artifactPrefix !== 'string' || artifactPrefix.length > 64 ||
      artifactPrefix.trim() !== artifactPrefix || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(artifactPrefix) ||
      /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/.test(artifactPrefix)) {
    throw new Error('Invalid portable release artifact prefix')
  }
  return [
    ...['arm64', 'x64'].flatMap(arch => ['dmg', 'zip', 'zip.blockmap'].map(ext => artifactPrefix + '-mac-' + arch + '.' + ext)),
    artifactPrefix + '-windows-x64-setup.exe',
    artifactPrefix + '-windows-x64-setup.exe.blockmap',
    'latest-mac.yml', 'latest.yml'
  ]
}

// A complete DSH Desktop runtime is substantially larger than these floors.
// These catch truncated/corrupt artifacts without pinning normal release sizes.
const DEFAULT_MINIMUM_BYTES = {
  dmg: 100 * 1024 * 1024,
  zip: 100 * 1024 * 1024,
  exe: 100 * 1024 * 1024,
  blockmap: 1024,
  yml: 64
}

async function sha512(file) {
  const hash = createHash('sha512')
  await new Promise((resolvePromise, rejectPromise) => {
    const stream = createReadStream(file)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('error', rejectPromise)
    stream.on('end', resolvePromise)
  })
  return hash.digest('base64')
}

function assetKind(name) {
  if (name.endsWith('.zip.blockmap') || name.endsWith('.exe.blockmap')) return 'blockmap'
  if (name.endsWith('.dmg')) return 'dmg'
  if (name.endsWith('.zip')) return 'zip'
  if (name.endsWith('.exe')) return 'exe'
  if (name.endsWith('.yml')) return 'yml'
  throw new Error(`Unsupported release asset: ${name}`)
}

async function assertFileHeader(file, kind, size) {
  if (kind !== 'exe' && kind !== 'zip' && kind !== 'dmg') return
  const handle = await open(file, 'r')
  try {
    if (kind === 'exe' || kind === 'zip') {
      const header = Buffer.alloc(2)
      const { bytesRead } = await handle.read(header, 0, header.length, 0)
      const expected = kind === 'exe' ? 'MZ' : 'PK'
      if (bytesRead !== header.length || !header.equals(Buffer.from(expected))) {
        throw new Error(
          `${basename(file)} is not a ${kind === 'exe' ? 'PE executable' : 'ZIP archive'}`
        )
      }
      return
    }

    const trailerSize = Math.min(512, size)
    const trailer = Buffer.alloc(trailerSize)
    const { bytesRead } = await handle.read(trailer, 0, trailer.length, size - trailerSize)
    if (bytesRead !== trailer.length || !trailer.includes(Buffer.from('koly'))) {
      throw new Error(`${basename(file)} is not a UDIF disk image`)
    }
  } finally {
    await handle.close()
  }
}

async function assertUpdateEntry(root, metadataName, version, assetName) {
  const metadata = parse(await readFile(join(root, metadataName), 'utf8'))
  if (!metadata || metadata.version !== version || !Array.isArray(metadata.files)) {
    throw new Error(`${metadataName} does not describe release ${version}`)
  }

  const entry = metadata.files.find((file) => file?.url === assetName)
  if (!entry || typeof entry.sha512 !== 'string' || typeof entry.size !== 'number') {
    throw new Error(`${metadataName} has no valid entry for ${assetName}`)
  }

  const file = join(root, assetName)
  const fileStat = await stat(file)
  const digest = await sha512(file)
  if (entry.size !== fileStat.size || entry.sha512 !== digest) {
    throw new Error(`${metadataName} checksum or size does not match ${assetName}`)
  }
}

export async function verifyReleaseAssets(releaseDir, version, options = {}) {
  const requiredAssets = releaseAssetNames(options.artifactPrefix)
  const root = resolve(releaseDir)
  const minimumBytes = { ...DEFAULT_MINIMUM_BYTES, ...options.minimumBytes }

  for (const name of requiredAssets) {
    const kind = assetKind(name)
    const file = join(root, name)
    const fileStat = await stat(file).catch(() => undefined)
    if (!fileStat?.isFile()) throw new Error(`Missing required release asset: ${name}`)
    if (fileStat.size < minimumBytes[kind]) {
      throw new Error(`${name} is unexpectedly small (${fileStat.size} bytes)`)
    }
    await assertFileHeader(file, kind, fileStat.size)
  }

  await assertUpdateEntry(root, 'latest.yml', version, requiredAssets[6])
  await assertUpdateEntry(root, 'latest-mac.yml', version, requiredAssets[1])
  await assertUpdateEntry(root, 'latest-mac.yml', version, requiredAssets[4])
}

async function main() {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: { 'artifact-prefix': { type: 'string' } } })
  const [releaseDir, version] = positionals
  if (positionals.length !== 2 || !releaseDir || !/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version ?? '')) {
    throw new Error('Usage: node scripts/verify/verify-release-assets.mjs <release-dir> <semver> [--artifact-prefix dsh-desktop]')
  }
  await verifyReleaseAssets(releaseDir, version, { artifactPrefix: values['artifact-prefix'] })
  console.log(`Verified release assets for ${version}.`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main()
