import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { parse, stringify } from 'yaml'

export function mergeMacUpdateMetadata(arm64, x64) {
  assertMetadata(arm64, 'arm64')
  assertMetadata(x64, 'x64')
  if (arm64.version !== x64.version) {
    throw new Error(`macOS update versions differ: ${arm64.version} and ${x64.version}`)
  }

  const files = deduplicateFiles([...arm64.files, ...x64.files]).filter((file) =>
    file.url.endsWith('.zip')
  )
  const primary = files.find((file) => file.url.includes('arm64') && file.url.endsWith('.zip'))
  if (!primary) throw new Error('Merged macOS update metadata has no Apple Silicon ZIP')

  return {
    version: arm64.version,
    files,
    path: primary.url,
    sha512: primary.sha512,
    releaseDate: latestReleaseDate(arm64.releaseDate, x64.releaseDate)
  }
}

function assertMetadata(metadata, architecture) {
  if (!metadata || typeof metadata !== 'object') {
    throw new Error(`${architecture} update metadata is invalid`)
  }
  if (typeof metadata.version !== 'string' || !Array.isArray(metadata.files)) {
    throw new Error(`${architecture} update metadata is missing version or files`)
  }
  const architectureFiles = metadata.files.filter((file) => file?.url?.includes(architecture))
  if (!architectureFiles.some((file) => file.url.endsWith('.zip'))) {
    throw new Error(`${architecture} update metadata has no matching ZIP`)
  }
  for (const file of architectureFiles) {
    if (typeof file.sha512 !== 'string' || !file.sha512) {
      throw new Error(`${architecture} update file ${file.url} has no sha512`)
    }
  }
}

function deduplicateFiles(files) {
  const unique = new Map()
  for (const file of files) {
    if (!file?.url) continue
    unique.set(file.url, file)
  }
  return [...unique.values()].sort((left, right) => left.url.localeCompare(right.url))
}

function latestReleaseDate(left, right) {
  const dates = [left, right].filter((value) => typeof value === 'string').sort()
  return dates.at(-1)
}

async function main() {
  const [arm64Path, x64Path, outputPath] = process.argv.slice(2)
  if (!arm64Path || !x64Path || !outputPath) {
    throw new Error(
      'Usage: node scripts/release/merge-mac-update-metadata.mjs <arm64.yml> <x64.yml> <output.yml>'
    )
  }
  const [arm64, x64] = await Promise.all([
    readFile(arm64Path, 'utf8').then(parse),
    readFile(x64Path, 'utf8').then(parse)
  ])
  const merged = mergeMacUpdateMetadata(arm64, x64)
  await writeFile(outputPath, stringify(merged), 'utf8')
  console.log(`Merged macOS update metadata for version ${merged.version}.`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main()
}
