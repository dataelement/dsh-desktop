import { spawn } from 'node:child_process'
import { createWriteStream } from 'node:fs'
import { rename, rm, stat } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { randomUUID } from 'node:crypto'
import { createGzip } from 'node:zlib'
import { pipeline } from 'node:stream/promises'
import { createInterface } from 'node:readline'

// Keep process completion separate from stream completion: tar code 1 is never success.
async function runTar(command, args, stage, consume, timeoutMs, log) {
  const child = spawn(command[0], [...command.slice(1), ...args], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true })
  let stderr = '', spawnError, timedOut = false
  child.stderr.setEncoding('utf8')
  child.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-16_384) })
  const closed = new Promise(resolveClose => {
    child.on('error', error => { spawnError = error })
    child.on('close', (code, signal) => resolveClose({ code, signal }))
  })
  const timer = setTimeout(() => {
    timedOut = true
    child.kill('SIGKILL')
    if (!child.stdout.readableEnded) child.stdout.destroy(new Error(stage + ' timed out'))
  }, timeoutMs)
  try {
    const streamResult = await consume(child.stdout).then(() => null, error => {
      child.kill('SIGKILL')
      return error
    })
    const { code, signal } = await closed
    if (stderr) log('[' + stage + '] stderr tail:\n' + stderr)
    if (spawnError || timedOut || code !== 0 || signal || streamResult) {
      throw Object.assign(new Error(
        stage + ' failed: code=' + code + ' signal=' + signal +
        (timedOut ? ' timeout=' + timeoutMs + 'ms' : '') +
        (spawnError ? ' ' + spawnError.message : '') +
        (streamResult ? ' stream=' + streamResult.message : '') +
        (stderr ? '\n' + stderr : ''), { cause: spawnError || streamResult || undefined }
      ), { code: spawnError?.code ?? code, signal, stderr, timedOut })
    }
  } finally {
    clearTimeout(timer)
  }
}

export async function validateWindowsArchive(archive, { tarCommand = ['tar'], timeoutMs = 600_000, log = console.error } = {}) {
  if (!(await stat(archive)).size) throw new Error('Archive is empty: ' + archive)
  let root = false, entries = 0
  await runTar(tarCommand, ['-tzf', archive], 'archive listing', async stdout => {
    const lines = createInterface({ input: stdout, crlfDelay: Infinity })
    try {
      for await (const name of lines) {
        if (name === 'win-unpacked' || name === 'win-unpacked/') root = true
        else if (!name.startsWith('win-unpacked/') || name.includes('\\') || name.split('/').some(part => part === '..' || part === '.')) {
          throw new Error('Unexpected archive entry: ' + name)
        } else entries++
      }
    } finally {
      lines.close()
    }
  }, timeoutMs, log)
  if (!root || !entries) throw new Error('Archive must contain a nonempty win-unpacked/ root')
}

export async function archiveWindowsRelease(dist = 'dist', options = {}) {
  const directory = resolve(dist)
  const output = join(directory, 'win-unpacked.tar.gz')
  const temporary = output + '.' + randomUUID() + '.tmp'
  const { tarCommand = ['tar'], timeoutMs = 600_000, log = console.error } = options
  let failure
  log('Archive tool: ' + JSON.stringify(tarCommand) + '; input: ' + join(directory, 'win-unpacked'))
  try {
    await runTar(tarCommand, ['-cf', '-', '-C', directory, 'win-unpacked'], 'archive packing',
      stdout => pipeline(stdout, createGzip(), createWriteStream(temporary, { flags: 'wx' })), timeoutMs, log)
    log('Packing/compression complete: ' + (await stat(temporary)).size + ' bytes; validating archive')
    await validateWindowsArchive(temporary, options)
    await rename(temporary, output)
    return output
  } catch (error) {
    failure = error
    throw error
  } finally {
    // Remove only this invocation's temporary file, without hiding the original failure.
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
