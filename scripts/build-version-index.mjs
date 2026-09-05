import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const SEMVER = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/

function comparePrerelease(a, b) {
  if (a === b) return 0
  if (!a) return 1
  if (!b) return -1
  const la = a.split('.')
  const lb = b.split('.')
  const length = Math.max(la.length, lb.length)
  for (let i = 0; i < length; i += 1) {
    const x = la[i]
    const y = lb[i]
    if (x === undefined) return -1
    if (y === undefined) return 1
    if (x === y) continue
    const xn = /^\d+$/.test(x)
    const yn = /^\d+$/.test(y)
    if (xn && yn) {
      const nx = x.replace(/^0+/, '') || '0'
      const ny = y.replace(/^0+/, '') || '0'
      if (nx.length !== ny.length) return nx.length < ny.length ? -1 : 1
      if (nx !== ny) return nx < ny ? -1 : 1
      continue
    }
    if (xn) return -1
    if (yn) return 1
    if (x < y) return -1
    if (x > y) return 1
  }
  return 0
}

function compare(a, b) {
  const pa = a.split('-')[0].split('.').map(Number)
  const pb = b.split('-')[0].split('.').map(Number)
  for (let i = 0; i < 3; i += 1) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i]
  }
  const preA = a.includes('-') ? a.slice(a.indexOf('-') + 1) : ''
  const preB = b.includes('-') ? b.slice(b.indexOf('-') + 1) : ''
  return comparePrerelease(preA, preB)
}

/**
 * Turn a list of `releases/archive/<name>` directory names into the version
 * index the desktop client reads from `dshdesktop.com/updates/versions.json`.
 * Non-semver names are dropped; the rest sort newest first.
 */
export function buildVersionIndex(archiveDirNames) {
  const versions = [...new Set(archiveDirNames)]
    .filter((name) => SEMVER.test(name))
    .sort((a, b) => compare(b, a))
    .map((version) => ({
      version,
      tag: `v${version}`,
      archiveUrl: `https://dshdesktop.com/updates/archive/${version}/`
    }))
  return { generatedAt: new Date().toISOString(), versions }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [namesFile, outFile] = process.argv.slice(2)
  if (!namesFile || !outFile) {
    console.error('Usage: node scripts/build-version-index.mjs <names-json-file> <out-file>')
    process.exit(1)
  }
  const names = JSON.parse(await readFile(namesFile, 'utf8'))
  const index = buildVersionIndex(names)
  await writeFile(outFile, `${JSON.stringify(index, null, 2)}\n`, 'utf8')
  console.log(`Wrote ${outFile} with ${index.versions.length} versions.`)
}
