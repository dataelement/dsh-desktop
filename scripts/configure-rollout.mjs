import { fileURLToPath } from 'node:url'

export const SUPPORTED_PLATFORMS = ['mac', 'mac-intel', 'windows']
export const DEFAULT_BASE_URL = 'https://dshdesktop.com/crash'
export const DEFAULT_PERCENTAGE = 5

const SEMVER =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([\da-zA-Z-]+(?:\.[\da-zA-Z-]+)*))?(?:\+[\da-zA-Z-]+(?:\.[\da-zA-Z-]+)*)?$/

export function isValidVersion(value) {
  return typeof value === 'string' && value.length <= 80 && SEMVER.test(value)
}

/**
 * Configure rollout percentage for all supported desktop platforms.
 * Idempotent: creates a new release target or updates an existing one.
 */
export async function configureRollout(options) {
  const {
    version,
    percentage = DEFAULT_PERCENTAGE,
    token = process.env.CRASH_ADMIN_TOKEN || process.env.DESKTOP_ADMIN_TOKEN,
    baseUrl = process.env.CRASH_BASE_URL || DEFAULT_BASE_URL,
    fetchImpl = globalThis.fetch,
    notes,
    log = console.log,
    warn = console.warn
  } = options

  if (!isValidVersion(version)) {
    throw new Error(`Invalid version: "${version}". Expected a canonical SemVer string (e.g. 0.8.2).`)
  }

  const numPercentage = Number(percentage)
  if (!Number.isFinite(numPercentage) || numPercentage < 0 || numPercentage > 100) {
    throw new Error(`Invalid percentage: ${percentage}. Must be between 0 and 100.`)
  }

  if (!token || typeof token !== 'string' || token.trim().length === 0) {
    throw new Error('CRASH_ADMIN_TOKEN is required for configuring rollout on crash service.')
  }

  const cleanBaseUrl = baseUrl.replace(/\/+$/, '')
  const headers = {
    Authorization: `Bearer ${token.trim()}`,
    'Content-Type': 'application/json'
  }

  // 1. Fetch existing releases to check for existing targets
  let existingReleases = []
  const listResponse = await fetchImpl(`${cleanBaseUrl}/admin/api/releases`, {
    headers,
    signal: AbortSignal.timeout(10_000)
  })

  if (!listResponse.ok) {
    throw new Error(
      `Failed to list existing releases from ${cleanBaseUrl}/admin/api/releases (${listResponse.status})`
    )
  }

  try {
    existingReleases = await listResponse.json()
  } catch (error) {
    throw new Error(`Invalid JSON response from ${cleanBaseUrl}/admin/api/releases: ${error.message}`)
  }

  const results = []

  // 2. Iterate each platform and configure the rollout rule
  for (const platform of SUPPORTED_PLATFORMS) {
    const existing = Array.isArray(existingReleases)
      ? existingReleases.find((r) => r.version === version && r.platform === platform)
      : undefined

    const defaultNotes = `Initial ${numPercentage}% rollout configured by release workflow`
    const releasePayload = {
      version,
      platform,
      percentage: numPercentage,
      algorithm: existing?.algorithm || 'sha256-installation-v1',
      seed: existing?.seed || 'desktop-v1',
      enabled: true,
      notes: notes ?? existing?.notes ?? defaultNotes
    }

    if (existing?.id && typeof existing.revision === 'number') {
      // Update existing release rule
      const updateResponse = await fetchImpl(`${cleanBaseUrl}/admin/api/releases/${existing.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          revision: existing.revision,
          ...releasePayload
        }),
        signal: AbortSignal.timeout(10_000)
      })

      if (!updateResponse.ok) {
        const text = await updateResponse.text().catch(() => '')
        throw new Error(
          `Failed to update release rule for ${platform}@${version} (${updateResponse.status}): ${text}`
        )
      }

      const updated = await updateResponse.json()
      log?.(`✅ [${platform}] Updated rollout for ${version} to ${numPercentage}% (rev ${updated.revision})`)
      results.push({ platform, action: 'updated', data: updated })
    } else {
      // Create new release rule
      const createResponse = await fetchImpl(`${cleanBaseUrl}/admin/api/releases`, {
        method: 'POST',
        headers,
        body: JSON.stringify(releasePayload),
        signal: AbortSignal.timeout(10_000)
      })

      if (createResponse.status === 409) {
        // Concurrently created or race condition: re-fetch and update
        warn?.(`⚠️ [${platform}] Conflict (409) while creating release. Retrying via PUT...`)
        const refreshRes = await fetchImpl(`${cleanBaseUrl}/admin/api/releases`, {
          headers,
          signal: AbortSignal.timeout(10_000)
        })
        const refreshed = await refreshRes.json()
        const found = Array.isArray(refreshed)
          ? refreshed.find((r) => r.version === version && r.platform === platform)
          : undefined

        if (!found) {
          throw new Error(`Conflict reported for ${platform}@${version} but entry could not be retrieved`)
        }

        const putRes = await fetchImpl(`${cleanBaseUrl}/admin/api/releases/${found.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            revision: found.revision,
            ...releasePayload
          }),
          signal: AbortSignal.timeout(10_000)
        })

        if (!putRes.ok) {
          const text = await putRes.text().catch(() => '')
          throw new Error(`Failed to update release rule on conflict retry for ${platform}@${version}: ${text}`)
        }

        const updated = await putRes.json()
        log?.(`✅ [${platform}] Updated rollout for ${version} to ${numPercentage}% after conflict retry (rev ${updated.revision})`)
        results.push({ platform, action: 'updated-after-conflict', data: updated })
      } else if (!createResponse.ok) {
        const text = await createResponse.text().catch(() => '')
        throw new Error(
          `Failed to create release rule for ${platform}@${version} (${createResponse.status}): ${text}`
        )
      } else {
        const created = await createResponse.json()
        log?.(`✅ [${platform}] Created new rollout for ${version} at ${numPercentage}%`)
        results.push({ platform, action: 'created', data: created })
      }
    }
  }

  return results
}

// CLI entry point
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const rawVersion = process.argv[2] || process.env.RELEASE_TAG || process.env.GITHUB_REF_NAME
  const cleanVersion = rawVersion?.startsWith('v') ? rawVersion.slice(1) : rawVersion
  const percentage = process.argv[3] !== undefined ? Number(process.argv[3]) : DEFAULT_PERCENTAGE

  if (!cleanVersion) {
    console.error('Usage: node scripts/configure-rollout.mjs <version> [percentage]')
    process.exit(1)
  }

  configureRollout({ version: cleanVersion, percentage })
    .then(() => {
      console.log('🎉 All desktop rollout rules configured successfully.')
    })
    .catch((error) => {
      console.error(`❌ Rollout configuration failed: ${error.message}`)
      process.exit(1)
    })
}
