import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { PassThrough, Readable, Writable } from 'node:stream'
import { createWriteStream } from 'node:fs'
import { c, t, x } from 'tar'

vi.mock('node:fs/promises', async importOriginal => {
  const fs = await importOriginal()
  return { ...fs, rm: vi.fn(fs.rm) }
})
vi.mock('node:fs', async importOriginal => {
  const fs = await importOriginal()
  return { ...fs, createWriteStream: vi.fn(fs.createWriteStream) }
})
vi.mock('tar', async importOriginal => {
  const tar = await importOriginal()
  return { ...tar, c: vi.fn(tar.c), t: vi.fn(tar.t) }
})
import { archiveWindowsRelease, validateWindowsArchive } from '../scripts/archive-windows-release.mjs'

let directory, output
const log = vi.fn()
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'archive 空格 '))
  output = join(directory, 'win-unpacked.tar.gz')
  await mkdir(join(directory, 'win-unpacked', '资源 空格'), { recursive: true })
  log.mockClear()
})
afterEach(async () => { await rm(directory, { recursive: true, force: true }) })
async function preserved(options, pattern) {
  await writeFile(output, 'previous archive')
  await expect(archiveWindowsRelease(directory, { log, ...options })).rejects.toThrow(pattern)
  expect(await readFile(output, 'utf8')).toBe('previous archive')
  expect((await readdir(directory)).filter(name => name.endsWith('.tmp'))).toEqual([])
}

it('roundtrips binary data with spaces and Unicode directories/filenames and replaces the previous archive', async () => {
  const binary = randomBytes(80_000)
  await writeFile(join(directory, 'win-unpacked', 'DSH Desktop.exe'), binary)
  await writeFile(join(directory, 'win-unpacked', '资源 空格', '中文 space.bin'), binary)
  await writeFile(output, 'previous archive')
  expect(await archiveWindowsRelease(directory, { log })).toBe(output)
  await validateWindowsArchive(output)
  const unpack = join(directory, 'extracted')
  await mkdir(unpack)
  await x({ file: output, cwd: unpack, strict: true })
  expect(await readFile(join(unpack, 'win-unpacked', 'DSH Desktop.exe'))).toEqual(binary)
  expect(await readFile(join(unpack, 'win-unpacked', '资源 空格', '中文 space.bin'))).toEqual(binary)
  expect((await readdir(directory)).some(name => name.endsWith('.tmp'))).toBe(false)
})

it.runIf(process.platform === 'darwin')('can be extracted by the native tar used on the macOS signing host', async () => {
  await writeFile(join(directory, 'win-unpacked', '资源 空格', '中文.bin'), 'test')
  await archiveWindowsRelease(directory, { log })
  const unpack = join(directory, 'native extracted')
  await mkdir(unpack)
  execFileSync('tar', ['-xzf', '../win-unpacked.tar.gz'], { cwd: unpack })
  expect(await readFile(join(unpack, 'win-unpacked', '资源 空格', '中文.bin'), 'utf8')).toBe('test')
})

it('runs the guarded CLI with an explicit Unicode directory', async () => {
  await writeFile(join(directory, 'win-unpacked', 'payload'), 'test')
  execFileSync(process.execPath, [fileURLToPath(new URL('../scripts/archive-windows-release.mjs', import.meta.url)), directory])
  await validateWindowsArchive(output)
})

it('preserves old output on a missing payload and reports the packing stage', async () => {
  await rm(join(directory, 'win-unpacked'), { recursive: true })
  await preserved({}, /archive packing failed:.*ENOENT/)
})

it('retains the original error code when temporary cleanup also fails', async () => {
  c.mockImplementationOnce(() => { throw Object.assign(new Error('fixture read denied'), { code: 'EACCES' }) })
  rm.mockRejectedValueOnce(Object.assign(new Error('fixture cleanup denied'), { code: 'EPERM' }))
  await writeFile(output, 'previous archive')
  const error = await archiveWindowsRelease(directory, { log }).catch(error => error)
  expect(error).toBeInstanceOf(AggregateError)
  expect(error.errors[0]).toMatchObject({ code: 'EACCES', stage: 'archive packing' })
  expect(error.errors[1]).toMatchObject({ code: 'EPERM' })
  expect(error.cause).toBe(error.errors[0])
  expect(await readFile(output, 'utf8')).toBe('previous archive')
})

it('bounds stalled packing and preserves previous output', async () => {
  const stream = new PassThrough()
  c.mockReturnValueOnce(stream)
  await preserved({ timeoutMs: 50 }, /archive packing failed: timeout=50ms/)
  expect(stream.destroyed).toBe(true)
})

it('bounds stalled validation and closes its input', async () => {
  await archiveWindowsRelease(directory, { log })
  const parser = new Writable({ write() {} })
  t.mockReturnValueOnce(parser)
  await expect(validateWindowsArchive(output, { timeoutMs: 50 })).rejects.toThrow(/archive validation failed: timeout=50ms/)
  expect(parser.destroyed).toBe(true)
})

it('rejects successful packing whose bytes are not gzip before replacing old output', async () => {
  c.mockReturnValueOnce(Readable.from([Buffer.alloc(4096, 42)]))
  await preserved({}, /Archive is not gzip/)
})

it('preserves old output when validation detects a corrupt gzip', async () => {
  c.mockReturnValueOnce(Readable.from([Buffer.from([31, 139, 8, 0, 42])]))
  await preserved({}, /archive validation failed/)
})

it('rejects empty output', async () => {
  c.mockReturnValueOnce(Readable.from([]))
  await preserved({}, /Archive is empty/)
})

it('rejects actual archives with foreign roots or an empty win-unpacked root', async () => {
  await writeFile(join(directory, 'outside'), 'must not ship')
  await c({ file: output, cwd: directory, gzip: true }, ['win-unpacked', 'outside'])
  await expect(validateWindowsArchive(output)).rejects.toThrow(/Unexpected archive entry: outside/)
  await rm(join(directory, 'win-unpacked', '资源 空格'), { recursive: true })
  await c({ file: output, cwd: directory, gzip: true }, ['win-unpacked'])
  await expect(validateWindowsArchive(output)).rejects.toThrow(/nonempty win-unpacked/)
})

it('propagates destination errors and aborts the pack stream', async () => {
  createWriteStream.mockImplementationOnce(() => new Writable({
    write(chunk, encoding, callback) { callback(Object.assign(new Error('fixture EPIPE'), { code: 'EPIPE' })) }
  }))
  await preserved({}, /archive packing failed: fixture EPIPE/)
})
