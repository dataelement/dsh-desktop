/**
 * Registry-source knowledge: how a curated registry entry's URL maps to an
 * installable pnpm target. Pure string logic, no I/O.
 */
const REPO_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
function validSubpath(subpath) {
    if (!/^[A-Za-z0-9_./-]+$/.test(subpath))
        return false;
    return !subpath.split('/').some(seg => seg === '' || seg === '.' || seg === '..');
}
/** Registry tarball names must be plain npm package names, nothing fancier. */
export const NPM_NAME_RE = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
/**
 * A curated, prebuilt GitHub Release archive accepted as a pnpm target —
 * but only one belonging to `repo`, the entry's own `owner/name`.
 *
 * The binding is the whole point. `npm` gets the same treatment one branch
 * up (repo-verified, "name-squatting protection"); without it here, an entry
 * could name a trusted repo and install an archive from somewhere else:
 *
 *     url:     https://github.com/good/plugin
 *     tarball: https://github.com/evil/repo/releases/download/v1/p.tgz
 *
 * That is also why the release CDNs (`objects.githubusercontent.com`,
 * `release-assets.githubusercontent.com`) are not accepted: their paths
 * carry no owner or repo, so there is nothing to bind the archive to and no
 * way to tell whose release it is. All 70 entries carrying `tarball` today
 * use github.com and match their own repo, so nothing real is turned away.
 */
function releaseTarballTarget(value, repo) {
    if (typeof value !== 'string')
        return null;
    const target = value.trim();
    let url;
    try {
        url = new URL(target);
    }
    catch {
        return null;
    }
    if (url.protocol !== 'https:' || url.hostname !== 'github.com')
        return null;
    if (!url.pathname.endsWith('.tgz') && !url.pathname.endsWith('.tar.gz'))
        return null;
    // /{owner}/{repo}/releases/... — the two leading segments must be the
    // entry's own. GitHub treats them case-insensitively, so we do too.
    const segments = url.pathname.split('/').filter(segment => segment !== '');
    if (segments.length < 4 || segments[2] !== 'releases')
        return null;
    return `${segments[0]}/${segments[1]}`.toLowerCase() === repo.toLowerCase() ? target : null;
}
/**
 * Parse a registry source url: a github repo, optionally with a
 * `/tree/<branch>/<subpath>` suffix (how the curated list links monorepo
 * subpackages, e.g. dsh-plugins#theme-gallery).
 */
export function parseSourceUrl(url) {
    const m = /^https:\/\/github\.com\/([^/]+\/[^/]+?)(?:\/tree\/[^/]+\/(.+?))?\/?$/.exec(url);
    if (m === null || !REPO_RE.test(m[1]))
        return null;
    const subpath = m[2] ?? null;
    if (subpath !== null) {
        // No empty/dot segments: `..` would escape the repo in the #path: selector.
        if (!validSubpath(subpath))
            return null;
    }
    return { repo: m[1], subpath };
}
function repoFromParts(owner, name) {
    const repoName = name.replace(/\.git$/i, '');
    const repo = `${owner}/${repoName}`;
    return REPO_RE.test(repo) ? { repo } : null;
}
/** Parse repository forms accepted by package.json.repository. */
export function parseGitHubRepository(value) {
    const input = value.trim();
    const shortcut = /^(?:github:)?([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?(?:#.*)?$/i.exec(input);
    if (shortcut !== null)
        return repoFromParts(shortcut[1], shortcut[2]);
    const remote = input.replace(/^git\+/i, '');
    const web = /^(?:https?|git|ssh):\/\/(?:git@)?github\.com[/:]([^/]+)\/([^/?#]+)\/?(?:[?#].*)?$/i.exec(remote);
    const scp = /^git@github\.com:([^/]+)\/([^/?#]+)$/i.exec(remote);
    const match = web ?? scp;
    return match === null ? null : repoFromParts(match[1], match[2]);
}
/**
 * Parse a Git remote. Unlike package metadata, a local origin may contain a
 * proxy prefix (for example `https://proxy/https://github.com/o/r.git`). In
 * that case only the last GitHub occurrence is considered.
 */
export function parseGitHubRemote(url) {
    const exact = parseGitHubRepository(url);
    if (exact !== null)
        return exact;
    const matches = [...url.matchAll(/github\.com[/:]([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?(?=$|[/?#])/ig)];
    const match = matches.at(-1);
    return match === undefined ? null : repoFromParts(match[1], match[2]);
}
/** Normalized repo identity shared by server discovery and client matching. */
export function githubRepoIdentity(url, directory) {
    const source = parseGitHubRepository(url);
    if (source === null)
        return null;
    const repo = source.repo.toLowerCase();
    if (directory === undefined || directory === null || directory.trim() === '')
        return repo;
    const subpath = directory.trim().replaceAll('\\', '/').replace(/^\/+|\/+$/g, '');
    return validSubpath(subpath) ? `${repo}#path:/${subpath.toLowerCase()}` : null;
}
/**
 * Repository evidence used for installed-source matching. A monorepo package
 * contributes both its collection root and exact subpath, mirroring the
 * identities extracted from `github:owner/repo#path:/package` specs.
 */
export function githubRepoIdentities(url, directory) {
    const identity = githubRepoIdentity(url, directory);
    if (identity === null)
        return [];
    const pathAt = identity.indexOf('#path:/');
    return pathAt === -1 ? [identity] : [identity.slice(0, pathAt), identity];
}
/** Weak identity hints from a local Git origin; never used to reject a unique match. */
export function githubRemoteIdentities(url, directory) {
    const source = parseGitHubRemote(url);
    if (source === null)
        return [];
    return githubRepoIdentities(`https://github.com/${source.repo}`, directory);
}
/** GitHub `owner/repo` for a registry URL, or null when it is not a GitHub repo URL. */
export function repoOf(url) {
    return parseSourceUrl(url)?.repo ?? null;
}
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
export function codeloadTarball(repo, sha, proxy) {
    const direct = `https://codeload.github.com/${repo}/tar.gz/${sha}`;
    return proxy === null ? direct : `${proxy}/${direct}`;
}
/**
 * The GitHub source behind an install target, in whatever spelling that
 * target uses — `owner/repo` in its ORIGINAL case, plus any `#path:`
 * subpath.
 *
 * Current installs use `github:` shortcuts. Older regional installs can
 * still carry a prefix-proxied codeload tarball, so both spellings resolve
 * here during update, duplicate detection, and recovery.
 */
function githubShortcut(spec) {
    const shortcut = /^github:([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+?)(?:\.git)?(?:#(.*))?$/.exec(spec);
    if (shortcut === null)
        return null;
    // Any non-path fragment is accepted (`#semver:`, a bare ref) because only
    // `path:` changes which plugin this is; the rest select a version of the
    // same one. pnpm permits a revision and subpath together as
    // `#<revision>&path:/sub`, which is what a mirror-resolved collection
    // install uses (#385).
    let subpath = null;
    for (const selector of (shortcut[2] ?? '').split('&')) {
        const pathMatch = /^path:\/(.+)$/.exec(selector);
        if (pathMatch === null)
            continue;
        const candidate = pathMatch[1];
        if (subpath !== null || !validSubpath(candidate))
            return null;
        subpath = candidate;
    }
    return { repo: shortcut[1], subpath };
}
function repoFromTarget(spec) {
    const shortcut = githubShortcut(spec);
    if (shortcut !== null)
        return shortcut;
    // A codeload tarball, direct or proxied. Matched as a substring for the
    // same reason profile.ts does: the proxy sits in FRONT of the real URL,
    // so anchoring the pattern would see only the proxy's own hostname.
    const tarball = /codeload\.github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)\/tar\.gz\/[0-9a-f]{40}/.exec(spec);
    return tarball === null ? null : { repo: tarball[1], subpath: null };
}
/**
 * Normalized identity of an install target, for comparing two targets that
 * may be spelled differently — lowercased, matching `githubRepoIdentity`.
 *
 * @returns the identity, or null when the spec is not a GitHub source (an
 * npm package name, a `file:` link, anything else).
 */
export function repoOfTarget(spec) {
    const parsed = repoFromTarget(spec);
    if (parsed === null)
        return null;
    const repo = parsed.repo.toLowerCase();
    return parsed.subpath === null ? repo : `${repo}#path:/${parsed.subpath.toLowerCase()}`;
}
/**
 * The branch or tag a GitHub spec selects, or null for the default branch.
 *
 * Update detection has to ask about the same ref the install used, or it
 * compares the installed commit against a line the user never chose (#446).
 * A commit pin yields null: the answer for a pinned install is the default
 * branch, which is what "is there something newer" means there.
 */
export function githubRefOfTarget(spec) {
    if (!spec.startsWith('github:'))
        return null;
    const fragmentAt = spec.indexOf('#');
    if (fragmentAt === -1)
        return null;
    for (const selector of spec.slice(fragmentAt + 1).split('&')) {
        if (selector === '' || selector.startsWith('path:/'))
            continue;
        if (/^[0-9a-f]{40}$/i.test(selector))
            continue;
        if (selector.startsWith('semver:'))
            continue;
        return selector;
    }
    return null;
}
/**
 * An immutable GitHub commit already carried by an install target.
 *
 * Build-script approval on pnpm below 11.21 needs the exact commit-pinned
 * codeload key. Re-resolving HEAD after an install can race a repository push
 * and approve a different URL, so consume an existing pin whenever the spec
 * has one (#285/#385).
 */
export function githubCommitOfTarget(spec) {
    const shortcut = githubShortcut(spec);
    const revision = shortcut === null ? null : /^github:[^#]+#([0-9a-f]{40})(?:&|$)/.exec(spec);
    if (revision !== null)
        return revision[1];
    const tarball = /codeload\.github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/tar\.gz\/([0-9a-f]{40})(?:[?#][^\s]*)?$/.exec(spec);
    return tarball === null ? null : tarball[1];
}
/**
 * Pin a GitHub shortcut to one immutable commit without losing its subpath.
 * Revision selectors are replaced; one valid `path:` selector is preserved.
 */
export function githubTargetAtCommit(spec, sha) {
    if (!/^[0-9a-f]{40}$/.test(sha))
        return null;
    const parsed = githubShortcut(spec);
    if (parsed === null)
        return null;
    return `github:${parsed.repo}#${sha}${parsed.subpath === null ? '' : `&path:/${parsed.subpath}`}`;
}
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
export function gitAllowBuildsKey(name, spec) {
    const parsed = repoFromTarget(spec);
    // Original case, not the normalized identity: this key is matched by pnpm
    // as a literal string, so it has to name the repo the way the spec did.
    // Subpath entries authorize under the repo itself — the `#path:` selector
    // picks a directory out of the same download.
    return parsed === null ? null : `${name}@git+https://github.com/${parsed.repo}.git`;
}
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
export function codeloadAllowBuildsKey(name, spec, sha) {
    const parsed = repoFromTarget(spec);
    if (parsed === null || !/^[0-9a-f]{40}$/.test(sha))
        return null;
    return `${name}@https://codeload.github.com/${parsed.repo}/tar.gz/${sha}`;
}
/**
 * The pnpm install target for a registry entry. Repo-verified npm packages
 * win, followed by author-supplied prebuilt GitHub Release tarballs; both avoid
 * full-repo downloads and local build scripts.
 * @returns the target spec, or null when the source url is unsupported.
 */
export function installTargetFor(entry) {
    const source = parseSourceUrl(entry.url);
    if (source === null)
        return null;
    if (typeof entry.npm === 'string' && NPM_NAME_RE.test(entry.npm))
        return entry.npm;
    const tarball = releaseTarballTarget(entry.tarball, source.repo);
    if (tarball !== null)
        return tarball;
    return source.subpath !== null
        ? `github:${source.repo}#path:/${source.subpath}`
        : `github:${source.repo}`;
}
/** True for profile specs that are a local checkout or tarball, not a registry pin. */
export function isLocalSpec(spec) {
    return /^(?:link|file):/i.test(spec);
}
/**
 * Keys a catalog URL contributes to restore matching.
 * A `/tree/` entry is ONLY its exact `#path:` id — never the bare repo —
 * so a collection-root identity cannot select a sibling subpackage.
 */
function catalogMatchKeys(url) {
    const source = parseSourceUrl(url);
    if (source === null)
        return { path: null, repo: null };
    const repo = source.repo.toLowerCase();
    return source.subpath === null
        ? { path: null, repo }
        : { path: `${repo}#path:/${source.subpath.toLowerCase()}`, repo: null };
}
/**
 * The catalog entry a locally linked / file: install should restore to.
 * Exact `#path:` identities win, then collection-root identities against
 * root-only catalog rows, then a unique name/npm match. A bare repo identity
 * never selects a root row while `/tree/` siblings exist for that repo —
 * the checkout did not say which package it is, and guessing wrong installs
 * a different plugin. Same-named forks without identities or a matching hint
 * stay unmatched rather than guessing.
 */
export function findCatalogEntryForLocal(plugins, name, identities = [], hints = []) {
    const nameKey = name.toLowerCase();
    const byName = plugins.filter(plugin => plugin.name.toLowerCase() === nameKey
        || (typeof plugin.npm === 'string' && plugin.npm.toLowerCase() === nameKey));
    const identitySet = new Set(identities.map(value => value.toLowerCase()));
    const hintSet = new Set(hints.map(value => value.toLowerCase()));
    const treeRepos = new Set();
    for (const plugin of plugins) {
        const keys = catalogMatchKeys(plugin.url);
        if (keys.path !== null)
            treeRepos.add(keys.path.slice(0, keys.path.indexOf('#path:/')));
    }
    if (identitySet.size > 0) {
        const pathHit = plugins.find(plugin => {
            const keys = catalogMatchKeys(plugin.url);
            return keys.path !== null && identitySet.has(keys.path);
        });
        if (pathHit !== undefined)
            return pathHit;
        const rootHit = plugins.find(plugin => {
            const keys = catalogMatchKeys(plugin.url);
            if (keys.repo === null || !identitySet.has(keys.repo))
                return false;
            return !treeRepos.has(keys.repo) || byName.includes(plugin);
        });
        if (rootHit !== undefined)
            return rootHit;
    }
    if (byName.length === 1)
        return byName[0];
    if (byName.length > 1 && hintSet.size > 0) {
        const hinted = byName.find((plugin) => {
            const keys = catalogMatchKeys(plugin.url);
            return (keys.path !== null && hintSet.has(keys.path)) || (keys.repo !== null && hintSet.has(keys.repo));
        });
        if (hinted !== undefined)
            return hinted;
    }
    return null;
}
/**
 * pnpm add target for restoring a local checkout onto a catalog entry.
 * When the catalog only lists the collection root but the checkout declared
 * `repository.directory`, keep that subdirectory — otherwise we install the
 * repo tarball and get the wrong package name (and its build scripts).
 */
export function restoreTargetForLocal(entry, identities = []) {
    const base = installTargetFor(entry);
    if (base === null)
        return null;
    if (!base.startsWith('github:') || base.includes('#path:/'))
        return base;
    const repo = base.slice('github:'.length).toLowerCase();
    for (const raw of identities) {
        const id = raw.toLowerCase();
        const prefix = `${repo}#path:/`;
        if (!id.startsWith(prefix))
            continue;
        const subpath = id.slice(prefix.length);
        if (validSubpath(subpath))
            return `github:${base.slice('github:'.length)}#path:/${subpath}`;
    }
    return base;
}
/**
 * Dependency names that use pnpm's `workspace:` protocol.
 * Those specs only resolve inside the author's monorepo; a git `#path:`
 * install into a profile cannot see the sibling packages. pnpm installs
 * optional dependencies and auto-installs peers too, so all three maps are
 * scanned; devDependencies are never installed and stay out.
 */
export function workspaceProtocolDeps(manifest) {
    if (typeof manifest !== 'object' || manifest === null)
        return [];
    const seen = new Set();
    const names = [];
    for (const field of ['dependencies', 'optionalDependencies', 'peerDependencies']) {
        const deps = manifest[field];
        if (typeof deps !== 'object' || deps === null)
            continue;
        for (const [name, spec] of Object.entries(deps)) {
            if (typeof spec === 'string' && spec.startsWith('workspace:') && !seen.has(name)) {
                seen.add(name);
                names.push(name);
            }
        }
    }
    return names;
}
/** Git subdirectory restores cannot satisfy `workspace:` dependencies. npm can. */
export function restoreBlockedByWorkspace(target, workspaceDeps) {
    return workspaceDeps.length > 0 && target.startsWith('github:');
}
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
export function findInstalledAlias(entry, installed) {
    const source = parseSourceUrl(entry.url);
    const entryRepoId = source === null
        ? null
        : source.subpath === null
            ? source.repo.toLowerCase()
            : `${source.repo.toLowerCase()}#path:/${source.subpath.toLowerCase()}`;
    const ids = new Set([entry.name.toLowerCase()]);
    if (typeof entry.npm === 'string' && entry.npm !== '')
        ids.add(entry.npm.toLowerCase());
    if (entryRepoId !== null)
        ids.add(entryRepoId);
    for (const [name, spec] of Object.entries(installed)) {
        const dep = new Set([name.toLowerCase()]);
        const scoped = /^@([^/]+)\/(.+)$/.exec(name);
        if (scoped !== null)
            dep.add(`${scoped[1]}/${scoped[2]}`.toLowerCase());
        const repoId = repoOfTarget(spec);
        if (repoId !== null) {
            dep.add(repoId.split('#path:/')[0]);
            dep.add(repoId);
            // Repo evidence on both sides is decisive (#66): the curated registry
            // lists distinct plugins under one name (both dsh-usage-stats, four
            // dsh-memory…), so a github-installed dependency is the entry's plugin
            // only if the REPOS agree — a bare name coincidence must not count.
            if (entryRepoId !== null) {
                if (dep.has(entryRepoId))
                    return name;
                continue;
            }
        }
        for (const id of dep)
            if (ids.has(id))
                return name;
    }
    return null;
}
