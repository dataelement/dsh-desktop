import { cp, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PDFJS_VERSION = '4.10.38'
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function argument(name) {
  const index = process.argv.indexOf(name)
  if (index === -1) return undefined
  const value = process.argv[index + 1]
  if (!value || value.startsWith('--')) throw new Error(`${name} requires a path.`)
  return path.resolve(value)
}

const source = argument('--source') ?? path.join(projectRoot, 'node_modules', 'pdfjs-dist')
const destination = argument('--destination') ?? path.join(
  projectRoot,
  'node_modules',
  '@deepseek-ai',
  'dsh-web-frontend',
  'dist',
  'sherlock-pdfjs'
)
const destinationParent = path.dirname(destination)
const stagingPrefix = `${path.basename(destination)}.staging-`
const staging = path.join(destinationParent, `${stagingPrefix}${process.pid}`)

function processIsRunning(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return error?.code === 'EPERM'
  }
}

async function removeStaleStagingDirectories() {
  await mkdir(destinationParent, { recursive: true })
  for (const entry of await readdir(destinationParent, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith(stagingPrefix)) continue
    const suffix = entry.name.slice(stagingPrefix.length)
    if (!/^\d+$/.test(suffix)) continue
    const pid = Number(suffix)
    if (Number.isSafeInteger(pid) && pid > 0 && processIsRunning(pid)) continue
    await rm(path.join(destinationParent, entry.name), { recursive: true, force: true })
  }
}

if (!process.argv.includes('--source')) {
  const manifest = JSON.parse(await readFile(path.join(source, 'package.json'), 'utf8'))
  if (manifest.version !== PDFJS_VERSION) {
    throw new Error(`Expected pdfjs-dist ${PDFJS_VERSION}, found ${String(manifest.version)}.`)
  }
}

await removeStaleStagingDirectories()
await rm(staging, { recursive: true, force: true })
await mkdir(staging, { recursive: true })
try {
  await Promise.all([
    cp(path.join(source, 'build', 'pdf.min.mjs'), path.join(staging, 'pdf.min.js')),
    cp(path.join(source, 'build', 'pdf.worker.min.mjs'), path.join(staging, 'pdf.worker.min.js')),
    cp(path.join(source, 'LICENSE'), path.join(staging, 'LICENSE')),
    cp(path.join(source, 'cmaps'), path.join(staging, 'cmaps'), { recursive: true }),
    cp(path.join(source, 'standard_fonts'), path.join(staging, 'standard_fonts'), { recursive: true })
  ])
  await writeFile(path.join(staging, 'loader.js'), [
    "import * as pdfjsLib from './pdf.min.js'",
    "pdfjsLib.GlobalWorkerOptions.workerSrc = '/sherlock-pdfjs/pdf.worker.min.js'",
    'globalThis.__sherlockPdfjs = pdfjsLib',
    ''
  ].join('\n'))
  await rm(destination, { recursive: true, force: true })
  await rename(staging, destination)
} finally {
  await rm(staging, { recursive: true, force: true })
}

console.log(`Installed PDF.js ${PDFJS_VERSION} assets: ${path.relative(projectRoot, destination)}`)
