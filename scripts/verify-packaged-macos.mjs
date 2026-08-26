import { existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { verifyBundledSkillParity } from './bundled-skill-parity.mjs'

const args = process.argv.slice(2)

function readOption(name) {
  const index = args.indexOf(name)
  if (index === -1) return undefined

  const value = args[index + 1]
  if (!value || value.startsWith('--')) {
    throw new Error(`${name} requires a value`)
  }

  return value
}

function resolveAutomaticAppPath() {
  const appName = 'Sherlock.app'
  const candidates =
    process.arch === 'arm64'
      ? [path.resolve('dist/mac-arm64', appName), path.resolve('dist/mac', appName)]
      : [path.resolve('dist/mac', appName), path.resolve('dist/mac-x64', appName)]

  const appPath = candidates.find((candidate) => existsSync(candidate))
  if (!appPath) {
    throw new Error(`packaged app not found; checked: ${candidates.join(', ')}`)
  }

  return appPath
}

function verifyRuntime(runtimeNode, runtimeRoot) {
  if (!existsSync(runtimeNode)) {
    throw new Error(`runtime Node executable not found: ${runtimeNode}`)
  }
  if (!existsSync(path.join(runtimeRoot, 'package.json'))) {
    throw new Error(`runtime package root not found: ${runtimeRoot}`)
  }

  const probe = String.raw`
const { createRequire } = require('node:module')
const { pathToFileURL } = require('node:url')
const path = require('node:path')

const runtimeRoot = process.argv[1]
const runtimeRequire = createRequire(path.join(runtimeRoot, 'package.json'))

async function loadDependency(name, required) {
  let entryPath
  try {
    entryPath = runtimeRequire.resolve(name)
  } catch (error) {
    if (!required && error && error.code === 'MODULE_NOT_FOUND') {
      console.log(name + ': not present (optional)')
      return
    }
    throw error
  }

  await import(pathToFileURL(entryPath).href)
  console.log(name + ': loadable')
}

Promise.resolve()
  .then(() => loadDependency('apache-arrow', true))
  .then(() => loadDependency('@lancedb/lancedb', false))
  .catch((error) => {
    console.error(error && error.stack ? error.stack : error)
    process.exitCode = 1
  })
`

  execFileSync(runtimeNode, ['-e', probe, runtimeRoot], {
    cwd: runtimeRoot,
    stdio: 'inherit'
  })
}

function verifySignature(appPath) {
  if (process.platform !== 'darwin') {
    throw new Error('macOS package signature verification must run on macOS')
  }

  execFileSync(
    '/usr/bin/codesign',
    ['--verify', '--deep', '--strict', '--all-architectures', '--verbose=2', appPath],
    { stdio: 'inherit' }
  )
  console.log('signature: valid')
}

try {
  const appOption = readOption('--app')
  const runtimeRootOption = readOption('--runtime-root')
  const runtimeNodeOption = readOption('--runtime-node')

  if (appOption) {
    if (runtimeRootOption || runtimeNodeOption) {
      throw new Error('--app cannot be combined with --runtime-root or --runtime-node')
    }

    const appPath = appOption === 'auto' ? resolveAutomaticAppPath() : path.resolve(appOption)
    if (!existsSync(appPath)) {
      throw new Error(`packaged app not found: ${appPath}`)
    }

    const resourcesPath = path.join(appPath, 'Contents', 'Resources')
    const runtimeRoot = path.join(resourcesPath, 'app')
    const runtimeNode = path.join(runtimeRoot, 'node_modules', 'node', 'bin', 'node')
    const bundledSkill = verifyBundledSkillParity({
      sourceSkillDirectory: path.resolve('skills', 'efund-ppt-maker'),
      packagedSkillDirectory: path.join(
        resourcesPath,
        'sherlock-skills',
        'efund-ppt-maker'
      )
    })

    verifyRuntime(runtimeNode, runtimeRoot)
    verifySignature(appPath)
    console.log(`bundled skill: ${bundledSkill.slug} ${bundledSkill.version} (source parity)`)
    console.log(`package: verified (${appPath})`)
  } else {
    if (!runtimeRootOption || !runtimeNodeOption) {
      throw new Error('provide --app or both --runtime-root and --runtime-node')
    }

    verifyRuntime(path.resolve(runtimeNodeOption), path.resolve(runtimeRootOption))
  }
} catch (error) {
  console.error(`macOS package verification failed: ${error instanceof Error ? error.message : error}`)
  process.exitCode = 1
}
