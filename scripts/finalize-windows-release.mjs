import { createHash } from 'node:crypto'
import { readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { basename, join, resolve } from 'node:path'

const require = createRequire(import.meta.url)
const { buildBlockMap } = require('app-builder-lib/out/targets/blockmap/blockmap')

async function findInstaller(releaseDir) {
  const entries = await readdir(releaseDir, { withFileTypes: true })
  const installers = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.exe'))
    .map((entry) => join(releaseDir, entry.name))
  if (installers.length !== 1) {
    throw new Error(`Expected exactly one Windows installer, found ${installers.length}.`)
  }
  return installers[0]
}

async function sha512(file) {
  return createHash('sha512').update(await readFile(file)).digest('base64')
}

async function finalizeRelease(releaseDir, version) {
  const installer = await findInstaller(releaseDir)
  const blockmap = `${installer}.blockmap`
  await rm(blockmap, { force: true })
  const updateInfo = await buildBlockMap(installer, 'gzip', blockmap)
  const fileStat = await stat(installer)
  const digest = await sha512(installer)
  if (updateInfo.size !== fileStat.size || updateInfo.sha512 !== digest) {
    throw new Error('Generated update metadata does not match the signed installer.')
  }

  const filename = basename(installer)
  const metadata = [
    `version: ${version}`,
    'files:',
    `  - url: ${JSON.stringify(filename)}`,
    `    sha512: ${digest}`,
    `    size: ${fileStat.size}`,
    `path: ${JSON.stringify(filename)}`,
    `sha512: ${digest}`,
    `releaseDate: ${JSON.stringify(new Date().toISOString())}`,
    ''
  ].join('\n')
  await writeFile(join(releaseDir, 'latest.yml'), metadata, 'utf8')
  return { installer, blockmap }
}

const [releaseDirArg, version] = process.argv.slice(2)
if (!releaseDirArg || !/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version ?? '')) {
  throw new Error('Usage: finalize-windows-release.mjs <release-dir> <semver>')
}

const result = await finalizeRelease(resolve(releaseDirArg), version)
console.log(`Finalized signed installer metadata for ${basename(result.installer)}.`)
