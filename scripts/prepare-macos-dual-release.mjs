#!/usr/bin/env node

import { access, copyFile, mkdir, readFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export async function prepareMacosDualRelease(options) {
  const architecture = options.architecture ?? 'arm64'
  if (!['arm64', 'x64'].includes(architecture)) {
    throw new Error(`Unsupported macOS architecture: ${architecture}`)
  }
  const version = String(options.version ?? '')
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
    throw new Error(`Invalid release version: ${version}`)
  }

  const legacyDirectory = path.resolve(options.legacyDirectory)
  const notarizedDirectory = path.resolve(options.notarizedDirectory)
  const outputDirectory = path.resolve(options.outputDirectory)
  if (path.basename(outputDirectory) !== 'dist-release') {
    throw new Error(`Release output directory must be named dist-release: ${outputDirectory}`)
  }

  const legacyZip = `sherlock-mac-${architecture}-legacy.zip`
  const notarizedZip = `sherlock-mac-${architecture}.zip`
  const notarizedDmg = `sherlock-mac-${architecture}.dmg`
  const copies = [
    [path.join(legacyDirectory, legacyZip), path.join(outputDirectory, legacyZip)],
    [
      path.join(legacyDirectory, `${legacyZip}.blockmap`),
      path.join(outputDirectory, `${legacyZip}.blockmap`)
    ],
    [path.join(notarizedDirectory, notarizedZip), path.join(outputDirectory, notarizedZip)],
    [
      path.join(notarizedDirectory, `${notarizedZip}.blockmap`),
      path.join(outputDirectory, `${notarizedZip}.blockmap`)
    ],
    [path.join(notarizedDirectory, notarizedDmg), path.join(outputDirectory, notarizedDmg)],
    [path.join(legacyDirectory, 'latest-mac.yml'), path.join(outputDirectory, 'latest-mac.yml')],
    [
      path.join(notarizedDirectory, 'latest-mac.yml'),
      path.join(outputDirectory, 'latest-mac-notarized.yml')
    ]
  ]

  await Promise.all(copies.map(([source]) => access(source)))
  const [legacyMetadata, notarizedMetadata] = await Promise.all([
    readFile(path.join(legacyDirectory, 'latest-mac.yml'), 'utf8').then(parse),
    readFile(path.join(notarizedDirectory, 'latest-mac.yml'), 'utf8').then(parse)
  ])
  validateMetadata(legacyMetadata, version, legacyZip, 'legacy')
  validateMetadata(notarizedMetadata, version, notarizedZip, 'notarized')

  await rm(outputDirectory, { recursive: true, force: true })
  await mkdir(outputDirectory, { recursive: true })
  await Promise.all(copies.map(([source, destination]) => copyFile(source, destination)))
  return copies.map(([, destination]) => destination)
}

function validateMetadata(metadata, version, expectedZip, channel) {
  if (!metadata || metadata.version !== version || !Array.isArray(metadata.files)) {
    throw new Error(`${channel} metadata does not describe version ${version}.`)
  }
  const zip = metadata.files.find((file) => file?.url === expectedZip)
  if (!zip?.sha512 || !Number.isFinite(zip.size)) {
    throw new Error(`${channel} metadata does not reference ${expectedZip}.`)
  }
  if (metadata.path !== expectedZip || metadata.sha512 !== zip.sha512) {
    throw new Error(`${channel} metadata primary update is not ${expectedZip}.`)
  }
}

function parseArguments(argv) {
  const values = new Map()
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index]
    const value = argv[index + 1]
    if (!key?.startsWith('--') || !value) throw new Error('Invalid release preparation arguments.')
    values.set(key.slice(2), value)
  }
  for (const required of ['version', 'legacy', 'notarized', 'output']) {
    if (!values.has(required)) throw new Error(`--${required} is required.`)
  }
  return {
    version: values.get('version'),
    architecture: values.get('arch') ?? 'arm64',
    legacyDirectory: values.get('legacy'),
    notarizedDirectory: values.get('notarized'),
    outputDirectory: values.get('output')
  }
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  try {
    const prepared = await prepareMacosDualRelease(parseArguments(process.argv.slice(2)))
    process.stdout.write(`Prepared ${prepared.length} dual-channel macOS release files.\n`)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
