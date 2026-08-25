#!/usr/bin/env node

import { execFile as execFileCallback } from 'node:child_process'
import { copyFile, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { stringify } from 'yaml'

const require = createRequire(import.meta.url)
const plist = require('plist')
const { buildBlockMap } = require('app-builder-lib/out/targets/blockmap/blockmap')
const execFile = promisify(execFileCallback)
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const bridgeContract = {
  bundleIdentifier: 'io.dsh.desktop',
  embeddedBundleIdentifier: 'com.evanarts.sherlock',
  productName: 'Sherlock',
  executableName: 'Sherlock',
  signingName: 'Sherlock Desktop Update Signing',
  signingFingerprint: '8B8FCCFB659D94D5C9A9CE2B735EB0FAE457CC7B'
}

export async function buildLegacyMigrationBridge(options) {
  if (process.platform !== 'darwin' || process.arch !== 'arm64') {
    throw new Error('The legacy migration bridge must be built on Apple Silicon macOS.')
  }

  const version = String(options.version ?? '')
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`Invalid release version: ${version}`)

  const notarizedApp = path.resolve(options.notarizedApp)
  const outputDirectory = path.resolve(options.outputDirectory)
  const outputName = path.basename(outputDirectory)
  if (outputName !== 'dist-legacy' && !outputName.startsWith('sherlock-bridge-build.')) {
    throw new Error(`Refusing to replace unsafe bridge output directory: ${outputDirectory}`)
  }
  const identity = options.identity ?? bridgeContract.signingFingerprint
  const appInfo = plist.parse(await readFile(path.join(notarizedApp, 'Contents', 'Info.plist'), 'utf8'))
  if (appInfo.CFBundleIdentifier !== bridgeContract.embeddedBundleIdentifier) {
    throw new Error(`Notarized app identifier is ${appInfo.CFBundleIdentifier ?? 'missing'}.`)
  }
  if (appInfo.CFBundleShortVersionString !== version) {
    throw new Error(`Notarized app version is ${appInfo.CFBundleShortVersionString ?? 'missing'}, expected ${version}.`)
  }

  const wrapperApp = path.join(outputDirectory, 'bridge', `${bridgeContract.productName}.app`)
  const contents = path.join(wrapperApp, 'Contents')
  const macosDirectory = path.join(contents, 'MacOS')
  const frameworksDirectory = path.join(contents, 'Frameworks')
  const resourcesDirectory = path.join(contents, 'Resources')
  const executable = path.join(macosDirectory, bridgeContract.executableName)
  const embeddedApp = path.join(resourcesDirectory, `${bridgeContract.productName}.app`)
  const zip = path.join(outputDirectory, 'sherlock-mac-arm64-legacy.zip')
  const blockmap = `${zip}.blockmap`

  await rm(outputDirectory, { recursive: true, force: true })
  await mkdir(macosDirectory, { recursive: true })
  await mkdir(frameworksDirectory, { recursive: true })
  await mkdir(resourcesDirectory, { recursive: true })

  const source = path.join(projectRoot, 'scripts', 'macos', 'legacy-migration-bridge.swift')
  await execFile('/usr/bin/swiftc', [
    '-O',
    '-target',
    'arm64-apple-macos12.0',
    '-framework',
    'AppKit',
    source,
    '-o',
    executable
  ])

  await writeFile(
    path.join(contents, 'Info.plist'),
    plist.build({
      CFBundleDevelopmentRegion: 'zh_CN',
      CFBundleDisplayName: bridgeContract.productName,
      CFBundleExecutable: bridgeContract.executableName,
      CFBundleIconFile: 'icon.icns',
      CFBundleIdentifier: bridgeContract.bundleIdentifier,
      CFBundleInfoDictionaryVersion: '6.0',
      CFBundleName: bridgeContract.productName,
      CFBundlePackageType: 'APPL',
      CFBundleShortVersionString: version,
      CFBundleVersion: version,
      CFBundleSupportedPlatforms: ['MacOSX'],
      LSMinimumSystemVersion: '12.0',
      NSHighResolutionCapable: true
    })
  )

  await execFile('/usr/bin/ditto', [notarizedApp, embeddedApp])
  for (const framework of [
    'Squirrel.framework',
    'Mantle.framework',
    'ReactiveObjC.framework'
  ]) {
    await execFile('/usr/bin/ditto', [
      path.join(notarizedApp, 'Contents', 'Frameworks', framework),
      path.join(frameworksDirectory, framework)
    ])
  }
  await copyFile(path.join(notarizedApp, 'Contents', 'Resources', 'icon.icns'), path.join(resourcesDirectory, 'icon.icns'))
  await execFile('/usr/bin/codesign', ['--verify', '--deep', '--strict', embeddedApp])
  await execFile('/usr/bin/xcrun', ['stapler', 'validate', embeddedApp])
  await execFile('/usr/sbin/spctl', ['--assess', '--type', 'execute', embeddedApp])

  await execFile('/usr/bin/codesign', [
    '--force',
    '--sign',
    identity,
    '--identifier',
    'io.dsh.desktop',
    '--timestamp=none',
    wrapperApp
  ])
  await execFile('/usr/bin/codesign', ['--verify', '--deep', '--strict', wrapperApp])
  const requirement = `=identifier \"io.dsh.desktop\" and certificate root = H\"${bridgeContract.signingFingerprint.toLowerCase()}\"`
  await execFile('/usr/bin/codesign', ['--verify', '--strict', '-R', requirement, wrapperApp])

  await execFile('/usr/bin/ditto', ['-c', '-k', '--sequesterRsrc', '--keepParent', wrapperApp, zip])
  const updateInfo = await buildBlockMap(zip, 'gzip', blockmap)
  const zipStat = await stat(zip)
  if (updateInfo.size !== zipStat.size) throw new Error('Legacy bridge ZIP size changed while hashing.')

  await writeFile(
    path.join(outputDirectory, 'latest-mac.yml'),
    stringify({
      version,
      files: [
        {
          url: path.basename(zip),
          sha512: updateInfo.sha512,
          size: updateInfo.size
        }
      ],
      path: path.basename(zip),
      sha512: updateInfo.sha512,
      releaseDate: new Date().toISOString()
    })
  )

  return { wrapperApp, zip, blockmap }
}

function parseArguments(argv) {
  const values = new Map()
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index]
    const value = argv[index + 1]
    if (!key?.startsWith('--') || !value) throw new Error('Invalid legacy bridge arguments.')
    values.set(key.slice(2), value)
  }
  for (const required of ['version', 'app', 'output']) {
    if (!values.has(required)) throw new Error(`--${required} is required.`)
  }
  return {
    version: values.get('version'),
    notarizedApp: values.get('app'),
    outputDirectory: values.get('output'),
    identity: values.get('identity')
  }
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  try {
    const result = await buildLegacyMigrationBridge(parseArguments(process.argv.slice(2)))
    process.stdout.write(`Prepared legacy migration bridge: ${result.zip}\n`)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
