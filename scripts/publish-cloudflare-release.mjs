#!/usr/bin/env node

import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildCloudflareReleasePlan } from './cloudflare-release-plan.mjs'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export function parsePublisherArguments(argv) {
  const values = new Map()
  let dryRun = false

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '--dry-run') {
      dryRun = true
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
    dryRun
  }
}

export async function publishCloudflareRelease(options) {
  const plan = await buildCloudflareReleasePlan(options)
  if (options.dryRun) return plan

  for (const entry of plan) {
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
  return plan
}

function runWrangler(arguments_) {
  const executable = path.join(
    projectRoot,
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'wrangler.cmd' : 'wrangler'
  )
  return new Promise((resolve, reject) => {
    const child = spawn(executable, arguments_, {
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
