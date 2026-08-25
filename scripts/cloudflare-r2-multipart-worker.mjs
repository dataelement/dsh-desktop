const json = (value, status = 200) =>
  Response.json(value, {
    status,
    headers: { 'cache-control': 'no-store' }
  })

function assertAuthorized(request, env) {
  if (
    typeof env.RELEASE_UPLOAD_TOKEN !== 'string' ||
    request.headers.get('authorization') !== `Bearer ${env.RELEASE_UPLOAD_TOKEN}`
  ) {
    throw new HttpError(401, 'Unauthorized')
  }
}

function assertReleaseTarget(key, version, env) {
  if (version !== env.RELEASE_VERSION) {
    throw new HttpError(400, 'Release version does not match the active upload session.')
  }
  const escapedVersion = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const immutable = new RegExp(
    `^releases/v${escapedVersion}/sherlock-mac-arm64(?:-legacy)?\\.(?:zip|dmg)$`
  )
  if (!immutable.test(key) && key !== 'download/sherlock-mac-arm64.dmg') {
    throw new HttpError(400, 'Key is not an allowed Sherlock release payload.')
  }
}

async function parseJson(request) {
  try {
    return await request.json()
  } catch {
    throw new HttpError(400, 'Request body must be valid JSON.')
  }
}

class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

export default {
  async fetch(request, env) {
    try {
      assertAuthorized(request, env)
      const url = new URL(request.url)
      if (request.method === 'GET' && url.pathname === '/health') {
        return json({ ok: true, version: env.RELEASE_VERSION })
      }

      if (request.method === 'POST' && url.pathname === '/multipart/create') {
        const { key, version, contentType, cacheControl } = await parseJson(request)
        assertReleaseTarget(key, version, env)
        const upload = await env.SHERLOCK_RELEASES.createMultipartUpload(key, {
          httpMetadata: { contentType, cacheControl }
        })
        return json({ uploadId: upload.uploadId })
      }

      if (request.method === 'PUT' && url.pathname === '/multipart/part') {
        const key = url.searchParams.get('key')
        const version = url.searchParams.get('version')
        const uploadId = url.searchParams.get('uploadId')
        const partNumber = Number(url.searchParams.get('partNumber'))
        assertReleaseTarget(key, version, env)
        if (!uploadId || !Number.isSafeInteger(partNumber) || partNumber < 1 || !request.body) {
          throw new HttpError(400, 'Multipart part parameters are invalid.')
        }
        const upload = env.SHERLOCK_RELEASES.resumeMultipartUpload(key, uploadId)
        const part = await upload.uploadPart(partNumber, request.body)
        return json({ partNumber: part.partNumber, etag: part.etag })
      }

      if (request.method === 'POST' && url.pathname === '/multipart/complete') {
        const { key, version, uploadId, parts } = await parseJson(request)
        assertReleaseTarget(key, version, env)
        if (!uploadId || !Array.isArray(parts) || parts.length === 0) {
          throw new HttpError(400, 'Multipart completion parameters are invalid.')
        }
        const upload = env.SHERLOCK_RELEASES.resumeMultipartUpload(key, uploadId)
        await upload.complete(parts)
        return json({ ok: true })
      }

      if (request.method === 'POST' && url.pathname === '/multipart/abort') {
        const { key, version, uploadId } = await parseJson(request)
        assertReleaseTarget(key, version, env)
        if (!uploadId) throw new HttpError(400, 'Multipart uploadId is required.')
        const upload = env.SHERLOCK_RELEASES.resumeMultipartUpload(key, uploadId)
        await upload.abort()
        return json({ ok: true })
      }

      if (request.method === 'POST' && url.pathname === '/copy') {
        const { sourceKey, targetKey, version, contentType, cacheControl } = await parseJson(request)
        assertReleaseTarget(sourceKey, version, env)
        if (sourceKey !== `releases/v${version}/sherlock-mac-arm64.dmg`) {
          throw new HttpError(400, 'Only the current immutable DMG can be promoted.')
        }
        if (targetKey !== 'download/sherlock-mac-arm64.dmg') {
          throw new HttpError(400, 'Only the stable Sherlock DMG can be promoted.')
        }
        const source = await env.SHERLOCK_RELEASES.get(sourceKey)
        if (!source) throw new HttpError(404, 'Immutable DMG was not found.')
        await env.SHERLOCK_RELEASES.put(targetKey, source.body, {
          httpMetadata: { contentType, cacheControl }
        })
        return json({ ok: true })
      }

      return json({ error: 'Not found' }, 404)
    } catch (error) {
      if (error instanceof HttpError) return json({ error: error.message }, error.status)
      console.error(error)
      return json({ error: 'Multipart upload failed.' }, 500)
    }
  }
}
