/**
 * Discovery-time DSH compatibility metadata.
 *
 * The public catalog does not carry npm manifests. Fetching every manifest
 * while the market opens would turn one catalog request into more than a
 * thousand registry requests, so this module supplies a bounded, on-demand
 * index. Successful public manifest facts are cached beside the market's
 * profile state; conclusions are never cached because they depend on the DSH
 * version of the process serving the page.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { satisfiesRange } from './check.ts'
import { classifyPeer } from './compatibility.ts'
import { marketFetch } from './net.ts'

export type HostCompatibilityStatus = 'compatible' | 'incompatible' | 'unknown'
export type HostCompatibilityBasis = 'manifest' | 'undeclared' | 'unavailable'

export interface HostRequirementDeclaration {
  kind: 'engine' | 'peer'
  /** Present only for a peer-derived declaration. */
  package?: string
  range: string
}

export interface HostCompatibility {
  status: HostCompatibilityStatus
  basis: HostCompatibilityBasis
  /** Human-readable intersection of every raw declaration. */
  requirement: string | null
  declarations: HostRequirementDeclaration[]
}

export interface NpmManifestFacts {
  version: string | null
  enginesDsh: string | null
  peerDependencies: Record<string, string>
}

interface CacheEntry {
  checkedAt: number
  facts: NpmManifestFacts
}

interface CacheFile {
  schema: 'dsh-market/discovery-compatibility-cache/v1'
  entries: Record<string, CacheEntry>
}

type FetchLike = (
  url: string,
  init?: { signal?: AbortSignal; headers?: Record<string, string> },
) => Promise<Response>

const CACHE_SCHEMA = 'dsh-market/discovery-compatibility-cache/v1' as const
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000
const FAILURE_COOLDOWN_MS = 5 * 60 * 1000
const OUTAGE_COOLDOWN_MS = 30 * 1000
const FETCH_TIMEOUT_MS = 8_000
const DEFAULT_CONCURRENCY = 8
const MAX_CACHE_ENTRIES = 5_000
const MAX_RANGE_LENGTH = 256

function range(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed !== '' && trimmed.length <= MAX_RANGE_LENGTH ? trimmed : null
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

/** Keep only the small public subset of an npm manifest needed by discovery. */
export function manifestFacts(value: unknown): NpmManifestFacts {
  const manifest = record(value) ?? {}
  const engines = record(manifest.engines)
  const peers = record(manifest.peerDependencies)
  const peerDependencies: Record<string, string> = {}
  for (const [name, raw] of Object.entries(peers ?? {})) {
    if (!name.startsWith('@deepseek-ai/')) continue
    const declared = range(raw)
    if (declared !== null) peerDependencies[name] = declared
  }
  return {
    version: range(manifest.version),
    enginesDsh: range(engines?.dsh),
    peerDependencies,
  }
}

function validFacts(value: unknown): value is NpmManifestFacts {
  const facts = record(value)
  const peers = record(facts?.peerDependencies)
  return facts !== null
    && (facts.version === null || range(facts.version) === facts.version)
    && (facts.enginesDsh === null || range(facts.enginesDsh) === facts.enginesDsh)
    && peers !== null
    && Object.entries(peers).every(([name, item]) =>
      name.startsWith('@deepseek-ai/') && range(item) === item)
}

function displayRequirement(declarations: HostRequirementDeclaration[]): string | null {
  const unique = [...new Set(declarations.map(item => item.range))]
  return unique.length === 0 ? null : unique.join(' ∩ ')
}

function rangeResult(hostVersion: string, declared: string): boolean | null {
  return satisfiesRange(hostVersion, declared, { includePrerelease: true })
}

/**
 * Host peers imply the DSH release-line floor, but old ecosystem packages
 * often carry caret ranges such as `^0.0.1` whose computed 0.x upper bound
 * was never intended as a host ceiling. Reuse install preflight's directional
 * policy: below-min and explicit upper/exact violations are definite; a
 * newer host above an implicit caret/tilde ceiling remains compatible.
 */
function declarationResult(
  declaration: HostRequirementDeclaration,
  hostVersion: string,
): boolean | null {
  const satisfied = rangeResult(hostVersion, declaration.range)
  if (declaration.kind === 'engine' || satisfied !== false) return satisfied
  const verdict = classifyPeer(
    'discovery',
    declaration.package ?? '@deepseek-ai/dsh',
    declaration.range,
    hostVersion,
    false,
  )
  if (verdict.kind === 'risk') return false
  if (verdict.kind === 'warning' && verdict.warning.reason === 'aboveMax') return true
  return null
}

/**
 * Derive the current host verdict from raw manifest facts.
 *
 * Every valid declaration is conjunctive: an explicit `engines.dsh` and all
 * host peers must agree. A malformed declaration keeps a passing result
 * unknown, but cannot erase a definite mismatch from another declaration.
 */
export function deriveHostCompatibility(
  facts: NpmManifestFacts | null,
  hostVersion: string | null,
  hostPackages: ReadonlySet<string>,
): HostCompatibility {
  if (facts === null) {
    return { status: 'unknown', basis: 'unavailable', requirement: null, declarations: [] }
  }
  const declarations: HostRequirementDeclaration[] = []
  if (facts.enginesDsh !== null) {
    declarations.push({ kind: 'engine', range: facts.enginesDsh })
  }
  for (const [name, declared] of Object.entries(facts.peerDependencies)) {
    // Cordis (4.x) and schemastery (3.x) are host packages, but are not on
    // DSH's lockstep 0.x release line and therefore say nothing about the
    // DSH version. `hostPackages` is the local install inventory plus its
    // curated fallback, so future lockstep DSH packages are picked up too.
    if (!hostPackages.has(name) || !/^@deepseek-ai\/dsh(?:-|$)/.test(name)) continue
    declarations.push({ kind: 'peer', package: name, range: declared })
  }
  const requirement = displayRequirement(declarations)
  if (declarations.length === 0) {
    return { status: 'unknown', basis: 'undeclared', requirement: null, declarations: [] }
  }
  if (hostVersion === null) {
    return { status: 'unknown', basis: 'manifest', requirement, declarations }
  }
  const outcomes = declarations.map(item => declarationResult(item, hostVersion))
  const status: HostCompatibilityStatus = outcomes.some(item => item === false)
    ? 'incompatible'
    : outcomes.every(item => item === true)
      ? 'compatible'
      : 'unknown'
  return { status, basis: 'manifest', requirement, declarations }
}

/**
 * Durable, bounded lookup of npm `latest` manifests.
 *
 * Failed requests are intentionally memory-only and short-lived: a mirror
 * outage must not become a day-long false "undeclared" result on disk.
 */
export class DiscoveryManifestIndex {
  private readonly entries = new Map<string, CacheEntry>()
  private readonly failures = new Map<string, number>()
  private readonly inflight = new Map<string, Promise<NpmManifestFacts | null>>()
  private readonly fetcher: FetchLike
  private readonly now: () => number
  private readonly ttlMs: number
  private readonly concurrency: number
  private loaded = false
  private consecutiveFailures = 0
  private unavailableUntil = 0
  private dirty = false
  private activeFetches = 0
  private readonly fetchWaiters: Array<() => void> = []

  constructor(
    private readonly cacheFile: string,
    options: { fetcher?: FetchLike; now?: () => number; ttlMs?: number; concurrency?: number } = {},
  ) {
    this.fetcher = options.fetcher ?? marketFetch
    this.now = options.now ?? Date.now
    this.ttlMs = options.ttlMs ?? DEFAULT_TTL_MS
    this.concurrency = Math.max(1, Math.floor(options.concurrency ?? DEFAULT_CONCURRENCY))
  }

  private load(): void {
    if (this.loaded) return
    this.loaded = true
    try {
      const parsed = JSON.parse(readFileSync(this.cacheFile, 'utf8')) as Partial<CacheFile>
      if (parsed.schema !== CACHE_SCHEMA || record(parsed.entries) === null) return
      for (const [name, raw] of Object.entries(parsed.entries as Record<string, unknown>)) {
        const entry = record(raw)
        if (entry === null || typeof entry.checkedAt !== 'number' || !validFacts(entry.facts)) continue
        this.entries.set(name, { checkedAt: entry.checkedAt, facts: entry.facts })
      }
    } catch { /* first run or a truncated cache — fetch fresh */ }
  }

  private persist(): void {
    try {
      mkdirSync(dirname(this.cacheFile), { recursive: true, mode: 0o700 })
      const newest = [...this.entries.entries()]
        .sort(([, a], [, b]) => b.checkedAt - a.checkedAt)
        .slice(0, MAX_CACHE_ENTRIES)
      this.entries.clear()
      for (const [name, entry] of newest) this.entries.set(name, entry)
      const data: CacheFile = { schema: CACHE_SCHEMA, entries: Object.fromEntries(newest) }
      writeFileSync(this.cacheFile, JSON.stringify(data), { mode: 0o600 })
    } catch { /* cache failure degrades to in-memory lookups */ }
  }

  /** One semaphore for the whole index, including overlapping HTTP batches. */
  private async withFetchPermit<T>(operation: () => Promise<T>): Promise<T> {
    if (this.activeFetches >= this.concurrency) {
      await new Promise<void>(resolve => this.fetchWaiters.push(resolve))
    }
    this.activeFetches += 1
    try {
      return await operation()
    } finally {
      this.activeFetches -= 1
      this.fetchWaiters.shift()?.()
    }
  }

  private async fetchOne(name: string, registry: string): Promise<NpmManifestFacts | null> {
    this.load()
    const now = this.now()
    const cached = this.entries.get(name)
    if (cached !== undefined && now - cached.checkedAt < this.ttlMs) return cached.facts
    if ((this.failures.get(name) ?? 0) > now || this.unavailableUntil > now) return null
    const pending = this.inflight.get(name)
    if (pending !== undefined) return await pending

    const request = (async (): Promise<NpmManifestFacts | null> => {
      try {
        const response = await this.withFetchPermit(async () => await this.fetcher(
          `${registry}/${encodeURIComponent(name)}/latest`,
          {
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
            headers: { accept: 'application/json', 'user-agent': 'dsh-market' },
          },
        ))
        if (!response.ok) throw new Error(`HTTP ${String(response.status)}`)
        const facts = manifestFacts(await response.json())
        this.entries.set(name, { checkedAt: this.now(), facts })
        this.dirty = true
        this.failures.delete(name)
        this.consecutiveFailures = 0
        return facts
      } catch {
        const failedAt = this.now()
        this.failures.set(name, failedAt + FAILURE_COOLDOWN_MS)
        this.consecutiveFailures += 1
        if (this.consecutiveFailures >= this.concurrency) {
          this.unavailableUntil = failedAt + OUTAGE_COOLDOWN_MS
        }
        return null
      } finally {
        this.inflight.delete(name)
      }
    })()
    this.inflight.set(name, request)
    return await request
  }

  /** Look up a bounded batch while never exceeding the configured fan-out. */
  async lookup(names: readonly string[], registry: string): Promise<Record<string, NpmManifestFacts | null>> {
    const unique = [...new Set(names)]
    const result: Record<string, NpmManifestFacts | null> = {}
    let next = 0
    const worker = async (): Promise<void> => {
      while (next < unique.length) {
        const name = unique[next++]!
        result[name] = await this.fetchOne(name, registry)
      }
    }
    await Promise.all(Array.from({ length: Math.min(this.concurrency, unique.length) }, worker))
    if (this.dirty) {
      this.dirty = false
      this.persist()
    }
    return result
  }
}
