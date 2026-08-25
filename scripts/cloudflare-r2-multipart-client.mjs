import { open, stat } from 'node:fs/promises'
import { resolve4 } from 'node:dns/promises'
import https from 'node:https'

export const WRANGLER_MAX_UPLOAD_BYTES = 300 * 1024 * 1024
export const DEFAULT_MULTIPART_PART_SIZE = 16 * 1024 * 1024
export const DEFAULT_MULTIPART_CONCURRENCY = 6

export function selectUploadTransport(size) {
  if (!Number.isSafeInteger(size) || size < 0) throw new Error(`Invalid upload size: ${size}`)
  return size > WRANGLER_MAX_UPLOAD_BYTES ? 'multipart' : 'wrangler'
}

export function assertMultipartReleaseKey(key, version) {
  const escapedVersion = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const immutable = new RegExp(
    `^releases/v${escapedVersion}/sherlock-mac-arm64(?:-legacy)?\\.(?:zip|dmg)$`
  )
  if (immutable.test(key) || key === 'download/sherlock-mac-arm64.dmg') return
  if (/^releases\/v[^/]+\//.test(key)) {
    throw new Error(`Multipart uploads may only target the current release v${version}: ${key}`)
  }
  throw new Error(`Multipart uploads may only target a Sherlock release payload: ${key}`)
}

export function validateExistingImmutableResponse({ key, localSize, response }) {
  if (response.status !== 200) {
    throw new Error(`Existing immutable object check failed for ${key}: HTTP ${response.status}`)
  }
  const remoteSize = Number(response.headers.get('content-length'))
  if (!Number.isSafeInteger(remoteSize) || remoteSize !== localSize) {
    throw new Error(
      `Existing immutable object size mismatch for ${key}: local ${localSize}, remote ${remoteSize}`
    )
  }
  const cacheControl = response.headers.get('cache-control') ?? ''
  if (!/(?:^|[, ])immutable(?:$|[, ])/i.test(cacheControl)) {
    throw new Error(`Existing immutable object has unsafe cache policy for ${key}: ${cacheControl}`)
  }
}

export async function fetchCloudflareWorker(input, init = {}) {
  const url = new URL(input)
  if (!/^[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev$/.test(url.hostname)) {
    return fetch(url, init)
  }
  const edgeAddresses = await resolve4('updates.evanarts.com')
  if (edgeAddresses.length === 0) throw new Error('Could not resolve a Cloudflare edge address.')

  let lastError
  for (const address of edgeAddresses) {
    try {
      const response = await requestCloudflareEdge({ url, address, init })
      if (response.status === 404 && (await response.clone().text()).includes('error code: 1042')) {
        lastError = new Error(`Cloudflare Worker has not propagated to edge ${address}.`)
        continue
      }
      return response
    } catch (error) {
      lastError = error
    }
  }
  throw lastError ?? new Error('Cloudflare Worker request failed.')
}

function requestCloudflareEdge({ url, address, init }) {
  return new Promise((resolve, reject) => {
    const headers = new Headers(init.headers)
    headers.set('host', url.hostname)
    const request = https.request(
      {
        hostname: address,
        port: 443,
        servername: url.hostname,
        path: `${url.pathname}${url.search}`,
        method: init.method ?? 'GET',
        headers: Object.fromEntries(headers.entries())
      },
      (response) => {
        const chunks = []
        response.on('data', (chunk) => chunks.push(chunk))
        response.once('error', reject)
        response.once('end', () => {
          const responseHeaders = new Headers()
          for (const [name, value] of Object.entries(response.headers)) {
            if (Array.isArray(value)) {
              for (const item of value) responseHeaders.append(name, item)
            } else if (value !== undefined) {
              responseHeaders.set(name, value)
            }
          }
          resolve(
            new Response(Buffer.concat(chunks), {
              status: response.statusCode ?? 500,
              statusText: response.statusMessage,
              headers: responseHeaders
            })
          )
        })
      }
    )
    request.setTimeout(360_000, () => request.destroy(new Error('Cloudflare request timed out.')))
    request.once('error', reject)
    if (init.body !== undefined && init.body !== null) request.write(init.body)
    request.end()
  })
}

export async function uploadFileMultipart(options) {
  const {
    endpoint,
    token,
    version,
    key,
    source,
    contentType,
    cacheControl,
    partSize = DEFAULT_MULTIPART_PART_SIZE,
    concurrency = DEFAULT_MULTIPART_CONCURRENCY,
    maxPartAttempts = 4,
    retryDelayMs = 1_000,
    fetchImpl,
    onProgress = () => {}
  } = options
  assertMultipartReleaseKey(key, version)
  if (
    !endpoint.startsWith('http://127.0.0.1:') &&
    !/^https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev$/.test(endpoint)
  ) {
    throw new Error(`Multipart uploader endpoint is not an approved Wrangler Worker: ${endpoint}`)
  }
  if (!token) throw new Error('Multipart uploader token is required.')
  if (!Number.isSafeInteger(partSize) || partSize <= 0) {
    throw new Error(`Invalid multipart part size: ${partSize}`)
  }
  if (!Number.isSafeInteger(concurrency) || concurrency < 1 || concurrency > 8) {
    throw new Error(`Invalid multipart concurrency: ${concurrency}`)
  }
  if (!Number.isSafeInteger(maxPartAttempts) || maxPartAttempts < 1 || maxPartAttempts > 8) {
    throw new Error(`Invalid multipart retry count: ${maxPartAttempts}`)
  }
  const send = fetchImpl ?? fetchCloudflareWorker

  const { size: totalBytes } = await stat(source)
  const request = async (pathname, init) => {
    const response = await send(`${endpoint}${pathname}`, {
      ...init,
      headers: {
        authorization: `Bearer ${token}`,
        ...init.headers
      }
    })
    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      throw new Error(`R2 multipart ${init.method} ${pathname} failed (${response.status}): ${detail}`)
    }
    return response
  }

  const created = await request('/multipart/create', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ key, version, contentType, cacheControl })
  })
  const { uploadId } = await created.json()
  if (typeof uploadId !== 'string' || !uploadId) {
    throw new Error('R2 multipart create did not return an uploadId.')
  }

  const uploadedParts = []
  let completedBytes = 0
  try {
    const partCount = Math.ceil(totalBytes / partSize)
    const file = await open(source, 'r')
    let nextPartNumber = 1
    const uploadNextParts = async () => {
      while (nextPartNumber <= partCount) {
        const partNumber = nextPartNumber
        nextPartNumber += 1
        const position = (partNumber - 1) * partSize
        const length = Math.min(partSize, totalBytes - position)
        const chunk = Buffer.allocUnsafe(length)
        const { bytesRead } = await file.read(chunk, 0, length, position)
        if (bytesRead !== length) {
          throw new Error(`Could only read ${bytesRead} of ${length} bytes for part ${partNumber}.`)
        }
        const query = new URLSearchParams({ key, version, uploadId, partNumber: String(partNumber) })
        let response
        let lastError
        for (let attempt = 1; attempt <= maxPartAttempts; attempt += 1) {
          try {
            response = await request(`/multipart/part?${query}`, {
              method: 'PUT',
              headers: { 'content-type': 'application/octet-stream' },
              body: chunk,
              duplex: 'half'
            })
            break
          } catch (error) {
            lastError = error
            if (attempt < maxPartAttempts && retryDelayMs > 0) {
              await new Promise((resolve) => setTimeout(resolve, retryDelayMs * attempt))
            }
          }
        }
        if (!response) throw lastError ?? new Error(`R2 multipart part ${partNumber} failed.`)
        const result = await response.json()
        if (typeof result.etag !== 'string' || !result.etag) {
          throw new Error(`R2 multipart part ${partNumber} did not return an etag.`)
        }
        uploadedParts.push({ partNumber, etag: result.etag })
        completedBytes += length
        onProgress({ key, completedBytes, totalBytes })
      }
    }
    const workers = Array.from({ length: Math.min(concurrency, partCount) }, () => uploadNextParts())
    const results = await Promise.allSettled(workers)
    await file.close()
    const failed = results.find((result) => result.status === 'rejected')
    if (failed) throw failed.reason
    uploadedParts.sort((left, right) => left.partNumber - right.partNumber)
    await request('/multipart/complete', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key, version, uploadId, parts: uploadedParts })
    })
  } catch (error) {
    await request('/multipart/abort', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key, version, uploadId })
    }).catch(() => {})
    throw error
  }
}

export async function copyR2Object(options) {
  const {
    endpoint,
    token,
    version,
    sourceKey,
    targetKey,
    contentType,
    cacheControl,
    fetchImpl = fetchCloudflareWorker
  } = options
  assertMultipartReleaseKey(sourceKey, version)
  if (sourceKey !== `releases/v${version}/sherlock-mac-arm64.dmg`) {
    throw new Error(`Only the current immutable DMG can be promoted: ${sourceKey}`)
  }
  if (targetKey !== 'download/sherlock-mac-arm64.dmg') {
    throw new Error(`Only the stable Sherlock DMG can be promoted: ${targetKey}`)
  }
  const response = await fetchImpl(`${endpoint}/copy`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({ sourceKey, targetKey, version, contentType, cacheControl })
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`R2 Worker copy failed (${response.status}): ${detail}`)
  }
}
