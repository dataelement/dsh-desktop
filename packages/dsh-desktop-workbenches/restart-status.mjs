// A Harness-process baseline deliberately survives page refreshes, but resets
// when Harness restarts and loads the newly installed workbench code.
import { readFile, stat } from 'node:fs/promises'
import { isAbsolute, join, resolve, sep } from 'node:path'
import { homedir } from 'node:os'
import { readInstallEvidence } from './install-evidence.mjs'

const safeName = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/i
const json = async path => JSON.parse(await readFile(path, 'utf8'))

/**
 * Read only installed workbench packages, never caller-provided paths.
 * @param {string} [home]
 * @param {Record<string, import('./market-install.mjs').MarketInstallRecord>} [installs]
 * @returns {Promise<Record<string, string>>}
 */
export async function readLocalWorkbenchSnapshot(home = process.env.DSH_HOME || join(homedir(), '.dsh'), installs = {}) {
  const profile = join(home, 'profiles', 'web')
  const dependencies = await json(join(profile, 'package.json')).then(value => value.dependencies || {}, error => {
    if (error.code === 'ENOENT') return {}
    throw error
  })
  const directories = new Map(Object.keys(dependencies).filter(name => safeName.test(name)).map(name => [name, { directory: join(profile, 'node_modules', name), sourceSpec: dependencies[name] }]))
  const root = join(home, 'profiles', '.generations')
  const desired = await json(join(root, 'desired.json')).catch(error => {
    if (error.code === 'ENOENT') return []
    throw error
  })
  for (const id of desired) {
    if (typeof id !== 'string' || !/^[a-zA-Z0-9._+-]+$/.test(id)) continue
    const directory = join(root, 'live', id)
    const generation = await json(join(directory, 'generation.json')).catch(() => null)
    if (safeName.test(generation?.pluginName || '')) directories.set(generation.pluginName, { directory: join(directory, 'node_modules', generation.pluginName), sourceSpec: generation.sourceSpec })
  }
  const existsInPackage = async (directory, relative) => {
    if (typeof relative !== 'string' || !relative || isAbsolute(relative)) return false
    const target = resolve(directory, relative)
    if (!target.startsWith(resolve(directory) + sep)) return false
    return stat(target).then(info => info.isFile(), () => false)
  }
  const names = []
  for (const [name, { directory, sourceSpec }] of directories) {
    const local = typeof sourceSpec === 'string' && /^(?:file:|link:|\/|[A-Za-z]:[\\/]|\.\.?[\\/])/.test(sourceSpec)
    // npm market packages never enter the expensive fingerprint walk. Local
    // archives still need content verification: an old market receipt must not
    // hide a same-version file: archive replaced by the developer.
    if (!local) continue
    const manifest = await json(join(directory, 'package.json')).catch(() => null)
    // Ordinary plugins must never trigger the workbench restart notice.
    if (manifest?.name === name && manifest.dsh?.bundle?.patch && manifest.dsh?.client?.platform === 'web'
      && Array.isArray(manifest.dsh.client.inject) && manifest.dsh.client.inject.includes('dsh-desktop-workbenches')
      && await existsInPackage(directory, manifest.dsh.bundle.patch)
      && await existsInPackage(directory, manifest.exports?.['./client'])) names.push(name)
  }
  const receipts = Object.fromEntries(Object.entries(installs).filter(([, record]) => names.includes(record?.pluginName)))
  const evidence = await readInstallEvidence(receipts, home, names)
  return Object.fromEntries(names.filter(name => evidence[name]?.fingerprint && (evidence[name].origin === 'local' || evidence[name].updateRisk === 'modified'))
    .map(name => [name, evidence[name].fingerprint]))
}

/**
 * @param {() => Promise<Record<string, string>>} readSnapshot
 * @param {{ minimumInterval?: number }} [options]
 */
export function createRestartStatus(readSnapshot, { minimumInterval = 1000 } = {}) {
  // Start before publishing the route, so a freshly installed package cannot
  // become the baseline merely because no browser had asked for status yet.
  const baseline = Promise.resolve().then(readSnapshot)
  baseline.catch(() => {}) // Read failure is reported by read(), never a false success.
  const pending = new Set()
  let inFlight
  let lastRead = 0
  let lastStatus
  return {
    /** @param {string} name Package whose managed activation completed. */
    async acknowledge(name) {
      // Let an earlier poll finish before changing its baseline and cached result.
      await inFlight
      const before = await baseline
      const current = await readSnapshot()
      if (current[name] !== undefined) before[name] = current[name]
      else delete before[name]
      pending.delete(name)
      lastStatus = undefined
    },
    read() {
      if (inFlight) return inFlight
      if (lastStatus && Date.now() - lastRead < minimumInterval) return Promise.resolve(lastStatus)
      inFlight = (async () => {
        const before = await baseline
        const current = await readSnapshot()
        for (const [name, fingerprint] of Object.entries(current)) if (before[name] !== fingerprint) pending.add(name)
        lastRead = Date.now()
        lastStatus = { restartRequired: pending.size > 0, packages: [...pending] }
        return lastStatus
      })().finally(() => { inFlight = undefined })
      return inFlight
    }
  }
}
