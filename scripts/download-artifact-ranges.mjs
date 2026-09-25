import { spawn, execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createReadStream, createWriteStream } from 'node:fs'
import { mkdir, mkdtemp, rename, rm, stat } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { Readable, Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { promisify } from 'node:util'
import { pathToFileURL } from 'node:url'

const CHUNK_SIZE = 32 * 1024 * 1024

/** Assemble bounded ranges only after every response has its expected length. */
export async function downloadInRanges({ size, digest, outputPath, downloadRange, concurrency = 6 }) {
  if (!Number.isSafeInteger(size) || size <= 0 || !/^sha256:[a-f0-9]{64}$/.test(digest ?? '')) {
    throw new Error('Artifact must declare a positive size and SHA-256 digest')
  }
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 8) throw new Error('Invalid download concurrency')
  await mkdir(dirname(outputPath), { recursive: true })
  const scratch = await mkdtemp(join(dirname(outputPath), '.artifact-download-'))
  const parts = Array.from({ length: Math.ceil(size / CHUNK_SIZE) }, (_, index) => ({
    start: index * CHUNK_SIZE,
    end: Math.min(size, (index + 1) * CHUNK_SIZE) - 1,
    path: join(scratch, String(index))
  }))
  let next = 0
  let failure
  try {
    await Promise.all(Array.from({ length: Math.min(concurrency, parts.length) }, async () => {
      while (!failure && next < parts.length) {
        const part = parts[next++]
        try {
          await downloadRange(part.start, part.end, part.path)
          if ((await stat(part.path)).size !== part.end - part.start + 1) throw new Error('Unexpected range response size')
        } catch (error) {
          failure ??= error
        }
      }
    }))
    if (failure) throw failure
    const hash = createHash('sha256')
    const combined = join(scratch, 'artifact.zip')
    async function* chunks() {
      for (const part of parts) {
        for await (const chunk of createReadStream(part.path)) {
          hash.update(chunk)
          yield chunk
        }
      }
    }
    await pipeline(Readable.from(chunks()), createWriteStream(combined))
    if (`sha256:${hash.digest('hex')}` !== digest) throw new Error('Artifact SHA-256 mismatch')
    await rename(combined, outputPath)
  } finally {
    await rm(scratch, { recursive: true, force: true })
  }
}

async function ghRange(route, start, end, destination) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const child = spawn('gh', ['api', route, '-H', `Range: bytes=${start}-${end}`], { stdio: ['ignore', 'pipe', 'ignore'] })
    let bytes = 0
    const bounded = new Transform({ transform(chunk, encoding, callback) {
      bytes += chunk.length
      callback(bytes > end - start + 1 ? new Error('Storage ignored the bounded Range request') : null, chunk)
    } })
    const exited = new Promise((resolveExit, reject) => {
      child.once('error', reject)
      child.once('exit', code => code === 0 ? resolveExit() : reject(new Error(`gh range request exited with code ${code}`)))
    })
    const timer = setTimeout(() => child.kill('SIGTERM'), 180_000)
    try {
      const transfer = pipeline(child.stdout, bounded, createWriteStream(destination)).catch(error => {
        child.kill('SIGTERM')
        throw error
      })
      const results = await Promise.allSettled([exited, transfer])
      const rejected = results.find(result => result.status === 'rejected')
      if (rejected) throw rejected.reason
      if (bytes !== end - start + 1) throw new Error('Incomplete range response')
      return
    } catch (error) {
      child.kill('SIGTERM')
      if (attempt === 3) throw error
    } finally {
      clearTimeout(timer)
    }
  }
}

async function main() {
  const [repository, runId, name, output] = process.argv.slice(2)
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository ?? '') || !/^\d+$/.test(runId ?? '') || !name || !output) {
    throw new Error('Usage: download-artifact-ranges.mjs <owner/repo> <run-id> <artifact-name> <output.zip>')
  }
  const { stdout } = await promisify(execFile)('gh', ['api', `repos/${repository}/actions/runs/${runId}/artifacts`, '--paginate', '--slurp'], { maxBuffer: 1024 * 1024 })
  const pages = JSON.parse(stdout)
  const artifact = pages.flatMap(page => page.artifacts ?? []).find(item => item.name === name && !item.expired)
  if (!artifact || !Number.isSafeInteger(artifact.id)) throw new Error(`Available artifact not found: ${name}`)
  const started = Date.now()
  await downloadInRanges({ size: artifact.size_in_bytes, digest: artifact.digest, outputPath: resolve(output),
    downloadRange: (start, end, path) => ghRange(`repos/${repository}/actions/artifacts/${artifact.id}/zip`, start, end, path)
  })
  console.log(`Verified ${name}: ${artifact.size_in_bytes} bytes in ${Math.round((Date.now() - started) / 1000)}s (SHA-256 matched)`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1 })
}
