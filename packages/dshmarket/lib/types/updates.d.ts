/**
 * Update detection: per-plugin comparison of what the profile has against
 * the source of truth — git HEAD for github installs, the npm latest
 * dist-tag for registry installs — with a TTL cache.
 */
import { type Channel } from './channels.ts';
export interface UpdateStatus {
    kind: 'github' | 'npm' | 'linked';
    version: string | null;
    current: string | null;
    latest: string | null;
    /**
     * A NEWER version exists. Forwards only, always — every caller reads it
     * as "there is an upgrade" and labels a button accordingly.
     */
    updateAvailable: boolean;
    /** Taking this update replaces a local package source with its matched online release. */
    restoreRequired?: boolean;
    /**
     * The version this package's channel points at, when it differs from what
     * is installed and is NOT newer.
     *
     * A separate field rather than a second meaning for `updateAvailable`,
     * which was tried and leaked immediately: the market page has three
     * consumers of that flag (the header banner, "update all", the row
     * button) and all three announced a DOWNGRADE as "a new version is
     * available". One field, one meaning; a caller that has not been taught
     * about channel switches simply does not offer one.
     *
     * Only a channel-following package can be in this state, and it is the
     * state that used to be unreachable: picking "stable" while a prerelease
     * was installed compared 1.13.1 against 1.14.0-beta.1, found nothing
     * newer, and answered "up to date" — so there was no way back off a
     * channel the user had just left.
     */
    channelSwitch?: string;
}
/**
 * Semver precedence: negative / 0 / positive like a comparator, or null when
 * either side isn't a plain semver version. Build metadata is ignored, a
 * release outranks any prerelease of the same core, and prerelease
 * identifiers compare numerically when both are numeric (so `rc.10` > `rc.9`).
 */
export declare function compareVersions(a: string, b: string): number | null;
/**
 * True only when the registry's `latest` is semantically HIGHER than what the
 * profile has (#64 by @ZeroOrigin64). A plain `!==` also fires when a
 * package's `latest` dist-tag is left pointing at an OLDER release than the
 * pinned install — clicking "update" then rewrote the exact pin to `@latest`
 * and downgraded the profile until it no longer booted.
 *
 * Undecidable inputs (missing or non-semver versions) report no update:
 * without a direction we cannot promise the "update" isn't a downgrade.
 */
export declare function isUpgrade(installed: string | null, latest: string | null): boolean;
/** Drop the cached listing (after a successful install/update/uninstall). */
export declare function invalidateUpdates(): void;
/**
 * Point update checks at a registry. Called when the download region
 * resolves and whenever it changes.
 *
 * Dropping the cache is the load-bearing half. A mirror can lag the official
 * registry by minutes, so answers gathered from one are not answers from the
 * other — keeping them across a switch would report a version this registry
 * cannot yet serve.
 */
export declare function setUpdateRegistry(base: string): void;
/**
 * Evidence check behind the "wait a day" stale diagnosis (#45): whether the
 * package's CURRENT latest release was published recently enough to sit
 * inside pnpm's default fresh-release window. pnpm's silent hold leaves no
 * trace in its output, so the publish time is the only verifiable signal.
 * @returns true/false when the npm time metadata answers, null when it
 *   can't be determined (offline, unpublished, non-npm) — callers must NOT
 *   claim the safety wait on null.
 */
export declare function latestPublishedRecently(name: string, windowMs?: number): Promise<boolean | null>;
/** The registry's current `latest` version for a package, or null when it can't be read. */
/**
 * The version a channel subscriber should be offered: the newest build in
 * the set that channel is willing to receive.
 *
 * A channel is a SET, not a tag. Someone on beta has not stopped accepting
 * releases — they accept releases and prereleases — so beta means
 * {latest, beta} and dev means {latest, beta, dev}. Reading it as one tag
 * gets a real case wrong: once 1.14.0 ships, `beta` still points at
 * 1.14.0-beta.1 until the next prerelease is cut, and following that tag
 * literally would walk a subscriber BACKWARDS onto a build their channel
 * has already moved past.
 *
 * The nesting is also what makes a channel leavable. Going backwards is
 * only ever offered when the user narrows the set — picking stable while a
 * prerelease is installed drops `beta` out of it, so the answer becomes
 * `latest` and the market can finally offer the way back. That case used to
 * be unreachable: comparing 1.13.1 against an installed 1.14.0-beta.1 found
 * nothing newer and answered "up to date", so the control the user had just
 * used appeared to do nothing.
 *
 * @param stable - the `latest` version, already fetched by the caller.
 */
export declare function versionOnChannel(name: string, channel: Channel, stable: string | null): Promise<string | null>;
export declare function fetchNpmLatest(name: string): Promise<string | null>;
/** Per-plugin update checks; a failed check reports no update rather than failing the listing. */
export declare function checkUpdates(profile: string, force?: boolean, explicitDir?: string, 
/**
 * Packages that follow a release channel instead of plain `latest`. Only
 * ever the market itself: opting into early builds is volunteering to try
 * THIS plugin early, not a licence to pull every other author's
 * unreleased work.
 */
channelFor?: ReadonlyMap<string, Channel>, 
/**
 * Curated npm sources for `file:` installs that were matched to the market
 * catalog. `link:` workspaces remain development sources and are never
 * opted into online updates.
 */
onlineSourceFor?: ReadonlyMap<string, string>): Promise<Record<string, UpdateStatus>>;
