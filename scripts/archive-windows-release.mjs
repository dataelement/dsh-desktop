import { createReadStream, createWriteStream } from 'node:fs'
import { open, rename, rm, stat } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { randomUUID } from 'node:crypto'
import { pipeline } from 'node:stream/promises'
import { c as createTar, t as listTar } from 'tar'

async function archiveStage(stage, timeoutMs, run) {
  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)
  timer.unref()
  try {
    return await run(controller.signal)
  } catch (error) {
    throw Object.assign(new Error(`${stage} failed: ${timedOut ? `timeout=${timeoutMs}ms` : error.message}`, { cause: error }), {
      code: error.code, stage, timedOut
    })
  } finally {
    clearTimeout(timer)
  }
}

export async function validateWindowsArchive(archive, { timeoutMs = 600_000 } = {}) {
  if (!(await stat(archive)).size) throw new Error('Archive is empty: ' + archive)
  const handle = await open(archive, 'r')
  try {
    const header = Buffer.alloc(3)
    const { bytesRead } = await handle.read(header, 0, header.length, 0)
    if (bytesRead !== 3 || header[0] !== 31 || header[1] !== 139 || header[2] !== 8) {
      throw new Error('Archive is not gzip: ' + archive)
    }
  } finally {
    await handle.close()
  }
  let root = false, entries = 0, invalid
  await archiveStage('archive validation', timeoutMs, signal => {
    const parser = listTar({ strict: true, onReadEntry(entry) {
      const name = entry.path
      if (name === 'win-unpacked' || name === 'win-unpacked/') root = true
      else if (!name.startsWith('win-unpacked/') || name.includes('\\') || name.split('/').some(part => part === '..' || part === '.')) {
        invalid ??= new Error('Unexpected archive entry: ' + name)
      } else entries++
    } })
    return pipeline(createReadStream(archive), parser, { signal })
  })
  if (invalid) throw invalid
  if (!root || !entries) throw new Error('Archive must contain a nonempty win-unpacked/ root')
}

export async function archiveWindowsRelease(dist = 'dist', { timeoutMs = 600_000, log = console.error } = {}) {
  const directory = resolve(dist)
  const output = join(directory, 'win-unpacked.tar.gz')
  const temporary = output + '.' + randomUUID() + '.tmp'
  let failure
  log('Archive implementation: node-tar; input: ' + join(directory, 'win-unpacked'))
  try {
    // Windows' native tar crashed with 0xC0000005 on the Unicode roundtrip.
    // Use the already pinned JS implementation, including gzip, on every host.
    await archiveStage('archive packing', timeoutMs, signal => pipeline(
      createTar({ cwd: directory, gzip: true, portable: true, strict: true }, ['win-unpacked']),
      createWriteStream(temporary, { flags: 'wx' }), { signal }
    ))
    log('Packing/compression complete: ' + (await stat(temporary)).size + ' bytes; validating archive')
    await validateWindowsArchive(temporary, { timeoutMs })
    await rename(temporary, output)
    return output
  } catch (error) {
    failure = error
    throw error
  } finally {
    try {
      await rm(temporary, { force: true })
    } catch (cleanupError) {
      if (failure) throw new AggregateError([failure, cleanupError], 'Archive operation and temporary-file cleanup failed', { cause: failure })
      throw cleanupError
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv.length > 3) {
    console.error('Usage: node scripts/archive-windows-release.mjs [dist-directory]')
    process.exitCode = 1
  } else {
    archiveWindowsRelease(process.argv[2]).then(output => console.log('Archived ' + output), error => {
      console.error(error)
      process.exitCode = 1
    })
  }
}
