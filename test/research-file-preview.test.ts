import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  open,
  readFile,
  realpath,
  rm,
  stat,
  symlink,
  writeFile
} from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { Readable } from 'node:stream'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  FileResearchPreviewAuthorizationStorage,
  HarnessWorkspaceFileResolver,
  RESEARCH_PREVIEW_CSP,
  ResearchFilePreviewRegistry,
  handleResearchFilePreviewProtocolRequest,
  registerResearchFilePreviewHandlers,
  researchPreviewAuthorizationStoragePath,
  type ResearchPreviewAuthorizationStorage,
  type ResearchPreviewFileSystem,
  type ResearchPreviewAuthorizationRecord,
  type ResearchFilePreviewDescriptor
} from '../src/main/state/research-file-preview'

const temporaryDirectories: string[] = []

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), 'sherlock-preview-'))
  temporaryDirectories.push(directory)
  return directory
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) =>
    rm(directory, { recursive: true, force: true })
  ))
})

const pngBytes = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52
])

function deterministicIds(...ids: string[]): () => string {
  const values = [...ids]
  return () => {
    const value = values.shift()
    if (value === undefined) throw new Error('Test random id sequence exhausted.')
    return value
  }
}

async function fixture(options?: { now?: () => number; ttlMs?: number }) {
  const root = await temporaryDirectory()
  const userData = path.join(root, 'user-data')
  const dshHome = path.join(root, 'harness')
  const workspace = path.join(root, 'workspace')
  await mkdir(workspace, { recursive: true })
  await mkdir(path.join(dshHome, 'storages'), { recursive: true })
  await writeFile(path.join(dshHome, 'storages', 'workspace.json'), JSON.stringify({
    unit: { name: 'workspace', version: 2 },
    global: { initialized: true, workspaceIds: ['workspace-1'], archivedSessionIds: [] },
    tables: {
      workspaces: {
        'workspace-1': {
          path: workspace,
          title: 'Research',
          sessionIds: ['session-1']
        }
      }
    }
  }))
  const registry = new ResearchFilePreviewRegistry({
    storage: new FileResearchPreviewAuthorizationStorage(userData),
    workspaceResolver: new HarnessWorkspaceFileResolver(dshHome),
    randomId: deterministicIds(
      'authorization_0000000000000001',
      'capability_0000000000000001',
      'authorization_0000000000000002',
      'capability_0000000000000002',
      'authorization_0000000000000003',
      'capability_0000000000000003',
      'authorization_0000000000000004',
      'capability_0000000000000004'
    ),
    now: options?.now,
    capabilityTtlMs: options?.ttlMs
  })
  return { dshHome, registry, root, userData, workspace }
}

async function body(response: Response): Promise<Buffer> {
  return Buffer.from(await response.arrayBuffer())
}

function expectDescriptor(value: ResearchFilePreviewDescriptor | null): asserts value is ResearchFilePreviewDescriptor {
  expect(value).not.toBeNull()
  expect(value?.authorizationId).toMatch(/^authorization_/)
  expect(value?.url).toMatch(/^sherlock-preview:\/\/capability_[a-z0-9_]+\/$/)
}

class ControllableAuthorizationStorage implements ResearchPreviewAuthorizationStorage {
  records: ResearchPreviewAuthorizationRecord[] = []
  failWrites = false

  load(): ResearchPreviewAuthorizationRecord[] {
    return this.records.map((record) => ({ ...record }))
  }

  save(records: readonly ResearchPreviewAuthorizationRecord[]): boolean {
    if (this.failWrites) return false
    this.records = records.map((record) => ({ ...record }))
    return true
  }
}

function countingRealFileSystem() {
  let reads = 0
  const fileSystem: ResearchPreviewFileSystem = {
    async realpath(targetPath) {
      reads += 1
      return realpath(targetPath)
    },
    async stat(targetPath) {
      reads += 1
      return stat(targetPath)
    },
    async readSlice(targetPath, start, endInclusive) {
      reads += 1
      const handle = await open(targetPath, 'r')
      try {
        const result = Buffer.allocUnsafe(Math.max(0, endInclusive - start + 1))
        const { bytesRead } = await handle.read(result, 0, result.length, start)
        return result.subarray(0, bytesRead)
      } finally {
        await handle.close()
      }
    },
    stream(targetPath, start, endInclusive) {
      reads += 1
      return Readable.toWeb(createReadStream(targetPath, {
        start,
        end: endInclusive
      })) as ReadableStream<Uint8Array>
    }
  }
  return {
    fileSystem,
    reads: () => reads,
    reset: () => { reads = 0 }
  }
}

describe('Research file preview authorization registry', () => {
  it('releases only the exact ephemeral capability and keeps durable authorization restorable', async () => {
    const { registry, root } = await fixture()
    const filePath = path.join(root, 'ephemeral.png')
    await writeFile(filePath, pngBytes)
    const admitted = await registry.admitFinder({
      path: filePath, sessionId: 'session-1', nodeId: 'node-ephemeral'
    })
    expectDescriptor(admitted)
    expect(admitted.capabilityToken).toBe('capability_0000000000000001')

    expect(registry.releaseCapability({
      sessionId: 'session-1', nodeId: 'node-ephemeral',
      authorizationId: admitted.authorizationId,
      capabilityToken: admitted.capabilityToken
    })).toBe(true)
    expect((await registry.handle(new Request(admitted.url))).status).toBe(403)

    const restored = await registry.restore({
      sessionId: 'session-1', nodeId: 'node-ephemeral',
      authorizationId: admitted.authorizationId
    })
    expect(restored).not.toBeNull()
    if (restored === null) return
    expect(restored.capabilityToken).not.toBe(admitted.capabilityToken)
    expect((await registry.handle(new Request(restored.url))).status).toBe(200)
    expect(registry.releaseCapability({
      sessionId: 'wrong-session', nodeId: 'node-ephemeral',
      authorizationId: restored.authorizationId,
      capabilityToken: restored.capabilityToken
    })).toBe(false)
    expect((await registry.handle(new Request(restored.url))).status).toBe(200)
  })
  it('admits a real Finder file and exposes only opaque authorization data', async () => {
    const { registry, root } = await fixture()
    const filePath = path.join(root, 'private', 'portrait.png')
    await mkdir(path.dirname(filePath), { recursive: true })
    await writeFile(filePath, pngBytes)

    const descriptor = await registry.admitFinder({
      path: filePath,
      sessionId: 'session-1',
      nodeId: 'node-1'
    })

    expectDescriptor(descriptor)
    expect(descriptor).toEqual({
      authorizationId: 'authorization_0000000000000001',
      capabilityToken: 'capability_0000000000000001',
      url: 'sherlock-preview://capability_0000000000000001/',
      contentType: 'image/png',
      name: 'portrait.png'
    })
    expect(JSON.stringify(descriptor)).not.toContain(root)
    expect(JSON.stringify(descriptor)).not.toContain('portrait.png/')
  })

  it('rejects empty, relative, directory, unsupported, and magic-mismatched Finder paths', async () => {
    const { registry, root } = await fixture()
    const directory = path.join(root, 'folder')
    const unsupported = path.join(root, 'notes.txt')
    const disguised = path.join(root, 'fake.png')
    await mkdir(directory)
    await writeFile(unsupported, 'notes')
    await writeFile(disguised, 'not a png')

    for (const candidate of ['', 'relative.png', directory, unsupported, disguised]) {
      await expect(registry.admitFinder({
        path: candidate,
        sessionId: 'session-1',
        nodeId: 'node-1'
      })).resolves.toBeNull()
    }
  })

  it('resolves sidebar identity from the main-owned workspace map and fences it by realpath', async () => {
    const { registry, root, workspace } = await fixture()
    const image = path.join(workspace, 'assets', 'chart.png')
    const outside = path.join(root, 'private.png')
    await mkdir(path.dirname(image), { recursive: true })
    await writeFile(image, pngBytes)
    await writeFile(outside, pngBytes)

    const descriptor = await registry.admitSidebar({
      sessionId: 'session-1',
      nodeId: 'node-sidebar',
      relativePath: 'assets/chart.png'
    })
    expectDescriptor(descriptor)

    await expect(registry.admitSidebar({
      sessionId: 'session-1',
      nodeId: 'node-traversal',
      relativePath: '../private.png'
    })).resolves.toBeNull()
    await expect(registry.admitSidebar({
      sessionId: 'session-1',
      nodeId: 'node-absolute',
      relativePath: outside
    })).resolves.toBeNull()
    await expect(registry.admitSidebar({
      sessionId: 'missing-session',
      nodeId: 'node-missing-session',
      relativePath: 'assets/chart.png'
    })).resolves.toBeNull()

    const escape = path.join(workspace, 'assets', 'escape.png')
    await symlink(outside, escape)
    await expect(registry.admitSidebar({
      sessionId: 'session-1',
      nodeId: 'node-symlink',
      relativePath: 'assets/escape.png'
    })).resolves.toBeNull()
  })

  it('persists bounded authorizations with mode 0600 and restores with a fresh capability', async () => {
    const root = await temporaryDirectory()
    const userData = path.join(root, 'user-data')
    const filePath = path.join(root, 'portrait.png')
    await writeFile(filePath, pngBytes)
    const storage = new FileResearchPreviewAuthorizationStorage(userData)
    const first = new ResearchFilePreviewRegistry({
      storage,
      randomId: deterministicIds(
        'authorization_0000000000000001',
        'capability_0000000000000001'
      )
    })
    const admitted = await first.admitFinder({
      path: filePath,
      sessionId: 'session-1',
      nodeId: 'node-1'
    })
    expectDescriptor(admitted)

    const storagePath = researchPreviewAuthorizationStoragePath(userData)
    expect((await lstat(storagePath)).mode & 0o777).toBe(0o600)
    const persisted = await readFile(storagePath, 'utf8')
    expect(persisted.length).toBeLessThan(1024 * 1024)
    expect(persisted).not.toContain('capability_')

    const restoredRegistry = new ResearchFilePreviewRegistry({
      storage: new FileResearchPreviewAuthorizationStorage(userData),
      randomId: deterministicIds('capability_0000000000000002')
    })
    const restored = await restoredRegistry.restore({
      authorizationId: admitted.authorizationId,
      sessionId: 'session-1',
      nodeId: 'node-1'
    })
    expectDescriptor(restored)
    expect(restored.authorizationId).toBe(admitted.authorizationId)
    expect(restored.url).toBe('sherlock-preview://capability_0000000000000002/')
    expect(restored.url).not.toBe(admitted.url)
    await expect(restoredRegistry.restore({
      authorizationId: admitted.authorizationId,
      sessionId: 'session-other',
      nodeId: 'node-1'
    })).resolves.toBeNull()
  })

  it('fails closed on an oversized or world-readable authorization registry', async () => {
    const root = await temporaryDirectory()
    const userData = path.join(root, 'user-data')
    const storagePath = researchPreviewAuthorizationStoragePath(userData)
    await mkdir(path.dirname(storagePath), { recursive: true })
    await writeFile(storagePath, 'x'.repeat(1024 * 1024 + 1), { mode: 0o644 })

    const registry = new ResearchFilePreviewRegistry({
      storage: new FileResearchPreviewAuthorizationStorage(userData),
      randomId: deterministicIds('capability_0000000000000001')
    })
    await expect(registry.restore({
      authorizationId: 'authorization_0000000000000001',
      sessionId: 'session-1',
      nodeId: 'node-1'
    })).resolves.toBeNull()

    await writeFile(storagePath, JSON.stringify({ version: 1, authorizations: [] }), { mode: 0o644 })
    await chmod(storagePath, 0o644)
    const secureReload = new FileResearchPreviewAuthorizationStorage(userData)
    expect((await lstat(storagePath)).mode & 0o777).toBe(0o600)
    expect(secureReload.load()).toEqual([])
  })

  it('expires ephemeral tokens and revokes capabilities by authorization, node, and session', async () => {
    let now = 10_000
    const { registry, root } = await fixture({ now: () => now, ttlMs: 100 })
    const firstPath = path.join(root, 'first.png')
    const secondPath = path.join(root, 'second.png')
    const thirdPath = path.join(root, 'third.png')
    await Promise.all([
      writeFile(firstPath, pngBytes),
      writeFile(secondPath, pngBytes),
      writeFile(thirdPath, pngBytes)
    ])
    const first = await registry.admitFinder({ path: firstPath, sessionId: 'session-1', nodeId: 'node-1' })
    const second = await registry.admitFinder({ path: secondPath, sessionId: 'session-1', nodeId: 'node-2' })
    const third = await registry.admitFinder({ path: thirdPath, sessionId: 'session-2', nodeId: 'node-3' })
    expectDescriptor(first)
    expectDescriptor(second)
    expectDescriptor(third)

    expect((await registry.handle(new Request(first.url))).status).toBe(200)
    now = 10_101
    expect((await registry.handle(new Request(first.url))).status).toBe(403)

    registry.revokeAuthorization(second.authorizationId)
    expect((await registry.handle(new Request(second.url))).status).toBe(403)
    await expect(registry.restore({
      authorizationId: second.authorizationId,
      sessionId: 'session-1',
      nodeId: 'node-2'
    })).resolves.toBeNull()

    const fourth = await registry.admitFinder({
      path: firstPath,
      sessionId: 'session-1',
      nodeId: 'node-4'
    })
    expectDescriptor(fourth)
    registry.revokeNode('session-1', 'node-4')
    expect((await registry.handle(new Request(fourth.url))).status).toBe(403)

    registry.revokeSession('session-2')
    expect((await registry.handle(new Request(third.url))).status).toBe(403)
  })

  it('atomically replaces stale durable authorization when the same node is re-admitted', async () => {
    const root = await temporaryDirectory()
    const firstPath = path.join(root, 'first.png')
    const secondPath = path.join(root, 'second.png')
    await Promise.all([writeFile(firstPath, pngBytes), writeFile(secondPath, pngBytes)])
    const storage = new ControllableAuthorizationStorage()
    const registry = new ResearchFilePreviewRegistry({
      storage,
      randomId: deterministicIds(
        'authorization_0000000000000001', 'capability_0000000000000001',
        'authorization_0000000000000002', 'capability_0000000000000002',
        'capability_0000000000000003'
      )
    })
    const first = await registry.admitFinder({
      path: firstPath, sessionId: 'session-1', nodeId: 'node-1'
    })
    const second = await registry.admitFinder({
      path: secondPath, sessionId: 'session-1', nodeId: 'node-1'
    })
    expectDescriptor(first)
    expectDescriptor(second)
    expect(storage.records).toHaveLength(1)
    expect(storage.records[0]?.authorizationId).toBe(second.authorizationId)
    expect((await registry.handle(new Request(first.url))).status).toBe(403)
    await expect(registry.restore({
      sessionId: 'session-1', nodeId: 'node-1', authorizationId: first.authorizationId
    })).resolves.toBeNull()
    await expect(registry.restore({
      sessionId: 'session-1', nodeId: 'node-1', authorizationId: second.authorizationId
    })).resolves.not.toBeNull()
  })

  it.each([
    {
      label: 'authorization',
      revoke: (registry: ResearchFilePreviewRegistry, descriptor: ResearchFilePreviewDescriptor) =>
        registry.revokeAuthorization(descriptor.authorizationId)
    },
    {
      label: 'node',
      revoke: (registry: ResearchFilePreviewRegistry) =>
        registry.revokeNode('session-1', 'node-1')
    },
    {
      label: 'session',
      revoke: (registry: ResearchFilePreviewRegistry) =>
        registry.revokeSession('session-1')
    }
  ])('keeps $label revocation transactional across storage failure and restart', async ({ revoke }) => {
    const root = await temporaryDirectory()
    const filePath = path.join(root, 'portrait.png')
    await writeFile(filePath, pngBytes)
    const storage = new ControllableAuthorizationStorage()
    const registry = new ResearchFilePreviewRegistry({
      storage,
      randomId: deterministicIds(
        'authorization_0000000000000001',
        'capability_0000000000000001'
      )
    })
    const descriptor = await registry.admitFinder({
      path: filePath,
      sessionId: 'session-1',
      nodeId: 'node-1'
    })
    expectDescriptor(descriptor)
    expect(storage.records).toHaveLength(1)

    storage.failWrites = true
    expect(revoke(registry, descriptor)).toBe(false)
    expect(storage.records).toHaveLength(1)
    expect((await registry.handle(new Request(descriptor.url))).status).toBe(200)

    const restartAfterFailure = new ResearchFilePreviewRegistry({
      storage,
      randomId: deterministicIds('capability_0000000000000002')
    })
    await expect(restartAfterFailure.restore({
      authorizationId: descriptor.authorizationId,
      sessionId: 'session-1',
      nodeId: 'node-1'
    })).resolves.toMatchObject({
      authorizationId: descriptor.authorizationId,
      url: 'sherlock-preview://capability_0000000000000002/'
    })

    storage.failWrites = false
    expect(revoke(registry, descriptor)).toBe(true)
    expect(storage.records).toHaveLength(0)
    expect((await registry.handle(new Request(descriptor.url))).status).toBe(403)

    const restartAfterSuccess = new ResearchFilePreviewRegistry({
      storage,
      randomId: deterministicIds('unused_capability_0000000000000003')
    })
    await expect(restartAfterSuccess.restore({
      authorizationId: descriptor.authorizationId,
      sessionId: 'session-1',
      nodeId: 'node-1'
    })).resolves.toBeNull()
  })
})

describe('sherlock-preview protocol responses', () => {
  it('serves GET and HEAD with immutable security headers and accurate content metadata', async () => {
    const { registry, root } = await fixture()
    const filePath = path.join(root, 'report.pdf')
    const bytes = Buffer.from('%PDF-1.7\nbody\n%%EOF')
    await writeFile(filePath, bytes)
    const descriptor = await registry.admitFinder({ path: filePath, sessionId: 'session-1', nodeId: 'pdf-1' })
    expectDescriptor(descriptor)

    const response = await registry.handle(new Request(descriptor.url))
    expect(response.status).toBe(200)
    expect(await body(response)).toEqual(bytes)
    expect(response.headers.get('content-type')).toBe('application/pdf')
    expect(response.headers.get('content-length')).toBe(String(bytes.length))
    expect(response.headers.get('accept-ranges')).toBe('bytes')
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    expect(response.headers.get('content-security-policy')).toBe(RESEARCH_PREVIEW_CSP)

    const head = await registry.handle(new Request(descriptor.url, { method: 'HEAD' }))
    expect(head.status).toBe(200)
    expect(head.headers.get('content-length')).toBe(String(bytes.length))
    expect(await body(head)).toHaveLength(0)
  })

  it('serves valid byte ranges and rejects malformed, multiple, or unsatisfiable ranges', async () => {
    const { registry, root } = await fixture()
    const filePath = path.join(root, 'report.pdf')
    const bytes = Buffer.from('%PDF-1234567890')
    await writeFile(filePath, bytes)
    const descriptor = await registry.admitFinder({ path: filePath, sessionId: 'session-1', nodeId: 'pdf-1' })
    expectDescriptor(descriptor)

    const first = await registry.handle(new Request(descriptor.url, {
      headers: { Range: 'bytes=0-3' }
    }))
    expect(first.status).toBe(206)
    expect(first.headers.get('content-range')).toBe(`bytes 0-3/${bytes.length}`)
    expect(first.headers.get('content-length')).toBe('4')
    expect(await body(first)).toEqual(bytes.subarray(0, 4))

    const openEnded = await registry.handle(new Request(descriptor.url, {
      headers: { Range: 'bytes=5-' }
    }))
    expect(openEnded.status).toBe(206)
    expect(openEnded.headers.get('content-range')).toBe(`bytes 5-${bytes.length - 1}/${bytes.length}`)
    expect(await body(openEnded)).toEqual(bytes.subarray(5))

    const suffix = await registry.handle(new Request(descriptor.url, {
      headers: { Range: 'bytes=-4' }
    }))
    expect(suffix.status).toBe(206)
    expect(await body(suffix)).toEqual(bytes.subarray(-4))

    for (const range of ['bytes=999-', 'bytes=8-3', 'bytes=0-1,3-4', 'items=0-1']) {
      const invalid = await registry.handle(new Request(descriptor.url, {
        headers: { Range: range }
      }))
      expect(invalid.status, range).toBe(416)
      expect(invalid.headers.get('content-range'), range).toBe(`bytes */${bytes.length}`)
    }
  })

  it('fails closed for unknown URLs, unsupported methods, missing files, directories, and changed magic bytes', async () => {
    const { registry, root } = await fixture()
    const filePath = path.join(root, 'portrait.png')
    await writeFile(filePath, pngBytes)
    const descriptor = await registry.admitFinder({ path: filePath, sessionId: 'session-1', nodeId: 'image-1' })
    expectDescriptor(descriptor)

    expect((await registry.handle(new Request('sherlock-preview://unknown_capability/'))).status)
      .toBe(403)
    expect((await registry.handle(new Request(descriptor.url, { method: 'POST' }))).status)
      .toBe(405)

    await writeFile(filePath, 'not a png')
    expect((await registry.handle(new Request(descriptor.url))).status).toBe(415)

    await rm(filePath)
    expect((await registry.handle(new Request(descriptor.url))).status).toBe(404)
    await mkdir(filePath)
    expect((await registry.handle(new Request(descriptor.url))).status).toBe(404)
  })

  it('serves HTML relative CSS, image, and script resources inside one realpath-fenced root', async () => {
    const { registry, root } = await fixture()
    const site = path.join(root, 'site')
    const outside = path.join(root, 'outside.js')
    await mkdir(path.join(site, 'assets'), { recursive: true })
    await writeFile(path.join(site, 'index.html'), '<!doctype html><html><head><link rel="stylesheet" href="assets/site.css"><script src="assets/site.js"></script></head><body><img src="assets/logo.png"></body></html>')
    await writeFile(path.join(site, 'assets', 'site.css'), 'body { color: black; }')
    await writeFile(path.join(site, 'assets', 'site.js'), 'document.body.dataset.ready = "yes"')
    await writeFile(path.join(site, 'assets', 'logo.png'), pngBytes)
    await writeFile(outside, 'window.secret = true')
    await symlink(outside, path.join(site, 'assets', 'escape.js'))

    const descriptor = await registry.admitFinder({
      path: path.join(site, 'index.html'),
      sessionId: 'session-1',
      nodeId: 'html-1'
    })
    expectDescriptor(descriptor)

    const html = await registry.handle(new Request(descriptor.url))
    expect(html.status).toBe(200)
    expect(html.headers.get('content-type')).toBe('text/html; charset=utf-8')
    const csp = html.headers.get('content-security-policy') ?? ''
    expect(csp).toContain("script-src 'none'")
    expect(csp).toContain("frame-src 'none'")
    expect(csp).not.toContain("frame-ancestors 'none'")
    expect((await body(html)).toString()).toContain('<!doctype html>')

    const css = await registry.handle(new Request(new URL('assets/site.css', descriptor.url)))
    expect(css.status).toBe(200)
    expect(css.headers.get('content-type')).toBe('text/css; charset=utf-8')
    const image = await registry.handle(new Request(new URL('assets/logo.png', descriptor.url)))
    expect(image.status).toBe(200)
    expect(image.headers.get('content-type')).toBe('image/png')
    const script = await registry.handle(new Request(new URL('assets/site.js', descriptor.url)))
    expect(script.status).toBe(200)
    expect(script.headers.get('content-type')).toBe('text/javascript; charset=utf-8')
    const escaped = await registry.handle(new Request(new URL('assets/escape.js', descriptor.url)))
    expect(escaped.status).toBe(403)
    const unsupported = await registry.handle(new Request(new URL('assets/notes.txt', descriptor.url)))
    expect(unsupported.status).toBe(404)

    for (const suffix of [
      '%2e%2e%2foutside.js',
      '%2Fetc%2Fpasswd',
      'assets%5cescape.js',
      'assets/%00site.js'
    ]) {
      const malformed = await registry.handle({
        url: `${descriptor.url}${suffix}`,
        method: 'GET',
        headers: new Headers()
      } as Request)
      expect(malformed.status, suffix).toBe(403)
    }
  })

  it('allows only the current trusted main-window origin and rejects other origins before file access', async () => {
    const root = await temporaryDirectory()
    const filePath = path.join(root, 'portrait.png')
    await writeFile(filePath, pngBytes)
    const access = countingRealFileSystem()
    const registry = new ResearchFilePreviewRegistry({
      storage: new ControllableAuthorizationStorage(),
      fileSystem: access.fileSystem,
      randomId: deterministicIds(
        'authorization_0000000000000001',
        'capability_0000000000000001'
      )
    })
    const descriptor = await registry.admitFinder({
      path: filePath,
      sessionId: 'session-1',
      nodeId: 'node-1'
    })
    expectDescriptor(descriptor)

    let mainWindowUrl = 'http://127.0.0.1:45821/research'
    const getMainWindow = () => ({
      isDestroyed: () => false,
      webContents: { getURL: () => mainWindowUrl }
    })
    const request = (origin?: string) => handleResearchFilePreviewProtocolRequest(
      registry,
      getMainWindow,
      new Request(descriptor.url, origin ? { headers: { Origin: origin } } : undefined)
    )

    access.reset()
    const allowed = await request('http://127.0.0.1:45821')
    expect(allowed.status).toBe(200)
    expect(allowed.headers.get('access-control-allow-origin')).toBe('http://127.0.0.1:45821')
    expect(allowed.headers.get('vary')).toBe('Origin')
    expect(allowed.headers.get('access-control-expose-headers')).toBe(
      'Accept-Ranges, Content-Length, Content-Range, Content-Type'
    )
    expect(await body(allowed)).toEqual(pngBytes)

    for (const deniedOrigin of [
      'http://127.0.0.1:45822',
      'https://attacker.example'
    ]) {
      access.reset()
      const denied = await request(deniedOrigin)
      expect(denied.status, deniedOrigin).toBe(403)
      expect(denied.headers.get('access-control-allow-origin'), deniedOrigin).toBeNull()
      expect(access.reads(), deniedOrigin).toBe(0)
    }

    access.reset()
    const navigation = await request()
    expect(navigation.status).toBe(200)
    expect(navigation.headers.get('access-control-allow-origin')).toBeNull()
    expect(await body(navigation)).toEqual(pngBytes)

    mainWindowUrl = 'https://attacker.example/research'
    access.reset()
    expect((await request('https://attacker.example')).status).toBe(403)
    expect(access.reads()).toBe(0)
  })

  it.each([
    {
      label: 'missing main window',
      method: 'GET',
      window: undefined
    },
    {
      label: 'destroyed main window',
      method: 'HEAD',
      window: {
        isDestroyed: () => true,
        webContents: { getURL: () => 'http://127.0.0.1:45821/research' }
      }
    },
    {
      label: 'external HTTP page',
      method: 'GET',
      window: {
        isDestroyed: () => false,
        webContents: { getURL: () => 'http://example.com/research' }
      }
    },
    {
      label: 'local file page',
      method: 'GET',
      window: {
        isDestroyed: () => false,
        webContents: { getURL: () => 'file:///Applications/Sherlock/splash.html' }
      }
    },
    {
      label: 'recovery page',
      method: 'HEAD',
      window: {
        isDestroyed: () => false,
        webContents: { getURL: () => 'dsh-recovery://plugin-error/' }
      }
    },
    {
      label: 'non-Harness HTTPS page',
      method: 'HEAD',
      window: {
        isDestroyed: () => false,
        webContents: { getURL: () => 'https://127.0.0.1:45821/research' }
      }
    }
  ])('rejects a no-Origin $method before file access for $label', async ({ method, window }) => {
    const root = await temporaryDirectory()
    const filePath = path.join(root, 'portrait.png')
    await writeFile(filePath, pngBytes)
    const access = countingRealFileSystem()
    const registry = new ResearchFilePreviewRegistry({
      storage: new ControllableAuthorizationStorage(),
      fileSystem: access.fileSystem,
      randomId: deterministicIds(
        'authorization_0000000000000001',
        'capability_0000000000000001'
      )
    })
    const descriptor = await registry.admitFinder({
      path: filePath,
      sessionId: 'session-1',
      nodeId: 'node-1'
    })
    expectDescriptor(descriptor)

    access.reset()
    const response = await handleResearchFilePreviewProtocolRequest(
      registry,
      () => window,
      new Request(descriptor.url, { method })
    )
    expect(response.status).toBe(403)
    expect(access.reads()).toBe(0)
  })

  it('answers a narrow Range preflight and exposes range metadata to the allowed origin', async () => {
    const { registry, root } = await fixture()
    const filePath = path.join(root, 'report.pdf')
    const bytes = Buffer.from('%PDF-1234567890')
    await writeFile(filePath, bytes)
    const descriptor = await registry.admitFinder({
      path: filePath,
      sessionId: 'session-1',
      nodeId: 'pdf-1'
    })
    expectDescriptor(descriptor)
    const getMainWindow = () => ({
      isDestroyed: () => false,
      webContents: { getURL: () => 'http://localhost:46317/research' }
    })

    const preflight = await handleResearchFilePreviewProtocolRequest(
      registry,
      getMainWindow,
      new Request(descriptor.url, {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://localhost:46317',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Range'
        }
      })
    )
    expect(preflight.status).toBe(204)
    expect(preflight.headers.get('access-control-allow-origin')).toBe('http://localhost:46317')
    expect(preflight.headers.get('access-control-allow-methods')).toBe('GET, HEAD, OPTIONS')
    expect(preflight.headers.get('access-control-allow-headers')).toBe('Range')
    expect(preflight.headers.get('vary')).toBe('Origin')

    const range = await handleResearchFilePreviewProtocolRequest(
      registry,
      getMainWindow,
      new Request(descriptor.url, {
        headers: {
          Origin: 'http://localhost:46317',
          Range: 'bytes=0-3'
        }
      })
    )
    expect(range.status).toBe(206)
    expect(range.headers.get('content-range')).toBe(`bytes 0-3/${bytes.length}`)
    expect(range.headers.get('access-control-allow-origin')).toBe('http://localhost:46317')
    expect(range.headers.get('access-control-expose-headers')).toContain('Content-Range')
    expect(await body(range)).toEqual(bytes.subarray(0, 4))
  })
})

describe('Research preview privileged IPC registration', () => {
  it('invokes the production handlers only for the trusted main frame', async () => {
    const { registry, root } = await fixture()
    const filePath = path.join(root, 'portrait.png')
    await writeFile(filePath, pngBytes)
    const mainFrame = { processId: 9, routingId: 12 }
    const webContents = { mainFrame }
    const window = { isDestroyed: () => false, webContents }
    const handlers = new Map<string, (event: any, value: unknown) => unknown>()
    const ipcMain = {
      removeHandler: vi.fn(),
      handle(channel: string, handler: (event: any, value: unknown) => unknown) {
        handlers.set(channel, handler)
      }
    }
    registerResearchFilePreviewHandlers({
      ipcMain,
      getMainWindow: () => window,
      registry
    })

    const finder = handlers.get('research:preview:admit-finder')
    expect(finder).toBeTypeOf('function')
    const trusted = { sender: webContents, senderFrame: mainFrame }
    const child = { sender: webContents, senderFrame: { processId: 9, routingId: 13 } }
    await expect(Promise.resolve().then(() => finder?.(child, {
      path: filePath,
      sessionId: 'session-1',
      nodeId: 'node-1'
    }))).rejects.toThrow('main Sherlock window')
    const descriptor = await finder?.(trusted, {
      path: filePath,
      sessionId: 'session-1',
      nodeId: 'node-1'
    }) as ResearchFilePreviewDescriptor
    expect(descriptor).toMatchObject({
      authorizationId: 'authorization_0000000000000001',
      contentType: 'image/png'
    })
    const release = handlers.get('research:preview:release')
    expect(release).toBeTypeOf('function')
    await expect(Promise.resolve().then(() => release?.(child, {
      sessionId: 'session-1', nodeId: 'node-1',
      authorizationId: descriptor.authorizationId,
      capabilityToken: descriptor.capabilityToken
    }))).rejects.toThrow('main Sherlock window')
    expect(await release?.(trusted, {
      sessionId: 'session-1', nodeId: 'node-1',
      authorizationId: descriptor.authorizationId,
      capabilityToken: descriptor.capabilityToken
    })).toEqual({ ok: true })
    expect(await registry.restore({
      sessionId: 'session-1', nodeId: 'node-1',
      authorizationId: descriptor.authorizationId
    })).not.toBeNull()
  })
})
