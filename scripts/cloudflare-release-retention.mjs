const VERSION_PATTERN = /^\d+\.\d+\.\d+$/

export function validateReleaseInventory(value) {
  if (!value || typeof value !== 'object' || value.schemaVersion !== 1) {
    throw new Error('Release inventory must use schemaVersion 1.')
  }
  if (!value.releases || typeof value.releases !== 'object' || Array.isArray(value.releases)) {
    throw new Error('Release inventory must contain a releases object.')
  }

  for (const [version, keys] of Object.entries(value.releases)) {
    validateVersion(version)
    if (!Array.isArray(keys) || keys.length === 0) {
      throw new Error(`Release ${version} must contain at least one immutable release key.`)
    }
    const uniqueKeys = new Set(keys)
    if (uniqueKeys.size !== keys.length) {
      throw new Error(`Release ${version} contains a duplicate object key.`)
    }
    for (const key of keys) validateImmutableKey(key, version)
  }
  return value
}

export function immutableKeysFromPublicationPlan(plan, version) {
  validateVersion(version)
  if (!Array.isArray(plan)) throw new Error('Cloudflare publication plan must be an array.')
  const keys = plan
    .filter((entry) => entry && entry.phase === 'immutable')
    .map((entry) => entry.key)
    .sort((left, right) => left.localeCompare(right, 'en'))
  if (keys.length === 0) throw new Error('Cloudflare publication plan has no immutable keys.')
  if (new Set(keys).size !== keys.length) {
    throw new Error('Cloudflare publication plan contains a duplicate immutable key.')
  }
  for (const key of keys) validateImmutableKey(key, version)
  return keys
}

export function buildReleaseRetentionPlan({ inventory, currentVersion, currentKeys }) {
  validateReleaseInventory(inventory)
  validateVersion(currentVersion)
  if (Object.hasOwn(inventory.releases, currentVersion)) {
    throw new Error(`Release ${currentVersion} already exists in the retention inventory.`)
  }
  if (!Array.isArray(currentKeys) || currentKeys.length === 0) {
    throw new Error('The current release must contain at least one immutable release key.')
  }
  const normalizedCurrentKeys = [...currentKeys].sort((left, right) =>
    left.localeCompare(right, 'en')
  )
  if (new Set(normalizedCurrentKeys).size !== normalizedCurrentKeys.length) {
    throw new Error(`Release ${currentVersion} contains a duplicate object key.`)
  }
  for (const key of normalizedCurrentKeys) validateImmutableKey(key, currentVersion)

  const previousVersions = Object.keys(inventory.releases).sort(compareVersions)
  if (previousVersions.length === 0) {
    throw new Error('No older release exists; refusing to prune the current release.')
  }
  const deletedVersion = previousVersions[0]
  const deleteKeys = [...inventory.releases[deletedVersion]]
  const retainedEntries = previousVersions
    .slice(1)
    .map((version) => [version, [...inventory.releases[version]]])
  retainedEntries.push([currentVersion, normalizedCurrentKeys])
  retainedEntries.sort(([left], [right]) => compareVersions(left, right))

  return {
    deletedVersion,
    deleteKeys,
    nextInventory: {
      schemaVersion: 1,
      releases: Object.fromEntries(retainedEntries)
    }
  }
}

function validateVersion(version) {
  if (typeof version !== 'string' || !VERSION_PATTERN.test(version)) {
    throw new Error(`Invalid stable release version: ${String(version)}`)
  }
}

function validateImmutableKey(key, version) {
  if (typeof key !== 'string' || !key.startsWith('releases/v')) {
    throw new Error(`Release ${version} contains a non-immutable release key: ${String(key)}`)
  }
  const expectedPrefix = `releases/v${version}/`
  if (!key.startsWith(expectedPrefix)) {
    throw new Error(`Object key ${key} does not belong to release ${version}.`)
  }
  const filename = key.slice(expectedPrefix.length)
  if (!filename || filename.includes('/') || filename === '.' || filename === '..') {
    throw new Error(`Release ${version} contains an unsafe object key: ${key}`)
  }
}

function compareVersions(left, right) {
  const leftParts = left.split('.').map(Number)
  const rightParts = right.split('.').map(Number)
  for (let index = 0; index < 3; index += 1) {
    const difference = leftParts[index] - rightParts[index]
    if (difference !== 0) return difference
  }
  return 0
}
