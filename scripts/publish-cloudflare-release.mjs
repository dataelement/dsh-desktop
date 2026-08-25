#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { mkdtemp, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildCloudflareReleasePlan } from './cloudflare-release-plan.mjs'
import {
  copyR2Object,
  fetchCloudflareWorker,
  selectUploadTransport,
  uploadFileMultipart,
  validateExistingImmutableResponse
} from './cloudflare-r2-multipart-client.mjs'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export function parsePublisherArguments(argv) {
  const values = new Map()
  let dryRun = false
  let resume = false

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '--dry-run') {
      dryRun = true
      continue
    }
    if (argument === '--resume') {
      resume = true
      continue
    }
    if (!argument.startsWith('--')) throw new Error(`Unexpected argument: ${argument}`)
    const value = argv[index + 1]
    if (!value || value.startsWith('--')) throw new Error(`${argument} requires a value.`)
    values.set(argument.slice(2), value)
    index += 1
  }

  for (const required of ['bucket', 'version', 'assets', 'prepared']) {
    if (!values.get(required)) throw new Error(`--${required} is required.`)
  }
  const bucket = values.get('bucket')
  if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket)) {
    throw new Error(`Invalid R2 bucket name: ${bucket}`)
  }

  return {
    bucket,
    version: values.get('version'),
    tag: values.get('tag'),
    assetDirectory: path.resolve(values.get('assets')),
    outputDirectory: path.resolve(values.get('prepared')),
    dryRun,
    resume
  }
}

export async function publishCloudflareRelease(options) {
  const plan = await buildCloudflareReleasePlan(options)
  if (options.dryRun) return plan

  let uploads = await Promise.all(
    plan.map(async (entry) => ({
      entry,
      transport: selectUploadTransport((await stat(entry.source)).size)
    }))
  )
  if (options.resume) uploads = await skipVerifiedImmutableUploads(uploads)
  const needsMultipart = uploads.some(({ transport }) => transport === 'multipart')
  const multipart = needsMultipart
    ? await startMultipartWorker({ bucket: options.bucket, version: options.version })
    : undefined

  try {
    for (const { entry, transport } of uploads) {
      if (multipart && entry.key === 'download/sherlock-mac-arm64.dmg') {
        await copyR2Object({
          endpoint: multipart.endpoint,
          token: multipart.token,
          version: options.version,
          sourceKey: `releases/v${options.version}/sherlock-mac-arm64.dmg`,
          targetKey: entry.key,
          contentType: entry.contentType,
          cacheControl: entry.cacheControl
        })
      } else if (transport === 'multipart') {
        if (!multipart) throw new Error('Multipart upload proxy is unavailable.')
        await uploadFileMultipart({
          endpoint: multipart.endpoint,
          token: multipart.token,
          version: options.version,
          key: entry.key,
          source: entry.source,
          contentType: entry.contentType,
          cacheControl: entry.cacheControl,
          onProgress({ key, completedBytes, totalBytes }) {
            const percent = Math.floor((completedBytes / totalBytes) * 100)
            process.stderr.write(`R2 multipart ${key}: ${percent}%\n`)
          }
        })
      } else {
        await runWrangler([
          'r2',
          'object',
          'put',
          `${options.bucket}/${entry.key}`,
          '--remote',
          '--file',
          entry.source,
          '--content-type',
          entry.contentType,
          '--cache-control',
          entry.cacheControl
        ])
      }
    }
  } finally {
    await multipart?.stop()
  }
  return plan
}

async function skipVerifiedImmutableUploads(uploads) {
  const pending = []
  for (const upload of uploads) {
    if (upload.entry.phase !== 'immutable') {
      pending.push(upload)
      continue
    }
    const localSize = (await stat(upload.entry.source)).size
    const response = await fetch(`https://updates.evanarts.com/${upload.entry.key}`, {
      method: 'HEAD',
      cache: 'no-store'
    })
    if (response.status === 404) {
      pending.push(upload)
      continue
    }
    validateExistingImmutableResponse({ key: upload.entry.key, localSize, response })
    process.stderr.write(`R2 resume verified existing ${upload.entry.key}\n`)
  }
  return pending
}

async function startMultipartWorker({ bucket, version }) {
  const root = await mkdtemp(path.join(tmpdir(), 'sherlock-r2-multipart-'))
  const config = path.join(root, 'wrangler.toml')
  const workerName = `sherlock-release-upload-${randomBytes(4).toString('hex')}`
  await writeFile(
    config,
    [
      `name = "${workerName}"`,
      'compatibility_date = "2026-08-25"',
      'workers_dev = true',
      '',
      '[[r2_buckets]]',
      'binding = "SHERLOCK_RELEASES"',
      `bucket_name = "${bucket}"`,
      ''
    ].join('\n'),
    'utf8'
  )
  const token = randomBytes(32).toString('hex')
  let deployed = false
  let endpoint
  try {
    const output = await runWranglerCaptured(
      [
        'deploy',
        path.join(projectRoot, 'scripts', 'cloudflare-r2-multipart-worker.mjs'),
        '--config',
        config,
        '--var',
        `RELEASE_UPLOAD_TOKEN:${token}`,
        '--var',
        `RELEASE_VERSION:${version}`
      ],
      token
    )
    deployed = true
    endpoint = output.match(/https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev/)?.[0]
    if (!endpoint) throw new Error(`Wrangler did not report the multipart Worker URL.\n${output}`)
    await waitForMultipartWorker({ endpoint, token })
  } catch (error) {
    if (deployed) {
      await runWrangler(['delete', workerName, '--config', config, '--force']).catch(() => {})
    }
    await rm(root, { recursive: true, force: true })
    throw error
  }

  let stopped = false
  return {
    endpoint,
    token,
    async stop() {
      if (stopped) return
      stopped = true
      try {
        await runWrangler(['delete', workerName, '--config', config, '--force'])
      } finally {
        await rm(root, { recursive: true, force: true })
      }
    }
  }
}

function runWranglerCaptured(arguments_, redactedValue) {
  const executable = wranglerExecutable()
  return new Promise((resolve, reject) => {
    const child = spawn(
      executable,
      [...arguments_, '--install-skills=false'],
      {
        cwd: projectRoot,
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: process.platform === 'win32'
      }
    )
    let output = ''
    const collect = (chunk) => {
      output += chunk
    }
    child.stdout.on('data', collect)
    child.stderr.on('data', collect)
    child.once('error', reject)
    child.once('exit', (code, signal) => {
      const sanitized = redactedValue ? output.replaceAll(redactedValue, '[REDACTED]') : output
      if (code === 0) resolve(sanitized)
      else {
        reject(
          new Error(
            `Wrangler exited with ${signal ? `signal ${signal}` : `code ${code}`}.\n${sanitized}`
          )
        )
      }
    })
  })
}

async function waitForMultipartWorker({ endpoint, token }) {
  const deadline = Date.now() + 120_000
  while (Date.now() < deadline) {
    try {
      const response = await fetchCloudflareWorker(`${endpoint}/health`, {
        headers: { authorization: `Bearer ${token}` }
      })
      if (response.ok) return
    } catch {
      // The new workers.dev route has not propagated yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error(`Timed out waiting for multipart Worker at ${endpoint}.`)
}

function runWrangler(arguments_) {
  const executable = wranglerExecutable()
  return new Promise((resolve, reject) => {
    const child = spawn(executable, [...arguments_, '--install-skills=false'], {
      cwd: projectRoot,
      env: process.env,
      stdio: 'inherit',
      shell: process.platform === 'win32'
    })
    child.once('error', reject)
    child.once('exit', (code, signal) => {
      if (code === 0) resolve()
      else reject(new Error(`Wrangler exited with ${signal ? `signal ${signal}` : `code ${code}`}.`))
    })
  })
}

function wranglerExecutable() {
  return path.join(
    projectRoot,
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'wrangler.cmd' : 'wrangler'
  )
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : ''
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    const options = parsePublisherArguments(process.argv.slice(2))
    const plan = await publishCloudflareRelease(options)
    if (options.dryRun) process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
