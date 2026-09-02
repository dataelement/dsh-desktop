/**
 * Registry-source knowledge: how a curated registry entry's URL maps to an
 * installable pnpm target. Pure string logic, no I/O.
 */
/** Registry tarball names must be plain npm package names, nothing fancier. */
export declare const NPM_NAME_RE: RegExp;
/**
 * Parse a registry source url: a github repo, optionally with a
 * `/tree/<branch>/<subpath>` suffix (how the curated list links monorepo
 * subpackages, e.g. dsh-plugins#theme-gallery).
 */
export declare function parseSourceUrl(url: string): {
    repo: string;
    subpath: string | null;
} | null;
/** Parse repository forms accepted by package.json.repository. */
export declare function parseGitHubRepository(value: string): {
    repo: string;
} | null;
/**
 * Parse a Git remote. Unlike package metadata, a local origin may contain a
 * proxy prefix (for example `https://proxy/https://github.com/o/r.git`). In
 * that case only the last GitHub occurrence is considered.
 */
export declare function parseGitHubRemote(url: string): {
    repo: string;
} | null;
/** Normalized repo identity shared by server discovery and client matching. */
export declare function githubRepoIdentity(url: string, directory?: string | null): string | null;
/**
 * Repository evidence used for installed-source matching. A monorepo package
 * contributes both its collection root and exact subpath, mirroring the
 * identities extracted from `github:owner/repo#path:/package` specs.
 */
export declare function githubRepoIdentities(url: string, directory?: string | null): string[];
/** Weak identity hints from a local Git origin; never used to reject a unique match. */
export declare function githubRemoteIdentities(url: string, directory?: string | null): string[];
/** GitHub `owner/repo` for a registry URL, or null when it is not a GitHub repo URL. */
export declare function repoOf(url: string): string | null;
/**
 * A commit-pinned codeload tarball URL, optionally behind a prefix proxy.
 *
 * Pinned to a SHA rather than `HEAD` on purpose. pnpm records whatever URL
 * it was given, and the profile's version detection reads the installed
 * commit back out of the lockfile by matching `codeload.github.com/owner/
 * repo/tar.gz/<40 hex>` (src/profile.ts). A `HEAD` URL installs fine and
 * then reports no version forever, which is a worse outcome than being slow.
 *
 * @param repo - `owner/repo`.
 * @param sha - full 40-character commit SHA.
 * @param proxy - prefix proxy, or null to address codeload directly.
 */
export declare function codeloadTarball(repo: string, sha: string, proxy: string | null): string;
/**
 * Normalized identity of an install target, for comparing two targets that
 * may be spelled differently — lowercased, matching `githubRepoIdentity`.
 *
 * @returns the identity, or null when the spec is not a GitHub source (an
 * npm package name, a `file:` link, anything else).
 */
export declare function repoOfTarget(spec: string): string | null;
/**
 * The branch or tag a GitHub spec selects, or null for the default branch.
 *
 * Update detection has to ask about the same ref the install used, or it
 * compares the installed commit against a line the user never chose (#446).
 * A commit pin yields null: the answer for a pinned install is the default
 * branch, which is what "is there something newer" means there.
 */
export declare function githubRefOfTarget(spec: string): string | null;
/**
 * An immutable GitHub commit already carried by an install target.
 *
 * Build-script approval on pnpm below 11.21 needs the exact commit-pinned
 * codeload key. Re-resolving HEAD after an install can race a repository push
 * and approve a different URL, so consume an existing pin whenever the spec
 * has one (#285/#385).
 */
export declare function githubCommitOfTarget(spec: string): string | null;
/**
 * Pin a GitHub shortcut to one immutable commit without losing its subpath.
 * Revision selectors are replaced; one valid `path:` selector is preserved.
 */
export declare function githubTargetAtCommit(spec: string, sha: string): string | null;
/**
 * The allowBuilds key that actually authorizes a git-hosted dependency's
 * build scripts. Verified against pnpm 11.21 (#68 by @yzr278892): for a
 * `github:owner/repo` install, a bare `name: true` entry does NOT match —
 * pnpm's own hint names a commit-pinned codeload URL that changes on every
 * push; the stable form that matches is `name@git+https://github.com/owner/repo.git`.
 *
 * A legacy China-region install may address the SAME repo through a proxied
 * codeload URL, and must authorize under the same key: the plugin a user
 * approved build scripts for does not become a different plugin because its
 * stored source spelling differs.
 *
 * @param name - installed package name.
 * @param spec - the dependency spec from package.json, or the install target.
 * @returns the stable key, or null when the spec is not github-hosted.
 */
export declare function gitAllowBuildsKey(name: string, spec: string): string | null;
/**
 * The OTHER allowBuilds key form, for pnpm below 11.21 (#285 by @omdsh-dev,
 * following #267).
 *
 * The stable `name@git+https://…` key above is what pnpm 11.21+ matches, and
 * it is the better key precisely because it does not change when the
 * repository is pushed to. Older pnpm does not match it at all: 11.8.0 — the
 * version DSH Desktop still bundles — matches only the commit-pinned
 * codeload URL it names in its own `ERR_PNPM_GIT_DEP_PREPARE_NOT_ALLOWED`
 * message. On those versions the "allow build scripts and retry" button
 * could never work, because the key it wrote was one pnpm would never read.
 *
 * Both are written. The pinned form goes stale the moment the repository
 * moves, which is why it cannot REPLACE the stable one — but a stale entry
 * costs a line in a YAML file, and a missing one costs the user the only
 * button that could have unblocked them.
 *
 * @param sha - the commit the install will actually fetch.
 * @returns the key, or null when the spec is not github-hosted.
 */
export declare function codeloadAllowBuildsKey(name: string, spec: string, sha: string): string | null;
/**
 * The pnpm install target for a registry entry. Repo-verified npm packages
 * win, followed by author-supplied prebuilt GitHub Release tarballs; both avoid
 * full-repo downloads and local build scripts.
 * @returns the target spec, or null when the source url is unsupported.
 */
export declare function installTargetFor(entry: {
    url: string;
    npm?: unknown;
    tarball?: unknown;
}): string | null;
/** True for profile specs that are a local checkout or tarball, not a registry pin. */
export declare function isLocalSpec(spec: string): boolean;
/**
 * The catalog entry a locally linked / file: install should restore to.
 * Exact `#path:` identities win, then collection-root identities against
 * root-only catalog rows, then a unique name/npm match. A bare repo identity
 * never selects a root row while `/tree/` siblings exist for that repo —
 * the checkout did not say which package it is, and guessing wrong installs
 * a different plugin. Same-named forks without identities or a matching hint
 * stay unmatched rather than guessing.
 */
export declare function findCatalogEntryForLocal<T extends {
    name: string;
    npm?: string | null;
    url: string;
}>(plugins: readonly T[], name: string, identities?: readonly string[], hints?: readonly string[]): T | null;
/**
 * pnpm add target for restoring a local checkout onto a catalog entry.
 * When the catalog only lists the collection root but the checkout declared
 * `repository.directory`, keep that subdirectory — otherwise we install the
 * repo tarball and get the wrong package name (and its build scripts).
 */
export declare function restoreTargetForLocal(entry: {
    url: string;
    npm?: unknown;
}, identities?: readonly string[]): string | null;
/**
 * Dependency names that use pnpm's `workspace:` protocol.
 * Those specs only resolve inside the author's monorepo; a git `#path:`
 * install into a profile cannot see the sibling packages. pnpm installs
 * optional dependencies and auto-installs peers too, so all three maps are
 * scanned; devDependencies are never installed and stay out.
 */
export declare function workspaceProtocolDeps(manifest: unknown): string[];
/** Git subdirectory restores cannot satisfy `workspace:` dependencies. npm can. */
export declare function restoreBlockedByWorkspace(target: string, workspaceDeps: readonly string[]): boolean;
/**
 * The name an entry is ALREADY installed under, or null — the server-side
 * duplicate guard (#27): the same plugin listed under an alias entry must
 * never install twice (two loader entries with one id brick the next boot).
 *
 * Identity is subpath-aware so monorepo siblings stay independent: an entry
 * with a /tree/ subpath identifies as repo#path:/sub (never the bare repo),
 * while an installed dependency contributes its bare repo AND its #path:
 * form — so a collection root still matches the pieces it was retargeted
 * into, but two different subpackages of one repo never cross-match.
 */
export declare function findInstalledAlias(entry: {
    name: string;
    npm?: unknown;
    url: string;
}, installed: Record<string, string>): string | null;
