// Installation identity comes from the installed package and its install receipt, never a matching listing.
import { createHash } from 'node:crypto'
import { lstat, readFile, readdir, realpath, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir } from 'node:os'

const safeName = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/i
const json = async path => JSON.parse(await readFile(path, 'utf8'))
const literal = value => typeof value === 'string' ? value : undefined

const fingerprintCache = new Map()
async function fingerprint(directory, sourceSpec) {
  const hash = createHash('sha256')
  const legacyHash = createHash('sha256')
  let size = 0, count = 0
  const files = []
  async function walk(relative = '', depth = 0) {
    if (depth > 30) throw new Error('Package nesting exceeds limits')
    for (const entry of (await readdir(join(directory, relative), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      if (['node_modules', '.git'].includes(entry.name)) continue
      if (++count > 10000) throw new Error('Package evidence exceeds limits')
      const path = relative ? `${relative}/${entry.name}` : entry.name
      if (entry.isSymbolicLink()) throw new Error('Package contains an unverified symlink')
      if (entry.isDirectory()) await walk(path, depth + 1)
      else if (entry.isFile()) {
        const info = await stat(join(directory, path))
        size += info.size
        if (size > 64 * 1024 * 1024) throw new Error('Package evidence exceeds limits')
        files.push({ path, signature: `${info.size}:${info.mtimeMs}:${info.ctimeMs}:${info.ino}` })
      }
    }
  }
  await walk()
  const signature = JSON.stringify([sourceSpec, files])
  const cached = fingerprintCache.get(directory)
  if (cached?.signature === signature) return cached.digest
  // v2 identifies package content across generation moves and source-spec changes.
  // Keep v1 verification for records written before this format existed.
  hash.update('dsh-workbench-content-v2\0')
  legacyHash.update(directory).update('\0').update(typeof sourceSpec === 'string' ? sourceSpec : '').update('\0')
  for (const file of files) {
    const content = await readFile(join(directory, file.path))
    hash.update(file.path).update('\0').update(content).update('\0')
    legacyHash.update(file.path).update('\0').update(content).update('\0')
  }
  const digest = { current: `v2:${hash.digest('hex')}`, legacy: legacyHash.digest('hex') }
  if (fingerprintCache.size > 128) fingerprintCache.clear()
  fingerprintCache.set(directory, { signature, digest })
  return digest
}

/**
 * origin describes the installation channel; contentVerified alone proves the
 * current files match a recorded market install. updateRisk describes positive
 * evidence of local code; missing historical verification is not a modification.
 * @param {Record<string, import('./market-install.mjs').MarketInstallRecord>} installs
 * @param {string} [home]
 * @param {string[]} [requestedNames]
 * @returns {Promise<Record<string, import('./market-install.mjs').WorkbenchInstallEvidence>>}
 */
export async function readInstallEvidence(installs, home = process.env.DSH_HOME || join(homedir(), '.dsh'), requestedNames = []) {
  const profile = join(home, 'profiles', 'web')
  const dependencies = await json(join(profile, 'package.json')).then(value => value.dependencies || {}, () => ({}))
  const generations = new Map()
  try {
    const root = join(home, 'profiles', '.generations')
    for (const id of await json(join(root, 'desired.json'))) {
      if (typeof id !== 'string' || !/^[a-zA-Z0-9._+-]+$/.test(id)) continue
      const directory = join(root, 'live', id)
      try {
        const generation = await json(join(directory, 'generation.json'))
        if (typeof generation.pluginName === 'string' && safeName.test(generation.pluginName)) generations.set(generation.pluginName, { directory: join(directory, 'node_modules', generation.pluginName), sourceSpec: generation.sourceSpec })
      } catch { /* One unreadable generation must not hide the other active packages. */ }
    }
  } catch { /* Legacy profiles have no generation registry; inspect their dependency tree. */ }
  const packages = {}
  const names = new Set([...requestedNames, ...Object.values(installs).map(item => item?.pluginName)])
  for (const name of names) {
    if (typeof name !== 'string' || !safeName.test(name)) continue
    const generation = generations.get(name)
    const candidate = generation?.directory || join(profile, 'node_modules', name)
    // Missing evidence must not make an existing or declared install look absent.
    const present = generation || Object.hasOwn(dependencies, name) || await lstat(candidate).then(() => true, error => error.code !== 'ENOENT')
    const sourceSpec = generation ? generation.sourceSpec : dependencies[name]
    const localSpec = typeof sourceSpec === 'string' && /^(?:file:|link:|\/|[A-Za-z]:[\\/]|\.\.?[\\/])/.test(sourceSpec)
    const archive = typeof sourceSpec === 'string' && /\.(?:tgz|tar\.gz)(?:$|[?#])/.test(sourceSpec)
    // Release installs also used file: archives. A read failure cannot turn a
    // known release into local development; directory/link sources stay local.
    const releaseReceipt = archive && !sourceSpec.startsWith('link:') && Object.values(installs).some(item => item?.pluginName === name && ['release', 'github-release'].includes(item.source))
    const fallbackLocal = localSpec && !releaseReceipt
    if (present) packages[name] = { origin: fallbackLocal ? 'local' : releaseReceipt ? 'market' : 'unknown', contentVerified: false, updateRisk: fallbackLocal ? 'local' : null, metadata: {} }
    try {
      const directory = await realpath(candidate)
      const manifest = await json(join(directory, 'package.json'))
      if (manifest.name !== name || !manifest.dsh?.client) continue
      const digests = await fingerprint(directory, sourceSpec).catch(() => undefined)
      const records = Object.values(installs).filter(item => item?.pluginName === name && item.version === manifest.version)
      const record = records.find(item => digests && (item.fingerprint === digests.current || item.fingerprint === digests.legacy))
      // Older release receipts used temporary file: archives and path-bound v1
      // hashes. A v1 mismatch can mean a moved generation, not edited content.
      const historicalRelease = records.some(item => ['release', 'github-release'].includes(item.source)
        && (!item.fingerprint || /^[a-f0-9]{64}$/.test(item.fingerprint)))
      const local = localSpec && (!archive || (!record && !historicalRelease) || sourceSpec.startsWith('link:'))
      const comparable = records.filter(item => /^v2:[a-f0-9]{64}$/.test(item.fingerprint))
      const modified = Boolean(digests && !record && comparable.length)
      const author = typeof manifest.author === 'string' ? manifest.author : literal(manifest.author?.name)
      const zh = await json(join(directory, 'locale', 'zh.json')).then(value => value.meta || {}, () => ({}))
      const en = await json(join(directory, 'locale', 'en.json')).then(value => value.meta || {}, () => ({}))
      packages[name] = {
        version: literal(manifest.version), fingerprint: digests?.current,
        origin: local ? 'local' : records.length ? 'market' : 'unknown',
        contentVerified: !local && Boolean(record),
        updateRisk: local ? 'local' : modified ? 'modified' : null,
        metadata: {
          title: literal(zh.title), titleEn: literal(en.title),
          description: literal(zh.description) || literal(manifest.description), descriptionEn: literal(en.description),
          author, repository: typeof manifest.repository === 'string' ? manifest.repository : literal(manifest.repository?.url)
        }
      }
    } catch { /* An unreadable package has no reliable source or metadata evidence. */ }
  }
  return packages
}
