import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { Writable } from 'node:stream'
import { createWriteStream } from 'node:fs'

vi.mock('node:fs/promises', async importOriginal => {
  const fs = await importOriginal()
  return { ...fs, rm: vi.fn(fs.rm) }
})
vi.mock('node:fs', async importOriginal => {
  const fs = await importOriginal()
  return { ...fs, createWriteStream: vi.fn(fs.createWriteStream) }
})
import { archiveWindowsRelease, validateWindowsArchive } from '../scripts/archive-windows-release.mjs'

let directory, output
const log = vi.fn()
const command = source => [process.execPath, '-e', source, '--']
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'archive 空格 '))
  output = join(directory, 'win-unpacked.tar.gz')
  await mkdir(join(directory, 'win-unpacked', 'resources'), { recursive: true })
  log.mockClear()
})
afterEach(async () => { await rm(directory, { recursive: true, force: true }) })
async function preserved(options, pattern) {
  await writeFile(output, 'previous archive')
  await expect(archiveWindowsRelease(directory, { log, ...options })).rejects.toThrow(pattern)
  expect(await readFile(output, 'utf8')).toBe('previous archive')
  expect((await readdir(directory)).filter(name => name.endsWith('.tmp'))).toEqual([])
}

it('roundtrips actual tar with binary data and spaces/Unicode and replaces a previous output', async () => {
  const binary = randomBytes(80_000)
  await writeFile(join(directory, 'win-unpacked', 'DSH Desktop.exe'), binary)
  await writeFile(join(directory, 'win-unpacked', 'resources', '中文 space.bin'), binary)
  await writeFile(output, 'previous archive')
  expect(await archiveWindowsRelease(directory, { log })).toBe(output)
  await validateWindowsArchive(output, { log })
  const unpack = join(directory, 'extracted')
  await mkdir(unpack)
  execFileSync('tar', ['-xzf', output, '-C', unpack])
  expect(await readFile(join(unpack, 'win-unpacked', 'DSH Desktop.exe'))).toEqual(binary)
  expect(await readFile(join(unpack, 'win-unpacked', 'resources', '中文 space.bin'))).toEqual(binary)
  expect((await readdir(directory)).some(name => name.endsWith('.tmp'))).toBe(false)
})

it('runs the guarded CLI with an explicit directory', async () => {
  await writeFile(join(directory, 'win-unpacked', 'payload'), 'test')
  execFileSync(process.execPath, [fileURLToPath(new URL('../scripts/archive-windows-release.mjs', import.meta.url)), directory])
  await validateWindowsArchive(output, { log })
})

it('preserves tar code 1 even without stderr and never replaces the old archive', async () => {
  await preserved({ tarCommand: command('process.stdout.write("partial"); process.exitCode = 1') }, /archive packing failed: code=1/)
})

it('retains original exit diagnostics when temporary-file cleanup also fails', async () => {
  await writeFile(output, 'previous archive')
  const cleanupError = Object.assign(new Error('fixture cleanup denied'), { code: 'EPERM' })
  rm.mockRejectedValueOnce(cleanupError)
  const error = await archiveWindowsRelease(directory, { log, tarCommand: command('process.exitCode = 1') }).catch(error => error)
  expect(error).toBeInstanceOf(AggregateError)
  expect(error.errors[0]).toMatchObject({ code: 1 })
  expect(error.errors[1]).toBe(cleanupError)
  expect(error.cause).toBe(error.errors[0])
  expect(await readFile(output, 'utf8')).toBe('previous archive')
})

it('logs bounded stderr tails while retaining the original exit status', async () => {
  await preserved({ tarCommand: command('process.stderr.write("x".repeat(40000) + "TAIL diagnostic", () => { process.exitCode = 7 })') }, /code=7.*\n[\s\S]*TAIL diagnostic/)
  const stderr = log.mock.calls.find(([line]) => line.startsWith('[archive packing] stderr tail:'))
  expect(stderr?.[0].length).toBeLessThan(16_500)
})

it('reports executable spawn errors with ENOENT and cleans its temporary output', async () => {
  await preserved({ tarCommand: [join(directory, 'missing-tar')] }, /ENOENT/)
})

it.each(['setInterval(() => {}, 1000)', 'process.stdout.end(); setInterval(() => {}, 1000)'])('bounds packing and listing time even after stdout ends: %s', async source => {
  await preserved({ tarCommand: command(source), timeoutMs: 150 }, /archive packing failed:.*timeout=150ms/)
  await writeFile(output, 'nonempty')
  await expect(validateWindowsArchive(output, { tarCommand: command(source), timeoutMs: 150, log })).rejects.toThrow(/archive listing failed:.*timeout=150ms/)
})

it('rejects successful packing whose bytes are not a tar archive using the real listing command', async () => {
  const tarCommand = command('const { spawnSync } = require("node:child_process"); const args = process.argv.slice(1); if (args[0] === "-cf") process.stdout.write(Buffer.alloc(4096, 42)); else { const r = spawnSync("tar", args, { stdio: "inherit" }); process.exitCode = r.status ?? 1 }')
  await preserved({ tarCommand }, /archive listing failed/)
})

it('rejects a corrupt gzip and an empty archive with real validation', async () => {
  await writeFile(output, Buffer.from([31, 139, 8, 0, 42]))
  await expect(validateWindowsArchive(output, { log })).rejects.toThrow(/archive listing failed/)
  await writeFile(output, '')
  await expect(validateWindowsArchive(output, { log })).rejects.toThrow(/Archive is empty/)
})

it('rejects actual archives with extra roots or an empty win-unpacked root', async () => {
  await writeFile(join(directory, 'outside'), 'must not ship')
  execFileSync('tar', ['-czf', output, '-C', directory, 'win-unpacked', 'outside'])
  await expect(validateWindowsArchive(output, { log })).rejects.toThrow(/Unexpected archive entry: outside/)
  await rm(join(directory, 'win-unpacked', 'resources'), { recursive: true })
  execFileSync('tar', ['-czf', output, '-C', directory, 'win-unpacked'])
  await expect(validateWindowsArchive(output, { log })).rejects.toThrow(/nonempty win-unpacked/)
})

it('kills a running tar when the gzip destination fails with EPIPE', async () => {
  createWriteStream.mockImplementationOnce(() => new Writable({
    write(chunk, encoding, callback) { callback(Object.assign(new Error('fixture EPIPE'), { code: 'EPIPE' })) }
  }))
  await preserved({ tarCommand: command('setInterval(() => process.stdout.write(Buffer.alloc(65536)), 10)'), timeoutMs: 3000 }, /stream=fixture EPIPE/)
})

it('rejects listing code 1 even if the expected root was printed', async () => {
  await writeFile(output, 'nonempty')
  await expect(validateWindowsArchive(output, { log, tarCommand: command('console.log("win-unpacked/\nwin-unpacked/file"); process.exitCode = 1') })).rejects.toThrow(/archive listing failed: code=1/)
})
