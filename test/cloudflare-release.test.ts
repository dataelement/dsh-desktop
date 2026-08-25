import { execFile as execFileCallback } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { afterEach, describe, expect, it } from 'vitest'
import { parse, stringify } from 'yaml'
import { buildCloudflareReleasePlan } from '../scripts/cloudflare-release-plan.mjs'
import {
  WRANGLER_MAX_UPLOAD_BYTES,
  assertMultipartReleaseKey,
  copyR2Object,
  selectUploadTransport,
  uploadFileMultipart,
  validateExistingImmutableResponse
} from '../scripts/cloudflare-r2-multipart-client.mjs'
import { refreshMacUpdateMetadata } from '../scripts/refresh-mac-update-metadata.mjs'
import multipartWorker from '../scripts/cloudflare-r2-multipart-worker.mjs'

const temporaryRoots: string[] = []
const execFile = promisify(execFileCallback)
const projectRoot = path.resolve(import.meta.dirname, '..')

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true })))
})

async function fixture(): Promise<{ assets: string; prepared: string }> {
  const root = await mkdtemp(path.join(tmpdir(), 'sherlock-cloudflare-release-'))
  temporaryRoots.push(root)
  const assets = path.join(root, 'release-assets')
  const prepared = path.join(root, 'release-cloudflare')
  await mkdir(assets)

  await Promise.all([
    writeFile(path.join(assets, 'sherlock-mac-arm64.zip'), 'arm zip'),
    writeFile(path.join(assets, 'sherlock-mac-arm64.zip.blockmap'), 'arm blockmap'),
    writeFile(path.join(assets, 'sherlock-mac-arm64.dmg'), 'arm dmg'),
    writeFile(path.join(assets, 'sherlock-windows-x64-setup.exe'), 'windows exe'),
    writeFile(path.join(assets, 'sherlock-windows-x64-setup.exe.blockmap'), 'windows blockmap'),
    writeFile(
      path.join(assets, 'latest-mac.yml'),
      stringify({
        version: '0.6.0',
        files: [{ url: 'sherlock-mac-arm64.zip', sha512: 'arm-sha', size: 7 }],
        path: 'sherlock-mac-arm64.zip',
        sha512: 'arm-sha'
      })
    ),
    writeFile(
      path.join(assets, 'latest.yml'),
      stringify({
        version: '0.6.0',
        files: [
          { url: 'sherlock-windows-x64-setup.exe', sha512: 'win-sha', size: 11 }
        ],
        path: 'sherlock-windows-x64-setup.exe',
        sha512: 'win-sha'
      })
    )
  ])
  return { assets, prepared }
}

describe('Cloudflare release plan', () => {
  it('routes only files above Wranglers 300 MiB limit through multipart upload', () => {
    expect(selectUploadTransport(WRANGLER_MAX_UPLOAD_BYTES)).toBe('wrangler')
    expect(selectUploadTransport(WRANGLER_MAX_UPLOAD_BYTES + 1)).toBe('multipart')
  })

  it('limits multipart writes to the current release payloads and stable DMG', () => {
    expect(() =>
      assertMultipartReleaseKey('releases/v0.6.8/sherlock-mac-arm64.zip', '0.6.8')
    ).not.toThrow()
    expect(() =>
      assertMultipartReleaseKey('releases/v0.6.8/sherlock-mac-arm64-legacy.zip', '0.6.8')
    ).not.toThrow()
    expect(() =>
      assertMultipartReleaseKey('download/sherlock-mac-arm64.dmg', '0.6.8')
    ).not.toThrow()
    expect(() =>
      assertMultipartReleaseKey('releases/v0.6.7/sherlock-mac-arm64.zip', '0.6.8')
    ).toThrow('current release')
    expect(() => assertMultipartReleaseKey('latest/latest-mac.yml', '0.6.8')).toThrow(
      'release payload'
    )
  })

  it('resumes only byte-identical immutable objects with immutable caching', () => {
    const matching = new Response(null, {
      status: 200,
      headers: {
        'content-length': '442072706',
        'cache-control': 'public, max-age=31536000, immutable'
      }
    })
    expect(() =>
      validateExistingImmutableResponse({
        key: 'releases/v0.6.8/sherlock-mac-arm64-legacy.zip',
        localSize: 442072706,
        response: matching
      })
    ).not.toThrow()
    expect(() =>
      validateExistingImmutableResponse({
        key: 'releases/v0.6.8/sherlock-mac-arm64-legacy.zip',
        localSize: 1,
        response: matching
      })
    ).toThrow('size mismatch')
    expect(() =>
      validateExistingImmutableResponse({
        key: 'releases/v0.6.8/sherlock-mac-arm64-legacy.zip',
        localSize: 442072706,
        response: new Response(null, {
          status: 200,
          headers: { 'content-length': '442072706', 'cache-control': 'no-cache' }
        })
      })
    ).toThrow('unsafe cache')
  })

  it('creates, uploads, and completes multipart objects in deterministic part order', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'sherlock-multipart-upload-'))
    temporaryRoots.push(root)
    const source = path.join(root, 'payload.zip')
    await writeFile(source, 'abcdefghijk')
    const calls: Array<{ method: string; path: string; body?: string }> = []

    const fetchImpl: typeof fetch = async (input, init = {}) => {
      const url = new URL(String(input))
      const body = init.body ? Buffer.from(init.body as ArrayBuffer).toString('utf8') : undefined
      calls.push({ method: init.method ?? 'GET', path: `${url.pathname}${url.search}`, body })
      if (url.pathname.endsWith('/create')) {
        return Response.json({ uploadId: 'upload-123' })
      }
      if (url.pathname.endsWith('/part')) {
        return Response.json({ etag: `etag-${url.searchParams.get('partNumber')}` })
      }
      return Response.json({ ok: true })
    }

    await uploadFileMultipart({
      endpoint: 'http://127.0.0.1:9786',
      token: 'ephemeral-token',
      version: '0.6.8',
      key: 'releases/v0.6.8/sherlock-mac-arm64.zip',
      source,
      contentType: 'application/zip',
      cacheControl: 'public, max-age=31536000, immutable',
      partSize: 5,
      concurrency: 1,
      fetchImpl
    })

    expect(calls.map((call) => call.method)).toEqual(['POST', 'PUT', 'PUT', 'PUT', 'POST'])
    expect(calls.filter((call) => call.method === 'PUT').map((call) => call.body)).toEqual([
      'abcde',
      'fghij',
      'k'
    ])
    expect(calls.at(-1)?.body).toContain('etag-3')
  })

  it('retries a failed multipart part without restarting the whole object', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'sherlock-multipart-retry-'))
    temporaryRoots.push(root)
    const source = path.join(root, 'payload.zip')
    await writeFile(source, 'retry-me')
    let partAttempts = 0
    const fetchImpl: typeof fetch = async (input) => {
      const url = new URL(String(input))
      if (url.pathname.endsWith('/create')) return Response.json({ uploadId: 'upload-123' })
      if (url.pathname.endsWith('/part')) {
        partAttempts += 1
        if (partAttempts === 1) return new Response('temporary', { status: 503 })
        return Response.json({ etag: 'etag-1' })
      }
      return Response.json({ ok: true })
    }
    await uploadFileMultipart({
      endpoint: 'http://127.0.0.1:9786',
      token: 'ephemeral-token',
      version: '0.6.8',
      key: 'releases/v0.6.8/sherlock-mac-arm64.zip',
      source,
      contentType: 'application/zip',
      cacheControl: 'public, max-age=31536000, immutable',
      partSize: 16,
      concurrency: 1,
      maxPartAttempts: 2,
      retryDelayMs: 0,
      fetchImpl
    })
    expect(partAttempts).toBe(2)
  })

  it('keeps the temporary multipart Worker token- and version-scoped', async () => {
    const created: string[] = []
    const env = {
      RELEASE_UPLOAD_TOKEN: 'ephemeral-token',
      RELEASE_VERSION: '0.6.8',
      SHERLOCK_RELEASES: {
        async createMultipartUpload(key: string) {
          created.push(key)
          return { uploadId: 'upload-123' }
        }
      }
    }
    const create = (key: string, token = 'ephemeral-token') =>
      multipartWorker.fetch(
        new Request('https://release-uploader.invalid/multipart/create', {
          method: 'POST',
          headers: {
            authorization: `Bearer ${token}`,
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            key,
            version: '0.6.8',
            contentType: 'application/zip',
            cacheControl: 'public, max-age=31536000, immutable'
          })
        }),
        env
      )

    expect((await create('releases/v0.6.8/sherlock-mac-arm64.zip', 'wrong')).status).toBe(401)
    expect((await create('releases/v0.6.7/sherlock-mac-arm64.zip')).status).toBe(400)
    expect((await create('latest/latest-mac.yml')).status).toBe(400)
    expect((await create('releases/v0.6.8/sherlock-mac-arm64.zip')).status).toBe(200)
    expect(created).toEqual(['releases/v0.6.8/sherlock-mac-arm64.zip'])
  })

  it('promotes only the current immutable DMG to the stable download key', async () => {
    const requests: Array<Record<string, unknown>> = []
    await copyR2Object({
      endpoint: 'http://127.0.0.1:9786',
      token: 'ephemeral-token',
      version: '0.6.8',
      sourceKey: 'releases/v0.6.8/sherlock-mac-arm64.dmg',
      targetKey: 'download/sherlock-mac-arm64.dmg',
      contentType: 'application/x-apple-diskimage',
      cacheControl: 'no-cache, max-age=0, must-revalidate',
      fetchImpl: async (_input, init) => {
        requests.push(JSON.parse(String(init?.body)))
        return Response.json({ ok: true })
      }
    })
    expect(requests).toEqual([
      expect.objectContaining({
        sourceKey: 'releases/v0.6.8/sherlock-mac-arm64.dmg',
        targetKey: 'download/sherlock-mac-arm64.dmg'
      })
    ])
    await expect(
      copyR2Object({
        endpoint: 'http://127.0.0.1:9786',
        token: 'ephemeral-token',
        version: '0.6.8',
        sourceKey: 'releases/v0.6.7/sherlock-mac-arm64.dmg',
        targetKey: 'download/sherlock-mac-arm64.dmg',
        contentType: 'application/x-apple-diskimage',
        cacheControl: 'no-cache',
        fetchImpl: async () => Response.json({ ok: true })
      })
    ).rejects.toThrow('current release')
  })

  it('refreshes the signed DMG hash and size before publishing metadata', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'sherlock-mac-metadata-'))
    temporaryRoots.push(root)
    const dmg = path.join(root, 'sherlock-mac-arm64.dmg')
    const metadataPath = path.join(root, 'latest-mac.yml')
    const signedDmg = Buffer.from('signed dmg contents')
    await writeFile(dmg, signedDmg)
    await writeFile(
      metadataPath,
      stringify({
        version: '0.6.0',
        files: [
          { url: 'sherlock-mac-arm64.zip', sha512: 'zip-sha', size: 7 },
          { url: 'sherlock-mac-arm64.dmg', sha512: 'pre-signing-sha', size: 1 }
        ],
        path: 'sherlock-mac-arm64.zip',
        sha512: 'zip-sha'
      })
    )

    await refreshMacUpdateMetadata({ metadataPath, dmgPath: dmg })

    const metadata = parse(await readFile(metadataPath, 'utf8')) as {
      files: Array<{ url: string; sha512: string; size: number }>
    }
    expect(metadata.files[0]).toEqual({
      url: 'sherlock-mac-arm64.zip',
      sha512: 'zip-sha',
      size: 7
    })
    expect(metadata.files[1]).toEqual({
      url: 'sherlock-mac-arm64.dmg',
      sha512: createHash('sha512').update(signedDmg).digest('base64'),
      size: signedDmg.length
    })
  })

  it('uploads immutable assets before stable downloads and metadata promotion', async () => {
    const { assets, prepared } = await fixture()
    const plan = await buildCloudflareReleasePlan({
      version: '0.6.0',
      tag: 'v0.6.0',
      assetDirectory: assets,
      outputDirectory: prepared
    })

    expect(plan.filter((item) => item.phase === 'immutable').map((item) => item.key)).toContain(
      'releases/v0.6.0/sherlock-mac-arm64.zip'
    )
    expect(plan.filter((item) => item.phase === 'stable').map((item) => item.key)).toContain(
      'download/sherlock-mac-arm64.dmg'
    )

    const metadata = parse(await readFile(path.join(prepared, 'latest-mac.yml'), 'utf8')) as {
      files: Array<{ url: string }>
      path: string
    }
    expect(metadata.files[0]?.url).toBe(
      '../releases/v0.6.0/sherlock-mac-arm64.zip'
    )
    expect(metadata.path).toBe('../releases/v0.6.0/sherlock-mac-arm64.zip')
    expect(plan.map((item) => item.phase)).toEqual([
      'immutable',
      'immutable',
      'immutable',
      'immutable',
      'immutable',
      'stable',
      'metadata',
      'metadata'
    ])
    expect(plan.at(-1)?.key).toBe('latest/latest-mac.yml')
    expect(plan.at(-1)?.cacheControl).toBe('no-cache, max-age=0, must-revalidate')
  })

  it('publishes an independent notarized macOS channel while keeping the legacy channel', async () => {
    const { assets, prepared } = await fixture()
    await Promise.all([
      writeFile(path.join(assets, 'sherlock-mac-arm64-notarized.zip'), 'notarized zip'),
      writeFile(
        path.join(assets, 'latest-mac-notarized.yml'),
        stringify({
          version: '0.6.0',
          files: [
            {
              url: 'sherlock-mac-arm64-notarized.zip',
              sha512: 'notarized-sha',
              size: 14
            }
          ],
          path: 'sherlock-mac-arm64-notarized.zip',
          sha512: 'notarized-sha'
        })
      )
    ])

    const plan = await buildCloudflareReleasePlan({
      version: '0.6.0',
      assetDirectory: assets,
      outputDirectory: prepared
    })

    expect(plan.filter((item) => item.phase === 'metadata').map((item) => item.key)).toEqual([
      'latest/latest.yml',
      'latest/latest-mac.yml',
      'notarized/latest/latest-mac.yml'
    ])
    expect(plan.filter((item) => item.phase === 'stable').map((item) => item.key)).toEqual([
      'download/sherlock-mac-arm64.dmg'
    ])
    const notarized = parse(
      await readFile(path.join(prepared, 'latest-mac-notarized.yml'), 'utf8')
    ) as { path: string }
    expect(notarized.path).toBe(
      '../../releases/v0.6.0/sherlock-mac-arm64-notarized.zip'
    )
  })

  it('rejects missing referenced files and empty hashes', async () => {
    const missing = await fixture()
    await rm(path.join(missing.assets, 'sherlock-mac-arm64.zip'))
    await expect(
      buildCloudflareReleasePlan({
        version: '0.6.0',
        assetDirectory: missing.assets,
        outputDirectory: missing.prepared
      })
    ).rejects.toThrow('missing')

    const hashless = await fixture()
    const metadataPath = path.join(hashless.assets, 'latest-mac.yml')
    const metadata = parse(await readFile(metadataPath, 'utf8'))
    metadata.files[0].sha512 = ''
    await writeFile(metadataPath, stringify(metadata))
    await expect(
      buildCloudflareReleasePlan({
        version: '0.6.0',
        assetDirectory: hashless.assets,
        outputDirectory: hashless.prepared
      })
    ).rejects.toThrow('sha512')
  })

  it('rejects tag/version mismatches and path traversal', async () => {
    const mismatch = await fixture()
    await expect(
      buildCloudflareReleasePlan({
        version: '0.6.0',
        tag: 'v0.6.1',
        assetDirectory: mismatch.assets,
        outputDirectory: mismatch.prepared
      })
    ).rejects.toThrow('tag')

    const traversal = await fixture()
    const metadataPath = path.join(traversal.assets, 'latest-mac.yml')
    const metadata = parse(await readFile(metadataPath, 'utf8'))
    metadata.files[0].url = '../private.key'
    await writeFile(metadataPath, stringify(metadata))
    await expect(
      buildCloudflareReleasePlan({
        version: '0.6.0',
        assetDirectory: traversal.assets,
        outputDirectory: traversal.prepared
      })
    ).rejects.toThrow('safe asset filename')
  })

  it('supports a credential-free dry run through the pinned publisher CLI', async () => {
    const { assets, prepared } = await fixture()
    const { stdout } = await execFile(process.execPath, [
      path.join(projectRoot, 'scripts', 'publish-cloudflare-release.mjs'),
      '--bucket',
      'sherlock-releases',
      '--version',
      '0.6.0',
      '--assets',
      assets,
      '--prepared',
      prepared,
      '--dry-run'
    ])

    const plan = JSON.parse(stdout) as Array<{ phase: string; key: string }>
    expect(plan[0]?.phase).toBe('immutable')
    expect(plan.at(-1)?.key).toBe('latest/latest-mac.yml')
  })
})
