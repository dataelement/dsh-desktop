/**
 * Update notes: what changed between an installed version and HEAD.
 *
 * Every byte of GitHub data comes from the catalog side's daily probe,
 * published as the `dsh-plugin-updates` package (origin fallback
 * `updates.json` beside `plugins.json`). The market asks GitHub for nothing:
 * anonymous REST quota is shared per egress IP and already unreliable behind
 * common proxies, and this data is wanted by thousands of markets but
 * produced perfectly well once a day by one probe.
 *
 * What the catalog cannot know is where each user's installed version sits,
 * so slicing the commit tail at that boundary happens here: the same sha the
 * update check resolved (`current`) marks where "new" begins. A tail that
 * does not contain it means the range is wider than the tail — those are
 * labelled recent commits rather than pretending to be an exact interval.
 * Plugins with neither notes nor commits fall back to npm publish times, and
 * a plugin nothing answers for gets a neutral "no notes" — absence of release
 * notes is the ordinary condition of small plugins, not a defect.
 */
export interface ReleaseNotes {
    tag: string | null;
    name: string | null;
    publishedAt: string | null;
    url: string | null;
    body: string;
}
export interface CommitNote {
    sha: string;
    message: string;
    date: string | null;
}
interface UpdatesEntry {
    release?: ReleaseNotes | null;
    commits?: CommitNote[];
}
interface UpdatesPayload {
    count?: number;
    updates?: Record<string, UpdatesEntry>;
}
/**
 * The update-notes payload from whichever route the region serves.
 *
 * Same source order as the catalog itself — the npm package first where one
 * exists (its mirror reach is the reason the package exists), then the
 * origin. Version-keyed like the catalog too: an unchanged payload costs one
 * packument read per TTL, not a tarball.
 */
export declare function loadUpdateNotes(force?: boolean): Promise<UpdatesPayload>;
/** Drop the cached payload (nothing currently invalidates it mid-process). */
export declare function invalidateUpdateNotes(): void;
/**
 * Slice the commit tail at the installed sha.
 *
 * @returns the commits newer than `installed`, and whether the boundary was
 *   actually found — `found === false` means the range is wider than the tail
 *   (or history diverged), so callers must label the result "recent" rather
 *   than exact.
 */
export declare function sliceCommitsAt(items: CommitNote[], installed: string | null): {
    items: CommitNote[];
    found: boolean;
};
/** The repo url key an entry's update notes live under, or null. */
export declare function repoKeyOf(spec: string): string | null;
/**
 * Look an entry up by its catalog url.
 *
 * The catalog keys entries by the url as listed (author's casing preserved);
 * the market resolves repos to lowercase (as every other consumer of
 * `repoOfTarget` sees them). Match case-insensitively so the two sides never
 * disagree over a capital letter.
 */
export declare function entryForRepo(payload: UpdatesPayload, key: string): UpdatesEntry | undefined;
export declare function npmPublishTimes(name: string): Promise<{
    version: string;
    date: string;
}[]>;
/** Everything the dialog renders for one plugin, already resolved. */
export interface UpdateNotes {
    kind: 'release' | 'commits' | 'npm' | 'none';
    /** Present for `release`: the author's own notes for the latest release. */
    release?: ReleaseNotes;
    /** Present for `commits`: the tail, sliced when the boundary was found. */
    commits?: {
        items: CommitNote[];
        found: boolean;
    };
    /** Present for `npm`: recent versions with their publish dates. */
    npmTimes?: {
        version: string;
        date: string;
    }[];
}
/**
 * Resolve the notes for one installed plugin, or `{ kind: 'none' }`.
 *
 * Never throws: every failure along the way degrades to the next tier, the
 * same contract the issue promised — a dialog that cannot load its data shows
 * a neutral statement, not an error.
 */
export declare function updateNotesFor(profile: string, explicitDir: string | undefined, name: string): Promise<UpdateNotes>;
export {};
