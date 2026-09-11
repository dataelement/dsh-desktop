import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { profilePackageJsonPath } from './plugin-recovery'

export interface NpmPackageManifest {
  name: string
  version: string
  deprecated?: string
  dependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  peerDependenciesMeta?: Record<string, { optional?: boolean }>
  engines?: Record<string, string>
  dsh?: {
    bundle?: {
      patch?: string
    }
    client?: {
      platform?: string
      inject?: string[]
    }
    minVersion?: string
  }
}

export type PluginHealthStatus =
  | 'up-to-date'
  | 'upgrade-available'
  | 'incompatible-upgrade-available'
  | 'incompatible-no-fix'
  | 'checking'
  | 'check-failed'

export interface PluginHealthReport {
  packageName: string
  installedVersion?: string
  latestVersion?: string
  healthStatus: PluginHealthStatus
  healthLabel: string
  upgradeReady: boolean
  upgradeVersion?: string
  detail?: string
}

export interface PluginUpgradeCandidate {
  packageName: string
  targetVersion: string
  installedVersion?: string
  upgradeHint?: string
}

export const DEFAULT_NPM_REGISTRY = 'https://registry.npmmirror.com'
export const FALLBACK_NPM_REGISTRY = 'https://registry.npmjs.org'
export const DEFAULT_MARKET_CHECK_TIMEOUT_MS = 2_500

/**
 * Parsed Semver version.
 */
export interface SemverVersion {
  major: number
  minor: number
  patch: number
  prerelease: Array<string | number>
}

const SEMVER_PATTERN =
  /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/

export function parseSemver(input: string): SemverVersion | null {
  if (typeof input !== 'string') return null
  const trimmed = input.trim()
  const match = SEMVER_PATTERN.exec(trimmed)
  if (!match) return null

  const major = Number(match[1])
  const minor = Number(match[2])
  const patch = Number(match[3])
  const prerelease = match[4]
    ? match[4].split('.').map((part) => (/^\d+$/.test(part) ? Number(part) : part))
    : []

  return { major, minor, patch, prerelease }
}

export function compareSemver(aStr: string, bStr: string): number {
  const a = parseSemver(aStr)
  const b = parseSemver(bStr)
  if (!a && !b) return aStr.localeCompare(bStr)
  if (!a) return -1
  if (!b) return 1

  if (a.major !== b.major) return a.major > b.major ? 1 : -1
  if (a.minor !== b.minor) return a.minor > b.minor ? 1 : -1
  if (a.patch !== b.patch) return a.patch > b.patch ? 1 : -1

  // When one has prerelease and other does not, version without prerelease is greater
  if (a.prerelease.length === 0 && b.prerelease.length > 0) return 1
  if (a.prerelease.length > 0 && b.prerelease.length === 0) return -1
  if (a.prerelease.length === 0 && b.prerelease.length === 0) return 0

  const len = Math.max(a.prerelease.length, b.prerelease.length)
  for (let i = 0; i < len; i += 1) {
    const aPart = a.prerelease[i]
    const bPart = b.prerelease[i]
    if (aPart === undefined) return -1
    if (bPart === undefined) return 1
    if (aPart === bPart) continue

    const aNum = typeof aPart === 'number'
    const bNum = typeof bPart === 'number'
    if (aNum && !bNum) return -1
    if (!aNum && bNum) return 1
    return aPart > bPart ? 1 : -1
  }

  return 0
}

/**
 * Check whether a version satisfies a comparator: e.g. "^0.1.2", ">=0.1.0", "~1.0.0", "*", "0.1.2-alpha.1".
 */
export function satisfiesComparator(versionStr: string, comparator: string): boolean {
  const comp = comparator.trim()
  if (!comp || comp === '*' || comp === 'x' || comp === 'X') return true

  const v = parseSemver(versionStr)
  if (!v) return false

  // Handle caret ^
  if (comp.startsWith('^')) {
    const target = comp.slice(1).trim()
    const t = parseSemver(target)
    if (!t) return false

    // Prerelease versions only satisfy ranges that have the same [major, minor, patch] tuple with a prerelease
    if (v.prerelease.length > 0) {
      if (t.prerelease.length === 0 || v.major !== t.major || v.minor !== t.minor || v.patch !== t.patch) {
        return false
      }
    }

    // Must be >= target
    if (compareSemver(versionStr, target) < 0) return false

    // Next breaking bump
    if (t.major > 0) {
      return v.major === t.major
    }
    if (t.minor > 0) {
      return v.major === 0 && v.minor === t.minor
    }
    return v.major === 0 && v.minor === 0 && v.patch === t.patch
  }

  // Handle tilde ~
  if (comp.startsWith('~')) {
    const target = comp.slice(1).trim()
    const t = parseSemver(target)
    if (!t) return false
    if (v.prerelease.length > 0) {
      if (t.prerelease.length === 0 || v.major !== t.major || v.minor !== t.minor || v.patch !== t.patch) {
        return false
      }
    }
    if (compareSemver(versionStr, target) < 0) return false
    return v.major === t.major && v.minor === t.minor
  }

  if (comp.startsWith('>=')) {
    const target = comp.slice(2).trim()
    return compareSemver(versionStr, target) >= 0
  }
  if (comp.startsWith('>')) {
    const target = comp.slice(1).trim()
    return compareSemver(versionStr, target) > 0
  }
  if (comp.startsWith('<=')) {
    const target = comp.slice(2).trim()
    return compareSemver(versionStr, target) <= 0
  }
  if (comp.startsWith('<')) {
    const target = comp.slice(1).trim()
    return compareSemver(versionStr, target) < 0
  }
  if (comp.startsWith('=')) {
    const target = comp.slice(1).trim()
    return compareSemver(versionStr, target) === 0
  }

  // Exact version
  return compareSemver(versionStr, comp) === 0
}

/**
 * Check whether a version satisfies a semver range: e.g. ">=0.1.0 <0.2.0" or "^0.1.0 || ^0.2.0".
 */
export function satisfiesRange(versionStr: string, range: string): boolean {
  if (!range || range.trim() === '*' || range.trim() === '') return true

  // Multiple alternatives separated by ||
  const alternatives = range.split('||').map((alt) => alt.trim()).filter(Boolean)
  if (alternatives.length === 0) return true

  return alternatives.some((alt) => {
    // AND conditions separated by whitespace
    const parts = alt.split(/\s+/).filter(Boolean)
    return parts.every((part) => satisfiesComparator(versionStr, part))
  })
}

export interface NpmPackageVersions {
  versions: Record<string, NpmPackageManifest>
  'dist-tags': { latest: string }
}

// Cache the complete version list, independent of the installed/runtime version.
const manifestCache = new Map<string, { metadata: NpmPackageVersions; timestamp: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000

export async function fetchPluginVersionsFromRegistry(
  packageName: string,
  options?: {
    registry?: string
    timeoutMs?: number
    fetchFn?: typeof fetch
    onFailure?: (reason: string) => void
  }
): Promise<NpmPackageVersions | null> {
  const primaryRegistry = (options?.registry || DEFAULT_NPM_REGISTRY).replace(/\/$/, '')
  const cacheKey = `${primaryRegistry}/${packageName}`
  const cached = manifestCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) return cached.metadata

  const registries = [...new Set([primaryRegistry, FALLBACK_NPM_REGISTRY])]
  const timeoutMs = options?.timeoutMs ?? DEFAULT_MARKET_CHECK_TIMEOUT_MS
  const fetchImpl = options?.fetchFn ?? fetch

  for (const registry of registries) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetchImpl(`${registry}/${encodeURIComponent(packageName)}`, {
        signal: controller.signal,
        // Full metadata preserves custom dsh.minVersion; abbreviated install
        // metadata is insufficient for this compatibility check.
        headers: { accept: 'application/json', 'user-agent': 'dsh-desktop' }
      })
      if (!res.ok) {
        options?.onFailure?.(`${registry}: HTTP ${res.status}`)
        continue
      }
      const data = (await res.json()) as NpmPackageVersions | null
      if (!data?.versions || typeof data.versions !== 'object' || Array.isArray(data.versions)) throw new Error('Invalid version metadata')
      const latest = data['dist-tags']?.latest
      if (typeof latest !== 'string' || !parseSemver(latest)) throw new Error('Invalid latest version')
      const versions = Object.fromEntries(Object.entries(data.versions).filter(([version, manifest]) =>
        parseSemver(version) && manifest?.version === version && manifest.name === packageName
      ))
      if (!versions[latest]) throw new Error('Latest version manifest is missing')
      const metadata: NpmPackageVersions = { versions, 'dist-tags': { latest } }
      manifestCache.set(cacheKey, { metadata, timestamp: Date.now() })
      return metadata
    } catch (error) {
      const failure = error as { message?: string; cause?: { code?: string } }
      options?.onFailure?.(`${registry}: ${failure.cause?.code ?? failure.message ?? 'Request failed'}`)
      // Try the fallback registry on transport, body or metadata errors.
    } finally {
      clearTimeout(timer)
    }
  }
  // A user retry must make a new request after a transient network failure.
  return null
}

/** Select the highest eligible release without installing/probing every version. */
export function selectCompatiblePluginUpgrade(
  metadata: NpmPackageVersions,
  installedVersion: string | undefined,
  currentRuntimeVersion: string
): NpmPackageManifest | undefined {
  const installed = installedVersion && parseSemver(installedVersion)
  if (!installed || !installedVersion) return undefined
  const latest = metadata['dist-tags'].latest
  return Object.values(metadata.versions)
    .filter((manifest) => {
      const version = parseSemver(manifest.version)
      return version && !manifest.deprecated &&
        compareSemver(manifest.version, installedVersion) > 0 &&
        compareSemver(manifest.version, latest) <= 0 &&
        (installed.prerelease.length > 0 || version.prerelease.length === 0)
    })
    .sort((left, right) => compareSemver(right.version, left.version))
    .find((manifest) => inferPluginRuntimeCompatibility(manifest, currentRuntimeVersion).isCompatible)
}

export function clearManifestCache(): void {
  manifestCache.clear()
}

/**
 * Inspect whether a remote manifest is compatible with current DSH runtime.
 */
export function inferPluginRuntimeCompatibility(
  manifest: NpmPackageManifest,
  currentRuntimeVersion: string
): { isCompatible: boolean; reason?: string } {
  // 1. Check peerDependencies for @deepseek-ai/* packages (e.g. @deepseek-ai/dsh, @deepseek-ai/dsh-agent, etc.)
  const peers = manifest.peerDependencies ?? {}
  for (const [peerPkg, peerRange] of Object.entries(peers)) {
    if (peerPkg.startsWith('@deepseek-ai/') && peerPkg !== '@deepseek-ai/cordis') {
      if (peerRange && !satisfiesRange(currentRuntimeVersion, peerRange)) {
        return {
          isCompatible: false,
          reason: `Declares peer ${peerPkg} (${peerRange}), incompatible with runtime ${currentRuntimeVersion}`
        }
      }
    }
  }

  // Both declarations apply. A bare minVersion is a lower bound, not an exact pin.
  const minVersion = manifest.dsh?.minVersion
  const constraints = [manifest.engines?.dsh, minVersion && parseSemver(minVersion) ? `>=${minVersion}` : minVersion]
  for (const constraint of constraints) {
    if (constraint && !satisfiesRange(currentRuntimeVersion, constraint)) {
      return {
        isCompatible: false,
        reason: `Requires DSH (${constraint}), incompatible with runtime ${currentRuntimeVersion}`
      }
    }
  }

  // 3. Check for deprecated packages in dependencies (e.g. dsh-host-apiproxy)
  const deps = { ...(manifest.dependencies ?? {}), ...(manifest.optionalDependencies ?? {}) }
  if (Object.keys(deps).includes('@deepseek-ai/dsh-host-apiproxy')) {
    return {
      isCompatible: false,
      reason: 'Requires deprecated module @deepseek-ai/dsh-host-apiproxy'
    }
  }

  return { isCompatible: true }
}

export async function readBundledDshVersion(bundledNodeModulesPath: string): Promise<string | undefined> {
  try {
    const raw = await readFile(join(bundledNodeModulesPath, '@deepseek-ai', 'dsh', 'package.json'), 'utf8')
    const manifest = JSON.parse(raw) as { version?: string }
    return manifest.version
  } catch {
    return undefined
  }
}

export async function readInstalledPluginVersion(
  dshHome: string,
  pluginName: string
): Promise<string | undefined> {
  try {
    const manifestPath = profilePackageJsonPath(dshHome)
    const profileDir = join(manifestPath, '..')
    const pkgPath = join(profileDir, 'node_modules', ...pluginName.split('/'), 'package.json')
    const raw = await readFile(pkgPath, 'utf8')
    const manifest = JSON.parse(raw) as { version?: string }
    return manifest.version
  } catch {
    return undefined
  }
}

/**
 * Evaluate single plugin for upgrade readiness.
 */
export async function evaluatePluginMarketCompatibility(options: {
  packageName: string
  installedVersion?: string
  currentRuntimeVersion: string
  registry?: string
  timeoutMs?: number
  fetchFn?: typeof fetch
  hasLocalIssue?: boolean
  locale?: 'zh' | 'en'
}): Promise<PluginHealthReport> {
  const {
    packageName,
    installedVersion,
    currentRuntimeVersion,
    hasLocalIssue = false,
    locale = 'zh'
  } = options
  const isZh = locale === 'zh'

  const failures: string[] = []
  const metadata = await fetchPluginVersionsFromRegistry(packageName, {
    registry: options.registry,
    timeoutMs: options.timeoutMs,
    fetchFn: options.fetchFn,
    onFailure: reason => failures.push(reason)
  })

  if (!metadata) {
    return {
      packageName,
      installedVersion,
      healthStatus: 'check-failed',
      healthLabel: isZh ? '未能连接市场检查' : 'Market check unavailable',
      upgradeReady: false,
      detail: (isZh ? '未能获取市场版本信息，请重新检查更新。' : 'Could not fetch market versions; retry the update check.') +
        (failures.length ? ` ${failures.join('; ')}` : '')
    }
  }

  const latestVersion = metadata['dist-tags'].latest
  if (!installedVersion || !parseSemver(installedVersion)) {
    return {
      packageName, installedVersion, latestVersion,
      healthStatus: 'check-failed', upgradeReady: false,
      healthLabel: isZh ? '无法确定已安装版本' : 'Installed version unavailable',
      detail: isZh ? '无法确定升级范围，请先检查已安装插件。' : 'Cannot determine the upgrade range; inspect the installed plugin first.'
    }
  }
  const candidate = selectCompatiblePluginUpgrade(metadata, installedVersion, currentRuntimeVersion)
  if (candidate) {
    return {
      packageName, installedVersion, latestVersion,
      healthStatus: hasLocalIssue ? 'incompatible-upgrade-available' : 'upgrade-available',
      healthLabel: isZh
        ? `${hasLocalIssue ? '加载异常，' : ''}可尝试升级至 v${candidate.version}`
        : `${hasLocalIssue ? 'Load failure; ' : ''}update candidate v${candidate.version}`,
      upgradeReady: true,
      upgradeVersion: candidate.version,
      detail: isZh
        ? `在当前版本至 latest（v${latestVersion}）之间，v${candidate.version} 是未发现 DSH ${currentRuntimeVersion} 声明冲突的最高可选版本；升级后仍需验证启动。`
        : `v${candidate.version} is the highest eligible update up to latest (v${latestVersion}) with no declared conflict with DSH ${currentRuntimeVersion}; startup must still be verified.`
    }
  }
  // A broken plugin still gets a user-initiated latest attempt when no
  // compatible release matches. This is a fallback, not a compatibility verdict.
  if (hasLocalIssue && compareSemver(latestVersion, installedVersion) > 0) {
    const compatibility = inferPluginRuntimeCompatibility(metadata.versions[latestVersion]!, currentRuntimeVersion)
    return {
      packageName, installedVersion, latestVersion,
      healthStatus: 'incompatible-upgrade-available',
      healthLabel: isZh
        ? `未找到兼容更新，可尝试 latest v${latestVersion}（兼容性未确认）`
        : `No compatible update; try latest v${latestVersion} (compatibility unconfirmed)`,
      upgradeReady: true,
      upgradeVersion: latestVersion,
      detail: (isZh
        ? `未找到匹配当前 DSH 的更新版本，可尝试升级至 latest v${latestVersion}；不保证兼容，升级后仍需验证启动。`
        : `No update matches the current DSH; you can try latest v${latestVersion}. Compatibility is not guaranteed; verify startup after upgrading.`) +
        (compatibility.reason ? ` ${compatibility.reason}` : '')
    }
  }
  if (hasLocalIssue && compareSemver(installedVersion, latestVersion) >= 0) {
    return {
      packageName, installedVersion, latestVersion,
      healthStatus: 'incompatible-no-fix',
      healthLabel: isZh ? '当前版本已是 latest 或更高，建议卸载问题插件' : 'Already at latest or newer; remove the failing plugin',
      upgradeReady: false,
      detail: isZh
        ? `当前插件 v${installedVersion} 已是 latest（v${latestVersion}）或更高版本，仍阻挡启动。请卸载此插件并继续检测；不会降级或重复安装。`
        : `Plugin v${installedVersion} is already at latest (v${latestVersion}) or newer and still blocks startup. Remove this plugin and continue checking; no downgrade or reinstall will be attempted.`
    }
  }
  return {
    packageName, installedVersion, latestVersion,
    healthStatus: hasLocalIssue ? 'incompatible-no-fix' : 'up-to-date',
    healthLabel: isZh
      ? (hasLocalIssue ? '加载异常，未找到兼容更新' : '未找到兼容更新')
      : (hasLocalIssue ? 'Load failure; no compatible update found' : 'No compatible update found'),
    upgradeReady: false,
    detail: isZh
      ? `在已安装版本之后、latest（v${latestVersion}）以内，没有符合当前 DSH 和发布版本筛选条件的更新。`
      : `No update after the installed version and up to latest (v${latestVersion}) satisfies the current DSH and release filters.`
  }
}

/**
 * Run health checkup on all installed plugins in parallel.
 */
export async function checkupAllProfilePlugins(options: {
  plugins: string[]
  dshHome: string
  bundledNodeModulesPath: string
  incompatiblePlugins?: string[]
  registry?: string
  timeoutMs?: number
  fetchFn?: typeof fetch
  locale?: 'zh' | 'en'
}): Promise<PluginHealthReport[]> {
  const currentRuntimeVersion = (await readBundledDshVersion(options.bundledNodeModulesPath)) || '0.1.2-alpha.1'
  const incompatibleSet = new Set(options.incompatiblePlugins ?? [])

  const reports = await Promise.all(
    options.plugins.map(async (plugin) => {
      const installedVersion = await readInstalledPluginVersion(options.dshHome, plugin)
      return evaluatePluginMarketCompatibility({
        packageName: plugin,
        installedVersion,
        currentRuntimeVersion,
        hasLocalIssue: incompatibleSet.has(plugin),
        registry: options.registry,
        timeoutMs: options.timeoutMs,
        fetchFn: options.fetchFn,
        locale: options.locale
      })
    })
  )

  return reports
}
