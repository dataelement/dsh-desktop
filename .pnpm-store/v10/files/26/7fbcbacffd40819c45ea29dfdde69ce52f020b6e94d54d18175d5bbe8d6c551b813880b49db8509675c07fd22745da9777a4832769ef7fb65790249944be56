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
export type HostCompatibilityStatus = 'compatible' | 'incompatible' | 'unknown';
export type HostCompatibilityBasis = 'manifest' | 'undeclared' | 'unavailable';
export interface HostRequirementDeclaration {
    kind: 'engine' | 'peer';
    /** Present only for a peer-derived declaration. */
    package?: string;
    range: string;
}
export interface HostCompatibility {
    status: HostCompatibilityStatus;
    basis: HostCompatibilityBasis;
    /** Human-readable intersection of every raw declaration. */
    requirement: string | null;
    declarations: HostRequirementDeclaration[];
}
export interface NpmManifestFacts {
    version: string | null;
    enginesDsh: string | null;
    peerDependencies: Record<string, string>;
}
type FetchLike = (url: string, init?: {
    signal?: AbortSignal;
    headers?: Record<string, string>;
}) => Promise<Response>;
/** Keep only the small public subset of an npm manifest needed by discovery. */
export declare function manifestFacts(value: unknown): NpmManifestFacts;
/**
 * Derive the current host verdict from raw manifest facts.
 *
 * Every valid declaration is conjunctive: an explicit `engines.dsh` and all
 * host peers must agree. A malformed declaration keeps a passing result
 * unknown, but cannot erase a definite mismatch from another declaration.
 */
export declare function deriveHostCompatibility(facts: NpmManifestFacts | null, hostVersion: string | null, hostPackages: ReadonlySet<string>): HostCompatibility;
/**
 * Durable, bounded lookup of npm `latest` manifests.
 *
 * Failed requests are intentionally memory-only and short-lived: a mirror
 * outage must not become a day-long false "undeclared" result on disk.
 */
export declare class DiscoveryManifestIndex {
    private readonly cacheFile;
    private readonly entries;
    private readonly failures;
    private readonly inflight;
    private readonly fetcher;
    private readonly now;
    private readonly ttlMs;
    private readonly concurrency;
    private loaded;
    private consecutiveFailures;
    private unavailableUntil;
    private dirty;
    private activeFetches;
    private readonly fetchWaiters;
    constructor(cacheFile: string, options?: {
        fetcher?: FetchLike;
        now?: () => number;
        ttlMs?: number;
        concurrency?: number;
    });
    private load;
    private persist;
    /** One semaphore for the whole index, including overlapping HTTP batches. */
    private withFetchPermit;
    private fetchOne;
    /** Look up a bounded batch while never exceeding the configured fan-out. */
    lookup(names: readonly string[], registry: string): Promise<Record<string, NpmManifestFacts | null>>;
}
export {};
