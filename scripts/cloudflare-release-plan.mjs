import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parse, stringify } from 'yaml'

const IMMUTABLE_CACHE = 'public, max-age=31536000, immutable'
const REVALIDATE_CACHE = 'no-cache, max-age=0, must-revalidate'
const METADATA_TARGETS = new Map([
  ['latest.yml', 'latest/latest.yml'],
  ['latest-mac.yml', 'latest/latest-mac.yml'],
  ['latest-mac-notarized.yml', 'notarized/latest/latest-mac.yml']
])
const METADATA_FILES = [...METADATA_TARGETS.keys()]

/**
 * @typedef {'immutable' | 'stable' | 'metadata'} UploadPhase
 * @typedef {{ phase: UploadPhase, source: string, key: string, contentType: string, cacheControl: string }} UploadEntry
 * @typedef {{ version: string, tag?: string, assetDirectory: string, outputDirectory: string }} ReleasePlanOptions
 */

/**
 * Build the complete, ordered R2 upload plan without publishing anything.
 * Immutable payloads always precede stable aliases and mutable update metadata.
 *
 * @param {ReleasePlanOptions} options
 * @returns {Promise<UploadEntry[]>}
 */
export async function buildCloudflareReleasePlan(options) {
  const version = validateVersion(options.version)
  const tag = options.tag ?? `v${version}`
  if (tag !== `v${version}`) {
    throw new Error(`Release tag ${tag} does not match version ${version}.`)
  }

  const assetDirectory = path.resolve(options.assetDirectory)
  const outputDirectory = path.resolve(options.outputDirectory)
  const directoryEntries = await readdir(assetDirectory, { withFileTypes: true })
  const assetNames = directoryEntries
    .filter((entry) => entry.isFile() && !METADATA_FILES.includes(entry.name))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, 'en'))

  const metadataNames = []
  for (const name of METADATA_FILES) {
    if (directoryEntries.some((entry) => entry.isFile() && entry.name === name)) {
      metadataNames.push(name)
    }
  }
  if (metadataNames.length === 0) {
    throw new Error('Release assets are missing latest.yml or latest-mac.yml metadata.')
  }

  await mkdir(outputDirectory, { recursive: true })
  for (const name of metadataNames) {
    const source = path.join(assetDirectory, name)
    const metadata = parse(await readFile(source, 'utf8'))
    validateMetadata(metadata, name, version)
    await validateAndRewriteReferences(metadata, assetDirectory, tag, name)
    await writeFile(path.join(outputDirectory, name), stringify(metadata), 'utf8')
  }

  /** @type {UploadEntry[]} */
  const plan = assetNames.map((name) => ({
    phase: /** @type {const} */ ('immutable'),
    source: path.join(assetDirectory, name),
    key: `releases/${tag}/${name}`,
    contentType: contentTypeFor(name),
    cacheControl: IMMUTABLE_CACHE
  }))

  for (const name of assetNames.filter((name) => name.endsWith('.dmg'))) {
    plan.push({
      phase: 'stable',
      source: path.join(assetDirectory, name),
      key: `download/${name}`,
      contentType: contentTypeFor(name),
      cacheControl: REVALIDATE_CACHE
    })
  }

  for (const name of metadataNames) {
    plan.push({
      phase: 'metadata',
      source: path.join(outputDirectory, name),
      key: METADATA_TARGETS.get(name),
      contentType: contentTypeFor(name),
      cacheControl: REVALIDATE_CACHE
    })
  }

  assertAtomicOrder(plan)
  return plan
}

function validateVersion(value) {
  if (typeof value !== 'string' || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(value)) {
    throw new Error(`Invalid release version: ${String(value)}`)
  }
  return value
}

function validateMetadata(metadata, name, version) {
  if (!metadata || typeof metadata !== 'object') {
    throw new Error(`${name} is not valid update metadata.`)
  }
  if (metadata.version !== version) {
    throw new Error(`${name} version ${String(metadata.version)} does not match ${version}.`)
  }
  if (!Array.isArray(metadata.files) || metadata.files.length === 0) {
    throw new Error(`${name} must contain at least one update file.`)
  }
  for (const file of metadata.files) {
    if (!file || typeof file !== 'object' || typeof file.sha512 !== 'string' || !file.sha512.trim()) {
      throw new Error(`${name} contains an update file without sha512.`)
    }
  }
  if (metadata.path !== undefined && (typeof metadata.sha512 !== 'string' || !metadata.sha512.trim())) {
    throw new Error(`${name} contains a path without sha512.`)
  }
}

async function validateAndRewriteReferences(metadata, assetDirectory, tag, metadataName) {
  const releasesPrefix =
    metadataName === 'latest-mac-notarized.yml' ? '../../releases' : '../releases'
  for (const file of metadata.files) {
    const filename = safeAssetFilename(file.url)
    await requireFile(path.join(assetDirectory, filename), filename)
    file.url = `${releasesPrefix}/${tag}/${filename}`
  }

  if (metadata.path !== undefined) {
    const filename = safeAssetFilename(metadata.path)
    await requireFile(path.join(assetDirectory, filename), filename)
    metadata.path = `${releasesPrefix}/${tag}/${filename}`
  }
}

function safeAssetFilename(value) {
  if (
    typeof value !== 'string' ||
    !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value) ||
    path.basename(value) !== value
  ) {
    throw new Error(`Update metadata requires a safe asset filename, received: ${String(value)}`)
  }
  return value
}

async function requireFile(filename, displayName) {
  try {
    await access(filename)
  } catch {
    throw new Error(`Update metadata references missing asset: ${displayName}`)
  }
}

function assertAtomicOrder(plan) {
  const rank = { immutable: 0, stable: 1, metadata: 2 }
  let previous = -1
  for (const entry of plan) {
    const current = rank[entry.phase]
    if (current < previous) {
      throw new Error('Cloudflare release metadata was scheduled before immutable assets.')
    }
    previous = current
  }
}

function contentTypeFor(filename) {
  if (filename.endsWith('.yml') || filename.endsWith('.yaml')) return 'application/yaml'
  if (filename.endsWith('.zip')) return 'application/zip'
  if (filename.endsWith('.dmg')) return 'application/x-apple-diskimage'
  if (filename.endsWith('.exe')) return 'application/vnd.microsoft.portable-executable'
  return 'application/octet-stream'
}
