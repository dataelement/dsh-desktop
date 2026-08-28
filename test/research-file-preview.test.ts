import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  open,
  readFile,
  realpath,
  rename,
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
import { strToU8, zipSync } from 'fflate'
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

const icoBytes = Buffer.concat([
  Buffer.from([
    0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
    0x10, 0x10, 0x00, 0x00, 0x01, 0x00, 0x20, 0x00,
    pngBytes.length, 0x00, 0x00, 0x00,
    0x16, 0x00, 0x00, 0x00
  ]),
  pngBytes
])

const avifBytes = Buffer.from([
  0x00, 0x00, 0x00, 0x18,
  0x66, 0x74, 0x79, 0x70,
  0x61, 0x76, 0x69, 0x66,
  0x00, 0x00, 0x00, 0x00,
  0x6d, 0x69, 0x66, 0x31,
  0x61, 0x76, 0x69, 0x66
])

type OfficeFamily = 'docx' | 'xlsx' | 'pptx'

const officeFamilyMarker: Record<OfficeFamily, string> = {
  docx: 'word/document.xml',
  xlsx: 'xl/workbook.xml',
  pptx: 'ppt/presentation.xml'
}

const officeContentType: Record<OfficeFamily, string> = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
}

function minimalOfficeZip(family: OfficeFamily, extra: Record<string, Uint8Array> = {}): Buffer {
  return Buffer.from(zipSync({
    '[Content_Types].xml': strToU8('<Types/>'),
    '_rels/.rels': strToU8('<Relationships/>'),
    [officeFamilyMarker[family]]: strToU8('<root/>'),
    ...extra
  }, { level: 0 }))
}

function findZipSignature(value: Buffer, signature: number, from = 0): number {
  for (let offset = from; offset <= value.length - 4; offset += 1) {
    if (value.readUInt32LE(offset) === signature) return offset
  }
  return -1
}

function mutateZip(value: Buffer, mutate: (copy: Buffer, eocd: number, central: number) => void): Buffer {
  const copy = Buffer.from(value)
  const eocd = findZipSignature(copy, 0x06054b50)
  const central = findZipSignature(copy, 0x02014b50)
  if (eocd < 0 || central < 0) throw new Error('Expected a conventional ZIP fixture.')
  mutate(copy, eocd, central)
  return copy
}

function withFirstEntryFlag(
  value: Buffer,
  flag: number,
  target: 'both' | 'local' | 'central' = 'both'
): Buffer {
  return mutateZip(value, (copy, _eocd, central) => {
    const local = copy.readUInt32LE(central + 42)
    if (target !== 'central') copy.writeUInt16LE(copy.readUInt16LE(local + 6) | flag, local + 6)
    if (target !== 'local') copy.writeUInt16LE(copy.readUInt16LE(central + 8) | flag, central + 8)
  })
}

function withZipComment(value: Buffer, comment: string): Buffer {
  const eocd = findZipSignature(value, 0x06054b50)
  if (eocd < 0) throw new Error('Expected ZIP EOCD.')
  const bytes = Buffer.from(comment, 'utf8')
  const result = Buffer.concat([value, bytes])
  result.writeUInt16LE(bytes.length, eocd + 20)
  return result
}

function withCentralDirectorySignature(value: Buffer): Buffer {
  const eocd = findZipSignature(value, 0x06054b50)
  if (eocd < 0) throw new Error('Expected ZIP EOCD.')
  const signature = Buffer.alloc(9)
  signature.writeUInt32LE(0x05054b50, 0)
  signature.writeUInt16LE(3, 4)
  signature.set(Buffer.from('sig'), 6)
  const result = Buffer.concat([value.subarray(0, eocd), signature, value.subarray(eocd)])
  const nextEocd = eocd + signature.length
  result.writeUInt32LE(value.readUInt32LE(eocd + 12) + signature.length, nextEocd + 12)
  return result
}

function withLastDataDescriptor(value: Buffer, signed: boolean): Buffer {
  const eocd = findZipSignature(value, 0x06054b50)
  if (eocd < 0) throw new Error('Expected ZIP EOCD.')
  const centralOffset = value.readUInt32LE(eocd + 16)
  const totalEntries = value.readUInt16LE(eocd + 10)
  let central = centralOffset
  let lastCentral = -1
  for (let index = 0; index < totalEntries; index += 1) {
    lastCentral = central
    central += 46 + value.readUInt16LE(central + 28) + value.readUInt16LE(central + 30) +
      value.readUInt16LE(central + 32)
  }
  const local = value.readUInt32LE(lastCentral + 42)
  const descriptor = Buffer.alloc(signed ? 16 : 12)
  let cursor = 0
  if (signed) {
    descriptor.writeUInt32LE(0x08074b50, cursor)
    cursor += 4
  }
  descriptor.writeUInt32LE(value.readUInt32LE(lastCentral + 16), cursor)
  descriptor.writeUInt32LE(value.readUInt32LE(lastCentral + 20), cursor + 4)
  descriptor.writeUInt32LE(value.readUInt32LE(lastCentral + 24), cursor + 8)
  const result = Buffer.concat([
    value.subarray(0, centralOffset),
    descriptor,
    value.subarray(centralOffset)
  ])
  const shiftedCentral = lastCentral + descriptor.length
  const shiftedEocd = eocd + descriptor.length
  result.writeUInt16LE(result.readUInt16LE(local + 6) | 0x0008, local + 6)
  result.writeUInt32LE(0, local + 14)
  result.writeUInt32LE(0, local + 18)
  result.writeUInt32LE(0, local + 22)
  result.writeUInt16LE(result.readUInt16LE(shiftedCentral + 8) | 0x0008, shiftedCentral + 8)
  result.writeUInt32LE(centralOffset + descriptor.length, shiftedEocd + 16)
  return result
}

function withUnsignedSignatureCrcDataDescriptor(value: Buffer): Buffer {
  const result = withLastDataDescriptor(value, false)
  const eocd = findZipSignature(result, 0x06054b50)
  if (eocd < 0) throw new Error('Expected ZIP EOCD.')
  const centralOffset = result.readUInt32LE(eocd + 16)
  const totalEntries = result.readUInt16LE(eocd + 10)
  let central = centralOffset
  let lastCentral = -1
  for (let index = 0; index < totalEntries; index += 1) {
    lastCentral = central
    central += 46 + result.readUInt16LE(central + 28) + result.readUInt16LE(central + 30) +
      result.readUInt16LE(central + 32)
  }
  const local = result.readUInt32LE(lastCentral + 42)
  const dataStart = local + 30 + result.readUInt16LE(local + 26) + result.readUInt16LE(local + 28)
  const descriptor = dataStart + result.readUInt32LE(lastCentral + 20)
  result.writeUInt32LE(0x08074b50, lastCentral + 16)
  result.writeUInt32LE(0x08074b50, descriptor)
  return result
}

function deterministicIds(...ids: string[]): () => string {
  const values = [...ids]
  return () => {
    const value = values.shift()
    if (value === undefined) throw new Error('Test random id sequence exhausted.')
    return value
  }
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve
    reject = promiseReject
  })
  return { promise, reject, resolve }
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

function revocationBookkeepingSize(registry: ResearchFilePreviewRegistry): number {
  return Object.entries(registry as unknown as Record<string, unknown>)
    .filter(([key, value]) => /revocation/i.test(key) && (value instanceof Map || value instanceof Set))
    .reduce((size, [, value]) => size + (value as Map<unknown, unknown> | Set<unknown>).size, 0)
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

  it.each<OfficeFamily>(['docx', 'xlsx', 'pptx'])(
    'admits a minimal valid %s package and serves bounded ranges with the exact OOXML MIME',
    async (family) => {
      const { registry, root } = await fixture()
      const bytes = minimalOfficeZip(family)
      const filePath = path.join(root, `report.${family}`)
      await writeFile(filePath, bytes)

      const descriptor = await registry.admitFinder({
        path: filePath,
        sessionId: 'session-1',
        nodeId: `office-${family}`
      })

      expectDescriptor(descriptor)
      expect(descriptor.contentType).toBe(officeContentType[family])
      const response = await registry.handle(new Request(descriptor.url, {
        headers: { Range: 'bytes=0-7' }
      }))
      expect(response.status).toBe(206)
      expect(response.headers.get('content-type')).toBe(officeContentType[family])
      expect(await body(response)).toEqual(bytes.subarray(0, 8))
    }
  )

  it.each([
    ['EOCD comment', withZipComment(minimalOfficeZip('docx'), 'Sherlock')],
    ['central directory signature', withCentralDirectorySignature(minimalOfficeZip('docx'))],
    ['signed data descriptor', withLastDataDescriptor(minimalOfficeZip('docx'), true)],
    ['unsigned data descriptor', withLastDataDescriptor(minimalOfficeZip('docx'), false)],
    ['unsigned descriptor with signature-shaped CRC', withUnsignedSignatureCrcDataDescriptor(
      minimalOfficeZip('docx')
    )],
    ['deflate option bits 1 and 2', withFirstEntryFlag(Buffer.from(zipSync({
      '[Content_Types].xml': strToU8('<Types/>'.repeat(30)),
      '_rels/.rels': strToU8('<Relationships/>'.repeat(30)),
      'word/document.xml': strToU8('<document>compressible</document>'.repeat(30))
    }, { level: 6 })), 0x0006)],
    ['deflate and UTF-8 entry', Buffer.from(zipSync({
      '[Content_Types].xml': strToU8('<Types/>'),
      '_rels/.rels': strToU8('<Relationships/>'),
      'word/document.xml': strToU8('<document>compressible compressible compressible</document>'),
      'word/备注.xml': strToU8('<note/>')
    }, { level: 6 }))]
  ])('accepts conventional DOCX ZIP compatibility: %s', async (_label, bytes) => {
    const { registry, root } = await fixture()
    const filePath = path.join(root, 'compatible.docx')
    await writeFile(filePath, bytes)
    expectDescriptor(await registry.admitFinder({
      path: filePath,
      sessionId: 'session-1',
      nodeId: 'compatible-office'
    }))
  })

  it.each([
    ['PK prefix without a central directory', Buffer.from('PK\u0003\u0004not-an-office-package')],
    ['wrong OOXML family', minimalOfficeZip('xlsx')],
    ['mixed OOXML families', minimalOfficeZip('docx', {
      'xl/workbook.xml': strToU8('<workbook/>')
    })],
    ['traversal entry', minimalOfficeZip('docx', {
      '../escape.bin': strToU8('escape')
    })],
    ['absolute entry', minimalOfficeZip('docx', {
      '/escape.bin': strToU8('escape')
    })],
    ['backslash entry', minimalOfficeZip('docx', {
      'word\\escape.bin': strToU8('escape')
    })],
    ['encrypted entry', mutateZip(minimalOfficeZip('docx'), (copy, _eocd, central) => {
      copy.writeUInt16LE(copy.readUInt16LE(central + 8) | 0x0001, central + 8)
    })],
    ['stored entry with deflate-only flag', withFirstEntryFlag(minimalOfficeZip('docx'), 0x0002)],
    ['reserved flag in LOCAL and CEN', withFirstEntryFlag(minimalOfficeZip('docx'), 0x0010)],
    ['reserved flag in LOCAL only', withFirstEntryFlag(minimalOfficeZip('docx'), 0x0010, 'local')],
    ['reserved flag in CEN only', withFirstEntryFlag(minimalOfficeZip('docx'), 0x0010, 'central')],
    ['multi-disk archive', mutateZip(minimalOfficeZip('docx'), (copy, eocd) => {
      copy.writeUInt16LE(1, eocd + 4)
    })],
    ['ZIP64 sentinel', mutateZip(minimalOfficeZip('docx'), (copy, eocd) => {
      copy.writeUInt16LE(0xffff, eocd + 10)
    })],
    ['too many entries', mutateZip(minimalOfficeZip('docx'), (copy, eocd) => {
      copy.writeUInt16LE(4097, eocd + 8)
      copy.writeUInt16LE(4097, eocd + 10)
    })],
    ['oversized central directory', mutateZip(minimalOfficeZip('docx'), (copy, eocd) => {
      copy.writeUInt32LE(8 * 1024 * 1024 + 1, eocd + 12)
    })],
    ['oversized entry declaration', mutateZip(minimalOfficeZip('docx'), (copy, _eocd, central) => {
      copy.writeUInt32LE(64 * 1024 * 1024 + 1, central + 24)
    })],
    ['excessive expansion ratio', mutateZip(minimalOfficeZip('docx'), (copy, _eocd, central) => {
      copy.writeUInt32LE(1, central + 20)
      copy.writeUInt32LE(201, central + 24)
    })],
    ['LOCAL/CEN CRC mismatch', mutateZip(minimalOfficeZip('docx'), (copy, _eocd, central) => {
      const local = copy.readUInt32LE(central + 42)
      copy.writeUInt32LE(copy.readUInt32LE(local + 14) ^ 1, local + 14)
    })],
    ['bad data descriptor', mutateZip(
      withLastDataDescriptor(minimalOfficeZip('docx'), true),
      (copy, eocd) => {
        const centralOffset = copy.readUInt32LE(eocd + 16)
        copy.writeUInt32LE(0, centralOffset - 12)
      }
    )]
  ])('rejects unsafe DOCX structure: %s', async (_label, bytes) => {
    const { registry, root } = await fixture()
    const filePath = path.join(root, 'unsafe.docx')
    await writeFile(filePath, bytes)

    expect(await registry.admitFinder({
      path: filePath,
      sessionId: 'session-1',
      nodeId: 'unsafe-office'
    })).toBeNull()
  })

  it('revalidates the OOXML family on restore and serving after the authorized file changes', async () => {
    const { registry, root } = await fixture()
    const filePath = path.join(root, 'mutable.docx')
    await writeFile(filePath, minimalOfficeZip('docx'))
    const descriptor = await registry.admitFinder({
      path: filePath,
      sessionId: 'session-1',
      nodeId: 'mutable-office'
    })
    expectDescriptor(descriptor)

    await writeFile(filePath, minimalOfficeZip('xlsx'))

    expect((await registry.handle(new Request(descriptor.url))).status).toBe(415)
    expect(await registry.restore({
      sessionId: 'session-1',
      nodeId: 'mutable-office',
      authorizationId: descriptor.authorizationId
    })).toBeNull()
  })

  it('rejects empty, relative, directory, and magic-mismatched Finder paths', async () => {
    const { registry, root } = await fixture()
    const directory = path.join(root, 'folder')
    const disguised = path.join(root, 'fake.png')
    await mkdir(directory)
    await writeFile(disguised, 'not a png')

    for (const candidate of ['', 'relative.png', directory, disguised]) {
      await expect(registry.admitFinder({
        path: candidate,
        sessionId: 'session-1',
        nodeId: 'node-1'
      })).resolves.toBeNull()
    }
  })

  it('admits ICO and AVIF only when their binary signatures match', async () => {
    for (const fixtureFile of [
      { name: 'favicon.ico', bytes: icoBytes, contentType: 'image/x-icon' },
      { name: 'cover.avif', bytes: avifBytes, contentType: 'image/avif' }
    ]) {
      const { registry, root } = await fixture()
      const filePath = path.join(root, fixtureFile.name)
      await writeFile(filePath, fixtureFile.bytes)
      const descriptor = await registry.admitFinder({
        path: filePath,
        sessionId: 'session-1',
        nodeId: `node-${fixtureFile.name}`
      })
      expectDescriptor(descriptor)
      expect(descriptor.contentType).toBe(fixtureFile.contentType)
      const response = await registry.handle(new Request(descriptor.url))
      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toBe(fixtureFile.contentType)
      expect(await body(response)).toEqual(fixtureFile.bytes)
    }

    for (const fixtureFile of [
      { name: 'forged.ico', bytes: Buffer.from('not-an-icon') },
      { name: 'empty.ico', bytes: Buffer.from([0x00, 0x00, 0x01, 0x00, 0x00, 0x00]) },
      { name: 'truncated-directory.ico', bytes: Buffer.from([0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x10, 0x10]) },
      { name: 'forged.avif', bytes: Buffer.from('\0\0\0\x18ftypfake\0\0\0\0mif1') },
      { name: 'minor-version-brand.avif', bytes: Buffer.from('\0\0\0\x10ftypmif1avif') },
      { name: 'unaligned-ftyp.avif', bytes: Buffer.from('\0\0\0\x12ftypavif\0\0\0\0\0\0') },
      { name: 'truncated.avif', bytes: Buffer.from('\0\0\x01\0ftypavif\0\0\0\0') }
    ]) {
      const { registry, root } = await fixture()
      const filePath = path.join(root, fixtureFile.name)
      await writeFile(filePath, fixtureFile.bytes)
      await expect(registry.admitFinder({
        path: filePath,
        sessionId: 'session-1',
        nodeId: `node-${fixtureFile.name}`
      })).resolves.toBeNull()
    }
  })

  it('admits bounded Markdown, code, and unknown-extension UTF-8 roots with explicit MIME types', async () => {
    const cases = [
      { name: 'thesis.markdown', text: '# 结论\n\n[来源](https://example.com)', contentType: 'text/markdown; charset=utf-8' },
      { name: 'analysis.ts', text: 'export const answer: number = 42\n', contentType: 'text/plain; charset=utf-8' },
      { name: 'research.custom', text: '第一行\nsecond line <not-markup>\n', contentType: 'text/plain; charset=utf-8' }
    ]

    for (const fixtureFile of cases) {
      const { registry, root } = await fixture()
      const filePath = path.join(root, fixtureFile.name)
      const bytes = Buffer.from(fixtureFile.text, 'utf8')
      await writeFile(filePath, bytes)
      const descriptor = await registry.admitFinder({
        path: filePath,
        sessionId: 'session-1',
        nodeId: `node-${fixtureFile.name}`
      })
      expectDescriptor(descriptor)
      expect(descriptor.contentType).toBe(fixtureFile.contentType)
      const response = await registry.handle(new Request(descriptor.url))
      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toBe(fixtureFile.contentType)
      expect(await body(response)).toEqual(bytes)
    }
  })

  it('rejects native text roots containing NUL, invalid UTF-8, or more than two MiB', async () => {
    for (const fixtureFile of [
      { name: 'nul.txt', bytes: Buffer.from([0x61, 0x00, 0x62]) },
      { name: 'invalid.code', bytes: Buffer.from([0x61, 0xc3, 0x28]) },
      { name: 'oversized.md', bytes: Buffer.alloc(2 * 1024 * 1024 + 1, 0x61) },
      {
        name: 'oversized.json',
        bytes: Buffer.from(JSON.stringify({ payload: 'j'.repeat(2 * 1024 * 1024) }))
      }
    ]) {
      const { registry, root } = await fixture()
      const filePath = path.join(root, fixtureFile.name)
      await writeFile(filePath, fixtureFile.bytes)
      await expect(registry.admitFinder({
        path: filePath,
        sessionId: 'session-1',
        nodeId: `node-${fixtureFile.name}`
      })).resolves.toBeNull()
    }
  })

  it('invalidates a text capability after its source is moved, deleted, or becomes binary', async () => {
    for (const mutation of ['move', 'delete', 'binary'] as const) {
      const { registry, root } = await fixture()
      const filePath = path.join(root, `${mutation}.txt`)
      await writeFile(filePath, 'trusted text')
      const descriptor = await registry.admitFinder({
        path: filePath,
        sessionId: 'session-1',
        nodeId: `node-${mutation}`
      })
      expectDescriptor(descriptor)

      if (mutation === 'move') await rename(filePath, `${filePath}.moved`)
      if (mutation === 'delete') await rm(filePath)
      if (mutation === 'binary') await writeFile(filePath, Buffer.from([0x61, 0x00, 0x62]))

      expect((await registry.handle(new Request(descriptor.url))).status)
        .toBe(mutation === 'binary' ? 415 : 404)
      await expect(registry.restore({
        authorizationId: descriptor.authorizationId,
        sessionId: 'session-1',
        nodeId: `node-${mutation}`
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

  it('serializes concurrent admission replacement for the same durable node identity', async () => {
    const root = await temporaryDirectory()
    const firstPath = path.join(root, 'first.png')
    const secondPath = path.join(root, 'second.png')
    await Promise.all([writeFile(firstPath, pngBytes), writeFile(secondPath, pngBytes)])
    const firstTargetReached = deferred<void>()
    const releaseFirstTarget = deferred<void>()
    const realFiles = countingRealFileSystem().fileSystem
    const fileSystem: ResearchPreviewFileSystem = {
      ...realFiles,
      async realpath(targetPath) {
        if (targetPath === firstPath) {
          firstTargetReached.resolve()
          await releaseFirstTarget.promise
        }
        return realFiles.realpath(targetPath)
      }
    }
    const storage = new ControllableAuthorizationStorage()
    const registry = new ResearchFilePreviewRegistry({
      storage,
      fileSystem,
      randomId: deterministicIds(
        'authorization_0000000000000001', 'capability_0000000000000001',
        'authorization_0000000000000002', 'capability_0000000000000002',
        'capability_0000000000000003'
      )
    })

    const firstAdmission = registry.admitFinder({
      path: firstPath, sessionId: 'session-1', nodeId: 'node-1'
    })
    await firstTargetReached.promise
    const secondAdmission = registry.admitFinder({
      path: secondPath, sessionId: 'session-1', nodeId: 'node-1'
    })
    releaseFirstTarget.resolve()

    const [first, second] = await Promise.all([firstAdmission, secondAdmission])
    expectDescriptor(first)
    expectDescriptor(second)
    expect(storage.records).toHaveLength(1)
    expect(storage.records[0]).toMatchObject({
      authorizationId: second.authorizationId,
      path: await realpath(secondPath),
      sessionId: 'session-1',
      nodeId: 'node-1'
    })
    expect((await registry.handle(new Request(first.url))).status).toBe(403)

    const restarted = new ResearchFilePreviewRegistry({
      storage,
      fileSystem,
      randomId: deterministicIds('capability_0000000000000003')
    })
    await expect(restarted.restore({
      sessionId: 'session-1', nodeId: 'node-1', authorizationId: first.authorizationId
    })).resolves.toBeNull()
    await expect(restarted.restore({
      sessionId: 'session-1', nodeId: 'node-1', authorizationId: second.authorizationId
    })).resolves.toMatchObject({
      authorizationId: second.authorizationId,
      url: 'sherlock-preview://capability_0000000000000003/'
    })
  })

  it.each([
    {
      label: 'node',
      revoke: (registry: ResearchFilePreviewRegistry) =>
        registry.revokeNode('session-race', 'node-race')
    },
    {
      label: 'session',
      revoke: (registry: ResearchFilePreviewRegistry) =>
        registry.revokeSession('session-race')
    }
  ])('does not resurrect an authorization when $label revocation races deferred admission', async ({ revoke }) => {
    const root = await temporaryDirectory()
    const filePath = path.join(root, 'racing.png')
    await writeFile(filePath, pngBytes)
    const targetReached = deferred<void>()
    const releaseTarget = deferred<void>()
    const realFiles = countingRealFileSystem().fileSystem
    const fileSystem: ResearchPreviewFileSystem = {
      ...realFiles,
      async realpath(targetPath) {
        if (targetPath === filePath) {
          targetReached.resolve()
          await releaseTarget.promise
        }
        return realFiles.realpath(targetPath)
      }
    }
    const storage = new ControllableAuthorizationStorage()
    const registry = new ResearchFilePreviewRegistry({
      storage,
      fileSystem,
      randomId: deterministicIds(
        'authorization_0000000000000001',
        'capability_0000000000000001'
      )
    })

    const admission = registry.admitFinder({
      path: filePath, sessionId: 'session-race', nodeId: 'node-race'
    })
    await targetReached.promise
    expect(revoke(registry)).toBe(true)
    releaseTarget.resolve()

    await expect(admission).resolves.toBeNull()
    expect(storage.records).toEqual([])
    const restarted = new ResearchFilePreviewRegistry({
      storage,
      fileSystem,
      randomId: deterministicIds('capability_0000000000000002')
    })
    await expect(restarted.restore({
      authorizationId: 'authorization_0000000000000001',
      sessionId: 'session-race',
      nodeId: 'node-race'
    })).resolves.toBeNull()
  })

  it('treats a valid already-absent node revocation as idempotent success', () => {
    const registry = new ResearchFilePreviewRegistry({
      storage: new ControllableAuthorizationStorage()
    })

    expect(registry.revokeNode('session-idempotent', 'node-idempotent')).toBe(true)
    expect(registry.revokeSession('session-idempotent')).toBe(true)
    expect(registry.revokeNode('', 'node-idempotent')).toBe(false)
    expect(registry.revokeNode('session-idempotent', '')).toBe(false)
  })

  it('does not retain revocation bookkeeping for absent nodes or sessions', () => {
    const registry = new ResearchFilePreviewRegistry({
      storage: new ControllableAuthorizationStorage()
    })

    for (let index = 0; index < 5_000; index += 1) {
      expect(registry.revokeNode(`session-${index}`, `node-${index}`)).toBe(true)
      expect(registry.revokeSession(`absent-session-${index}`)).toBe(true)
    }

    expect(revocationBookkeepingSize(registry)).toBe(0)
  })

  it('captures sidebar revocation before the asynchronous workspace lookup', async () => {
    const root = await temporaryDirectory()
    const filePath = path.join(root, 'sidebar-racing.png')
    await writeFile(filePath, pngBytes)
    const resolverReached = deferred<void>()
    const releaseResolver = deferred<void>()
    const storage = new ControllableAuthorizationStorage()
    const registry = new ResearchFilePreviewRegistry({
      storage,
      workspaceResolver: {
        async resolveRoot() {
          resolverReached.resolve()
          await releaseResolver.promise
          return root
        }
      },
      randomId: deterministicIds(
        'authorization_0000000000000001',
        'capability_0000000000000001'
      )
    })

    const admission = registry.admitSidebar({
      sessionId: 'session-sidebar-race',
      nodeId: 'node-sidebar-race',
      relativePath: path.basename(filePath)
    })
    await resolverReached.promise
    expect(registry.revokeNode('session-sidebar-race', 'node-sidebar-race')).toBe(true)
    releaseResolver.resolve()

    await expect(admission).resolves.toBeNull()
    expect(storage.records).toEqual([])
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

  it('serves HTML capability-origin modules and practical local resources inside one realpath-fenced root', async () => {
    const { registry, root } = await fixture()
    const site = path.join(root, 'site')
    const outside = path.join(root, 'outside.js')
    const largeJson = JSON.stringify({ payload: 'j'.repeat(2 * 1024 * 1024) })
    const largeSourceMap = JSON.stringify({ version: 3, sources: ['source.ts'], mappings: 'AAAA;'.repeat(128) })
    await mkdir(path.join(site, 'assets'), { recursive: true })
    await mkdir(path.join(site, 'modules'), { recursive: true })
    await mkdir(path.join(site, 'data'), { recursive: true })
    await mkdir(path.join(site, 'fonts'), { recursive: true })
    await mkdir(path.join(site, 'media'), { recursive: true })
    const htmlSource = '<!doctype html><html><head><link rel="stylesheet" href="assets/site.css"><script src="assets/site.js"></script></head><body><img src="assets/logo.png"></body></html>'
    await writeFile(path.join(site, 'index.html'), htmlSource)
    await writeFile(path.join(site, 'fragment.html'), '<main>HTML fragment without a doctype or head</main>')
    await writeFile(path.join(site, 'assets', 'site.css'), 'body { color: black; }')
    await writeFile(path.join(site, 'assets', 'site.js'), 'document.body.dataset.ready = "yes"')
    await writeFile(path.join(site, 'assets', 'logo.png'), pngBytes)
    await writeFile(path.join(site, 'modules', 'bootstrap.mjs'), 'export const ready = true')
    await writeFile(path.join(site, 'data', 'config.json'), largeJson)
    await writeFile(path.join(site, 'data', 'config.json.map'), largeSourceMap)
    await writeFile(path.join(site, 'data', 'malformed.json'), `{"payload":"${'unterminated-'.repeat(64)}`)
    await writeFile(path.join(site, 'data', 'binary.map'), Buffer.from([0x7b, 0x22, 0x78, 0x22, 0x3a, 0xff, 0x7d]))
    await writeFile(path.join(site, 'fonts', 'display.woff2'), Buffer.from('wOF2\u0000\u0001'))
    await writeFile(path.join(site, 'media', 'demo.mp4'), Buffer.from('\u0000\u0000\u0000\u0018ftypisom'))
    await writeFile(path.join(site, 'modules', 'codec.wasm'), Buffer.from([0, 0x61, 0x73, 0x6d, 1, 0, 0, 0]))
    await writeFile(outside, 'window.secret = true')
    await symlink(outside, path.join(site, 'assets', 'escape.js'))

    const descriptor = await registry.admitFinder({
      path: path.join(site, 'index.html'),
      sessionId: 'session-1',
      nodeId: 'html-1'
    })
    expectDescriptor(descriptor)

    const harnessOrigin = 'http://127.0.0.1:43123'
    const html = await registry.handle(new Request(descriptor.url), harnessOrigin)
    expect(html.status).toBe(200)
    expect(html.headers.get('content-type')).toBe('text/html; charset=utf-8')
    const csp = html.headers.get('content-security-policy') ?? ''
    const capabilitySource = 'sherlock-preview://capability_0000000000000001'
    expect(csp).toContain(`script-src ${capabilitySource} http: https:`)
    expect(csp).toContain(`style-src ${capabilitySource} 'unsafe-inline' http: https:`)
    expect(csp).toContain(`img-src ${capabilitySource} data: blob: http: https:`)
    expect(csp).toContain(`font-src ${capabilitySource} data: http: https:`)
    expect(csp).toContain(`media-src ${capabilitySource} blob: http: https:`)
    expect(csp).toContain(`frame-ancestors ${harnessOrigin}`)
    expect(csp).not.toContain("'unsafe-eval'")
    expect(csp).not.toContain("script-src 'unsafe-inline'")
    expect(csp).toContain(`connect-src ${capabilitySource} http: https: ws: wss:`)
    expect(csp).toContain("frame-src 'none'")
    expect(csp).toContain("worker-src 'none'")
    expect(csp).toContain("manifest-src 'none'")
    expect(csp).toContain('form-action http: https:')
    expect(csp).toContain("base-uri 'none'")
    expect(html.headers.get('content-length')).toBe(String(Buffer.byteLength(htmlSource)))
    expect((await body(html)).toString()).toBe(htmlSource)
    expect(htmlSource).not.toContain('__sherlock/research-wheel-bridge')

    const range = await registry.handle(new Request(descriptor.url, {
      headers: { Range: 'bytes=0-15' }
    }), harnessOrigin)
    expect(range.status).toBe(206)
    expect(range.headers.get('content-range')).toBe(`bytes 0-15/${Buffer.byteLength(htmlSource)}`)
    expect(range.headers.get('content-length')).toBe('16')
    expect((await body(range)).toString()).toBe(htmlSource.slice(0, 16))
    const head = await registry.handle(new Request(descriptor.url, { method: 'HEAD' }), harnessOrigin)
    expect(head.status).toBe(200)
    expect(head.headers.get('content-length')).toBe(String(Buffer.byteLength(htmlSource)))
    expect(await body(head)).toHaveLength(0)
    const removedBridge = await registry.handle(new Request(
      new URL('__sherlock/research-wheel-bridge-v1.js', descriptor.url)
    ), harnessOrigin)
    expect(removedBridge.status).toBe(404)

    const fragment = await registry.admitFinder({
      path: path.join(site, 'fragment.html'),
      sessionId: 'session-1',
      nodeId: 'html-fragment'
    })
    expectDescriptor(fragment)
    const fragmentResponse = await registry.handle(new Request(fragment.url), harnessOrigin)
    expect(fragmentResponse.status).toBe(200)
    expect((await body(fragmentResponse)).toString())
      .toBe('<main>HTML fragment without a doctype or head</main>')

    const css = await registry.handle(new Request(new URL('assets/site.css', descriptor.url)), harnessOrigin)
    expect(css.status).toBe(200)
    expect(css.headers.get('content-type')).toBe('text/css; charset=utf-8')
    const image = await registry.handle(new Request(new URL('assets/logo.png', descriptor.url)), harnessOrigin)
    expect(image.status).toBe(200)
    expect(image.headers.get('content-type')).toBe('image/png')
    const script = await registry.handle(new Request(new URL('assets/site.js', descriptor.url)), harnessOrigin)
    expect(script.status).toBe(200)
    expect(script.headers.get('content-type')).toBe('text/javascript; charset=utf-8')
    const module = await registry.handle(new Request(new URL('modules/bootstrap.mjs', descriptor.url)), harnessOrigin)
    expect(module.status).toBe(200)
    expect(module.headers.get('content-type')).toBe('text/javascript; charset=utf-8')
    const json = await registry.handle(new Request(new URL('data/config.json', descriptor.url)), harnessOrigin)
    expect(Buffer.byteLength(largeJson)).toBeGreaterThan(2 * 1024 * 1024)
    expect(Buffer.byteLength(largeJson)).toBeLessThan(4 * 1024 * 1024)
    expect(json.status).toBe(200)
    expect(json.headers.get('content-type')).toBe('application/json; charset=utf-8')
    const sourceMap = await registry.handle(new Request(new URL('data/config.json.map', descriptor.url)), harnessOrigin)
    expect(Buffer.byteLength(largeSourceMap)).toBeGreaterThan(512)
    expect(sourceMap.status).toBe(200)
    expect(sourceMap.headers.get('content-type')).toBe('application/json; charset=utf-8')
    const malformedJson = await registry.handle(new Request(new URL('data/malformed.json', descriptor.url)), harnessOrigin)
    expect(malformedJson.status).toBe(415)
    const binarySourceMap = await registry.handle(new Request(new URL('data/binary.map', descriptor.url)), harnessOrigin)
    expect(binarySourceMap.status).toBe(415)
    const font = await registry.handle(new Request(new URL('fonts/display.woff2', descriptor.url)), harnessOrigin)
    expect(font.status).toBe(200)
    expect(font.headers.get('content-type')).toBe('font/woff2')
    const media = await registry.handle(new Request(new URL('media/demo.mp4', descriptor.url)), harnessOrigin)
    expect(media.status).toBe(200)
    expect(media.headers.get('content-type')).toBe('video/mp4')
    const wasm = await registry.handle(new Request(new URL('modules/codec.wasm', descriptor.url)), harnessOrigin)
    expect(wasm.status).toBe(200)
    expect(wasm.headers.get('content-type')).toBe('application/wasm')
    const escaped = await registry.handle(new Request(new URL('assets/escape.js', descriptor.url)), harnessOrigin)
    expect(escaped.status).toBe(403)
    const unsupported = await registry.handle(new Request(new URL('assets/notes.txt', descriptor.url)), harnessOrigin)
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
      } as Request, harnessOrigin)
      expect(malformed.status, suffix).toBe(403)
    }

    const other = await registry.admitFinder({
      path: path.join(site, 'index.html'),
      sessionId: 'session-1',
      nodeId: 'html-2'
    })
    expectDescriptor(other)
    expect(csp).not.toContain('sherlock-preview://capability_0000000000000002')
    const capabilityModuleRequest = await registry.handle(new Request(
      new URL('assets/site.js', descriptor.url),
      { headers: { Origin: capabilitySource } }
    ), harnessOrigin)
    expect(capabilityModuleRequest.status).toBe(200)
    expect(capabilityModuleRequest.headers.get('access-control-allow-origin')).toBe(capabilitySource)
    const otherCapabilityModuleRequest = await registry.handle(new Request(
      new URL('assets/site.js', descriptor.url),
      { headers: { Origin: 'sherlock-preview://capability_0000000000000002' } }
    ), harnessOrigin)
    expect(otherCapabilityModuleRequest.status).toBe(403)
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
    const revokeNode = handlers.get('research:preview:revoke-node')
    expect(revokeNode).toBeTypeOf('function')
    expect(await revokeNode?.(trusted, {
      sessionId: 'session-1', nodeId: 'node-1'
    })).toEqual({ ok: true })
    expect(await revokeNode?.(trusted, {
      sessionId: 'session-1', nodeId: 'node-1'
    })).toEqual({ ok: true })
    expect(await revokeNode?.(trusted, {
      sessionId: '', nodeId: 'node-1'
    })).toEqual({ ok: false })
    expect(await registry.restore({
      sessionId: 'session-1', nodeId: 'node-1',
      authorizationId: descriptor.authorizationId
    })).toBeNull()
  })
})
