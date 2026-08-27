import { cp, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
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
const staging = `${destination}.staging-${process.pid}`

if (!process.argv.includes('--source')) {
  const manifest = JSON.parse(await readFile(path.join(source, 'package.json'), 'utf8'))
  if (manifest.version !== PDFJS_VERSION) {
    throw new Error(`Expected pdfjs-dist ${PDFJS_VERSION}, found ${String(manifest.version)}.`)
  }
}

await rm(staging, { recursive: true, force: true })
await mkdir(staging, { recursive: true })
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
await mkdir(path.dirname(destination), { recursive: true })
await rm(destination, { recursive: true, force: true })
await rename(staging, destination)

console.log(`Installed PDF.js ${PDFJS_VERSION} assets: ${path.relative(projectRoot, destination)}`)
