import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { profilePackageJsonPath } from './plugin-recovery'

export interface NpmPackageManifest {
  name: string
  version: string
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
  | 'incompatible-fixed-in-latest'
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

// In-memory cache for package metadata to avoid repeated network hits
const manifestCache = new Map<string, { manifest: NpmPackageManifest | null; timestamp: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000

export async function fetchPluginManifestFromRegistry(
  packageName: string,
  options?: {
    registry?: string
    timeoutMs?: number
    fetchFn?: typeof fetch
  }
): Promise<NpmPackageManifest | null> {
  const cached = manifestCache.get(packageName)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.manifest
  }

  const registries = [
    options?.registry || DEFAULT_NPM_REGISTRY,
    FALLBACK_NPM_REGISTRY
  ]
  const timeoutMs = options?.timeoutMs ?? DEFAULT_MARKET_CHECK_TIMEOUT_MS
  const fetchImpl = options?.fetchFn ?? fetch

  for (const registry of registries) {
    try {
      const url = `${registry.replace(/\/$/, '')}/${encodeURIComponent(packageName)}/latest`
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)
      const res = await fetchImpl(url, {
        signal: controller.signal,
        headers: {
          accept: 'application/json',
          'user-agent': 'dsh-desktop'
        }
      }).finally(() => clearTimeout(timer))

      if (res.ok) {
        const data = (await res.json()) as NpmPackageManifest
        if (data && typeof data.version === 'string') {
          manifestCache.set(packageName, { manifest: data, timestamp: Date.now() })
          return data
        }
      }
    } catch {
      // Try next registry
    }
  }

  manifestCache.set(packageName, { manifest: null, timestamp: Date.now() })
  return null
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
  // 1. Check peerDependencies for @deepseek-ai/dsh or @deepseek-ai/dsh-web-app
  const peers = manifest.peerDependencies ?? {}
  const dshPeer = peers['@deepseek-ai/dsh'] || peers['@deepseek-ai/dsh-web-app']
  if (dshPeer && !satisfiesRange(currentRuntimeVersion, dshPeer)) {
    return {
      isCompatible: false,
      reason: `Declares peer @deepseek-ai/dsh (${dshPeer}), incompatible with runtime ${currentRuntimeVersion}`
    }
  }

  // 2. Check engines.dsh
  const engineDsh = manifest.engines?.dsh || manifest.dsh?.minVersion
  if (engineDsh && !satisfiesRange(currentRuntimeVersion, engineDsh)) {
    return {
      isCompatible: false,
      reason: `Requires engine DSH (${engineDsh}), incompatible with runtime ${currentRuntimeVersion}`
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

  const manifest = await fetchPluginManifestFromRegistry(packageName, {
    registry: options.registry,
    timeoutMs: options.timeoutMs,
    fetchFn: options.fetchFn
  })

  if (!manifest) {
    return {
      packageName,
      installedVersion,
      healthStatus: 'check-failed',
      healthLabel: isZh ? '未能连接市场检查' : 'Market check unavailable',
      upgradeReady: false,
      detail: isZh ? '网络超时或市场暂无此插件' : 'Network timeout or package not found in market'
    }
  }

  const latestVersion = manifest.version
  const compatibility = inferPluginRuntimeCompatibility(manifest, currentRuntimeVersion)
  const isNewer = installedVersion ? compareSemver(latestVersion, installedVersion) > 0 : false

  if (hasLocalIssue) {
    if (isNewer && compatibility.isCompatible) {
      return {
        packageName,
        installedVersion,
        latestVersion,
        healthStatus: 'incompatible-fixed-in-latest',
        healthLabel: isZh
          ? `不兼容（最新版 v${latestVersion} 已适配）`
          : `Incompatible (v${latestVersion} is compatible)`,
        upgradeReady: true,
        upgradeVersion: latestVersion,
        detail: isZh
          ? `最新版 v${latestVersion} 已适配当前 DSH Runtime (${currentRuntimeVersion})，推荐升级`
          : `Latest version v${latestVersion} supports current runtime (${currentRuntimeVersion}), upgrade recommended`
      }
    }
    return {
      packageName,
      installedVersion,
      latestVersion,
      healthStatus: 'incompatible-no-fix',
      healthLabel: isZh ? '当前版本与最新版均不兼容' : 'Incompatible (no compatible update in market)',
      upgradeReady: false,
      detail: compatibility.reason ?? (isZh ? '市场最新版本仍未声明适配当前 Runtime' : 'Latest version is still not compatible')
    }
  }

  if (isNewer) {
    if (compatibility.isCompatible) {
      return {
        packageName,
        installedVersion,
        latestVersion,
        healthStatus: 'upgrade-available',
        healthLabel: isZh ? `发现新版本 v${latestVersion}` : `Update available v${latestVersion}`,
        upgradeReady: true,
        upgradeVersion: latestVersion,
        detail: isZh ? `可升级至 v${latestVersion}` : `Can upgrade to v${latestVersion}`
      }
    }
    return {
      packageName,
      installedVersion,
      latestVersion,
      healthStatus: 'up-to-date',
      healthLabel: isZh ? '已是最新兼容版本' : 'Up to date (compatible)',
      upgradeReady: false,
      detail: isZh ? '市场有新版，但与当前 Runtime 暂不兼容' : 'Newer version in market is not compatible with current runtime'
    }
  }

  return {
    packageName,
    installedVersion,
    latestVersion,
    healthStatus: 'up-to-date',
    healthLabel: isZh ? '已是最新版' : 'Up to date',
    upgradeReady: false
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
