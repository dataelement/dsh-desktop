import { constants, accessSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const [expectedPlatform, expectedArch] = process.argv.slice(2)

if (!expectedPlatform || !expectedArch) {
  console.error('Usage: node scripts/verify-target.mjs <platform> <arch>')
  process.exit(2)
}

if (process.platform !== expectedPlatform || process.arch !== expectedArch) {
  console.error(
    `This package must be built on ${expectedPlatform}/${expectedArch}; current runtime is ${process.platform}/${process.arch}.`
  )
  console.error('Install dependencies and run the build on the matching machine or CI runner.')
  process.exit(1)
}

const executable = expectedPlatform === 'win32' ? 'node.exe' : 'node'
const runtimeExecutable = resolve('node_modules', 'node', 'bin', executable)

try {
  accessSync(runtimeExecutable, constants.X_OK)
} catch {
  console.error(`Bundled Node.js runtime was not found or is not executable: ${runtimeExecutable}`)
  console.error('Reinstall dependencies with lifecycle scripts enabled, or run `npm rebuild node`.')
  process.exit(1)
}

const probe = spawnSync(
  runtimeExecutable,
  ['-p', 'JSON.stringify({ platform: process.platform, arch: process.arch, version: process.versions.node })'],
  { encoding: 'utf8' }
)

if (probe.status !== 0) {
  console.error(`Bundled Node.js runtime could not start: ${runtimeExecutable}`)
  if (probe.stderr) console.error(probe.stderr.trim())
  process.exit(1)
}

let runtime
try {
  runtime = JSON.parse(probe.stdout.trim())
} catch {
  console.error(`Bundled Node.js runtime returned an invalid probe result: ${probe.stdout.trim()}`)
  process.exit(1)
}

if (runtime.platform !== expectedPlatform || runtime.arch !== expectedArch) {
  console.error(
    `Bundled Node.js runtime must target ${expectedPlatform}/${expectedArch}; received ${runtime.platform}/${runtime.arch}.`
  )
  process.exit(1)
}

console.log(`Packaging target verified: ${process.platform}/${process.arch}; bundled Node.js ${runtime.version}`)
