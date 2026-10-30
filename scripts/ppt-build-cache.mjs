/**
 * Input fingerprint for the PPT runtime build. The pipeline is a pure function
 * of these files, so dev/test/build can skip the ~6 s regeneration when none of
 * them changed. `npm ci` replaces node_modules/dsh-ppt* with the unbuilt source
 * packages, so the installed projection carries its own marker and is re-copied
 * from the staged build when the marker is missing or stale.
 */
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

export const PPT_PACKAGES = ['dsh-ppt', 'dsh-ppt-composer']

/** Every source the pipeline reads, relative to the project root. */
export const PPT_BUILD_INPUTS = [
  'packages/ppt-runtime',
  'scripts/ppt',
  'scripts/prepare-ppt-runtime.mjs',
  'scripts/generate-zara-ppt-templates.mjs',
  'scripts/localize-ppt-templates.mjs',
  'scripts/enrich-ppt-templates.mjs',
  'scripts/build-ppt-runtime.mjs',
  'scripts/ppt-package-projection.mjs',
  'scripts/ppt-build-cache.mjs',
  // Pins js-yaml, sharp and the runtime's own dependencies.
  'package-lock.json'
]

const STAMP_FILE = 'build-inputs.json'
const INSTALLED_MARKER = '.dsh-ppt-build-inputs'

function ignored(name) {
  return name === 'node_modules' || name === '.DS_Store' || name.startsWith('._')
}

async function collectFiles(root, relative, files) {
  const absolute = path.join(root, relative)
  let stat
  try {
    stat = await fs.stat(absolute)
  } catch (error) {
    if (error?.code === 'ENOENT') return
    throw error
  }
  if (stat.isFile()) {
    files.push(relative)
    return
  }
  for (const entry of await fs.readdir(absolute, { withFileTypes: true })) {
    if (!ignored(entry.name)) await collectFiles(root, path.join(relative, entry.name), files)
  }
}

/**
 * Hash the relative path and bytes of every input file in a stable order.
 * @param {string} root - project root.
 * @param {readonly string[]} inputs - files or directories relative to root.
 * @returns {Promise<string>} hex sha256 fingerprint.
 */
export async function fingerprintInputs(root, inputs = PPT_BUILD_INPUTS) {
  const files = []
  for (const input of inputs) await collectFiles(root, input, files)
  const hash = crypto.createHash('sha256')
  for (const file of files.map(file => file.split(path.sep).join('/')).sort()) {
    hash.update(file).update('\0')
    hash.update(await fs.readFile(path.join(root, file))).update('\0')
  }
  return hash.digest('hex')
}

async function readText(file) {
  try {
    return await fs.readFile(file, 'utf8')
  } catch (error) {
    if (error?.code === 'ENOENT') return undefined
    throw error
  }
}

async function exists(file) {
  return (await readText(file)) !== undefined
}

/**
 * Decide how much of the pipeline must run for this fingerprint.
 * @param {{ outputRoot: string, nodeModulesRoot: string, fingerprint: string }} options
 * @returns {Promise<'full' | 'project' | 'fresh'>} full rebuild, re-projection only, or nothing.
 */
export async function planPptBuild({ outputRoot, nodeModulesRoot, fingerprint }) {
  const stamp = await readText(path.join(outputRoot, STAMP_FILE))
  let recorded
  try {
    recorded = stamp === undefined ? undefined : JSON.parse(stamp).fingerprint
  } catch {
    recorded = undefined // A torn or hand-edited stamp only costs one rebuild.
  }
  if (recorded !== fingerprint) return 'full'
  if (!await exists(path.join(outputRoot, 'packages', 'build.json'))) return 'full'
  for (const name of PPT_PACKAGES) {
    if (!await exists(path.join(outputRoot, 'packages', name, 'package.json'))) return 'full'
  }
  for (const name of PPT_PACKAGES) {
    const marker = await readText(path.join(nodeModulesRoot, name, INSTALLED_MARKER))
    if (marker?.trim() !== fingerprint) return 'project'
  }
  return 'fresh'
}

/** Record a completed build: the stamp is written last so an interrupted build never looks fresh. */
export async function recordPptBuild({ outputRoot, nodeModulesRoot, fingerprint }) {
  for (const name of PPT_PACKAGES) {
    await fs.writeFile(path.join(nodeModulesRoot, name, INSTALLED_MARKER), fingerprint + '\n')
  }
  await fs.writeFile(path.join(outputRoot, STAMP_FILE), JSON.stringify({ fingerprint }, null, 2) + '\n')
}

/** Staged package directories for {@link replaceInstalledPackages}. */
export function stagedPptPackages(outputRoot) {
  return PPT_PACKAGES.map(packageName => ({ packageName, source: path.join(outputRoot, 'packages', packageName) }))
}
