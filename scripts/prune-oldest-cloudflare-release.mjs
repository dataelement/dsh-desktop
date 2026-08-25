#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildReleaseRetentionPlan,
  immutableKeysFromPublicationPlan
} from './cloudflare-release-retention.mjs'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export function parseRetentionArguments(argv) {
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
  for (const required of ['bucket', 'version', 'plan', 'inventory']) {
    if (!values.get(required)) throw new Error(`--${required} is required.`)
  }
  const bucket = values.get('bucket')
  if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket)) {
    throw new Error(`Invalid R2 bucket name: ${bucket}`)
  }
  return {
    bucket,
    version: values.get('version'),
    planPath: path.resolve(values.get('plan')),
    inventoryPath: path.resolve(values.get('inventory')),
    dryRun
  }
}

export async function pruneOldestCloudflareRelease(options) {
  const [inventory, publicationPlan] = await Promise.all([
    readJson(options.inventoryPath),
    readJson(options.planPath)
  ])
  const currentKeys = immutableKeysFromPublicationPlan(publicationPlan, options.version)
  const retentionPlan = buildReleaseRetentionPlan({
    inventory,
    currentVersion: options.version,
    currentKeys
  })
  if (options.dryRun) return retentionPlan

  for (const key of retentionPlan.deleteKeys) {
    await runWrangler([
      'r2',
      'object',
      'delete',
      `${options.bucket}/${key}`,
      '--remote',
      '--force'
    ])
  }
  await writeJsonAtomically(options.inventoryPath, retentionPlan.nextInventory)
  return retentionPlan
}

async function readJson(filename) {
  return JSON.parse(await readFile(filename, 'utf8'))
}

async function writeJsonAtomically(filename, value) {
  const temporaryPath = `${filename}.tmp`
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  await rename(temporaryPath, filename)
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
    const options = parseRetentionArguments(process.argv.slice(2))
    const plan = await pruneOldestCloudflareRelease(options)
    process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
