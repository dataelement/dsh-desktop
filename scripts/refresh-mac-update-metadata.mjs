#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse, stringify } from 'yaml'

/**
 * Refresh the electron-updater entry for a DMG after the disk image is signed,
 * notarized, and stapled. These operations can change both its size and digest.
 *
 * @param {{ metadataPath: string, dmgPath: string }} options
 */
export async function refreshMacUpdateMetadata(options) {
  const metadataPath = path.resolve(options.metadataPath)
  const dmgPath = path.resolve(options.dmgPath)
  const dmgName = path.basename(dmgPath)
  const metadata = parse(await readFile(metadataPath, 'utf8'))

  if (!metadata || typeof metadata !== 'object' || !Array.isArray(metadata.files)) {
    throw new Error(`${metadataPath} is not valid macOS update metadata.`)
  }

  const entry = metadata.files.find((file) => file?.url === dmgName)
  if (!entry) {
    throw new Error(`${metadataPath} does not reference ${dmgName}.`)
  }

  const fileStats = await stat(dmgPath)
  entry.sha512 = await sha512Base64(dmgPath)
  entry.size = fileStats.size
  await writeFile(metadataPath, stringify(metadata), 'utf8')
}

function sha512Base64(filename) {
  return new Promise((resolve, reject) => {
    const digest = createHash('sha512')
    const input = createReadStream(filename)
    input.on('error', reject)
    input.on('data', (chunk) => digest.update(chunk))
    input.on('end', () => resolve(digest.digest('base64')))
  })
}

function parseArguments(argv) {
  const values = new Map()
  for (let index = 0; index < argv.length; index += 2) {
    const argument = argv[index]
    const value = argv[index + 1]
    if (!argument?.startsWith('--') || !value) {
      throw new Error('Usage: refresh-mac-update-metadata --metadata <yml> --dmg <file>')
    }
    values.set(argument.slice(2), value)
  }
  const metadataPath = values.get('metadata')
  const dmgPath = values.get('dmg')
  if (!metadataPath || !dmgPath || values.size !== 2) {
    throw new Error('Usage: refresh-mac-update-metadata --metadata <yml> --dmg <file>')
  }
  return { metadataPath, dmgPath }
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  try {
    await refreshMacUpdateMetadata(parseArguments(process.argv.slice(2)))
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
