/**
 * HTTP routes bridging the browser market UI to the host. This layer only
 * parses requests, calls the service modules, and serializes responses —
 * process spawning lives in dsh-cli.ts, filesystem reads in profile.ts,
 * orchestration in install.ts / themes.ts / updates.ts.
 *
 * Security: the install route executes a shell command, so it accepts only
 * same-origin POSTs and only sources present in the curated registry.
 */
import { existsSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { load as loadYaml } from 'js-yaml';
import { forgetCatalog, loadRegistry, pluginCategories } from "./registry.js";
import { cleanHotDir, hotMount, hotUnmount, listHotMounts, MAX_NOTE, mountClientOnlyDeps, purgeMarketState, readMarketState, writeMarketState, } from "./hot.js";
import { createGroup, deleteGroup, removeFromGroups, renameGroup, setGroupMembers } from "./groups.js";
import { dshHostInfo } from "./dsh-install.js";
import { configurePersistentLog, exportLogs, logEvent, readPersistentLog } from "./log.js";
import { marketFetch } from "./net.js";
import { diagnosePackageManifests } from "./diagnostics.js";
import { BOOT_ID, cancelActive, probePnpm, progress, provisionPnpm, runDshPlugin, TARGET_RE, } from "./dsh-cli.js";
import { addProfileBundle, dropFromManifest, hasLoadableEntry, INBOX_BUNDLES, isDshProfileName, profileDir, readInstalled, readInstalledManifest, readInstalledRepoEvidence, readInstalledVersion, readLockCommits, readProfileBundles, readProfileManifestSnapshot, removeProfileBundle, restoreProfileManifest, setAllowBuilds } from "./profile.js";
import { assessProfile, classifyPeer, introducedDuplicateNames, introducedRisks } from "./compatibility.js";
import { runningAgentIds } from "./agents.js";
import { analyzeProfile } from "./check.js";
import { applyBundleOrder, mergeOrder, readBundleRules, readBundleStack, validateOrder } from "./order.js";
import { applyPreset, deletePreset, listPresets, previewPreset, savePreset } from "./presets.js";
import { createProfileSnapshot, DEFAULT_MAX_SNAPSHOTS, deleteSnapshot, listSnapshots, restoreSnapshot } from "./snapshot.js";
import { trialValidate } from "./trial.js";
import { codeloadAllowBuildsKey, findCatalogEntryForLocal, findInstalledAlias, githubCommitOfTarget, githubTargetAtCommit, gitAllowBuildsKey, installTargetFor, isLocalSpec, NPM_NAME_RE, repoOfTarget, restoreBlockedByWorkspace, restoreTargetForLocal, workspaceProtocolDeps } from "./sources.js";
import { failureDetail, groupConflictsByOwner, isStaleUpdate, parseIgnoredBuilds, parsePrepareNotAllowed, RELEASE_AGE_OVERRIDE, retargetCollections, validateAddedPlugins, withHoistRecovery } from "./install.js";
import { asChannel, CHANNELS, DIST_TAG, resolveChannel } from "./channels.js";
import { asRegion, REGIONS, routesFor, setActiveRegion } from "./regions.js";
import { resolveRegion } from "./region-probe.js";
import { acceleratedTarget, resolveHeadCommit } from "./accelerate.js";
import { updateNotesFor } from "./changelog.js";
import { checkUpdates, compareVersions, fetchNpmLatest, invalidateUpdates, isUpgrade, latestPublishedRecently, setUpdateRegistry, versionOnChannel } from "./updates.js";
import { createThemeManager } from "./themes.js";
import { readJsonBody, sameOrigin, sendJson } from "./http.js";
import { detectedDebugger, detectedSupervisor, restartAllowed, scheduleRestart, servingPort, trustedRestartRequest, trustedDownloadRequest } from "./restart.js";
import { activationAfterReplace, brokenClientBundles, checkClientBundle, hasHostHalf, newlyBrokenBundles, verifyActivation } from "./verify.js";
import { carrierDisableIds, disableRow, enableRow, findUserPatchPath, isProtectedModule, packagePatchFlags, readUserPatchState, removeRowBlocks, rowIdsForPackage, userPatchPackageReferences, } from "./patch.js";
import { createProfileBackup, downloadWebdav, MAX_BACKUP_BYTES, mergeRestoreManifest, restoreProfileBackup, unportableDeps, uploadWebdav, } from "./backup.js";
import { createGist, fitsGistLimit, GistError, gistErrorCode, parseGistId, readGist, resolveGistTokenSource, updateGist, verifyGistToken, } from "./gist.js";
import { MAX_UPDATE_OPERATIONS_V1, UpdateOperationStoreV1, UPDATE_API_V1_SCHEMA } from "./update-api-v1.js";
/**
 * Recognize the documented GitHub Release-download target shape. This does
 * not authorize a new URL: install trust remains catalog-bound in sources.ts,
 * while rollback only re-adds the exact direct URL already present in this
 * profile before the update. Keep it route-local and independent of any
 * unverified Desktop sidecar.
 */
function isGitHubReleaseTarballSpec(spec) {
    try {
        const url = new URL(spec);
        if (url.protocol !== 'https:' || url.hostname !== 'github.com')
            return false;
        const segments = url.pathname.split('/').filter(segment => segment !== '');
        return segments.length >= 6
            && segments[2] === 'releases'
            && segments[3] === 'download'
            && (url.pathname.endsWith('.tgz') || url.pathname.endsWith('.tar.gz'));
    }
    catch {
        return false;
    }
}
/**
 * The market's own version, read once from its installed package.json.
 *
 * The UI puts this in the page heading so a user's screenshot carries it:
 * most bug reports arrive as a photo of the screen, and without a version
 * in frame the first reply always has to ask which one it was.
 */
let cachedVersion = null;
export function marketVersion() {
    if (cachedVersion !== null)
        return cachedVersion;
    try {
        const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
        cachedVersion = manifest.version ?? 'unknown';
    }
    catch {
        cachedVersion = 'unknown';
    }
    return cachedVersion;
}
/** The market's own package names, as they appear in a profile manifest. */
const SELF_NAMES = new Set(['dshmarket', 'dsh-market']);
/**
 * Rebuild a GitHub target for an update.
 *
 * A commit pin is dropped so pnpm resolves the repository again — that is the
 * whole point of asking for an update. One valid `path:` selector is kept
 * because it identifies the package inside a monorepo; pnpm permits both in
 * one fragment (`#main&path:/packages/plugin`).
 *
 * A BRANCH or tag is kept, which used to be the same case as a commit and
 * was not (#446 by @Dave-12138). `github:owner/repo#publish` names the line
 * of development the user installed from; dropping it silently moved them to
 * the default branch on the next update — a source change wearing the word
 * "update". A 40-character hex selector is a pin worth discarding, and
 * anything else is a choice worth preserving. A short hex string stays too:
 * it is indistinguishable from a branch named `abc1234`, and keeping a pin
 * by mistake only means the update is a no-op, while dropping a branch by
 * mistake reinstalls different code.
 */
function githubUpdateTarget(spec) {
    const fragmentAt = spec.indexOf('#');
    if (fragmentAt === -1)
        return spec;
    const repo = spec.slice(0, fragmentAt);
    let subpath = null;
    let ref = null;
    for (const selector of spec.slice(fragmentAt + 1).split('&')) {
        if (!selector.startsWith('path:/')) {
            // `semver:<range>` selects a release line, so it is preserved for the
            // same reason a branch is.
            const isCommitPin = /^[0-9a-f]{40}$/i.test(selector);
            if (selector !== '' && !isCommitPin) {
                // Two refs in one fragment is not a shape pnpm produces; refuse to
                // guess which one the user meant and fall back to the bare repo.
                if (ref !== null)
                    return repo;
                ref = selector;
            }
            continue;
        }
        const candidate = selector.slice('path:/'.length);
        const valid = /^[A-Za-z0-9_./-]+$/.test(candidate)
            && !candidate.split('/').some(segment => segment === '' || segment === '.' || segment === '..');
        // Multiple path selectors are ambiguous; an invalid selector is never
        // forwarded to the package manager from a hand-edited profile.
        if (subpath !== null || !valid)
            return repo;
        subpath = candidate;
    }
    const selectors = [...(ref === null ? [] : [ref]), ...(subpath === null ? [] : [`path:/${subpath}`])];
    return selectors.length === 0 ? repo : `${repo}#${selectors.join('&')}`;
}
/**
 * Whether an installed package declares a client part (`dsh.client`). Its UI
 * is injected into the page, so toggling it needs a browser refresh to show
 * the change — the install flow prompts the same way via the hot banner.
 */
function packageHasClientPart(profileDirectory, name) {
    try {
        const manifest = JSON.parse(readFileSync(join(profileDirectory, 'node_modules', name, 'package.json'), 'utf8'));
        return manifest.dsh?.client !== undefined;
    }
    catch {
        return false;
    }
}
/**
 * Packages whose build scripts pnpm refused to run, from any of its three
 * reporting shapes: the structured ndjson event (pnpm 11), the human
 * "Ignored build scripts:" line, or the fetcher's git-prepare rejection —
 * which fires BEFORE the package lands in node_modules (#68). Undefined when
 * none, so the field can be spread straight into a JSON response.
 */
function blockedBuilds(result) {
    if (Array.isArray(result.ignoredBuilds) && result.ignoredBuilds.length > 0)
        return result.ignoredBuilds;
    const list = parseIgnoredBuilds(result.stdout, result.stderr);
    if (list.length > 0)
        return list;
    const pending = parsePrepareNotAllowed(result.stdout, result.stderr);
    return pending !== null ? [pending] : undefined;
}
/**
 * Register the market's HTTP routes.
 * @param host - Acquired webServer + shell services.
 * @param config - Validated market configuration.
 * @returns Disposer removing every registered route.
 */
export function mountMarketRoutes(host, config, commandRuntime, agentsLookup) {
    let disposed = false;
    // An ordinary profile must resolve under DSH_HOME by the same rules as the
    // DSH CLI. A host-authoritative explicit directory (DSH Desktop) does not
    // derive a path from this display/profile name.
    if (config.profileDirectory === undefined && !isDshProfileName(config.profile)) {
        // Loud on the way out. This throw happens inside a cordis effect, which
        // swallows it: the routes silently never mount and EVERY /dsh-market/*
        // request answers 404 with nothing anywhere saying why — the market
        // simply looks broken (#260 by @realguan). The log line is the only
        // thing that turns that into something diagnosable, so it is written
        // before the throw rather than left to a handler that never runs.
        const message = `dsh-market: invalid profile name ${JSON.stringify(config.profile)}; the market's routes were not mounted and every /dsh-market/* request will answer 404. Use the same non-empty, non-traversal profile name accepted by DSH, or pass an explicit profile directory.`;
        host.logger?.warn(`[dsh-market] ${message}`);
        logEvent('error', 'mount', message);
        throw new Error(message);
    }
    const activeProfileDir = profileDir(config.profile, config.profileDirectory);
    const persistentLogFile = join(activeProfileDir, '.dsh-market', 'log.ndjson');
    configurePersistentLog(persistentLogFile);
    let agentGuardUnavailableLogged = false;
    /** Running-agent ids for the mutation gate; logs once when the host exposes no agents service. */
    const runningAgentsForGuard = () => {
        const service = agentsLookup?.();
        const ids = runningAgentIds(service);
        if (service === undefined && !agentGuardUnavailableLogged) {
            agentGuardUnavailableLogged = true;
            logEvent('warn', 'agent-guard', 'host exposes no agents service — mutations are not guarded while agents run');
        }
        return ids;
    };
    /** Whether the host exposes a usable agents service (readable in /status). */
    const agentsGuardAvailable = () => {
        const service = agentsLookup?.();
        if (service === undefined)
            return false;
        try {
            return Array.isArray(service.list());
        }
        catch {
            return false;
        }
    };
    // The profile's user patch layer (cordis.patch.yml): toggles are written
    // here so DSH's own HMR re-composes the tree (no restart) and the loader
    // re-applies the same choice on every boot (ported from dsh-plugin-hub).
    const userPatchPath = findUserPatchPath(host, activeProfileDir);
    const commands = commandRuntime ?? { runPlugin: runDshPlugin, probePnpm, provisionPnpm, cancelActive };
    const supportsExactRollbackTarget = (target) => commands.supportsExactRollbackTarget?.(target) ?? TARGET_RE.test(target);
    // Snapshot retention cap (issue #98 supplement): a finite positive number
    // from the market config wins; anything else falls back to the default.
    const maxSnapshots = typeof config.maxSnapshots === 'number' && Number.isFinite(config.maxSnapshots) && config.maxSnapshots >= 1
        ? Math.floor(config.maxSnapshots)
        : DEFAULT_MAX_SNAPSHOTS;
    // Boot-time wipe: stale hot-mount inputs from a previous session must never
    // survive into a composition where the bundle layer already covers them.
    cleanHotDir(activeProfileDir);
    // The user's persisted choices: the generic disable list (legacy
    // disabledSkins loads transparently) plus custom groups. Every toggle,
    // group, install and uninstall mutates this shared state and persists it.
    const marketState = readMarketState(activeProfileDir);
    const disabled = marketState.disabled;
    const groups = marketState.groups;
    const groupOrder = marketState.groupOrder;
    // A choice made in a previous session outranks whatever the entry layer
    // composed, which is only ever a default.
    if (marketState.channel !== undefined)
        config.channel = marketState.channel;
    const activeChannel = () => resolveChannel(config.channel, marketVersion());
    // The download region: which mirrors every outbound request uses.
    //
    // `global` until something decides otherwise, so nothing waits on the
    // network to start serving. A machine with no region on record gets one
    // probed in the background below; a machine that already has one is
    // routed immediately.
    if (marketState.region !== undefined)
        config.region = marketState.region;
    let region = config.region ?? 'global';
    let regionAuto = marketState.regionAuto === true;
    const applyRegion = (next) => {
        region = next;
        // The shared holder every reader consults, plus the one consumer that
        // must also DROP state on a change: update answers gathered from the
        // other registry are not this registry's answers.
        setActiveRegion(next);
        setUpdateRegistry(routesFor(next).npmRegistry);
    };
    applyRegion(region);
    // Probe only when NOTHING has decided a region — not the saved state, and
    // not the composition either. An operator who wrote `region:` into their
    // profile has answered the question the probe exists to ask, and measuring
    // over the top of that answer would quietly override a deliberate choice a
    // few seconds after boot.
    if (config.region === undefined) {
        void resolveRegion(undefined).then(({ region: probed }) => {
            // A manual choice made while the probe was pending, or a replacement
            // mount created after this one was disposed, owns the region now.
            if (disposed || config.region !== undefined)
                return;
            applyRegion(probed);
            regionAuto = true;
            // Persisted as the decision, not re-probed each boot: a market that
            // silently changes routes between runs makes "it was fast yesterday"
            // impossible to investigate.
            marketState.region = probed;
            marketState.regionAuto = true;
            config.region = probed;
            writeMarketState(activeProfileDir, marketState);
            // The listing was fetched before the region was known.
            forgetCatalog();
            invalidateUpdates();
        }).catch(() => { });
    }
    const themes = createThemeManager(host, config.profile, disabled, activeProfileDir);
    /**
     * Re-sync the live closure state from disk. Snapshot restore writes
     * state.json directly (it must, to survive the next boot), which would
     * leave this in-memory `disabled`/`groups`/`groupOrder` stale —
     * the next toggle/groups write would then overwrite the restored values.
     * The objects are mutated in place (clear + refill) so every captured
     * reference (themes manager, live handlers) sees the fresh state (issue
     * #98 review M2).
     */
    function refreshMarketState() {
        const fresh = readMarketState(activeProfileDir);
        disabled.clear();
        for (const name of fresh.disabled)
            disabled.add(name);
        for (const key of Object.keys(groups))
            delete groups[key];
        Object.assign(groups, fresh.groups);
        groupOrder.length = 0;
        groupOrder.push(...fresh.groupOrder);
        // The three above are aliased objects other closures hold, so they are
        // mutated in place. These three are read off `marketState` itself and
        // were not being refreshed at all — which is #435: a note written
        // through this route reached disk, but `marketState.notes` still held
        // the empty object from boot, and the next write from that object put
        // the empty one back. The note survived a page reload (disk was right)
        // and vanished later, which is exactly what the reporter described.
        marketState.notes = fresh.notes;
        marketState.channel = fresh.channel;
        marketState.region = fresh.region;
        marketState.regionAuto = fresh.regionAuto;
    }
    // Client-only packages (dsh.client without dsh.bundle) are invisible to the
    // bundle layer in every boot; the market shim-mounts them so their client
    // bundles are actually served.
    void mountClientOnlyDeps(host, activeProfileDir).then(async (mounted) => {
        if (mounted.length > 0)
            logEvent('info', 'boot', `client-only shims mounted: ${mounted.join(', ')}`);
        // Replay the persisted disable list: bundle-layer plugins the user
        // switched away from get live-disabled again (bundle trees are
        // in-memory, so the disable never persists on its own). Client-only
        // shims for disabled plugins were already skipped by mountClientOnlyDeps.
        for (const name of disabled) {
            if (await themes.setEntryDisabled(name, true))
                logEvent('info', 'boot', `plugin kept off: ${name}`);
        }
    });
    // Self-healing guard: dsh's own patch overlay can re-update entries during
    // activation and wipe the runtime disabled flag — whenever a fiber comes
    // up for a plugin the user switched off, put it back down.
    host.on?.('internal/plugin', (fiber) => {
        const name = fiber.entry?.options?.name;
        if (name !== undefined && disabled.has(name))
            void themes.setEntryDisabled(name, true);
    });
    let installing = false;
    let restarting = false;
    // UI-state flags ONLY: mutual exclusion is enforced by withMutationLock
    // below (one promise chain every mutating route appends to), never by
    // these booleans — a promise-chain serialization cannot be raced by
    // interleaved awaits, and a second mutating request answers 409
    // immediately instead of queueing (issue #125 review).
    let writing = false;
    let mutationBusy = false;
    /** The shared mutation chain: every mutating operation appends to it. */
    let mutationChain = Promise.resolve();
    /**
     * Run a mutating operation under the shared mutation lock. `kind` selects
     * the UI busy flag (`install` = pnpm operation, `write` = direct profile
     * write) and the 409 message. The operation runs only after every earlier
     * mutation settled (promise chain); while one is in flight a second
     * mutating request answers 409 immediately — the UI polls /status for the
     * busy flag instead of queueing (issue #125 review).
     * @returns the operation's value, or null when the lock was busy (409 sent).
     */
    async function withMutationLock(response, kind, fn) {
        if (mutationBusy) {
            sendJson(response, 409, {
                error: kind === 'install' ? 'another install is already running' : 'another plugin operation is running',
            });
            return null;
        }
        mutationBusy = true;
        if (kind === 'install')
            installing = true;
        else
            writing = true;
        try {
            const run = mutationChain.then(async () => fn());
            mutationChain = run.catch(() => undefined);
            return await run;
        }
        finally {
            mutationBusy = false;
            if (kind === 'install')
                installing = false;
            else
                writing = false;
        }
    }
    /** Dependency diff vs. a pre-operation snapshot (cancel aftermath). */
    function changedSince(before) {
        const now = readInstalled(config.profile, activeProfileDir);
        const changed = new Set();
        for (const [name, spec] of Object.entries(now))
            if (before[name] !== spec)
                changed.add(name);
        for (const name of Object.keys(before))
            if (now[name] === undefined)
                changed.add(name);
        return { changed: [...changed], partial: changed.size > 0 };
    }
    /**
     * Apply one enable/disable request: persist the choice in state.json, then
     * drive the live composition. Covers every mount form — hot mounts and
     * client-only shims go through hotUnmount/hotMount, bundle-layer entries
     * through setEntryDisabled. Enabling a THEME goes through the caller's
     * activateTheme instead so the Themes tab's exclusivity stays intact.
     */
    async function setPluginEnabled(name, enabled) {
        const dir = activeProfileDir;
        if (enabled)
            disabled.delete(name);
        else
            disabled.add(name);
        let ok;
        let reason;
        if (enabled) {
            if (listHotMounts().includes(name)) {
                ok = true;
            }
            else if (await themes.setEntryDisabled(name, false)) {
                ok = true;
            }
            else {
                const result = await hotMount(host, dir, name);
                ok = result.ok;
                reason = result.reason ?? undefined;
            }
        }
        else {
            ok = await hotUnmount(name) || await themes.setEntryDisabled(name, true);
            if (!ok) {
                // Nothing was live (boot-skipped client shim, user-patch-managed
                // entry, or already off): the persisted flag is the contract.
                ok = true;
            }
        }
        writeMarketState(dir, { disabled, groups, groupOrder });
        return { ok, reason };
    }
    /**
     * Everything live in the running composition: market hot mounts plus
     * bundle-layer loader entries whose fiber is up (loaded at boot). This is
     * the source of truth for verifyActivation's `live` state — without the
     * loader side, every boot-loaded bundle plugin would read as "restart".
     */
    function liveNames() {
        const live = new Set(listHotMounts());
        for (const entry of host.loader.entries()) {
            if (entry.fiber === undefined)
                continue;
            if (entry.options.name !== undefined)
                live.add(entry.options.name);
            // Entry IDS too, under a `#` prefix that cannot collide with a package
            // name. A CARRIER bundle's row names the package it mounts, not
            // itself (#156: @tt-a1i/archify-dsh inserts an entry named
            // @deepseek-ai/dsh-skill-filesystem), so its own name never appears
            // here — but the id it created does, and that id is unique to its
            // patch. Verification needs both, and putting them in one set means
            // no call site can pass the names and forget the ids.
            if (entry.options.id !== undefined && entry.options.id !== '') {
                live.add(`#${entry.options.id}`);
                // Loader ids may carry an include prefix (`include:archify-…`).
                const bare = entry.options.id.split(':').pop();
                if (bare !== undefined && bare !== entry.options.id)
                    live.add(`#${bare}`);
            }
        }
        return live;
    }
    /**
     * Drop live hot mounts whose package was removed outside the market
     * (e.g. `dsh plugin remove` in a terminal): the stale mount would keep
     * serving a client bundle that 404s after refresh, wedging the page
     * until a restart (#29 by @SunYanbox).
     */
    async function dropStaleHotMounts() {
        for (const name of listHotMounts()) {
            if (existsSync(join(activeProfileDir, 'node_modules', name, 'package.json')))
                continue;
            await hotUnmount(name);
            logEvent('warn', 'hot-sweep', `${name}: package removed outside the market — live mount dropped`);
        }
    }
    /** Every plugin command goes through the pnpm-drift recovery wrapper (#20). */
    const runPlugin = (profile, args) => withHoistRecovery(commands.runPlugin, profile, args, activeProfileDir);
    /**
     * Undo a clean-exit update whose new build cannot boot. Restoring only the
     * manifest pin (the original #159 behavior) leaves the bad package files
     * on disk, and the boot resolves bundle patches from node_modules — the
     * next start still fails. Re-run pnpm install against the restored
     * manifest to rematerialize the previous build's files.
     */
    async function rollbackUpdateBuild(name, manifestBefore, rematerializeWhenManifestUnchanged = false) {
        const rolledBack = restoreProfileManifest(config.profile, manifestBefore, activeProfileDir);
        if (rolledBack.length === 0 && !rematerializeWhenManifestUnchanged)
            return { ok: true, detail: null };
        // CI=true (the market always runs pnpm that way) turns frozen-lockfile
        // on, and the restored manifest pin now disagrees with the lockfile the
        // bad add just wrote — without the flag this restore run fails with
        // ERR_PNPM_OUTDATED_LOCKFILE (measured). The age override lets pnpm
        // re-resolve a previous release that is still inside its fresh window.
        // Flags come BEFORE the command: preparePluginArgs treats the last arg as
        // the package target and rejects a trailing flag, while pnpm accepts the
        // same flags in front of `install`.
        const reinstall = await runPlugin(config.profile, ['--no-frozen-lockfile', RELEASE_AGE_OVERRIDE, 'install']);
        const ok = reinstall.exitCode === 0 && !reinstall.timedOut && !reinstall.cancelled;
        if (ok)
            logEvent('info', 'update', `${name}: previous build rematerialized (${rolledBack.join(', ')})`);
        return { ok, detail: ok ? null : failureDetail(reinstall) };
    }
    /**
     * Discriminated preflight for rollback state. readProfileManifestSnapshot
     * intentionally degrades read/parse failures to an empty profile for
     * diagnostics callers; an update must never mistake that fabricated empty
     * value for a rollback snapshot and erase real dependencies.
     */
    function captureUpdateManifest() {
        const file = join(activeProfileDir, 'package.json');
        try {
            const value = JSON.parse(readFileSync(file, 'utf8'));
            if (typeof value !== 'object' || value === null || Array.isArray(value)) {
                return { ok: false, detail: 'the profile package.json root is not an object' };
            }
            const manifest = value;
            if (manifest.dependencies !== undefined && (typeof manifest.dependencies !== 'object'
                || manifest.dependencies === null
                || Array.isArray(manifest.dependencies)
                || Object.values(manifest.dependencies).some(spec => typeof spec !== 'string'))) {
                return { ok: false, detail: 'the profile package.json dependency map is malformed' };
            }
            if (manifest.dsh !== undefined && (typeof manifest.dsh !== 'object'
                || manifest.dsh === null
                || Array.isArray(manifest.dsh))) {
                return { ok: false, detail: 'the profile package.json dsh field is malformed' };
            }
            const dsh = typeof manifest.dsh === 'object' && manifest.dsh !== null && !Array.isArray(manifest.dsh)
                ? manifest.dsh
                : undefined;
            if (dsh?.profile !== undefined && (typeof dsh.profile !== 'object'
                || dsh.profile === null
                || Array.isArray(dsh.profile))) {
                return { ok: false, detail: 'the profile package.json dsh.profile field is malformed' };
            }
            const profile = typeof dsh?.profile === 'object' && dsh.profile !== null && !Array.isArray(dsh.profile)
                ? dsh.profile
                : undefined;
            return {
                ok: true,
                snapshot: {
                    dependencies: { ...manifest.dependencies },
                    profileBundles: profile !== undefined && Object.hasOwn(profile, 'bundles')
                        ? { present: true, value: structuredClone(profile.bundles) }
                        : { present: false },
                },
            };
        }
        catch (error) {
            return { ok: false, detail: `the profile package.json could not be read: ${error instanceof Error ? error.message : String(error)}` };
        }
    }
    /** Exact pnpm importer state paired with one pre-update manifest snapshot. */
    function captureProfileLockfile() {
        const file = join(activeProfileDir, 'pnpm-lock.yaml');
        try {
            return { ok: true, snapshot: { present: true, contents: readFileSync(file) } };
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                return { ok: true, snapshot: { present: false } };
            }
            const detail = error instanceof Error ? error.message : String(error);
            return {
                ok: false,
                detail: `更新前无法读取 pnpm-lock.yaml，因此自动回滚不可用：${detail} / The pre-update pnpm-lock.yaml could not be read, so automatic rollback is unavailable: ${detail}`,
            };
        }
    }
    /** Resolved npm version for one dependency in a captured pnpm v9 importer. */
    function capturedNpmVersion(snapshot, name) {
        if (!snapshot.present)
            return null;
        try {
            const parsed = loadYaml(snapshot.contents.toString('utf8'));
            const dependency = parsed?.importers?.['.']?.dependencies?.[name];
            const raw = typeof dependency === 'string' ? dependency : dependency?.version;
            if (typeof raw !== 'string')
                return null;
            return /^(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)(?:\(|$)/.exec(raw)?.[1] ?? null;
        }
        catch {
            return null;
        }
    }
    /** Restore lockfile bytes atomically, or restore the fact it was absent. */
    function restoreProfileLockfile(snapshot) {
        const file = join(activeProfileDir, 'pnpm-lock.yaml');
        if (!snapshot.present) {
            try {
                rmSync(file, { force: true });
                return { ok: true, detail: null };
            }
            catch (error) {
                return { ok: false, detail: `the newly created lockfile could not be removed: ${error instanceof Error ? error.message : String(error)}` };
            }
        }
        const temp = `${file}.dsh-market-rollback-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        try {
            writeFileSync(temp, snapshot.contents);
            renameSync(temp, file);
            return { ok: true, detail: null };
        }
        catch (error) {
            try {
                rmSync(temp, { force: true });
            }
            catch { /* best-effort temp cleanup */ }
            return { ok: false, detail: `the pre-update lockfile could not be restored: ${error instanceof Error ? error.message : String(error)}` };
        }
    }
    /**
     * Re-add one immutable source while restoring both durable manifest spelling
     * and the exact pre-update importer/lock resolution around the command.
     * The second lock restore is load-bearing for floating tags: real pnpm 11
     * rewrites `latest` to an exact specifier during the add, and putting only
     * package.json back makes the next frozen install reject the profile.
     */
    async function rollbackExactTarget(name, manifestBefore, lockfileBefore, target, keepRepairedLock = false) {
        restoreProfileManifest(config.profile, manifestBefore, activeProfileDir);
        const preparedLock = restoreProfileLockfile(lockfileBefore);
        if (!preparedLock.ok)
            return preparedLock;
        let finalLockError = null;
        // The lock can already name the old identity while pnpm's package bytes
        // were replaced before the rejected update failed. A normal exact add is
        // then an "already up to date" no-op; --force is what rematerializes the
        // captured version/commit/archive instead of blessing corrupted bytes.
        const add = await runPlugin(config.profile, ['add', '--force', RELEASE_AGE_OVERRIDE, target]);
        // Exact recovery targets deliberately pin versions/commits. Keep the
        // user's durable range, tag, floating github shortcut, or release URL.
        restoreProfileManifest(config.profile, manifestBefore, activeProfileDir);
        // When an independently authoritative old identity (an installed npm
        // version or pinned Git manifest) disagrees with a missing/stale lock,
        // keep the exact add's repaired OLD resolution. Floating sources instead
        // need their captured importer/lock bytes back.
        if (!keepRepairedLock || add.exitCode !== 0 || add.timedOut || add.cancelled) {
            const restoredLock = restoreProfileLockfile(lockfileBefore);
            finalLockError = restoredLock.detail;
        }
        if (finalLockError !== null)
            return { ok: false, detail: finalLockError };
        if (add.exitCode !== 0 || add.timedOut || add.cancelled) {
            return { ok: false, detail: failureDetail(add) };
        }
        if (!hasLoadableEntry(activeProfileDir, name)) {
            return { ok: false, detail: 'the previous source was reinstalled without a loadable entry' };
        }
        return { ok: true, detail: null };
    }
    /** Restore the exact npm build that was on disk before the update. */
    async function rollbackNpmBuild(name, manifestBefore, beforeVersion, lockfileBefore) {
        const rollback = await rollbackExactTarget(name, manifestBefore, lockfileBefore, `${name}@${beforeVersion}`);
        if (!rollback.ok)
            return rollback;
        const restoredVersion = readInstalledVersion(config.profile, name, activeProfileDir);
        if (restoredVersion !== beforeVersion) {
            return { ok: false, detail: `expected v${beforeVersion} after rollback, found v${restoredVersion ?? 'unknown'}` };
        }
        logEvent('info', 'update-rollback', `${name}: restored npm build v${beforeVersion}`);
        return { ok: true, detail: null };
    }
    function exactGitRollbackTarget(target, beforeCommit) {
        return githubCommitOfTarget(target) === beforeCommit
            ? target
            : githubTargetAtCommit(target, beforeCommit);
    }
    /** Restore a github: update by re-adding the commit captured before it. */
    async function rollbackGitBuild(name, manifestBefore, target, beforeCommit, lockfileBefore, keepRepairedLock) {
        // Preserve an already immutable durable spelling (including a pinned
        // codeload URL). Rewriting that source to github: while keeping the
        // repaired lock would make its importer disagree with package.json.
        // Floating shortcuts still need to be converted to an exact commit.
        const rollbackTarget = exactGitRollbackTarget(target, beforeCommit);
        if (rollbackTarget === null) {
            return { ok: false, detail: 'the previous github target is invalid; nothing to roll back to' };
        }
        const rollback = await rollbackExactTarget(name, manifestBefore, lockfileBefore, rollbackTarget, keepRepairedLock);
        if (!rollback.ok)
            return rollback;
        const repoKey = repoOfTarget(rollbackTarget)?.split('#')[0] ?? null;
        const restoredCommit = repoKey === null
            ? null
            : readLockCommits(config.profile, activeProfileDir).get(repoKey.toLowerCase()) ?? null;
        if (restoredCommit !== beforeCommit) {
            return { ok: false, detail: `expected commit ${beforeCommit} after rollback, found ${restoredCommit ?? 'unknown'}` };
        }
        logEvent('info', 'update-rollback', `${name}: restored github build at ${beforeCommit}`);
        return { ok: true, detail: null };
    }
    async function executeUpdateRollback(name, manifestBefore, source) {
        if (source.kind === 'npm') {
            return rollbackNpmBuild(name, manifestBefore, source.beforeVersion, source.lockfileBefore);
        }
        if (source.kind === 'github') {
            return rollbackGitBuild(name, manifestBefore, source.target, source.beforeCommit, source.lockfileBefore, source.keepRepairedLock);
        }
        return rollbackUpdateBuild(name, manifestBefore, true);
    }
    const pendingRollbacks = new Map();
    let rollbackSequence = 0;
    function captureProfileStateFingerprint() {
        try {
            const packageJson = readFileSync(join(activeProfileDir, 'package.json'));
            const lockfile = captureProfileLockfile();
            return lockfile.ok ? { packageJson, lockfile: lockfile.snapshot } : null;
        }
        catch {
            return null;
        }
    }
    function sameProfileLockfile(left, right) {
        if (left.present !== right.present)
            return false;
        return !left.present || (right.present && left.contents.equals(right.contents));
    }
    function profileStateMatches(expected) {
        const current = captureProfileStateFingerprint();
        return current !== null
            && current.packageJson.equals(expected.packageJson)
            && sameProfileLockfile(current.lockfile, expected.lockfile);
    }
    function savePendingRollback(record) {
        const expectedState = captureProfileStateFingerprint();
        if (expectedState === null)
            return null;
        const id = `rollback-${String(rollbackSequence++)}`;
        pendingRollbacks.set(id, { ...record, id, expectedState });
        return id;
    }
    async function removeInstalledPackage(name) {
        const result = await runPlugin(config.profile, ['remove', name]);
        if (result.exitCode !== 0 || result.timedOut || result.cancelled) {
            return { ok: false, hot: false, detail: failureDetail(result) };
        }
        // Both cleanups run — see the uninstall route's note on #213: a package
        // with two activation sources must not have the second one skipped
        // because the first succeeded.
        const unmounted = await hotUnmount(name);
        const entryDisabled = await themes.setEntryDisabled(name, true);
        const hot = unmounted || entryDisabled;
        removeRowBlocks(userPatchPath, rowIdsForPackage(host, activeProfileDir, name));
        disabled.delete(name);
        removeFromGroups({ groups, groupOrder }, name);
        writeMarketState(activeProfileDir, { disabled, groups, groupOrder });
        return { ok: true, hot, detail: null };
    }
    /**
     * Errors the profile analysis reports about the restored composition —
     * a bundle or a user-patch insert naming a package that is not in
     * node_modules. #205: those surfaced only at the NEXT boot, as a Loader
     * ERR_MODULE_NOT_FOUND with nothing tying it to the restore that caused it.
     *
     * Reported, never rolled back. A restore undone halfway can leave someone
     * worse off than the state they were trying to leave, and after a
     * cross-machine restore they still have the old machine to compare against.
     * Naming the packages is what they cannot do for themselves.
     *
     * An analysis that throws is not allowed to fail a restore that already
     * succeeded — the profile is on disk either way.
     */
    function restoredBootErrors() {
        try {
            return analyzeProfile(activeProfileDir).summary.errors;
        }
        catch (error) {
            logEvent('warn', 'restore', `post-restore analysis failed: ${error instanceof Error ? error.message : String(error)}`);
            return [];
        }
    }
    /**
     * Bundles the profile declares that will not resolve at boot.
     *
     * The boot loader reads `dsh.profile.bundles` and dies on the first name it
     * cannot resolve — the whole profile, not just that plugin (#339). The
     * rollback that leaves such a row behind is fixed, but the market issues
     * one call and the host owns both writes, so this is the net under any
     * write path that does the same thing next: check at the end of an
     * operation instead of letting the next restart be the one to find out.
     *
     * Judged by the SAME analysis the diagnostics page uses, deliberately. A
     * bundle can legitimately live in the dsh installation rather than the
     * profile's node_modules (#316), and reimplementing that resolution here
     * would call those orphans.
     */
    function orphanBundles() {
        try {
            return analyzeProfile(activeProfileDir).bundles
                // Not an in-box bundle we merely could not locate (#369): those are
                // supplied by the dsh installation, and failing to find one is a gap
                // in what this process can see rather than a profile that will not
                // start. Reporting them here rolled back a good update.
                .filter(layer => layer.directory === null && layer.unresolvedInbox !== true)
                .map(layer => layer.name);
        }
        catch (error) {
            logEvent('warn', 'install', `bundle resolution check failed: ${error instanceof Error ? error.message : String(error)}`);
            return [];
        }
    }
    /**
     * Whether a `#path:` target still points at a directory that exists.
     *
     * A catalog entry can name a monorepo subpackage that the author has since
     * moved or renamed. pnpm's failure for that is unrecognisable — the user
     * sees a resolver error and no reason to suspect the entry rather than
     * their own machine (#346). Audited the live catalog while looking into
     * it: 8 of the 224 subpath entries point at a directory that is gone.
     *
     * Only ever called AFTER an install has already failed, so the happy path
     * pays nothing, and a network problem here just means no extra sentence.
     */
    async function staleSubpath(target) {
        const match = /^github:([^#]+)#path:\/(.+)$/.exec(target);
        if (match === null)
            return null;
        const [, repo, subpath] = match;
        try {
            const res = await marketFetch(`https://raw.githubusercontent.com/${repo}/HEAD/${subpath}/package.json`, { signal: AbortSignal.timeout(6000) });
            if (res.ok)
                return null;
            if (res.status !== 404)
                return null;
        }
        catch {
            return null;
        }
        return `目录条目指向的子目录在仓库里已不存在（${repo} 的 ${subpath}），多半是作者改名或移动了它——这不是你的环境的问题。请到 awesome-dsh-plugin 反馈这条收录已失效。 / This catalog entry points at a subdirectory that no longer exists in the repository (${subpath} in ${repo}); the author most likely renamed or moved it. Nothing is wrong with your setup — please report the stale entry to awesome-dsh-plugin.`;
    }
    async function restoreBackup(value) {
        if (!await probePnpm())
            throw new Error('pnpm is required to restore plugins');
        // Snapshot the target's manifest BEFORE the backup files overwrite it, so
        // the restore can merge rather than replace: plugins the target already
        // has that are NOT in the backup stay installed instead of silently
        // dropping off the manifest (partial exports, issue #89). The mutation
        // lock is owned by withMutationLock now, so no `installing` flag here.
        const manifestBefore = JSON.parse(readFileSync(join(activeProfileDir, 'package.json'), 'utf8'));
        const restored = restoreProfileBackup(config.profile, value, activeProfileDir);
        try {
            // Merge: current deps stay, backup specs win on name conflicts; bundle
            // lists are unioned. Full exports merge to the backup view unchanged.
            const mergedManifest = mergeRestoreManifest(JSON.parse(readFileSync(join(activeProfileDir, 'package.json'), 'utf8')), manifestBefore);
            writeFileSync(join(activeProfileDir, 'package.json'), `${JSON.stringify(mergedManifest, null, 2)}\n`);
            // Named BEFORE the install runs, because that is the install this
            // will make fail: a `link:/Users/…` spec from another machine points
            // at a path that does not exist here (#205). Reported rather than
            // rewritten — where those files should live is the operator's call.
            const unportable = unportableDeps(mergedManifest.dependencies);
            if (unportable.length > 0) {
                logEvent('warn', 'restore', `machine-specific dependency paths in the restored manifest — ${unportable.map(dep => `${dep.name}: ${dep.spec}`).join('; ')}`);
            }
            const result = await runPlugin(config.profile, ['install']);
            if (result.exitCode === 0 && !result.timedOut && !result.cancelled) {
                invalidateUpdates();
                const bootErrors = restoredBootErrors();
                if (bootErrors.length > 0) {
                    logEvent('warn', 'restore', `restored profile will not boot as-is — ${bootErrors.join('; ')}`);
                }
                return { files: restored.files, errors: [], unportable, ...(bootErrors.length > 0 ? { bootErrors } : {}) };
            }
            // A bad dependency makes pnpm abort the whole install. Retry from an
            // empty dependency list so one broken plugin cannot block the rest.
            // activeProfileDir, NOT profileDir(config.profile): in DSH Desktop the
            // profile directory is host-authoritative (#72) and the ambient
            // derivation would edit the WRONG profile's manifest.
            const manifestFile = join(activeProfileDir, 'package.json');
            const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
            const dependencies = Object.entries(manifest.dependencies ?? {});
            const desiredBundles = [...(manifest.dsh?.profile?.bundles ?? [])];
            const dependencyNames = new Set(dependencies.map(([name]) => name));
            manifest.dependencies = {};
            if (Array.isArray(manifest.dsh?.profile?.bundles)) {
                manifest.dsh.profile.bundles = desiredBundles.filter(bundle => !dependencyNames.has(bundle));
            }
            writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
            const errors = [];
            let installed = 0;
            for (const [name, spec] of dependencies) {
                const target = /^(?:file|link|github|git\+|https?):/.test(spec) ? spec : `${name}@${spec}`;
                try {
                    const item = await runPlugin(config.profile, ['add', target]);
                    if (item.exitCode === 0 && !item.timedOut && !item.cancelled
                        && existsSync(join(activeProfileDir, 'node_modules', name, 'package.json'))) {
                        installed += 1;
                        if (desiredBundles.includes(name)) {
                            const current = JSON.parse(readFileSync(manifestFile, 'utf8'));
                            current.dsh ??= {};
                            current.dsh.profile ??= {};
                            current.dsh.profile.bundles ??= [];
                            if (!current.dsh.profile.bundles.includes(name))
                                current.dsh.profile.bundles.push(name);
                            writeFileSync(manifestFile, `${JSON.stringify(current, null, 2)}\n`);
                        }
                        continue;
                    }
                    errors.push({ name, error: failureDetail(item).trim() || 'pnpm failed' });
                }
                catch (error) {
                    errors.push({ name, error: error instanceof Error ? error.message : String(error) });
                }
                const current = JSON.parse(readFileSync(manifestFile, 'utf8'));
                if (current.dependencies !== undefined)
                    delete current.dependencies[name];
                writeFileSync(manifestFile, `${JSON.stringify(current, null, 2)}\n`);
            }
            if (installed === 0 && dependencies.length > 0) {
                restored.rollback();
            }
            invalidateUpdates();
            const bootErrors = restoredBootErrors();
            if (bootErrors.length > 0) {
                logEvent('warn', 'restore', `restored profile will not boot as-is — ${bootErrors.join('; ')}`);
            }
            return {
                files: restored.files,
                errors,
                unportable: unportableDeps(manifest.dependencies),
                ...(bootErrors.length > 0 ? { bootErrors } : {}),
            };
        }
        catch (error) {
            restored.rollback();
            throw error;
        }
    }
    const legacyHandlers = new Map();
    const captureLegacy = (path, route) => {
        legacyHandlers.set(path, route.handler);
        return route;
    };
    const operationsV1 = new UpdateOperationStoreV1(BOOT_ID);
    /** Invoke one existing route in memory so v1 reuses the battle-tested executor. */
    async function invokeLegacy(path, source, method, body, url = path) {
        const handler = legacyHandlers.get(path);
        if (handler === undefined)
            throw new Error(`legacy route is unavailable: ${path}`);
        const chunks = body === undefined ? [] : [Buffer.from(JSON.stringify(body))];
        const replay = Readable.from(chunks);
        Object.assign(replay, {
            method,
            url,
            headers: { ...source.headers },
            socket: source.socket,
        });
        let status = 200;
        let text = '';
        const captured = {
            writeHead(code) { status = code; return this; },
            end(chunk) {
                if (chunk !== undefined)
                    text += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : chunk;
                return this;
            },
        };
        await handler(replay, captured);
        let payload = null;
        try {
            payload = text === '' ? null : JSON.parse(text);
        }
        catch {
            payload = { error: text };
        }
        return { status, payload };
    }
    const packageNameFrom = (request) => {
        try {
            return new URL(request.url ?? '', 'http://localhost').searchParams.get('name') ?? '';
        }
        catch {
            return '';
        }
    };
    const operationIdFrom = (request) => {
        try {
            return new URL(request.url ?? '', 'http://localhost').searchParams.get('operationId') ?? '';
        }
        catch {
            return '';
        }
    };
    const forceCheckFrom = (request) => {
        try {
            return new URL(request.url ?? '', 'http://localhost').searchParams.get('force') === '1';
        }
        catch {
            return false;
        }
    };
    const disposers = [
        host.webServer.register({
            kind: 'exact',
            path: '/dsh-market/api/v1/capabilities',
            handler: (request, response) => {
                if (request.method !== 'GET') {
                    response.writeHead(405, { allow: 'GET' });
                    response.end();
                    return;
                }
                const canRestart = restartAllowed(config);
                sendJson(response, 200, {
                    schema: UPDATE_API_V1_SCHEMA,
                    apiVersion: 1,
                    // Machine-readable, because a policy that lives only in a markdown
                    // file is one a client never reads. `beta` says the shape may still
                    // change; it becomes `stable` once a release stops moving it, and
                    // that is the point at which the compatibility promise starts.
                    stability: 'beta',
                    marketVersion: marketVersion(),
                    profile: config.profile,
                    bootId: BOOT_ID,
                    runtime: config.profileDirectory === undefined ? 'web' : 'desktop',
                    features: {
                        check: true,
                        update: true,
                        progress: true,
                        rollback: true,
                        restart: canRestart,
                    },
                    restart: {
                        supported: canRestart,
                        managedBy: canRestart ? 'market' : config.profileDirectory === undefined ? 'operator' : 'desktop-host',
                        supervisor: detectedSupervisor(),
                        debugger: detectedDebugger(),
                    },
                    operationRetention: 'current-process',
                    operationLimit: MAX_UPDATE_OPERATIONS_V1,
                    endpoints: {
                        updates: '/dsh-market/api/v1/updates',
                        operations: '/dsh-market/api/v1/operations',
                        rollback: '/dsh-market/api/v1/rollback',
                        restart: '/dsh-market/api/v1/restart',
                    },
                });
            },
        }),
        host.webServer.register({
            kind: 'exact',
            path: '/dsh-market/api/v1/updates',
            handler: async (request, response) => {
                if (request.method === 'GET') {
                    const name = packageNameFrom(request);
                    if (!NPM_NAME_RE.test(name)) {
                        sendJson(response, 400, { schema: UPDATE_API_V1_SCHEMA, error: 'a valid package name is required' });
                        return;
                    }
                    try {
                        const force = forceCheckFrom(request);
                        const channel = activeChannel();
                        const channelFor = SELF_NAMES.has(name) ? new Map([[name, channel]]) : undefined;
                        const update = (await checkUpdates(config.profile, force, activeProfileDir, channelFor))[name];
                        if (update === undefined) {
                            sendJson(response, 404, { schema: UPDATE_API_V1_SCHEMA, error: 'plugin is not installed' });
                            return;
                        }
                        sendJson(response, 200, {
                            schema: UPDATE_API_V1_SCHEMA,
                            package: {
                                name,
                                source: update.kind,
                                installedVersion: update.current ?? update.version,
                                latestVersion: update.latest,
                                updateAvailable: update.updateAvailable,
                                channelSwitch: update.channelSwitch ?? null,
                            },
                        });
                    }
                    catch (error) {
                        sendJson(response, 500, {
                            schema: UPDATE_API_V1_SCHEMA,
                            error: error instanceof Error ? error.message : String(error),
                        });
                    }
                    return;
                }
                if (request.method !== 'POST') {
                    response.writeHead(405, { allow: 'GET, POST' });
                    response.end();
                    return;
                }
                if (!sameOrigin(request)) {
                    sendJson(response, 403, { schema: UPDATE_API_V1_SCHEMA, error: 'untrusted origin' });
                    return;
                }
                try {
                    const body = (await readJsonBody(request));
                    const packageName = typeof body.packageName === 'string' ? body.packageName : '';
                    if (!NPM_NAME_RE.test(packageName)) {
                        sendJson(response, 400, { schema: UPDATE_API_V1_SCHEMA, error: 'a valid package name is required' });
                        return;
                    }
                    if (operationsV1.hasActive()) {
                        sendJson(response, 409, {
                            schema: UPDATE_API_V1_SCHEMA,
                            error: 'another public update operation is already running',
                            failure: {
                                code: 'OPERATION_BUSY',
                                message: 'another public update operation is already running',
                                retryable: true,
                            },
                        });
                        return;
                    }
                    const installedVersion = readInstalledVersion(config.profile, packageName, activeProfileDir);
                    if (installedVersion === null) {
                        sendJson(response, 404, {
                            schema: UPDATE_API_V1_SCHEMA,
                            error: 'plugin is not installed',
                            failure: {
                                code: 'PLUGIN_NOT_INSTALLED',
                                message: 'plugin is not installed in this profile',
                                retryable: false,
                            },
                        });
                        return;
                    }
                    const operation = operationsV1.create(packageName, installedVersion);
                    operationsV1.start(operation.operationId);
                    void invokeLegacy('/dsh-market/update', request, 'POST', {
                        name: packageName,
                        ...(body.force === true ? { force: true } : {}),
                    }).then(({ status, payload }) => {
                        operationsV1.finish(operation.operationId, status, payload, readInstalledVersion(config.profile, packageName, activeProfileDir));
                    }).catch((error) => {
                        operationsV1.finish(operation.operationId, 500, { error: error instanceof Error ? error.message : String(error) }, readInstalledVersion(config.profile, packageName, activeProfileDir));
                    });
                    sendJson(response, 202, {
                        schema: UPDATE_API_V1_SCHEMA,
                        operation: operationsV1.get(operation.operationId),
                    });
                }
                catch (error) {
                    sendJson(response, 400, {
                        schema: UPDATE_API_V1_SCHEMA,
                        error: error instanceof Error ? error.message : String(error),
                    });
                }
            },
        }),
        host.webServer.register({
            kind: 'exact',
            path: '/dsh-market/api/v1/operations',
            handler: (request, response) => {
                if (request.method !== 'GET') {
                    response.writeHead(405, { allow: 'GET' });
                    response.end();
                    return;
                }
                const operation = operationsV1.get(operationIdFrom(request), progress);
                if (operation === null) {
                    sendJson(response, 404, { schema: UPDATE_API_V1_SCHEMA, error: 'operation not found in this host process' });
                    return;
                }
                sendJson(response, 200, { schema: UPDATE_API_V1_SCHEMA, operation });
            },
        }),
        host.webServer.register({
            kind: 'exact',
            path: '/dsh-market/api/v1/rollback',
            handler: async (request, response) => {
                if (request.method !== 'POST') {
                    response.writeHead(405, { allow: 'POST' });
                    response.end();
                    return;
                }
                if (!sameOrigin(request)) {
                    sendJson(response, 403, { schema: UPDATE_API_V1_SCHEMA, error: 'untrusted origin' });
                    return;
                }
                try {
                    const body = (await readJsonBody(request));
                    const operationId = typeof body.operationId === 'string' ? body.operationId : '';
                    const trackedOperation = operationsV1.get(operationId);
                    const legacyRollbackId = operationsV1.beginRollback(operationId);
                    if (legacyRollbackId === null || trackedOperation === null) {
                        sendJson(response, 409, { schema: UPDATE_API_V1_SCHEMA, error: 'rollback is not available for this operation' });
                        return;
                    }
                    const result = await invokeLegacy('/dsh-market/rollback', request, 'POST', { rollbackId: legacyRollbackId });
                    const installedVersion = readInstalledVersion(config.profile, trackedOperation.packageName, activeProfileDir);
                    const operation = operationsV1.finishRollback(operationId, result.status, result.payload, installedVersion);
                    sendJson(response, 200, { schema: UPDATE_API_V1_SCHEMA, operation });
                }
                catch (error) {
                    sendJson(response, 400, {
                        schema: UPDATE_API_V1_SCHEMA,
                        error: error instanceof Error ? error.message : String(error),
                    });
                }
            },
        }),
        host.webServer.register({
            kind: 'exact',
            path: '/dsh-market/api/v1/restart',
            handler: async (request, response) => {
                if (request.method !== 'POST') {
                    response.writeHead(405, { allow: 'POST' });
                    response.end();
                    return;
                }
                const result = await invokeLegacy('/dsh-market/restart', request, 'POST', {});
                sendJson(response, result.status, { schema: UPDATE_API_V1_SCHEMA, result: result.payload });
            },
        }),
        host.webServer.register({
            kind: 'exact',
            path: '/dsh-market/backup',
            handler: (request, response) => {
                if (request.method !== 'GET') {
                    response.writeHead(405, { allow: 'GET' });
                    response.end();
                    return;
                }
                // Profile exports carry configuration that may include credentials
                // (config.toml, .env, …), so they stay limited to loopback peers
                // without proxy forwarding (review #63). Unlike process control,
                // browsers omit the Origin header on `<a download>` GET navigations,
                // so a missing Origin passes; a present one must still match Host.
                if (!trustedDownloadRequest(request)) {
                    sendJson(response, 403, { error: 'backup export is limited to same-origin loopback requests' });
                    return;
                }
                try {
                    const data = createProfileBackup(config.profile, activeProfileDir);
                    const backup = JSON.stringify(data, null, 2);
                    const timestamp = new Date(data.createdAt).toLocaleString('sv-SE').replace(/\D/g, '');
                    response.writeHead(200, {
                        'cache-control': 'no-store',
                        'content-type': 'application/json; charset=utf-8',
                        'content-disposition': `attachment; filename="dsh-dshmarket-backup-${timestamp}.json"`,
                    });
                    response.end(backup);
                }
                catch (error) {
                    sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) });
                }
            },
        }),
        host.webServer.register({
            kind: 'exact',
            path: '/dsh-market/restore',
            handler: async (request, response) => {
                if (request.method !== 'POST') {
                    response.writeHead(405, { allow: 'POST' });
                    response.end();
                    return;
                }
                if (!sameOrigin(request))
                    return sendJson(response, 403, { error: 'untrusted origin' });
                try {
                    const body = await readJsonBody(request, MAX_BACKUP_BYTES + 4096);
                    await withMutationLock(response, 'install', async () => {
                        pendingRollbacks.clear();
                        sendJson(response, 200, { ok: true, ...await restoreBackup(body.backup) });
                    });
                }
                catch (error) {
                    sendJson(response, 400, { error: error instanceof Error ? error.message : String(error) });
                }
            },
        }),
        host.webServer.register({
            kind: 'exact',
            path: '/dsh-market/webdav',
            handler: async (request, response) => {
                if (request.method !== 'POST') {
                    response.writeHead(405, { allow: 'POST' });
                    response.end();
                    return;
                }
                if (!sameOrigin(request))
                    return sendJson(response, 403, { error: 'untrusted origin' });
                try {
                    const body = await readJsonBody(request);
                    const url = typeof body.url === 'string' ? body.url : '';
                    const username = typeof body.username === 'string' ? body.username : '';
                    const password = typeof body.password === 'string' ? body.password : '';
                    if (body.action === 'backup') {
                        await uploadWebdav(url, username, password, createProfileBackup(config.profile, activeProfileDir));
                        sendJson(response, 200, { ok: true });
                    }
                    else if (body.action === 'restore') {
                        // The preview flow first returns the downloaded backup so the
                        // client can show what will be restored; the real restore then
                        // posts it to /dsh-market/restore, where downloadWebdav's strict
                        // validation guarantees the fetch result is never blindly echoed
                        // (review #63).
                        sendJson(response, 200, { ok: true, backup: await downloadWebdav(url, username, password) });
                    }
                    else
                        sendJson(response, 400, { error: 'invalid WebDAV action' });
                }
                catch (error) {
                    sendJson(response, 400, { error: error instanceof Error ? error.message : String(error) });
                }
            },
        }),
        host.webServer.register({
            kind: 'exact',
            path: '/dsh-market/gist',
            handler: async (request, response) => {
                if (request.method !== 'POST') {
                    response.writeHead(405, { allow: 'POST' });
                    response.end();
                    return;
                }
                if (!sameOrigin(request))
                    return sendJson(response, 403, { error: 'untrusted origin' });
                // 25 s route-level ceiling: abort the underlying GitHub request too,
                // so the client always gets a definite, structured answer and a
                // wedged gh CLI / slow network can never leave a request running in
                // the background (issue #89; the error carries a code for the UI).
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(new GistError('Gist operation timed out', 'timeout')), 25_000);
                try {
                    const body = await readJsonBody(request);
                    const { token, source } = await resolveGistTokenSource(body.token);
                    if (body.action === 'export') {
                        const gistIdInput = typeof body.gistId === 'string' ? body.gistId.trim() : '';
                        const includeDeps = Array.isArray(body.includeDeps)
                            ? body.includeDeps.filter((name) => typeof name === 'string' && name !== '')
                            : undefined;
                        const backup = createProfileBackup(config.profile, activeProfileDir, includeDeps !== undefined
                            ? { includeDeps, includeConfig: body.includeConfig === true }
                            : undefined);
                        const content = JSON.stringify(backup, null, 2);
                        if (!fitsGistLimit(content))
                            throw new Error('backup exceeds the GitHub Gist 1 MB limit');
                        const ref = gistIdInput === ''
                            ? await createGist(token, content, controller.signal)
                            : await updateGist(token, parseGistId(gistIdInput), content, controller.signal);
                        sendJson(response, 200, { ok: true, gistId: ref.id, gistUrl: ref.htmlUrl });
                    }
                    else if (body.action === 'import') {
                        if (typeof body.gistId !== 'string' || body.gistId.trim() === '')
                            throw new Error('gist id is required');
                        const backup = await readGist(token, parseGistId(body.gistId), controller.signal);
                        // Preview flow, same as WebDAV: the client reviews the backup and
                        // posts it to /dsh-market/restore; readGist's strict validation
                        // guarantees the fetch result is never blindly echoed.
                        sendJson(response, 200, { ok: true, backup });
                    }
                    else if (body.action === 'verify') {
                        await verifyGistToken(token, controller.signal);
                        sendJson(response, 200, { ok: true, source });
                    }
                    else
                        sendJson(response, 400, { error: 'invalid Gist action' });
                }
                catch (error) {
                    sendJson(response, 400, { error: error instanceof Error ? error.message : String(error), code: gistErrorCode(error) });
                }
                finally {
                    clearTimeout(timer);
                }
            },
        }),
        host.webServer.register({
            kind: 'exact',
            path: '/dsh-market/registry',
            handler: async (request, response) => {
                if (request.method !== 'GET') {
                    response.writeHead(405, { allow: 'GET' });
                    response.end();
                    return;
                }
                try {
                    try {
                        sendJson(response, 200, { registry: await loadRegistry() });
                    }
                    catch (error) {
                        // Say what went wrong. The market used to substitute a bundled
                        // copy here, so an unreachable registry looked exactly like a
                        // reachable one with fewer plugins in it.
                        const message = error instanceof Error ? error.message : String(error);
                        logEvent('warn', 'registry', `catalog fetch failed: ${message}`);
                        sendJson(response, 502, { error: message });
                    }
                }
                catch (error) {
                    sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) });
                }
            },
        }),
        host.webServer.register({
            kind: 'exact',
            path: '/dsh-market/installed',
            handler: async (request, response) => {
                if (request.method !== 'GET') {
                    response.writeHead(405, { allow: 'GET' });
                    response.end();
                    return;
                }
                await dropStaleHotMounts();
                const installed = readInstalled(config.profile, activeProfileDir);
                const repoIdentities = {};
                const repoHints = {};
                for (const [name, spec] of Object.entries(installed)) {
                    const evidence = readInstalledRepoEvidence(config.profile, name, spec, activeProfileDir);
                    if (evidence.identities.length > 0)
                        repoIdentities[name] = evidence.identities;
                    if (evidence.hints.length > 0)
                        repoHints[name] = evidence.hints;
                }
                const present = Object.keys(installed).filter(name => readInstalledVersion(config.profile, name, activeProfileDir) !== null);
                // User-patch-layer state (port of dsh-plugin-hub): rows the user
                // patch disables/force-enables, plus per-package flags so the UI can
                // show toggles made OUTSIDE the market (hand-edited cordis.patch.yml,
                // the dsh CLI) that state.json never sees.
                const patch = readUserPatchState(userPatchPath);
                const patchFlags = packagePatchFlags(host, activeProfileDir, Object.keys(installed), patch);
                const activation = {};
                const live = liveNames();
                for (const name of Object.keys(installed)) {
                    activation[name] = verifyActivation(config.profile, name, live, activeProfileDir, disabled.has(name) || patchFlags.disabled.includes(name));
                }
                const diagnostics = diagnosePackageManifests(Object.keys(installed).map(packageName => ({
                    packageName,
                    manifest: readInstalledManifest(config.profile, packageName, activeProfileDir),
                })));
                sendJson(response, 200, {
                    profile: config.profile,
                    installed,
                    repoIdentities,
                    repoHints,
                    present,
                    activation,
                    diagnostics,
                    live: listHotMounts(),
                    disabled: [...disabled],
                    groups,
                    groupOrder,
                    notes: readMarketState(activeProfileDir).notes ?? {},
                    patch: { disables: patch.disables, forced: patch.forced, inserts: patch.inserts },
                    patchDisabled: patchFlags.disabled,
                    patchForced: patchFlags.forced,
                    bundles: readProfileBundles(activeProfileDir).filter(name => !INBOX_BUNDLES.has(name)),
                });
            },
        }),
        host.webServer.register({
            kind: 'exact',
            path: '/dsh-market/check',
            handler: (request, response) => {
                if (request.method !== 'GET') {
                    response.writeHead(405, { allow: 'GET' });
                    response.end();
                    return;
                }
                try {
                    const report = analyzeProfile(activeProfileDir);
                    // #201: attach the #200 directional verdict to every peer row so the
                    // diagnostics UI can tier risk / warning / info without recomputing
                    // (the client cannot see peerDependenciesMeta on disk).
                    for (const row of report.peerMismatches) {
                        row.verdict = row.satisfied === false
                            // `optional` is absent rather than false on a row the plugin
                            // did not mark (#275), and absent means not optional.
                            ? classifyPeer(row.plugin, row.name, row.range, row.resolved, row.optional === true)
                            : { kind: 'none' };
                    }
                    sendJson(response, 200, report);
                }
                catch (error) {
                    sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) });
                }
            },
        }),
        // Issue #98 phase 2: reorder the community bundles. Official bundles are
        // fixed; the candidate is trial-validated (dry-run composition replay)
        // before the manifest is written — a broken order is refused and the
        // profile is never touched.
        host.webServer.register({
            kind: 'exact',
            path: '/dsh-market/bundle-order',
            handler: async (request, response) => {
                if (request.method !== 'POST') {
                    response.writeHead(405, { allow: 'POST' });
                    response.end();
                    return;
                }
                if (!sameOrigin(request)) {
                    sendJson(response, 403, { error: 'untrusted origin' });
                    return;
                }
                // Mutex with pnpm operations AND other direct writes (issue #98
                // analysis): reordering writes package.json directly; racing an
                // install/update/uninstall — or another direct write — would
                // corrupt the manifest (backup restore uses the same guard). The
                // lock is taken BEFORE the body is read so a slow/pending request
                // cannot interleave with another write either.
                // #125 hardening (lesson from #122: a bad order write can stop DSH
                // from starting): keep a pre-write profile backup and restore it
                // automatically if the write throws mid-flight, and persist a profile
                // snapshot before the write (issue #126) so the change is recoverable
                // from the snapshots tab — the backup is the immediate rollback net.
                let backup = null;
                try {
                    await withMutationLock(response, 'write', async () => {
                        const body = (await readJsonBody(request));
                        if (body === null || typeof body !== 'object') {
                            sendJson(response, 400, { error: 'JSON body is required / 需要 JSON body' });
                            return;
                        }
                        if (!Array.isArray(body.order) || !body.order.every(item => typeof item === 'string')) {
                            sendJson(response, 400, { error: 'order must be an array of bundle names / order 必须是 bundle 名称数组' });
                            return;
                        }
                        const order = body.order;
                        // Before/after rules (issue #98 phase 2): the merged stack must
                        // satisfy every rule the bundles declare. Enforced BEFORE the
                        // trial/write so a rule-breaking order is refused outright.
                        const stack = readBundleStack(activeProfileDir);
                        const merged = mergeOrder(stack.bundles, order);
                        if (merged.ok) {
                            const conflicts = validateOrder(merged.bundles, readBundleRules(activeProfileDir));
                            if (conflicts.length > 0) {
                                logEvent('warn', 'bundle-order', `rejected by before/after rules: ${conflicts.map(c => c.reason).join('; ')}`);
                                sendJson(response, 422, {
                                    error: 'the order violates declared before/after rules / 该顺序违反了插件声明的 before/after 规则',
                                    conflicts,
                                });
                                return;
                            }
                        }
                        const trial = trialValidate(activeProfileDir, order);
                        if (!trial.ok) {
                            const first = trial.errors[0];
                            logEvent('warn', 'bundle-order', `rejected by trial validation: ${first?.message ?? 'unknown'}`);
                            sendJson(response, 422, {
                                error: `trial validation failed — ${first?.message ?? 'this order would not boot'} / 试启动校验失败：${first?.message ?? '该顺序无法启动'}`,
                                trial: { errors: trial.errors, warnings: trial.warnings, diff: trial.diff },
                            });
                            return;
                        }
                        backup = createProfileBackup(config.profile, activeProfileDir);
                        // yzke review point 4 (issue #126): persist a profile snapshot BEFORE
                        // the write (subject to the maxSnapshots quota), so the change is
                        // recoverable from the snapshots tab; the in-process backup above
                        // stays as the immediate rollback net (double protection).
                        const captured = createProfileSnapshot(activeProfileDir, maxSnapshots);
                        if (!captured.ok) {
                            sendJson(response, 400, { error: captured.error });
                            return;
                        }
                        const snapshot = captured.snapshot;
                        pendingRollbacks.clear();
                        const applied = applyBundleOrder(activeProfileDir, order);
                        if (!applied.ok) {
                            sendJson(response, 400, { error: applied.error });
                            return;
                        }
                        invalidateUpdates();
                        logEvent('info', 'bundle-order', `applied new community order (snapshot ${snapshot.id})`);
                        sendJson(response, 200, { ok: true, bundles: applied.bundles, snapshot: snapshot.id });
                    });
                }
                catch (error) {
                    // The write threw mid-flight: restore the pre-write profile so a
                    // broken manifest can never stop DSH from starting (issue #125,
                    // lesson from #122). Best-effort — a failing restore must not mask
                    // the original error.
                    if (backup !== null) {
                        try {
                            restoreProfileBackup(config.profile, backup, activeProfileDir);
                            logEvent('error', 'bundle-order', `write failed — profile restored from pre-write backup: ${error instanceof Error ? error.message : String(error)}`);
                        }
                        catch {
                            logEvent('error', 'bundle-order', 'write failed AND automatic rollback failed');
                        }
                    }
                    sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) });
                }
            },
        }),
        // Issue #98 phase 3: named plugin presets (bundle order + disable list).
        host.webServer.register({
            kind: 'exact',
            path: '/dsh-market/presets',
            handler: async (request, response) => {
                if (request.method === 'GET') {
                    sendJson(response, 200, { presets: listPresets(activeProfileDir) });
                    return;
                }
                if (request.method !== 'POST') {
                    response.writeHead(405, { allow: 'GET, POST' });
                    response.end();
                    return;
                }
                if (!sameOrigin(request)) {
                    sendJson(response, 403, { error: 'untrusted origin' });
                    return;
                }
                try {
                    // save carries the FULL community order + disabled list, which can
                    // exceed the 4KiB default (CJK names are 3 bytes/char).
                    const body = (await readJsonBody(request, 256 * 1024));
                    if (body === null || typeof body !== 'object') {
                        sendJson(response, 400, { error: 'JSON body is required / 需要 JSON body' });
                        return;
                    }
                    const name = body.name;
                    // Preview is a pure read; save/apply/delete write presets.json,
                    // package.json and state.json, so they take the direct-write lock —
                    // a concurrent pnpm run or another direct write must not interleave
                    // (issue #98 analysis: write-route mutual exclusion).
                    if (body.action === 'preview') {
                        const previewed = previewPreset(activeProfileDir, name);
                        sendJson(response, previewed.ok ? 200 : 422, previewed);
                        return;
                    }
                    await withMutationLock(response, 'write', async () => {
                        switch (body.action) {
                            case 'save': {
                                const saved = savePreset(activeProfileDir, name, body.bundleOrder, body.disabled);
                                sendJson(response, saved.ok ? 200 : 400, saved);
                                return;
                            }
                            case 'apply': {
                                pendingRollbacks.clear();
                                const applied = applyPreset(activeProfileDir, name, maxSnapshots);
                                if (applied.ok) {
                                    invalidateUpdates();
                                    refreshMarketState();
                                }
                                sendJson(response, applied.ok ? 200 : 422, applied);
                                return;
                            }
                            case 'delete': {
                                const deleted = deletePreset(activeProfileDir, name);
                                sendJson(response, deleted.ok ? 200 : 400, deleted);
                                return;
                            }
                            default:
                                sendJson(response, 400, { error: 'action must be save | preview | apply | delete / action 必须是 save | preview | apply | delete' });
                        }
                    });
                }
                catch (error) {
                    sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) });
                }
            },
        }),
        // Issue #98 phase 3 (#19): profile snapshots — list, create, restore.
        host.webServer.register({
            kind: 'exact',
            path: '/dsh-market/snapshots',
            handler: async (request, response) => {
                if (request.method === 'GET') {
                    sendJson(response, 200, { snapshots: listSnapshots(activeProfileDir) });
                    return;
                }
                if (request.method === 'POST') {
                    if (!sameOrigin(request)) {
                        sendJson(response, 403, { error: 'untrusted origin' });
                        return;
                    }
                    try {
                        await withMutationLock(response, 'write', async () => {
                            const captured = createProfileSnapshot(activeProfileDir, maxSnapshots);
                            if (captured.ok)
                                sendJson(response, 200, { ok: true, snapshot: captured.snapshot });
                            else
                                sendJson(response, 400, captured);
                        });
                    }
                    catch (error) {
                        sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) });
                    }
                    return;
                }
                response.writeHead(405, { allow: 'GET, POST' });
                response.end();
            },
        }),
        host.webServer.register({
            kind: 'exact',
            path: '/dsh-market/restore-snapshot',
            handler: async (request, response) => {
                if (request.method !== 'POST') {
                    response.writeHead(405, { allow: 'POST' });
                    response.end();
                    return;
                }
                if (!sameOrigin(request)) {
                    sendJson(response, 403, { error: 'untrusted origin' });
                    return;
                }
                try {
                    await withMutationLock(response, 'write', async () => {
                        const body = (await readJsonBody(request));
                        if (body === null || typeof body !== 'object' || typeof body.snapshot !== 'string' || body.snapshot === '') {
                            sendJson(response, 400, { error: 'snapshot id is required / 需要快照 id' });
                            return;
                        }
                        pendingRollbacks.clear();
                        const restored = restoreSnapshot(activeProfileDir, body.snapshot);
                        if (restored.ok) {
                            invalidateUpdates();
                            refreshMarketState();
                        }
                        sendJson(response, restored.ok ? 200 : 400, restored);
                    });
                }
                catch (error) {
                    sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) });
                }
            },
        }),
        // Issue #98 supplement: delete one snapshot (the cap also prunes old ones
        // automatically, but the user may want to drop a specific snapshot).
        host.webServer.register({
            kind: 'exact',
            path: '/dsh-market/delete-snapshot',
            handler: async (request, response) => {
                if (request.method !== 'POST') {
                    response.writeHead(405, { allow: 'POST' });
                    response.end();
                    return;
                }
                if (!sameOrigin(request)) {
                    sendJson(response, 403, { error: 'untrusted origin' });
                    return;
                }
                try {
                    await withMutationLock(response, 'write', async () => {
                        const body = (await readJsonBody(request));
                        if (body === null || typeof body !== 'object' || typeof body.snapshot !== 'string' || body.snapshot === '') {
                            sendJson(response, 400, { error: 'snapshot id is required / 需要快照 id' });
                            return;
                        }
                        // deleteSnapshot refuses traversal-shaped ids before touching the
                        // filesystem (same discipline as restore); a false result means the
                        // id is malformed or no such snapshot exists.
                        const deleted = deleteSnapshot(activeProfileDir, body.snapshot);
                        if (!deleted) {
                            sendJson(response, 400, { ok: false, error: 'snapshot not found / 快照不存在' });
                            return;
                        }
                        logEvent('info', 'snapshot', `deleted ${body.snapshot}`);
                        sendJson(response, 200, { ok: true, snapshot: body.snapshot });
                    });
                }
                catch (error) {
                    sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) });
                }
            },
        }),
        host.webServer.register({
            kind: 'exact',
            path: '/dsh-market/use-skin',
            handler: async (request, response) => {
                if (request.method !== 'POST') {
                    response.writeHead(405, { allow: 'POST' });
                    response.end();
                    return;
                }
                if (!sameOrigin(request)) {
                    sendJson(response, 403, { error: 'untrusted origin' });
                    return;
                }
                try {
                    const body = (await readJsonBody(request));
                    const name = typeof body.name === 'string' ? body.name : '';
                    const installed = readInstalled(config.profile, activeProfileDir);
                    const themeNames = await themes.installedThemeNames();
                    if (installed[name] === undefined || !themeNames.has(name)) {
                        sendJson(response, 400, { error: 'not an installed theme' });
                        return;
                    }
                    pendingRollbacks.clear();
                    const activated = await themes.activateTheme(name);
                    logEvent(activated ? 'info' : 'error', 'use-skin', `${name}: ${activated ? 'active' : 'failed'}`);
                    sendJson(response, activated ? 200 : 502, { ok: activated, live: listHotMounts() });
                }
                catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    logEvent('error', 'use-skin', `route error: ${message}`);
                    sendJson(response, 500, { error: message });
                }
            },
        }),
        host.webServer.register({
            kind: 'exact',
            path: '/dsh-market/toggle',
            handler: async (request, response) => {
                if (request.method !== 'POST') {
                    response.writeHead(405, { allow: 'POST' });
                    response.end();
                    return;
                }
                if (!sameOrigin(request)) {
                    sendJson(response, 403, { error: 'untrusted origin' });
                    return;
                }
                try {
                    await withMutationLock(response, 'write', async () => {
                        const body = (await readJsonBody(request));
                        const name = typeof body.name === 'string' ? body.name : '';
                        const enabled = body.enabled === true;
                        if (name === 'dsh-market' || name === 'dshmarket') {
                            sendJson(response, 400, { error: 'the market cannot be disabled from its own page; use the dsh CLI' });
                            return;
                        }
                        if (readInstalled(config.profile, activeProfileDir)[name] === undefined) {
                            sendJson(response, 400, { error: 'plugin is not installed' });
                            return;
                        }
                        // Host infrastructure (port of dsh-plugin-hub): switching off the
                        // timer/hmr/webserver/storage chain would break the very HMR the
                        // patch layer relies on, so those rows refuse to toggle.
                        if (isProtectedModule(name)) {
                            sendJson(response, 403, {
                                error: `${name} 属于宿主基础设施,禁止开关(会破坏热加载/传输/存储链) / ${name} is host infrastructure and cannot be toggled (it would break the hot-reload/transport/storage chain)`,
                            });
                            return;
                        }
                        pendingRollbacks.clear();
                        let ok;
                        let reason;
                        if (enabled && (await themes.installedThemeNames()).has(name)) {
                            // Theme exclusivity stays a Themes-page concern: enabling a theme
                            // deactivates the previously active one, so only the last-enabled
                            // theme is live (same semantics as use-skin).
                            ok = await themes.activateTheme(name);
                            if (!ok)
                                reason = 'theme activation failed — restart required / 主题启用失败，需要重启';
                        }
                        else {
                            const result = await setPluginEnabled(name, enabled);
                            ok = result.ok;
                            reason = result.reason;
                        }
                        // Durable patch-layer write (port of dsh-plugin-hub): the package's
                        // bundle rows get 'disabled: true|false' in the user patch layer,
                        // which DSH's HMR applies within ~1s AND the loader re-applies on
                        // every boot. Client-only packages have no bundle rows — the
                        // market's own state.json replay covers those.
                        const patchRows = rowIdsForPackage(host, activeProfileDir, name);
                        // Disable-carrier (#224): a bundle whose patch DISABLES a plugin it
                        // does not own (dsh-postgres-backends disables session-persistence-jsonl).
                        // Disabling only its inserted rows leaves that foreign disable applying
                        // on every boot — the bundle stays in the stack — so drop it from
                        // dsh.profile.bundles entirely, which stops its whole patch at once
                        // (including any config side effects it carries). Enabling re-adds it.
                        // A bundle that merely reconfigures a neighbour (config without
                        // disabled) is NOT dropped: #147 requires disabling it to leave the
                        // neighbour live, and the e2e fixture-cross re-enable breaks otherwise.
                        const disablesOthers = carrierDisableIds(activeProfileDir, name);
                        const isCarrier = disablesOthers.length > 0;
                        let bundleSwitch = { ok: true, reason: null };
                        if (isCarrier) {
                            try {
                                if (enabled)
                                    addProfileBundle(activeProfileDir, name);
                                else
                                    removeProfileBundle(activeProfileDir, name);
                                logEvent('info', 'toggle', `${name}: disable-carrier ${enabled ? 're-added to' : 'removed from'} dsh.profile.bundles (disables: ${disablesOthers.join(', ')})`);
                            }
                            catch (error) {
                                bundleSwitch = { ok: false, reason: error instanceof Error ? error.message : String(error) };
                                logEvent('warn', 'toggle', `${name}: carrier bundle switch failed — ${bundleSwitch.reason}`);
                            }
                        }
                        let patchWrite = null;
                        if (patchRows.length > 0) {
                            for (const rowId of patchRows) {
                                const result = enabled ? await enableRow(userPatchPath, rowId) : await disableRow(userPatchPath, rowId);
                                if (!result.ok && patchWrite === null)
                                    patchWrite = result;
                            }
                            if (patchWrite === null) {
                                logEvent('info', 'toggle', `${name}: patch layer ${enabled ? 'enabled' : 'disabled'} rows ${patchRows.join(', ')}`);
                            }
                            else {
                                logEvent('warn', 'toggle', `${name}: patch layer write refused — ${patchWrite.reason}`);
                            }
                        }
                        logEvent(ok ? 'info' : 'error', 'toggle', `${name}: ${enabled ? 'on' : 'off'} ok=${String(ok)}`);
                        // Activation reads the post-write truth: the switch state OR the
                        // patch layer, so a disabled plugin never reports "restart to
                        // apply".
                        const patchNow = readUserPatchState(userPatchPath);
                        const offNow = disabled.has(name) || patchRows.some(id => patchNow.disables.includes(id));
                        // When the live composition does not match the requested state
                        // (enable failed to hot-mount / disable left the fiber up), the
                        // change lands on the next boot via the patch layer + state.json —
                        // the client reuses the market's pending-restart banner for it.
                        const liveAfter = liveNames().has(name);
                        // A carrier toggle moves the bundle in/out of dsh.profile.bundles,
                        // which only takes effect on the next composition — always a restart.
                        // Non-carrier plugins keep the live-mount based decision.
                        const restart = isCarrier ? true : enabled ? !liveAfter : liveAfter;
                        // A client-part plugin's UI is in the page already — toggling it
                        // needs a browser refresh to show the change (same signal the
                        // install flow uses for the hot banner).
                        const refresh = packageHasClientPart(activeProfileDir, name);
                        sendJson(response, ok ? 200 : 502, {
                            ok,
                            name,
                            enabled,
                            disabled: [...disabled],
                            live: listHotMounts(),
                            activation: { [name]: verifyActivation(config.profile, name, liveNames(), activeProfileDir, offNow) },
                            reason,
                            patchRows,
                            patchWrite: patchWrite ?? { ok: true, reason: null },
                            carrier: disablesOthers,
                            bundleSwitch,
                            restart,
                            refresh,
                        });
                    });
                }
                catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    logEvent('error', 'toggle', `route error: ${message}`);
                    sendJson(response, 500, { error: message });
                }
            },
        }),
        host.webServer.register({
            kind: 'exact',
            path: '/dsh-market/note',
            handler: async (request, response) => {
                if (request.method !== 'POST') {
                    response.writeHead(405, { allow: 'POST' });
                    response.end();
                    return;
                }
                if (!sameOrigin(request)) {
                    sendJson(response, 403, { error: 'untrusted origin' });
                    return;
                }
                try {
                    await withMutationLock(response, 'write', async () => {
                        const body = (await readJsonBody(request));
                        const name = typeof body?.name === 'string' ? body.name : '';
                        if (name === '') {
                            sendJson(response, 400, { error: 'name is required / 需要 name' });
                            return;
                        }
                        const state = readMarketState(activeProfileDir);
                        const notes = { ...state.notes };
                        const text = typeof body?.text === 'string' ? body.text.trim().slice(0, MAX_NOTE) : '';
                        // Empty clears rather than storing a blank: a row must not claim
                        // to carry a note the user just erased.
                        if (text === '')
                            delete notes[name];
                        else
                            notes[name] = text;
                        writeMarketState(activeProfileDir, { ...state, notes });
                        refreshMarketState();
                        sendJson(response, 200, { ok: true, notes });
                    });
                }
                catch (error) {
                    sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) });
                }
            },
        }),
        host.webServer.register({
            kind: 'exact',
            path: '/dsh-market/groups',
            handler: async (request, response) => {
                if (request.method !== 'POST') {
                    response.writeHead(405, { allow: 'POST' });
                    response.end();
                    return;
                }
                if (!sameOrigin(request)) {
                    sendJson(response, 403, { error: 'untrusted origin' });
                    return;
                }
                try {
                    const body = (await readJsonBody(request));
                    const action = typeof body.action === 'string' ? body.action : '';
                    const known = action === 'create' || action === 'rename' || action === 'delete'
                        || action === 'set-members' || action === 'toggle';
                    if (!known) {
                        sendJson(response, 400, { ok: false, error: 'unknown group action' });
                        return;
                    }
                    const installed = new Set(Object.keys(readInstalled(config.profile, activeProfileDir)));
                    // Theme members follow the global one-active-theme rule: a group
                    // holds at most one, and enabling one deactivates every other.
                    const themeNames = await themes.installedThemeNames();
                    let ok = true;
                    let error;
                    let restartMembers = [];
                    let refreshMembers = [];
                    if (action === 'toggle') {
                        const name = typeof body.name === 'string' ? body.name : '';
                        const enabled = body.enabled === true;
                        if (groups[name] === undefined) {
                            sendJson(response, 400, { ok: false, error: 'group not found / 分组不存在' });
                            return;
                        }
                        pendingRollbacks.clear();
                        // Batch toggle: on = every installed member enabled, off = every
                        // member disabled. Each member keeps its own persisted flag, so
                        // later individual toggles still work (the group switch itself is
                        // derived state and never stored).
                        const failures = [];
                        for (const member of groups[name]) {
                            if (!installed.has(member))
                                continue;
                            const result = enabled && themeNames.has(member)
                                ? { ok: await themes.activateTheme(member), reason: undefined }
                                : await setPluginEnabled(member, enabled);
                            if (!result.ok)
                                failures.push(member);
                            // Same live-mismatch signal as the single toggle: a member
                            // whose fiber did not follow the switch needs a boot.
                            const liveAfter = liveNames().has(member);
                            if ((enabled && !liveAfter) || (!enabled && liveAfter))
                                restartMembers.push(member);
                            // Client-part members need a page refresh to show the change.
                            if (packageHasClientPart(activeProfileDir, member))
                                refreshMembers.push(member);
                        }
                        ok = failures.length === 0;
                        if (!ok)
                            error = `failed to ${enabled ? 'enable' : 'disable'}: ${failures.join(', ')}`;
                    }
                    else {
                        const state = { groups, groupOrder };
                        const result = action === 'create' ? createGroup(state, body.name)
                            : action === 'rename' ? renameGroup(state, body.name, body.newName)
                                : action === 'delete' ? deleteGroup(state, body.name)
                                    : setGroupMembers(state, body.name, body.members, installed, themeNames);
                        ok = result.ok;
                        error = result.error;
                    }
                    if (ok)
                        writeMarketState(activeProfileDir, { disabled, groups, groupOrder });
                    logEvent(ok ? 'info' : 'warn', 'groups', `${action}${typeof body.name === 'string' ? ' ' + body.name : ''}${ok ? '' : ` — ${error ?? ''}`}`);
                    sendJson(response, ok ? 200 : 400, {
                        ok,
                        error,
                        groups,
                        groupOrder,
                        disabled: [...disabled],
                        restartMembers,
                        refreshMembers,
                    });
                }
                catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    logEvent('error', 'groups', `route error: ${message}`);
                    sendJson(response, 500, { error: message });
                }
            },
        }),
        host.webServer.register({
            kind: 'exact',
            path: '/dsh-market/status',
            handler: async (request, response) => {
                if (request.method !== 'GET') {
                    response.writeHead(405, { allow: 'GET' });
                    response.end();
                    return;
                }
                await dropStaleHotMounts();
                const installed = readInstalled(config.profile, activeProfileDir);
                sendJson(response, 200, {
                    active: progress.active,
                    target: progress.target,
                    seconds: progress.active ? Math.round((Date.now() - progress.startedAt) / 1000) : 0,
                    lastLine: progress.lastLine,
                    phase: progress.phase,
                    done: progress.done,
                    total: progress.total,
                    currentPackage: progress.currentPackage,
                    downloaded: progress.downloaded,
                    size: progress.size,
                    ndjson: progress.ndjson,
                    error: progress.error,
                    cancelling: progress.cancelling,
                    // The route-level operation flag, NOT progress.active: after pnpm
                    // exits, install post-processing (retarget, validation, hot-mount)
                    // still holds the operation lock for a moment — the exact window
                    // where clicking the restart banner used to bounce off a 409 (#91).
                    busy: installing,
                    pnpm: await commands.probePnpm(),
                    boot: BOOT_ID,
                    agentGuardAvailable: agentsGuardAvailable(),
                    // Shown in the page heading so screenshots carry it (#159).
                    version: marketVersion(),
                    channel: activeChannel(),
                    channels: CHANNELS,
                    region,
                    regions: REGIONS,
                    // The prefix the BROWSER should put in front of github.com URLs
                    // (avatars, README images). Sent resolved rather than derived from
                    // `region` on the client, so the routing table has one home and a
                    // change to it cannot leave the two halves disagreeing.
                    githubProxy: routesFor(region).githubProxy,
                    // Whether the region was decided by the network check rather than
                    // by the user — the card explains a choice it made on their behalf
                    // exactly once, so nobody has to wonder why downloads moved.
                    regionAuto,
                    restart: restartAllowed(config),
                    // Named so the UI can say WHY the button is gone. A blank
                    // "no restart button" is the state #229 reported as broken.
                    supervisor: detectedSupervisor(),
                    debugger: detectedDebugger(),
                    selfManaged: installed.dshmarket !== undefined || installed['dsh-market'] !== undefined,
                    installed,
                });
            },
        }),
        host.webServer.register({
            kind: 'exact',
            path: '/dsh-market/logs',
            handler: (request, response) => {
                if (request.method !== 'GET') {
                    response.writeHead(405, { allow: 'GET' });
                    response.end();
                    return;
                }
                const version = marketVersion();
                response.writeHead(200, {
                    'cache-control': 'no-store',
                    'content-type': 'text/plain; charset=utf-8',
                    'content-disposition': 'attachment; filename="dsh-market-log.txt"',
                });
                // Built here, not in log.ts: this is the composition, and the log
                // module deliberately knows nothing about profiles. Each declared
                // bundle is marked with whether it actually resolves, because an
                // unresolvable one is what stops the next boot (#339, #341) and it
                // is invisible in a manifest listing on its own.
                const snapshot = [];
                try {
                    const report = analyzeProfile(activeProfileDir);
                    const installed = readInstalled(config.profile, activeProfileDir);
                    snapshot.push(`dependencies (${String(Object.keys(installed).length)}):`);
                    for (const [name, spec] of Object.entries(installed))
                        snapshot.push(`  ${name}: ${spec}`);
                    snapshot.push(`bundles (${String(report.bundles.length)}):`);
                    for (const layer of report.bundles) {
                        const state = layer.directory !== null
                            ? 'ok'
                            : layer.unresolvedInbox === true
                                ? 'supplied by the dsh installation (not locatable from here)'
                                : 'NOT RESOLVED — the next start fails here';
                        snapshot.push(`  ${layer.name}: ${state}`);
                    }
                    if (report.summary.errors.length > 0) {
                        snapshot.push('errors:');
                        for (const line of report.summary.errors)
                            snapshot.push(`  ${line}`);
                    }
                }
                catch (error) {
                    snapshot.push(`profile state unavailable: ${error instanceof Error ? error.message : String(error)}`);
                }
                // The host version, and where it was found. Absent until now, and
                // it is the field investigations kept stalling on: #293 spent three
                // rounds before it emerged that the reporter's host was newer than
                // every attempt to reproduce, and a path under Electron's resources
                // is how a Desktop-bundled (possibly older, #139) host announces
                // itself. sanitize() rewrites the home prefix in the value.
                const host = dshHostInfo();
                response.end(exportLogs({
                    'dsh-market': version,
                    'dsh host': host === null
                        ? 'not locatable from this process'
                        : `${host.version} (${host.directory})`,
                    platform: `${process.platform} ${process.arch}`,
                    node: process.version,
                    profile: config.profile,
                }, snapshot, readPersistentLog(persistentLogFile)));
            },
        }),
        host.webServer.register({
            kind: 'exact',
            path: '/dsh-market/updates',
            handler: async (request, response) => {
                if (request.method !== 'GET') {
                    response.writeHead(405, { allow: 'GET' });
                    response.end();
                    return;
                }
                try {
                    const force = (request.url ?? '').includes('force=1');
                    // Only the market itself follows the channel setting (see
                    // MarketSettings.channel): a user opting into betas is volunteering
                    // to try THIS plugin early, not to be handed every other author's
                    // unreleased work.
                    const channel = activeChannel();
                    const installed = readInstalled(config.profile, activeProfileDir);
                    const channelFor = new Map(Object.keys(installed)
                        .filter(name => SELF_NAMES.has(name))
                        .map(name => [name, channel]));
                    const onlineSourceFor = new Map();
                    try {
                        const registry = await loadRegistry();
                        for (const [name, spec] of Object.entries(installed)) {
                            if (!spec.toLowerCase().startsWith('file:'))
                                continue;
                            const evidence = readInstalledRepoEvidence(config.profile, name, spec, activeProfileDir);
                            const entry = findCatalogEntryForLocal(registry.plugins, name, evidence.identities, evidence.hints);
                            const target = entry === null ? null : restoreTargetForLocal(entry, evidence.identities);
                            if (target !== null && NPM_NAME_RE.test(target))
                                onlineSourceFor.set(name, target);
                        }
                    }
                    catch (error) {
                        logEvent('warn', 'updates', `local package source lookup failed — ${error instanceof Error ? error.message : String(error)}`);
                    }
                    sendJson(response, 200, {
                        updates: await checkUpdates(config.profile, force, activeProfileDir, channelFor, onlineSourceFor),
                    });
                }
                catch (error) {
                    sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) });
                }
            },
        }),
        // Read-only notes for the update dialog (#294): release body and/or a
        // commit tail sliced at the installed sha, resolved from the catalog
        // side's daily probe — no GitHub API call is made here, ever. The handler
        // itself does not throw (every failure degrades to `kind: 'none'`), so a
        // dialog that cannot load its data shows a neutral statement rather than
        // an error banner.
        host.webServer.register({
            kind: 'exact',
            path: '/dsh-market/changelog',
            handler: async (request, response) => {
                if (request.method !== 'GET') {
                    response.writeHead(405, { allow: 'GET' });
                    response.end();
                    return;
                }
                try {
                    const name = new URL(request.url ?? '/', 'http://localhost').searchParams.get('name') ?? '';
                    if (name === '') {
                        sendJson(response, 400, { error: 'name query parameter is required' });
                        return;
                    }
                    sendJson(response, 200, await updateNotesFor(config.profile, activeProfileDir, name));
                }
                catch (error) {
                    sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) });
                }
            },
        }),
        host.webServer.register(captureLegacy('/dsh-market/update', {
            kind: 'exact',
            path: '/dsh-market/update',
            handler: async (request, response) => {
                if (request.method !== 'POST') {
                    response.writeHead(405, { allow: 'POST' });
                    response.end();
                    return;
                }
                if (!sameOrigin(request)) {
                    sendJson(response, 403, { error: 'untrusted origin' });
                    return;
                }
                try {
                    await withMutationLock(response, 'install', async () => {
                        const body = (await readJsonBody(request));
                        const name = typeof body.name === 'string' ? body.name : '';
                        const force = body.force === true;
                        const restore = body.restore === true;
                        const manifestCapture = captureUpdateManifest();
                        if (!manifestCapture.ok) {
                            sendJson(response, 500, {
                                error: `更新前无法安全读取 profile package.json，未执行任何修改（${manifestCapture.detail}）。 / The profile package.json could not be captured safely before update; nothing was changed (${manifestCapture.detail}).`,
                            });
                            return;
                        }
                        let spec = manifestCapture.snapshot.dependencies[name];
                        if (spec === undefined || INBOX_BUNDLES.has(name)) {
                            sendJson(response, 400, { error: 'plugin is not installed' });
                            return;
                        }
                        if (restore && !isLocalSpec(spec)) {
                            sendJson(response, 400, { error: 'restore 只适用于 link:/file: 的本地开发安装。 / Restore only applies to locally developed link:/file: installs.' });
                            return;
                        }
                        if (restore && SELF_NAMES.has(name) && spec.toLowerCase().startsWith('link:')) {
                            sendJson(response, 400, { error: '市场的本地开发链接不会被线上版本替换。 / The market\'s local development link is never replaced by an online release.' });
                            return;
                        }
                        if (isLocalSpec(spec)) {
                            if (!restore) {
                                sendJson(response, 400, { error: 'locally linked plugins update from their checkout' });
                                return;
                            }
                            // Restore replaces the local checkout with the curated source
                            // so the ordinary update check can see it again. Same add path
                            // as a registry update — only the resolved target changes.
                            let catalogTarget = null;
                            try {
                                const registry = await loadRegistry();
                                const evidence = readInstalledRepoEvidence(config.profile, name, spec, activeProfileDir);
                                const entry = findCatalogEntryForLocal(registry.plugins, name, evidence.identities, evidence.hints);
                                catalogTarget = entry === null ? null : restoreTargetForLocal(entry, evidence.identities);
                                const workspaceDeps = workspaceProtocolDeps(readInstalledManifest(config.profile, name, activeProfileDir));
                                if (catalogTarget !== null && restoreBlockedByWorkspace(catalogTarget, workspaceDeps)) {
                                    sendJson(response, 400, {
                                        error: `该插件依赖 monorepo workspace 包（${workspaceDeps.join(', ')}），无法从 Git 子目录单独恢复。请继续用本地开发，或等作者发布 npm 后再恢复。 / This plugin depends on monorepo workspace packages (${workspaceDeps.join(', ')}); a git subdirectory install cannot resolve workspace: protocol. Keep the local checkout, or restore after the author publishes to npm.`,
                                    });
                                    return;
                                }
                            }
                            catch (error) {
                                logEvent('warn', 'update', `${name}: restore catalog lookup failed — ${error instanceof Error ? error.message : String(error)}`);
                            }
                            if (catalogTarget === null) {
                                sendJson(response, 400, {
                                    error: '目录里找不到对应的线上版本，无法从本地开发恢复。 / No catalog entry matches this local plugin, so it cannot be restored to a registry install.',
                                });
                                return;
                            }
                            spec = catalogTarget;
                        }
                        // Replacing a package on disk under a live agent is a mixed-state
                        // hazard the "restart" verdict cannot fix: the running module keeps
                        // executing while its files change under it, so lazily imported
                        // assets and data reads can fail or change version mid-turn.
                        // No bypass is offered — the user can wait or cancel the agent.
                        const busyAgents = runningAgentsForGuard();
                        if (busyAgents.length > 0) {
                            logEvent('warn', 'update-blocked', `${name}: refused while agents are running — ${busyAgents.join(', ')}`);
                            sendJson(response, 409, {
                                error: `有 agent 正在运行（${busyAgents.join(', ')}）。更新会直接替换插件文件，正在工作的 agent 可能在执行中途读到缺失或新版本的文件而报错；请等它完成或取消后再更新。 / ${busyAgents.length === 1 ? 'An agent is running' : 'Agents are running'} (${busyAgents.join(', ')}). Updating replaces plugin files in place, so a working agent can fail or mix versions mid-turn; wait for it to finish (or cancel it) before updating.`,
                                agentsBusy: true,
                                runningAgents: busyAgents,
                            });
                            return;
                        }
                        const beforeInstalled = readInstalled(config.profile, activeProfileDir);
                        // Re-running add re-resolves the source: git HEAD for github specs,
                        // dist-tag latest for registry installs.
                        // A GitHub source in EITHER spelling. A legacy regional install
                        // can carry a proxied codeload URL rather than the `github:`
                        // shortcut, and asking only about the shortcut sent those down
                        // the npm path below —
                        // where `name@latest` either fails or, far worse, installs an
                        // unrelated package that happens to share the plugin's name.
                        // The `github:` shortcut keeps its own handling, fragments and
                        // all — `githubUpdateTarget` is what preserves a monorepo
                        // `#path:` while dropping revision selectors (#281).
                        //
                        // A proxied codeload URL is the legacy spelling of the same
                        // source. It has no fragment to preserve (subpath entries
                        // are never accelerated), so the canonical shortcut is rebuilt
                        // from it. Without this branch these fell through to the npm path
                        // below, where `name@latest` either fails or — far worse —
                        // installs an unrelated package that shares the plugin's name.
                        const codeloadRepo = spec.startsWith('github:') ? null : repoOfTarget(spec);
                        const gitSpec = spec.startsWith('github:')
                            ? githubUpdateTarget(spec)
                            : codeloadRepo === null ? null : `github:${codeloadRepo}`;
                        const isGit = gitSpec !== null;
                        const isReleaseTarball = !restore && isGitHubReleaseTarballSpec(spec);
                        const isNpmRollbackSource = !restore && !isGit && !isReleaseTarball
                            // Market-managed npm installs persist only a range, version, or
                            // dist-tag. Any protocol/path/manual shorthand needs its own
                            // proven source-preserving rollback rather than being guessed
                            // into name@<installed-version>.
                            && !/[:/\\]/.test(spec);
                        // Every ordinary non-Git update still installs name@<tag>, even
                        // when its PREVIOUS source was a release URL. Source
                        // classification chooses rollback mechanics; it must not weaken
                        // the existing registry target/downgrade validation.
                        const usesNpmUpdateTarget = !restore && !isGit;
                        // `@latest` was hardcoded, so a beta subscriber would have been
                        // told an update existed and then handed the stable build. The
                        // dist-tag has to follow the same setting the offer came from.
                        // The market follows its channel; everything else is `latest`.
                        const selfChannel = SELF_NAMES.has(name) ? activeChannel() : null;
                        const tag = selfChannel === null ? 'latest' : DIST_TAG[selfChannel];
                        let expectedNpmVersion = null;
                        // Re-accelerated from the unpinned shortcut, never from the
                        // installed URL: that one names the commit already on disk, so
                        // reusing it would be an update that can never move.
                        //
                        // A restore is not an update. `spec` by now IS the catalog target
                        // the checkout is being put back onto, and it is already exact: a
                        // `#path:` on it selects which package, not which version, and a
                        // prebuilt Release tarball (#250) is a URL that `@latest` must not
                        // be glued onto — only a bare npm name wants the dist-tag.
                        // acceleratedTarget returns anything that is not a bare
                        // `github:owner/repo` untouched, so passing a restore through it
                        // still gets a China-region mirror where one applies and changes
                        // nothing where one does not.
                        const target = restore
                            ? (NPM_NAME_RE.test(spec) ? `${spec}@${tag}` : await acceleratedTarget(spec, region))
                            : gitSpec === null
                                ? `${name}@${tag}`
                                : await acceleratedTarget(gitSpec, region);
                        // Never let `@latest` walk a profile BACKWARDS (#64 by @ZeroOrigin64):
                        // a package whose latest dist-tag was left on an older release turns
                        // this update into a downgrade that also rewrites an exact pin to
                        // `@latest`. Detection already hides the button; this guards the
                        // route itself. Unreadable versions fall through and update as before.
                        //
                        // A channel-following package is exempt from the DIRECTION, not
                        // from the check. Going backwards is exactly what "put me back on
                        // stable" means, and #64 is about a downgrade nobody asked for —
                        // so here the guard only refuses when the channel already points
                        // at what is installed, and it compares against the target tag
                        // rather than `latest`, which is not the tag being installed.
                        if (usesNpmUpdateTarget) {
                            const installedVersion = readInstalledVersion(config.profile, name, activeProfileDir);
                            const registryLatest = selfChannel === null
                                ? await fetchNpmLatest(name)
                                : await versionOnChannel(name, selfChannel, await fetchNpmLatest(name));
                            expectedNpmVersion = registryLatest;
                            const refuse = selfChannel === null
                                ? installedVersion !== null && registryLatest !== null && !isUpgrade(installedVersion, registryLatest)
                                : installedVersion !== null && registryLatest !== null && installedVersion === registryLatest;
                            if (refuse) {
                                logEvent('info', 'update', `${name} refused: latest=${registryLatest} is not newer than installed=${installedVersion}`);
                                sendJson(response, 400, {
                                    error: `已是最新：registry 的 latest 是 ${registryLatest}，不高于已装的 ${installedVersion}，更新会造成降级。 / Already current: the registry's latest (${registryLatest}) is not newer than the installed ${installedVersion}, so updating would downgrade it.`,
                                });
                                return;
                            }
                        }
                        const repoIdentity = isGit ? repoOfTarget(spec) : null;
                        const repoKey = repoIdentity?.split('#')[0] ?? null;
                        // dsh-cli's deliberately narrow target grammar rejects the `&`
                        // required to combine an exact commit and a monorepo path. Do not
                        // weaken that command boundary or offer a rollback action that
                        // the real host can never execute.
                        const hasGitSubpath = repoIdentity?.includes('#path:/') ?? false;
                        // Captured BEFORE pnpm replaces the files: afterwards the loader
                        // inventory reads exactly the same, because replacing a package
                        // on disk does not unload the module the process already imported.
                        // A client-only package has no host half to go stale: its bundle
                        // is re-fetched from disk on the next page load, so an update to
                        // one needs a refresh, not a restart.
                        const wasLive = verifyActivation(config.profile, name, liveNames(), activeProfileDir, disabled.has(name)).state === 'live'
                            && hasHostHalf(config.profile, name, activeProfileDir);
                        const beforeVersion = readInstalledVersion(config.profile, name, activeProfileDir);
                        // A durable manifest pin is independently authoritative. When its
                        // captured lock is missing or stale, the exact OLD re-add repairs
                        // that lock and rollback must keep the repair. Floating Git specs
                        // still derive identity from the captured lock, so their exact
                        // importer bytes remain the authority after rematerialization.
                        const manifestPinnedCommit = repoKey !== null ? githubCommitOfTarget(spec) : null;
                        const capturedLockCommit = repoKey !== null
                            ? readLockCommits(config.profile, activeProfileDir).get(repoKey) ?? null
                            : null;
                        const beforeCommit = manifestPinnedCommit ?? capturedLockCommit;
                        const keepRepairedGitLock = manifestPinnedCommit !== null
                            && capturedLockCommit !== manifestPinnedCommit;
                        const gitRollbackTarget = beforeCommit === null
                            ? null
                            : exactGitRollbackTarget(spec, beforeCommit);
                        // force: the user chose to install a fresh release without the
                        // default one-day safety wait; scoped to this single command.
                        const addArgs = force ? ['add', RELEASE_AGE_OVERRIDE, target] : ['add', target];
                        // Exact manifest snapshot for failure rollback (#65, #339) — the
                        // host can write dependencies AND dsh.profile.bundles before a
                        // hard-failed add, leaving residue that breaks the next boot.
                        pendingRollbacks.clear();
                        const compatibilityBefore = assessProfile(config.profile, activeProfileDir);
                        // pnpm re-extracts the whole tree on any operation, so a plugin
                        // nobody touched can come back pristine-and-broken, or lose a
                        // patch that was holding it together (#222). Only what THIS run
                        // broke is attributable to it, so the profile is swept before as
                        // well as after.
                        const bundlesBefore = brokenClientBundles(config.profile, activeProfileDir);
                        const manifestBefore = manifestCapture.snapshot;
                        const lockfileCapture = captureProfileLockfile();
                        const previousVersionZh = beforeVersion === null ? '更新前版本未知' : `更新前版本为 v${beforeVersion}`;
                        const previousVersionEn = beforeVersion === null ? 'the previous version is unknown' : `the previous version was v${beforeVersion}`;
                        const rollbackPlan = restore
                            ? { available: true, source: { kind: 'manifest' } }
                            : !lockfileCapture.ok
                                ? { available: false, detail: lockfileCapture.detail }
                                : isGit
                                    ? hasGitSubpath
                                        ? {
                                            available: false,
                                            detail: `更新前的 GitHub 来源使用 monorepo 子目录${beforeCommit === null ? '' : `（提交 ${beforeCommit}）`}，当前 DSH 命令无法表达该精确目标，因此自动回滚不可用；需要时请手工重新安装该提交。 / The previous GitHub source uses a monorepo subpath${beforeCommit === null ? '' : ` at commit ${beforeCommit}`}; the current DSH command cannot express that exact target, so automatic rollback is unavailable. Reinstall that commit manually if needed.`,
                                            lockfileBefore: lockfileCapture.snapshot,
                                        }
                                        : beforeCommit === null
                                            ? {
                                                available: false,
                                                detail: '未能确认更新前的 GitHub 提交，因此自动回滚不可用；需要时请从可信来源手工重新安装先前版本。 / The previous GitHub commit could not be verified, so automatic rollback is unavailable. Reinstall the prior version manually from a trusted source if needed.',
                                                lockfileBefore: lockfileCapture.snapshot,
                                            }
                                            : gitRollbackTarget === null || !supportsExactRollbackTarget(gitRollbackTarget)
                                                ? {
                                                    available: false,
                                                    detail: `当前宿主无法安装更新前的精确 GitHub 提交 ${beforeCommit}，因此自动回滚不可用；需要时请手工重新安装该提交。 / This host cannot install the exact previous GitHub commit ${beforeCommit}, so automatic rollback is unavailable. Reinstall that commit manually if needed.`,
                                                    lockfileBefore: lockfileCapture.snapshot,
                                                }
                                                : {
                                                    available: true,
                                                    source: {
                                                        kind: 'github',
                                                        target: spec,
                                                        beforeCommit,
                                                        lockfileBefore: lockfileCapture.snapshot,
                                                        keepRepairedLock: keepRepairedGitLock,
                                                    },
                                                }
                                    : isReleaseTarball
                                        // A release download URL is not a content identity: GitHub
                                        // assets can be replaced unless immutable releases are
                                        // enabled. Re-adding the same URL could bless different
                                        // bytes, so restore durable state but never claim an exact
                                        // build rollback without a captured content binding.
                                        ? {
                                            available: false,
                                            detail: `${previousVersionZh}，但先前的 Release 归档没有经过验证的不可变内容标识；同一链接以后可能返回不同文件，因此自动回滚不可用。需要时请从可信来源手工重新安装${beforeVersion === null ? '先前版本' : ` v${beforeVersion}`}。 / ${previousVersionEn}, but the previous Release archive has no verified immutable content identity; the same URL may later return different bytes, so automatic rollback is unavailable. Reinstall ${beforeVersion === null ? 'the prior version' : `v${beforeVersion}`} manually from a trusted source if needed.`,
                                            lockfileBefore: lockfileCapture.snapshot,
                                        }
                                        : isNpmRollbackSource
                                            ? beforeVersion === null
                                                ? {
                                                    available: false,
                                                    detail: '未能确认更新前安装的 npm 版本，因此自动回滚不可用；需要时请从可信来源手工重新安装先前版本。 / The previously installed npm version could not be verified, so automatic rollback is unavailable. Reinstall the prior version manually from a trusted source if needed.',
                                                    lockfileBefore: lockfileCapture.snapshot,
                                                }
                                                : lockfileCapture.snapshot.present
                                                    && capturedNpmVersion(lockfileCapture.snapshot, name) !== beforeVersion
                                                    ? {
                                                        available: false,
                                                        detail: `更新前安装的是 v${beforeVersion}，但 pnpm-lock.yaml 中的版本与它不一致，因此无法证明精确来源，自动回滚不可用。需要时请手工重新安装 ${name}@${beforeVersion}。 / The installed version before the update was v${beforeVersion}, but pnpm-lock.yaml does not match it, so the exact source cannot be proven and automatic rollback is unavailable. Reinstall ${name}@${beforeVersion} manually if needed.`,
                                                        lockfileBefore: lockfileCapture.snapshot,
                                                    }
                                                    : !supportsExactRollbackTarget(`${name}@${beforeVersion}`)
                                                        ? {
                                                            available: false,
                                                            detail: `当前宿主无法安装更新前的精确 npm 目标 ${name}@${beforeVersion}（v${beforeVersion}），因此自动回滚不可用；需要时请手工重新安装该版本。 / This host cannot install the exact previous npm target ${name}@${beforeVersion} (v${beforeVersion}), so automatic rollback is unavailable. Reinstall that version manually if needed.`,
                                                            lockfileBefore: lockfileCapture.snapshot,
                                                        }
                                                        : { available: true, source: { kind: 'npm', beforeVersion, lockfileBefore: lockfileCapture.snapshot } }
                                            : {
                                                available: false,
                                                detail: `更新前的来源 ${spec} 不是受支持的精确回滚目标（${previousVersionZh}），因此自动回滚不可用；需要时请从可信来源手工重新安装先前版本。 / The previous source ${spec} is not a supported exact rollback target (${previousVersionEn}), so automatic rollback is unavailable. Reinstall the prior version manually from a trusted source if needed.`,
                                                lockfileBefore: lockfileCapture.snapshot,
                                            };
                        const result = await runPlugin(config.profile, addArgs);
                        const cancelled = result.cancelled;
                        const rollbackAttemptBuild = async () => {
                            if (rollbackPlan.available) {
                                return executeUpdateRollback(name, manifestBefore, rollbackPlan.source);
                            }
                            restoreProfileManifest(config.profile, manifestBefore, activeProfileDir);
                            const lockRestore = rollbackPlan.lockfileBefore === undefined
                                ? { ok: true, detail: null }
                                : restoreProfileLockfile(rollbackPlan.lockfileBefore);
                            return {
                                ok: false,
                                detail: lockRestore.ok ? rollbackPlan.detail : `${rollbackPlan.detail}; ${lockRestore.detail ?? 'the lockfile could not be restored'}`,
                            };
                        };
                        let rollbackOk = true;
                        let rollbackDetail = null;
                        let hardFailureRollbackError = null;
                        // A non-zero exit or timeout can happen after pnpm has replaced
                        // both package.json and node_modules. Restoring the manifest alone
                        // leaves the rejected build running after restart. Reinstall the
                        // exact prior source identity unless the host rejected the start
                        // as busy or the user deliberately cancelled and chose to inspect
                        // the resulting partial state.
                        if ((result.exitCode !== 0 || result.timedOut) && !cancelled && result.busy !== true) {
                            const rollback = await rollbackAttemptBuild();
                            rollbackOk = rollback.ok;
                            rollbackDetail = rollback.detail;
                            if (rollback.ok) {
                                logEvent('warn', 'update', `${name}: failed update command; previous build restored and verified`);
                            }
                            else {
                                hardFailureRollbackError = `${name} 更新失败，且更新前的构建未能验证恢复（${rollback.detail ?? 'unknown'}）；请先检查该 profile，再重新启动。 / ${name} update failed and restoration of the previous build could not be verified (${rollback.detail ?? 'unknown'}); inspect this profile before restarting.`;
                                logEvent('error', 'update-rollback', `${name}: failed update command and restoration of the previous build could not be verified — ${rollback.detail ?? 'unknown'}`);
                            }
                        }
                        let ok = result.exitCode === 0 && !result.timedOut && !cancelled;
                        let stale = false;
                        let versionFailureCode = null;
                        let versionFailureError = null;
                        let activation;
                        if (ok) {
                            if (restore) {
                                // Restore succeeds when the spec is no longer local, even if
                                // the checkout already sat on the same version as latest.
                                const afterSpec = readInstalled(config.profile, activeProfileDir)[name];
                                const stillLocal = afterSpec !== undefined && isLocalSpec(afterSpec);
                                if (stillLocal)
                                    ok = false;
                            }
                            else {
                                stale = isStaleUpdate({
                                    isGit,
                                    beforeVersion,
                                    afterVersion: readInstalledVersion(config.profile, name, activeProfileDir),
                                    beforeCommit,
                                    afterCommit: repoKey !== null
                                        ? readLockCommits(config.profile, activeProfileDir).get(repoKey) ?? null
                                        : null,
                                });
                                if (stale)
                                    ok = false;
                            }
                        }
                        // pnpm's minimumReleaseAge can silently resolve `@latest` to an
                        // OLDER release and still exit 0. The old stale check only caught
                        // "same version"; a real 0.2.24 -> 0.2.23 regression therefore
                        // looked like a successful update. Verify the bytes that actually
                        // landed against both the pre-update version and the registry
                        // target, then rematerialize the previous build on any mismatch.
                        if (ok && usesNpmUpdateTarget) {
                            const afterVersion = readInstalledVersion(config.profile, name, activeProfileDir);
                            const direction = beforeVersion !== null && afterVersion !== null
                                ? compareVersions(afterVersion, beforeVersion)
                                : null;
                            const unexpectedDowngrade = selfChannel === null && direction !== null && direction < 0;
                            // Only a version BELOW the target is a mismatch. `latest` can move
                            // forward while pnpm is still downloading — a large plugin gives
                            // the author minutes of window — and rejecting the newer release
                            // that arrives would roll back a good update and report it as a
                            // failure. Getting less than we asked for is the actual symptom.
                            const target = expectedNpmVersion;
                            const targetOrder = target !== null && afterVersion !== null
                                ? compareVersions(afterVersion, target)
                                : null;
                            const targetMismatch = target !== null && (afterVersion === null
                                || (targetOrder !== null
                                    // Comparable: getting LESS than we asked for is the symptom.
                                    // A version above the target is `latest` moving forward while
                                    // pnpm was still downloading, which is a good update.
                                    ? targetOrder < 0
                                    // Not comparable as semver. With no way to tell forward from
                                    // back, keep the exact check this replaced.
                                    : afterVersion !== target));
                            if (unexpectedDowngrade || targetMismatch) {
                                versionFailureCode = unexpectedDowngrade ? 'DOWNGRADE_DETECTED' : 'RESOLVED_VERSION_MISMATCH';
                                ok = false;
                                const rollback = await rollbackAttemptBuild();
                                rollbackOk = rollback.ok;
                                rollbackDetail = rollback.detail;
                                const mismatchZh = unexpectedDowngrade
                                    ? `${name} 更新实际解析为 v${afterVersion ?? 'unknown'}，低于更新前的 v${beforeVersion ?? 'unknown'}；已拒绝降级`
                                    : `${name} 更新目标为 v${expectedNpmVersion ?? 'unknown'}，但实际安装为 v${afterVersion ?? 'unknown'}`;
                                const mismatchEn = unexpectedDowngrade
                                    ? `${name} resolved to v${afterVersion ?? 'unknown'}, below the installed v${beforeVersion ?? 'unknown'}; the downgrade was rejected`
                                    : `${name} targeted v${expectedNpmVersion ?? 'unknown'} but installed v${afterVersion ?? 'unknown'}`;
                                versionFailureError = rollback.ok
                                    ? `${mismatchZh}；已自动恢复原版本。 / ${mismatchEn}; the previous build was restored.`
                                    : `${mismatchZh}；回滚未能验证恢复原版本（${rollback.detail ?? 'unknown'}）。 / ${mismatchEn}; restoration of the previous build could not be verified (${rollback.detail ?? 'unknown'}).`;
                                logEvent('error', 'update-version', `${name}: ${versionFailureCode} before=${beforeVersion ?? 'unknown'} expected=${expectedNpmVersion ?? 'unknown'} actual=${afterVersion ?? 'unknown'}${rollback.ok ? '; previous build restored' : `; rollback failed: ${rollback.detail ?? 'unknown'}`}`);
                            }
                        }
                        // The new build has to be loadable (#159). pnpm exits 0 for any
                        // tarball it can extract, and the version really did change, so
                        // nothing above notices a package that arrived without its entry
                        // artifact — a registry mirror serving a source-only tarball for
                        // a just-published version is the reported case, a plugin author
                        // shipping a broken `files` list is the other one.
                        //
                        // Activation cannot stand in for this check: a package updating
                        // ITSELF still reports live, because the running fiber belongs to
                        // the OLD code that is already in memory. The failure only
                        // surfaces on the next boot, as a profile that will not start.
                        let brokenEntry = false;
                        if (ok && !hasLoadableEntry(activeProfileDir, name)) {
                            brokenEntry = true;
                            ok = false;
                            const rollback = await rollbackAttemptBuild();
                            rollbackOk = rollback.ok;
                            rollbackDetail = rollback.detail;
                            logEvent('error', 'update', `${name}: updated build has no loadable entry — ${rollback.ok ? 'previous build restored' : `could not restore previous files: ${rollback.detail ?? 'unknown'}`}`);
                        }
                        // Composition-level boot check for the remaining brick shapes:
                        // duplicate loader entry ids, unparseable bundle patches, or
                        // bundle layers that no longer resolve. hasLoadableEntry cannot
                        // see these because the entry file exists — the profile still
                        // cannot boot until the next start.
                        let trialError = null;
                        if (ok) {
                            const stack = readBundleStack(activeProfileDir);
                            const trial = trialValidate(activeProfileDir, stack.community);
                            if (!trial.ok) {
                                ok = false;
                                const first = trial.errors[0]?.message ?? 'the composition would not boot';
                                const rollback = await rollbackAttemptBuild();
                                rollbackOk = rollback.ok;
                                rollbackDetail = rollback.detail;
                                trialError = rollback.ok
                                    ? `${name} 更新后的组合无法启动（${first}），已自动回滚并恢复原版本文件。 / ${name} updated to a composition that cannot boot (${first}); the previous build was restored.`
                                    : `${name} 更新后的组合无法启动（${first}），回滚未能恢复原版本文件（${rollback.detail ?? 'unknown'}）；请运行 dsh plugin --profile ${config.profile} install 手工恢复。 / ${name} updated to a composition that cannot boot (${first}); the previous files could not be restored (${rollback.detail ?? 'unknown'}) — run 'dsh plugin --profile ${config.profile} install' to recover manually.`;
                                logEvent('error', 'update', `${name}: trial validation failed — ${first}${rollback.ok ? '; previous build restored' : `; could not restore previous files: ${rollback.detail ?? 'unknown'}`}`);
                            }
                        }
                        let compatibility;
                        if (ok) {
                            invalidateUpdates();
                            activation = {
                                [name]: activationAfterReplace(verifyActivation(config.profile, name, liveNames(), activeProfileDir, disabled.has(name)), wasLive),
                            };
                            const after = assessProfile(config.profile, activeProfileDir);
                            const risks = introducedRisks(compatibilityBefore, after);
                            // An update can introduce shadowing too: a bundle migration
                            // moves a plugin between layers, which is exactly the shape
                            // #230 reported (bundle layer vs user patch layer).
                            const shadowed = introducedDuplicateNames(compatibilityBefore, after);
                            // See the install route: an update is the operation the #222
                            // report actually hit.
                            const bundleCheck = checkClientBundle(config.profile, name, activeProfileDir);
                            const brokenBundles = newlyBrokenBundles(bundlesBefore, [
                                ...(bundleCheck.ok ? [] : [{ name, reason: bundleCheck.reason ?? 'parse failed' }]),
                                ...brokenClientBundles(config.profile, activeProfileDir),
                            ].filter((entry, index, all) => all.findIndex(other => other.name === entry.name) === index));
                            if (risks.length > 0 || shadowed.length > 0 || brokenBundles.length > 0) {
                                const rollbackId = rollbackPlan.available
                                    ? savePendingRollback({
                                        kind: 'update',
                                        names: [name],
                                        manifestBefore,
                                        updateSource: rollbackPlan.source,
                                    })
                                    : null;
                                compatibility = {
                                    code: 'soft-incompatible',
                                    risks,
                                    shadowedNames: shadowed.length > 0 ? shadowed : undefined,
                                    brokenBundles: brokenBundles.length > 0 ? brokenBundles : undefined,
                                    ...(rollbackId !== null
                                        ? { rollbackId }
                                        : {
                                            rollbackUnavailable: rollbackPlan.available
                                                ? `更新完成后无法安全捕获 profile 状态（${previousVersionZh}），因此自动回滚不可用；需要时请从可信来源手工重新安装先前版本。 / The post-update profile state could not be captured safely (${previousVersionEn}), so automatic rollback is unavailable. Reinstall the prior version manually from a trusted source if needed.`
                                                : rollbackPlan.detail,
                                        }),
                                };
                                if (brokenBundles.length > 0) {
                                    logEvent('error', 'update-bundle', `${brokenBundles.map(entry => `${entry.name}: ${entry.reason}`).join('; ')}`);
                                }
                                if (risks.length > 0) {
                                    logEvent('warn', 'update-compat', `${name}: introduced host-compatibility risks — ${risks.map(risk => `${risk.peer}@${risk.range} vs ${risk.resolved}`).join('; ')}`);
                                }
                                if (shadowed.length > 0) {
                                    logEvent('warn', 'update-shadow', `${name}: introduced cross-layer duplicate loader names — ${shadowed.map(entry => `${entry.name} (${entry.layers.join(' + ')})`).join('; ')}`);
                                }
                            }
                        }
                        // Diagnose the stale outcome with EVIDENCE (#45 by @ayingQAQ):
                        // only blame pnpm's fresh-release wait when the target's latest
                        // release really is young; otherwise be honest that the cause is
                        // unconfirmed. Git installs never hit the age gate.
                        const youngRelease = stale && !isGit ? await latestPublishedRecently(name) : false;
                        const staleReason = stale ? (youngRelease === true ? 'release-age' : 'unknown') : null;
                        const staleError = !stale
                            ? null
                            : staleReason === 'release-age'
                                ? '这个新版本刚发布不久。为了安全，系统默认会等它发布满一天后再安装——刚发布的版本偶尔会被发现问题然后撤回。可以明天再试，或点「立即更新」不再等待。 / This version was just released; for safety, installs normally wait about a day after a release. Try again tomorrow, or click "Update now" to install it right away.'
                                : '更新命令执行完成，但版本没有变化，原因未能确认。点「立即更新」重试通常能解决；若仍不行，请导出日志反馈。 / The update command completed but the version did not change; the cause could not be confirmed. Clicking "Update now" to retry usually resolves it — if not, export the log and report it.';
                        // Actionable, because the user's own recovery is the right one:
                        // the bad artifact is cached under its integrity hash, so a plain
                        // re-add reuses it — the package has to be removed first.
                        const brokenEntryError = !brokenEntry ? null
                            : rollbackOk
                                ? `${name} 更新后缺少入口文件（package.json 的 main/exports 指向的文件不存在），已自动回滚并重新安装原版本文件，下次启动不受影响。这通常是镜像源在新版本刚发布时同步不完整；若仍需这个版本，请先卸载再从官方源重装。 / ${name} arrived without the entry file its package.json points at; the previous build was restored, so the next boot is unaffected. A registry mirror serving an incomplete tarball for a just-published version is the usual cause — remove the package and reinstall from the official registry if you still want this version.`
                                : `${name} 更新后缺少入口文件（package.json 的 main/exports 指向的文件不存在），且未能验证恢复原版本文件（${rollbackDetail ?? 'unknown'}）；请先检查该 profile，再重新启动。 / ${name} arrived without the entry file its package.json points at, and restoration of the previous build could not be verified (${rollbackDetail ?? 'unknown'}); inspect this profile before restarting.`;
                        const cancelDiff = cancelled ? changedSince(beforeInstalled) : null;
                        // Build-script blocks hit updates too (#69): a leftover invalid
                        // allowBuilds entry (pnpm's placeholder bug, #56) or a newly
                        // build-required dep fails the add with ERR_PNPM_IGNORED_BUILDS.
                        // Reporting the blocked packages here gives the client the same
                        // approve-and-retry banner the install flow has had since #6.
                        const ignoredBuilds = ok || cancelled ? undefined : blockedBuilds(result);
                        logEvent(ok || cancelled ? 'info' : 'error', 'update', `${name} -> ${target} exit=${String(result.exitCode)}${result.timedOut ? ' TIMEOUT' : ''}${cancelled ? ' CANCELLED' : ''}${stale ? ` STALE(${staleReason ?? 'unknown'})` : ''}${ok || cancelled ? '' : ` err=${failureDetail(result)}`}`);
                        // A user-cancelled run is a quiet outcome, not an error.
                        sendJson(response, ok || cancelled ? 200 : result.busy === true ? 409 : 502, {
                            ok,
                            cancelled: cancelled || undefined,
                            busy: result.busy || undefined,
                            stale: stale || undefined,
                            partial: cancelDiff?.partial,
                            changed: cancelDiff?.changed,
                            activation,
                            compatibility,
                            ignoredBuilds,
                            // Named here rather than left for the next restart to find
                            // (#339). Empty on every healthy operation, so the client only
                            // ever sees this when something really is unbootable.
                            ...(() => { const orphans = orphanBundles(); return orphans.length > 0 ? { orphanBundles: orphans } : {}; })(),
                            staleReason: staleReason ?? undefined,
                            failureCode: versionFailureCode ?? undefined,
                            error: versionFailureError ?? trialError ?? brokenEntryError ?? hardFailureRollbackError ?? staleError ?? undefined,
                            exitCode: result.exitCode,
                            timedOut: result.timedOut,
                            stdout: result.stdout,
                            stderr: result.stderr,
                            installed: readInstalled(config.profile, activeProfileDir),
                        });
                    });
                }
                catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    host.logger?.warn(`[dsh-market] update failed: ${message}`);
                    logEvent('error', 'update', `route error: ${message}`);
                    sendJson(response, 500, { error: message });
                }
            },
        })),
        host.webServer.register({
            kind: 'exact',
            path: '/dsh-market/setup-pnpm',
            handler: async (request, response) => {
                if (request.method !== 'POST') {
                    response.writeHead(405, { allow: 'POST' });
                    response.end();
                    return;
                }
                if (!sameOrigin(request)) {
                    sendJson(response, 403, { error: 'untrusted origin' });
                    return;
                }
                try {
                    const result = await commands.provisionPnpm();
                    sendJson(response, 200, { ok: result.ok, error: result.hint });
                }
                catch (error) {
                    sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) });
                }
            },
        }),
        /**
         * Remove the market itself, from its card on the plugin configuration
         * page. Deliberately NOT the generic uninstall route, which keeps
         * refusing the market: a destructive action on the thing serving the
         * request should be reachable only from the surface built for it, and
         * never as a stray `{ name: "dshmarket" }` on the ordinary path.
         *
         * Removing itself is safe, which is not obvious and was measured before
         * this was written: an already-imported module does not vanish with its
         * files, so the process keeps serving and the response completes
         * normally. The profile boots clean afterwards, with the market's rows
         * gone from `dependencies` and `dsh.profile.bundles`.
         */
        /**
         * Which release channel the market offers ITSELF from.
         *
         * Writable from the card because the settings scope is host-mode only —
         * a browser that is not on loopback never gets one, and the choice would
         * be unreachable there. Same-origin POST, like every other mutation.
         */
        host.webServer.register({
            kind: 'exact',
            path: '/dsh-market/channel',
            handler: async (request, response) => {
                if (request.method !== 'POST') {
                    response.writeHead(405, { allow: 'POST' });
                    response.end();
                    return;
                }
                if (!sameOrigin(request)) {
                    sendJson(response, 403, { error: 'untrusted origin' });
                    return;
                }
                try {
                    const body = (await readJsonBody(request));
                    const wanted = asChannel(body.channel);
                    if (wanted === null) {
                        sendJson(response, 400, { error: 'channel must be "stable", "beta" or "dev"' });
                        return;
                    }
                    config.channel = wanted;
                    // Persisted with the market's own durable state, so the choice
                    // survives a restart — a setting that forgets is a setting the
                    // user has to make again every boot.
                    marketState.channel = wanted;
                    writeMarketState(activeProfileDir, marketState);
                    // The cached listing was computed for the old channel, so the very
                    // next check would answer for a setting that no longer applies.
                    invalidateUpdates();
                    logEvent('info', 'channel', `release channel set to ${wanted}`);
                    sendJson(response, 200, { ok: true, channel: wanted });
                }
                catch (error) {
                    sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) });
                }
            },
        }),
        /**
         * Which mirrors every outbound request uses.
         *
         * Beside the channel route rather than in the settings namespace, and
         * for the reason recorded there: a value the market stores in its own
         * state.json cannot also be owned by the settings schema without the two
         * writing over each other.
         */
        host.webServer.register({
            kind: 'exact',
            path: '/dsh-market/region',
            handler: async (request, response) => {
                if (request.method !== 'POST') {
                    response.writeHead(405, { allow: 'POST' });
                    response.end();
                    return;
                }
                if (!sameOrigin(request)) {
                    sendJson(response, 403, { error: 'untrusted origin' });
                    return;
                }
                try {
                    const body = (await readJsonBody(request));
                    const wanted = asRegion(body.region);
                    if (wanted === null) {
                        sendJson(response, 400, { error: 'region must be "global" or "china"' });
                        return;
                    }
                    applyRegion(wanted);
                    config.region = wanted;
                    marketState.region = wanted;
                    // A choice made by hand is no longer the probe's choice, so the
                    // one-time explanation stops being offered.
                    marketState.regionAuto = undefined;
                    regionAuto = false;
                    writeMarketState(activeProfileDir, marketState);
                    // Both caches were filled from the other region's origins. The
                    // catalog validator in particular is scoped to the URL that issued
                    // it and would be meaningless against the new one.
                    forgetCatalog();
                    invalidateUpdates();
                    logEvent('info', 'region', `download region set to ${wanted}`);
                    sendJson(response, 200, { ok: true, region: wanted });
                }
                catch (error) {
                    sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) });
                }
            },
        }),
        host.webServer.register({
            kind: 'exact',
            path: '/dsh-market/self-uninstall',
            handler: async (request, response) => {
                if (request.method !== 'POST') {
                    response.writeHead(405, { allow: 'POST' });
                    response.end();
                    return;
                }
                // The same single door the restart route uses — and only it. Both
                // end the market's life in this process, so neither may be driven by
                // a remote or forwarded client. A separate `sameOrigin` call would
                // read as an extra guard while testing nothing: origin-matches-host
                // is already part of what this checks, so no request can fail one
                // and pass the other.
                if (!trustedRestartRequest(request)) {
                    sendJson(response, 403, { error: 'self-uninstall is limited to same-origin loopback requests' });
                    return;
                }
                try {
                    await withMutationLock(response, 'install', async () => {
                        const body = (await readJsonBody(request));
                        // An explicit flag, not merely reaching the endpoint: this is the
                        // one route whose accidental success cannot be undone from the UI
                        // that would have undone it.
                        if (body.confirm !== true) {
                            sendJson(response, 400, { error: 'self-uninstall requires an explicit confirmation' });
                            return;
                        }
                        const installed = readInstalled(config.profile, activeProfileDir);
                        const selfName = ['dshmarket', 'dsh-market'].find(candidate => installed[candidate] !== undefined);
                        if (selfName === undefined) {
                            sendJson(response, 400, { error: 'the market is not an installed dependency of this profile' });
                            return;
                        }
                        pendingRollbacks.clear();
                        const result = await runPlugin(config.profile, ['remove', selfName]);
                        const ok = result.exitCode === 0 && !result.timedOut && !result.cancelled;
                        if (!ok) {
                            // Report what pnpm actually said. A bare "removal failed" on
                            // the one action the user cannot retry from a UI that is
                            // still there would leave them with nothing to act on.
                            const said = (result.stderr.trim() || result.stdout.trim()).slice(-800);
                            sendJson(response, 502, {
                                ok: false,
                                error: said === '' ? 'removing the market failed' : said,
                                timedOut: result.timedOut,
                                cancelled: result.cancelled,
                            });
                            return;
                        }
                        // Opt-in cleanup. Rows the market wrote to the USER patch layer
                        // outlive it: a plugin switched off here stays off after the
                        // market is gone, and the only UI that could switch it back on
                        // has just been removed. Only rows belonging to packages on the
                        // market's own disable list are touched — a hand-written row is
                        // the user's, not ours.
                        const purge = body.purge === true;
                        const restored = [];
                        if (purge) {
                            for (const name of disabled) {
                                const ids = rowIdsForPackage(host, activeProfileDir, name);
                                if (ids.length > 0) {
                                    removeRowBlocks(userPatchPath, ids);
                                    restored.push(name);
                                }
                            }
                            purgeMarketState(activeProfileDir);
                        }
                        logEvent('info', 'self-uninstall', `removed ${selfName}${purge ? `; purged state, restored ${String(restored.length)} disabled plugin(s)` : '; state kept'}`);
                        sendJson(response, 200, {
                            ok: true,
                            removed: selfName,
                            purged: purge,
                            restored,
                            restart: restartAllowed(config),
                        });
                        // AFTER the response. The package is gone from disk, so the host
                        // now 404s on this plugin's client bundle while the loader entry
                        // is still live — the shape that wedges the whole page on the
                        // next refresh (#37). Disabling our own entry composes the page
                        // without the market instead. Deferred because it disposes the
                        // context this handler runs in.
                        //
                        // This is also why nothing here schedules a restart. An earlier
                        // version offered one, first as a button in the end state (which
                        // could only answer 405, since the disable takes the restart
                        // route with it) and then as a checkbox in the confirmation. Both
                        // were asking the user to arrange a consequence rather than
                        // stating it: the browser drops the market the moment this runs,
                        // and the leftover disabled entry is cleared by whatever restart
                        // happens next. There is no decision to offer.
                        setTimeout(() => {
                            void themes.setEntryDisabled(selfName, true).catch(() => { });
                        }, 0);
                    });
                }
                catch (error) {
                    sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) });
                }
            },
        }),
        host.webServer.register(captureLegacy('/dsh-market/restart', {
            kind: 'exact',
            path: '/dsh-market/restart',
            handler: (request, response) => {
                if (request.method !== 'POST') {
                    response.writeHead(405, { allow: 'POST' });
                    response.end();
                    return;
                }
                // One-click restart contributed in #14 by @ysyyhhh.
                if (!restartAllowed(config)) {
                    sendJson(response, 403, { error: 'self-restart is disabled for this host' });
                    return;
                }
                if (detectedDebugger() !== null) {
                    sendJson(response, 403, { error: 'self-restart is disabled while the host is under a debugger' });
                    return;
                }
                if (!trustedRestartRequest(request)) {
                    sendJson(response, 403, { error: 'restart is limited to same-origin loopback requests' });
                    return;
                }
                if (writing || installing) {
                    sendJson(response, 409, { error: 'cannot restart while a plugin operation is running' });
                    return;
                }
                if (restarting) {
                    sendJson(response, 409, { error: 'restart already scheduled' });
                    return;
                }
                restarting = true;
                try {
                    const result = scheduleRestart(servingPort(request));
                    logEvent('info', 'restart', `scheduled pid=${String(result.pid)} helper=${String(result.helperPid)}`);
                    sendJson(response, 202, { ok: true, boot: BOOT_ID, ...result });
                }
                catch (error) {
                    restarting = false;
                    const message = error instanceof Error ? error.message : String(error);
                    logEvent('error', 'restart', message);
                    sendJson(response, 500, { error: message });
                }
            },
        })),
        host.webServer.register({
            kind: 'exact',
            path: '/dsh-market/approve-builds',
            handler: async (request, response) => {
                if (request.method !== 'POST') {
                    response.writeHead(405, { allow: 'POST' });
                    response.end();
                    return;
                }
                if (!sameOrigin(request)) {
                    sendJson(response, 403, { error: 'untrusted origin' });
                    return;
                }
                try {
                    // One-click build-script approval (#6 by @qichuang321): only
                    // packages physically present in the profile's installed tree can
                    // be allowed — the list is not free input. Presence is checked in
                    // node_modules, NOT the dependencies map: pnpm's blocked build
                    // scripts are usually TRANSITIVE deps (cloudflared, ssh2,
                    // cpu-features…), which never appear in package.json (#56 by
                    // @walnut1218).
                    // pnpm 11's ndjson `ignored-scripts` event reports version-qualified
                    // names (cloudflared@0.7.3); strip the @version suffix so the
                    // allowlist keys and node_modules lookups use bare package names.
                    const stripVersion = (name) => {
                        const at = name.lastIndexOf('@');
                        return at > 0 ? name.slice(0, at) : name;
                    };
                    const PKG_RE = /^(@[A-Za-z0-9-~][A-Za-z0-9._~-]*\/)?[A-Za-z0-9-~][A-Za-z0-9._~-]*$/;
                    const body = (await readJsonBody(request));
                    const requested = (Array.isArray(body.packages) ? body.packages.map(String).map(stripVersion) : [])
                        .filter(name => PKG_RE.test(name));
                    const installed = requested
                        .filter(name => existsSync(join(activeProfileDir, 'node_modules', name, 'package.json')));
                    // Git-hosted plugins rejected by pnpm's FETCHER (#68) exist in
                    // neither node_modules nor package.json — the only trusted anchor
                    // left is the curated registry itself: a name that resolves to a
                    // github-sourced catalog entry may be approved pre-materialization.
                    //
                    // pnpm only matches a git-hosted dep's allowBuilds entry under its
                    // stable `name@git+https://…` key (#68/#69) — a bare name entry is
                    // ignored (verified against pnpm 11.21). Derive that key wherever
                    // the github source is known: from the profile spec for installed
                    // deps, from the curated registry for pending ones. The bare name
                    // is kept alongside — it authorizes the npm-sourced case.
                    const specs = readInstalled(config.profile, activeProfileDir);
                    const packages = [];
                    /**
                     * Both key forms for one github source (#285).
                     *
                     * pnpm 11.21+ matches the stable `git+https://…` key; 11.8.0 — what
                     * DSH Desktop bundles — matches only a commit-pinned codeload URL,
                     * so on those versions the approval button wrote a key pnpm would
                     * never read and could never work. The pin is resolved here rather
                     * than assumed: `github:owner/repo` names no commit, and the one
                     * pnpm will fetch is whatever HEAD is at install time.
                     *
                     * A pin that cannot be resolved is simply omitted. The stable key
                     * still covers modern pnpm, and an approval that authorizes less
                     * than hoped is better than one that fails.
                     */
                    const buildKeys = async (name, spec) => {
                        const stable = gitAllowBuildsKey(name, spec);
                        if (stable === null)
                            return [];
                        const repo = repoOfTarget(spec)?.split('#')[0] ?? null;
                        // A proxied legacy install and the mirror-resolved github form
                        // both already carry their commit; only a bare shortcut asks.
                        const pinned = githubCommitOfTarget(spec)
                            ?? (repo === null ? null : await resolveHeadCommit(repo, region));
                        const codeload = pinned === null || pinned === undefined
                            ? null
                            : codeloadAllowBuildsKey(name, spec, pinned);
                        return codeload === null ? [stable] : [stable, codeload];
                    };
                    for (const name of requested) {
                        if (installed.includes(name)) {
                            packages.push(name, ...await buildKeys(name, String(specs[name] ?? '')));
                            continue;
                        }
                        if (specs[name] !== undefined)
                            continue;
                        // The catalog can now FAIL rather than quietly serving a bundled
                        // copy, and this key is an optimisation, not a requirement: the
                        // bare name already authorizes the npm-sourced case, and a git
                        // source that misses its key simply prompts again. Losing the
                        // catalog must not turn "allow this build" into a 500.
                        let entry;
                        try {
                            entry = (await loadRegistry()).plugins.find(p => p.name === name || p.npm === name);
                        }
                        catch (error) {
                            logEvent('warn', 'approve-builds', `catalog unavailable, authorizing ${name} by name only: ${error instanceof Error ? error.message : String(error)}`);
                            packages.push(name);
                            continue;
                        }
                        const target = entry === undefined ? null : installTargetFor(entry);
                        const keys = target === null ? [] : await buildKeys(name, target);
                        if (keys.length > 0) {
                            packages.push(name, ...keys);
                        }
                    }
                    if (packages.length === 0) {
                        sendJson(response, 400, { error: 'no installed packages given' });
                        return;
                    }
                    pendingRollbacks.clear();
                    const approved = setAllowBuilds(config.profile, packages, activeProfileDir);
                    logEvent('info', 'approve-builds', `allowed build scripts: ${approved.join(', ')}`);
                    sendJson(response, 200, { ok: true, approved });
                }
                catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    logEvent('error', 'approve-builds', `route error: ${message}`);
                    sendJson(response, 500, { error: message });
                }
            },
        }),
        host.webServer.register({
            kind: 'exact',
            path: '/dsh-market/cancel',
            handler: async (request, response) => {
                if (request.method !== 'POST') {
                    response.writeHead(405, { allow: 'POST' });
                    response.end();
                    return;
                }
                if (!sameOrigin(request)) {
                    sendJson(response, 403, { error: 'untrusted origin' });
                    return;
                }
                // Cancel flow contributed in #6 by @qichuang321.
                if (!commands.cancelActive()) {
                    sendJson(response, 400, { error: 'no operation is running' });
                    return;
                }
                logEvent('info', 'cancel', `cancelled ${progress.target || 'operation'}`);
                sendJson(response, 200, { ok: true, cancelled: true, target: progress.target });
            },
        }),
        host.webServer.register({
            kind: 'exact',
            path: '/dsh-market/uninstall',
            handler: async (request, response) => {
                if (request.method !== 'POST') {
                    response.writeHead(405, { allow: 'POST' });
                    response.end();
                    return;
                }
                if (!sameOrigin(request)) {
                    sendJson(response, 403, { error: 'untrusted origin' });
                    return;
                }
                try {
                    await withMutationLock(response, 'install', async () => {
                        const body = (await readJsonBody(request));
                        const name = typeof body.name === 'string' ? body.name : '';
                        // Only the INDETERMINATE patch case is forceable, below. A patch
                        // that definitely names the package stays refused: there the user
                        // has a concrete thing to go fix, so an override would only help
                        // them break their next boot.
                        const force = body.force === true;
                        if (name === 'dsh-market' || name === 'dshmarket') {
                            sendJson(response, 400, { error: 'the market cannot uninstall itself; use the dsh CLI' });
                            return;
                        }
                        if (readInstalled(config.profile, activeProfileDir)[name] === undefined) {
                            sendJson(response, 400, { error: 'plugin is not installed' });
                            return;
                        }
                        const userPatchReferences = userPatchPackageReferences(userPatchPath, name);
                        if (userPatchReferences === null && !force) {
                            // Refusing here is right — an unreadable patch might still load
                            // the package, and removing it would break the next boot. But
                            // refusing with NO way through is the wrong shape: the market
                            // cannot say which row to fix, and the moment someone wants to
                            // uninstall is usually the moment something is already broken.
                            // So this one is forceable, and says so.
                            logEvent('warn', 'uninstall-blocked', `${name}: user cordis.patch.yml could not be inspected safely`);
                            sendJson(response, 409, {
                                error: `无法安全卸载 ${name}：当前 profile 的 cordis.patch.yml 无法读取为有效的补丁列表，因此无法排除它仍在引用该包。请先检查补丁文件；确认无关后可强制卸载。 / Cannot safely uninstall ${name}: this profile's cordis.patch.yml could not be read as a valid patch list, so the market cannot rule out a remaining package reference. Check the patch file; you can force the uninstall once you are sure it is unrelated.`,
                                userPatchInspectionFailed: true,
                                forceable: true,
                            });
                            return;
                        }
                        if (userPatchReferences === null) {
                            logEvent('warn', 'uninstall', `${name}: forced past an unreadable user cordis.patch.yml`);
                        }
                        if (userPatchReferences !== null && userPatchReferences.length > 0) {
                            const listed = userPatchReferences.join(', ');
                            logEvent('warn', 'uninstall-blocked', `${name}: user cordis.patch.yml still inserts ${listed}`);
                            sendJson(response, 409, {
                                error: `无法卸载 ${name}：当前 profile 的 cordis.patch.yml 仍通过 insert 引用 ${listed}。请先移除这些用户补丁引用再重试；市场不会自动改写用户补丁。 / Cannot uninstall ${name}: this profile's cordis.patch.yml still inserts ${listed}. Remove those user-owned patch references first and retry; the market will not rewrite the user patch automatically.`,
                                userPatchReferenced: true,
                                patchReferences: userPatchReferences,
                            });
                            return;
                        }
                        const busyAgents = runningAgentsForGuard();
                        if (busyAgents.length > 0) {
                            logEvent('warn', 'uninstall-blocked', `${name}: refused while agents are running — ${busyAgents.join(', ')}`);
                            sendJson(response, 409, {
                                error: `有 agent 正在运行（${busyAgents.join(', ')}）。卸载会修改插件文件，正在工作的 agent 可能在中途报错；请等它完成或取消后再卸载。 / ${busyAgents.length === 1 ? 'An agent is running' : 'Agents are running'} (${busyAgents.join(', ')}). Uninstalling changes plugin files, so a working agent can fail mid-turn; wait for it to finish (or cancel it) before uninstalling.`,
                                agentsBusy: true,
                                runningAgents: busyAgents,
                            });
                            return;
                        }
                        pendingRollbacks.clear();
                        const beforeInstalled = readInstalled(config.profile, activeProfileDir);
                        // isDisabled comes from the patch layer (#130) — keep it while the
                        // lock moves into withMutationLock (#125).
                        const activation = {
                            [name]: verifyActivation(config.profile, name, liveNames(), activeProfileDir, disabled.has(name)),
                        };
                        // Capture whether the plugin has a client part BEFORE removal — after
                        // runPlugin the package may be gone from node_modules, so a post-hoc
                        // check would always return false on a successful uninstall.
                        const hadClientPart = packageHasClientPart(activeProfileDir, name);
                        const result = await runPlugin(config.profile, ['remove', name]);
                        const cancelled = result.cancelled;
                        const ok = result.exitCode === 0 && !result.timedOut && !cancelled;
                        const cancelDiff = cancelled ? changedSince(beforeInstalled) : null;
                        // Half-uninstall guard: pnpm can fail a remove AFTER deleting
                        // node_modules but BEFORE saving package.json (#65's write-order
                        // mirror image — a file locked mid-unlink aborts the run). The
                        // manifest would then reference a package that no longer exists,
                        // and the next boot fails to activate the ghost dependency.
                        // Reconcile from disk truth: when the package is gone, finish
                        // the removal the CLI could not; when it is intact, keep the
                        // manifest so the user can simply retry.
                        const halfGone = !ok && !cancelled
                            && !existsSync(join(activeProfileDir, 'node_modules', name, 'package.json'));
                        let reconciled = false;
                        if (halfGone) {
                            reconciled = dropFromManifest(config.profile, name, activeProfileDir);
                            logEvent('warn', 'uninstall', `${name}: remove failed (exit ${String(result.exitCode)}) but the package is gone from disk; ${reconciled ? 'reconciled manifest lists to match' : 'manifest lists already clean'}`);
                        }
                        let hot = false;
                        if (ok || halfGone) {
                            invalidateUpdates();
                            hot = await hotUnmount(name);
                            // Bundle-layer plugins never hot-mount, but their loader entry
                            // is still LIVE in this process — after the remove deleted the
                            // package, the next refresh would 404 on its client bundle and
                            // wedge the whole page until a dsh restart (#37 by
                            // @1123762794). Live-disable the entry so the refresh composes
                            // without it; after a real restart the entry is gone anyway.
                            //
                            // Both run, unconditionally. This used to short-circuit on the
                            // hot unmount, which is right only while a package has ONE
                            // activation source — a package that is both hot-mounted AND
                            // reachable through the bundle layer got half its cleanup, and
                            // the surviving half is exactly the 404-on-refresh wedge above
                            // (#213). setEntryDisabled just scans entries by name and
                            // returns false when none match, so calling it after a
                            // successful unmount costs a lookup and nothing else.
                            const entryDisabled = await themes.setEntryDisabled(name, true);
                            hot = hot || entryDisabled;
                            // Patch-layer rows must not survive the remove either: a
                            // `- id: X` + `disabled: true` row for a package that no longer
                            // mounts is a boot-time orphan (port of dsh-plugin-hub).
                            removeRowBlocks(userPatchPath, rowIdsForPackage(host, activeProfileDir, name));
                            // The disable list must not keep a removed plugin: a later
                            // reinstall starts enabled. Group memberships follow the same
                            // rule so no group toggle ever targets a ghost member.
                            disabled.delete(name);
                            removeFromGroups({ groups, groupOrder }, name);
                            writeMarketState(activeProfileDir, { disabled, groups, groupOrder });
                        }
                        logEvent(ok || cancelled ? 'info' : 'error', 'uninstall', `${name} exit=${String(result.exitCode)}${cancelled ? ' CANCELLED' : ''}${ok ? ` live-removed=${String(hot)}` : cancelled ? '' : ` err=${failureDetail(result)}`}`);
                        sendJson(response, ok || cancelled ? 200 : result.busy === true ? 409 : 502, {
                            ok,
                            cancelled: cancelled || undefined,
                            busy: result.busy || undefined,
                            // A failed remove whose package vanished from disk was
                            // reconciled: the manifest lists match disk truth again, the
                            // removal is final (a retry would 400 on "not installed").
                            reconciled: reconciled || undefined,
                            hot,
                            // A client-part plugin's UI is already injected into the page; after
                            // uninstall the injected bundle stays live until a refresh, so the
                            // same banner as enable/disable prompts the user to reload.
                            // Gate on hot: non-hot uninstalls already show the restart banner,
                            // and adding a refresh banner there would double-banner (#213's
                            // pendingRefreshNames merge exists specifically to avoid that).
                            refresh: ok && hot && hadClientPart,
                            partial: cancelDiff?.partial,
                            changed: cancelDiff?.changed,
                            // The state of the package that was just removed (captured pre-op).
                            activation,
                            exitCode: result.exitCode,
                            stdout: result.stdout,
                            stderr: result.stderr,
                            installed: readInstalled(config.profile, activeProfileDir),
                        });
                    });
                }
                catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    host.logger?.warn(`[dsh-market] uninstall failed: ${message}`);
                    logEvent('error', 'uninstall', `route error: ${message}`);
                    sendJson(response, 500, { error: message });
                }
            },
        }),
        host.webServer.register(captureLegacy('/dsh-market/rollback', {
            kind: 'exact',
            path: '/dsh-market/rollback',
            handler: async (request, response) => {
                if (request.method !== 'POST') {
                    response.writeHead(405, { allow: 'POST' });
                    response.end();
                    return;
                }
                if (!sameOrigin(request)) {
                    sendJson(response, 403, { error: 'untrusted origin' });
                    return;
                }
                try {
                    await withMutationLock(response, 'install', async () => {
                        const body = (await readJsonBody(request));
                        const id = typeof body.rollbackId === 'string' ? body.rollbackId : '';
                        const pending = pendingRollbacks.get(id);
                        if (pending === undefined) {
                            sendJson(response, 400, { error: 'rollback is not available (it may have been superseded by another operation) / 回滚已不可用（可能已被后续操作覆盖）' });
                            return;
                        }
                        // The token captures whole-profile manifest and lock state. A
                        // terminal-side pnpm/dsh command is outside this route's mutation
                        // lock, so internal invalidation alone cannot prevent an old token
                        // from overwriting a newer external edit. Refuse unless the exact
                        // post-operation state that the user was shown is still current.
                        if (!profileStateMatches(pending.expectedState)) {
                            pendingRollbacks.delete(id);
                            sendJson(response, 400, {
                                error: 'rollback is not available because the profile changed after this operation / 操作后配置已发生变化，回滚不可用',
                            });
                            return;
                        }
                        let ok = true;
                        let hot = false;
                        let detail = null;
                        if (pending.kind === 'update') {
                            const name = pending.names[0];
                            const result = pending.updateSource === undefined
                                ? { ok: false, detail: 'the saved update rollback source is unavailable' }
                                : await executeUpdateRollback(name, pending.manifestBefore, pending.updateSource);
                            ok = result.ok;
                            detail = result.detail;
                        }
                        else {
                            for (const name of pending.names) {
                                const result = await removeInstalledPackage(name);
                                hot ||= result.hot;
                                if (!result.ok) {
                                    ok = false;
                                    detail = result.detail;
                                    break;
                                }
                            }
                        }
                        if (ok) {
                            pendingRollbacks.delete(id);
                            invalidateUpdates();
                            logEvent('info', 'rollback', `${pending.kind}: ${pending.names.join(', ')} restored`);
                        }
                        else {
                            logEvent('error', 'rollback', `${pending.kind}: ${pending.names.join(', ')} failed — ${detail ?? 'unknown'}`);
                        }
                        sendJson(response, ok ? 200 : 502, {
                            ok,
                            rolledBack: ok,
                            hot,
                            detail: detail ?? undefined,
                            installed: readInstalled(config.profile, activeProfileDir),
                        });
                    });
                }
                catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    host.logger?.warn(`[dsh-market] rollback failed: ${message}`);
                    logEvent('error', 'rollback', `route error: ${message}`);
                    sendJson(response, 500, { error: message });
                }
            },
        })),
        host.webServer.register({
            kind: 'exact',
            path: '/dsh-market/install',
            handler: async (request, response) => {
                if (request.method !== 'POST') {
                    response.writeHead(405, { allow: 'POST' });
                    response.end();
                    return;
                }
                if (!sameOrigin(request)) {
                    sendJson(response, 403, { error: 'untrusted origin' });
                    return;
                }
                try {
                    await withMutationLock(response, 'install', async () => {
                        const body = (await readJsonBody(request));
                        const busyAgents = runningAgentsForGuard();
                        if (busyAgents.length > 0) {
                            logEvent('warn', 'install-blocked', `refused while agents are running — ${busyAgents.join(', ')}`);
                            sendJson(response, 409, {
                                error: `有 agent 正在运行（${busyAgents.join(', ')}）。安装会修改插件文件，正在工作的 agent 可能在中途报错；请等它完成或取消后再安装。 / ${busyAgents.length === 1 ? 'An agent is running' : 'Agents are running'} (${busyAgents.join(', ')}). Installing changes plugin files, so a working agent can fail mid-turn; wait for it to finish (or cancel it) before installing.`,
                                agentsBusy: true,
                                runningAgents: busyAgents,
                            });
                            return;
                        }
                        const url = typeof body.url === 'string' ? body.url : '';
                        const registry = await loadRegistry();
                        const entry = registry.plugins.find(p => p.url.toLowerCase() === url.toLowerCase());
                        if (entry === undefined) {
                            logEvent('warn', 'install-rejected', `not in curated registry: ${url.slice(0, 120)}`);
                            sendJson(response, 400, { error: 'plugin is not in the curated registry' });
                            return;
                        }
                        const plainTarget = installTargetFor(entry);
                        if (plainTarget === null) {
                            sendJson(response, 400, { error: 'unsupported source url' });
                            return;
                        }
                        // Resolve GitHub HEAD through the region's mirror, when there is
                        // one, then let pnpm fetch the canonical commit-pinned target.
                        // Applied HERE, before the guards below, so every step downstream
                        // reasons about the exact spec that will be installed. Returns
                        // the original on any lookup failure (see accelerate.ts).
                        const target = await acceleratedTarget(plainTarget, region);
                        if (target !== plainTarget) {
                            logEvent('info', 'region', `${entry.name}: resolved HEAD through the ${region} mirror; downloading the commit-pinned GitHub target directly for pnpm integrity`);
                        }
                        // Duplicate guard (#27): the same plugin listed under another name
                        // (an alias entry pointing at the same repo) must never install
                        // twice — two loader entries with one id brick the next boot.
                        // Monorepo subpath entries (distinct plugins in one repo) pass:
                        // their entry urls differ by subpath and identity is name-based.
                        // A dependency left in package.json by a FAILED install (blocked
                        // build scripts: pnpm writes the manifest, then exits 1) is NOT a
                        // duplicate — it was never activated. Blocking the retry would
                        // make the approve-builds flow dead-end, so a leftover that is the
                        // SAME package/source (not a repo-only alias of a different entry)
                        // and is not yet active (bundle layer or live mount) may be retried.
                        const installedNow = readInstalled(config.profile, activeProfileDir);
                        const aliasOf = findInstalledAlias(entry, installedNow);
                        // When the duplicate guard allows a retry of a leftover dep, that
                        // name must be treated as "newly added" by the post-install
                        // validation and hot-mount below (it IS in package.json from the
                        // failed attempt, so the plain before/after diff would miss it).
                        let retryAlias = null;
                        if (aliasOf !== null) {
                            // Same install? The leftover's own name/spec must match what we
                            // are about to add — an npm entry retries under its npm name; a
                            // github entry's package.json spec equals the target.
                            // Compared as IDENTITIES, not as strings. One GitHub plugin has
                            // several historical spellings — mutable or pinned `github:`
                            // shortcuts and legacy proxied codeload tarballs — so a literal
                            // comparison would call a leftover from before an upgrade or
                            // region switch "a different source" and refuse the retry it
                            // exists to allow. `repoOfTarget` returns null for npm names and file
                            // links, which fall through to the string comparison below.
                            const installedSpec = String(installedNow[aliasOf] ?? '').replace(/^file:/, '');
                            const wantedSpec = String(target).replace(/^file:/, '');
                            const installedRepo = repoOfTarget(installedSpec);
                            const wantedRepo = repoOfTarget(wantedSpec);
                            const sameSource = aliasOf.toLowerCase() === (entry.npm ?? '').toLowerCase()
                                || (installedRepo !== null && installedRepo === wantedRepo)
                                || installedSpec.toLowerCase() === wantedSpec.toLowerCase();
                            let active = false;
                            try {
                                const manifest = JSON.parse(readFileSync(join(activeProfileDir, 'package.json'), 'utf8'));
                                active = (manifest.dsh?.profile?.bundles ?? []).includes(aliasOf) || liveNames().has(aliasOf);
                            }
                            catch {
                                // unreadable manifest — treat as active to stay safe
                                active = true;
                            }
                            if (active || !sameSource) {
                                logEvent('warn', 'install-rejected', `${entry.name}: same plugin already installed as ${aliasOf}`);
                                sendJson(response, 400, { error: `已以「${aliasOf}」安装过同一个插件，无需重复安装 / this plugin is already installed as "${aliasOf}"` });
                                return;
                            }
                            retryAlias = aliasOf;
                            logEvent('info', 'install', `${entry.name}: ${aliasOf} present but inactive (leftover of a failed install) — retrying`);
                        }
                        // Name-collision guard (#66): the curated registry lists DISTINCT
                        // plugins sharing one name (both dsh-usage-stats, four dsh-memory…).
                        // The alias guard above no longer cross-matches them (repo evidence
                        // decides), but two packages with one name still cannot coexist —
                        // pnpm would silently REPLACE the installed one's dependency entry.
                        // Refuse with the honest reason instead.
                        if (aliasOf === null) {
                            const clashName = [entry.npm, entry.name].find((n) => typeof n === 'string' && n !== '' && installedNow[n] !== undefined);
                            if (clashName !== undefined) {
                                logEvent('warn', 'install-rejected', `${entry.name}: name collision with installed ${clashName} (${installedNow[clashName]}) from a different source`);
                                sendJson(response, 400, {
                                    error: `同名冲突：已安装的「${clashName}」来自其他来源，两个同名插件无法共存于一个 profile，请先卸载再安装 / name conflict: an installed plugin already uses the name "${clashName}" but comes from a different source; two plugins with the same name cannot coexist in one profile — uninstall it first`,
                                });
                                return;
                            }
                        }
                        const beforeSpecs = readInstalled(config.profile, activeProfileDir);
                        const before = new Set(Object.keys(beforeSpecs));
                        if (retryAlias !== null)
                            before.delete(retryAlias);
                        pendingRollbacks.clear();
                        const compatibilityBefore = assessProfile(config.profile, activeProfileDir);
                        // pnpm re-extracts the whole tree on any operation, so a plugin
                        // nobody touched can come back pristine-and-broken, or lose a
                        // patch that was holding it together (#222). Only what THIS run
                        // broke is attributable to it, so the profile is swept before as
                        // well as after.
                        const bundlesBefore = brokenClientBundles(config.profile, activeProfileDir);
                        // Exact manifest snapshot for failure rollback (#65, #339): the
                        // host writes dependencies and dsh.profile.bundles before the
                        // build-script check / registry fetches run. Either residue can
                        // break every later operation or the next boot. Cancelled runs
                        // keep their partial state on purpose (the user sees the diff
                        // and decides).
                        const manifestBefore = readProfileManifestSnapshot(config.profile, activeProfileDir);
                        const result = await runPlugin(config.profile, ['add', target]);
                        const cancelled = result.cancelled;
                        if ((result.exitCode !== 0 || result.timedOut) && !cancelled) {
                            const rolledBack = restoreProfileManifest(config.profile, manifestBefore, activeProfileDir);
                            if (rolledBack.length > 0)
                                logEvent('warn', 'install', `${target}: rolled back manifest residue of the failed run: ${rolledBack.join(', ')}`);
                        }
                        let ok = result.exitCode === 0 && !result.timedOut && !cancelled;
                        const cancelDiff = cancelled ? changedSince(beforeSpecs) : null;
                        if (ok)
                            invalidateUpdates();
                        if (ok) {
                            // Collection repos (e.g. skin monorepos) install as a junk
                            // fileset with no root package.json; retarget to the real
                            // plugin subdirectories via pnpm's #path: selector.
                            ok = await retargetCollections(runPlugin, config.profile, before, target, activeProfileDir);
                        }
                        // Fake-success guard (#18): a clean exit that added nothing
                        // installable must not read as success. Runs even when
                        // retargeting partially failed — a broken piece that slipped in
                        // must never survive to brick the next boot.
                        let notAPlugin = false;
                        // pnpm exited 0 and the profile did not change at all — a
                        // different failure from "what it added was unusable" (#258).
                        let addedNothing = false;
                        let removedBroken = [];
                        let conflicts = [];
                        if (result.exitCode === 0 && !result.timedOut && !cancelled) {
                            const validated = await validateAddedPlugins(runPlugin, config.profile, before, activeProfileDir);
                            removedBroken = validated.removedBroken;
                            conflicts = validated.conflicts;
                            if (removedBroken.length > 0) {
                                logEvent('warn', 'install', `${target}: removed uninstallable pieces (no dsh manifest or missing build artifacts): ${removedBroken.join(', ')}`);
                            }
                            if (validated.keep.length === 0) {
                                ok = false;
                                notAPlugin = true;
                                addedNothing = validated.added.length === 0;
                                logEvent('error', 'install', addedNothing
                                    ? `${target}: the plugin command reported success but added nothing to the profile`
                                    : `${target}: nothing installable survived validation (added: ${validated.added.join(', ')})`);
                            }
                            else {
                                // Partial success across a collection still counts as success.
                                ok = true;
                            }
                        }
                        const conflictGroups = groupConflictsByOwner(conflicts);
                        const installed = readInstalled(config.profile, activeProfileDir);
                        let hot = false;
                        let activation;
                        let compatibility;
                        let addedPackages = [];
                        if (ok) {
                            const added = Object.keys(installed).filter(name => !before.has(name));
                            addedPackages = added;
                            if (added.length > 0) {
                                // Fresh installs start enabled: drop any stale disable flag
                                // (e.g. reinstall after an uninstall while this process kept
                                // running) and persist before the activation loop.
                                for (const name of added)
                                    disabled.delete(name);
                                writeMarketState(activeProfileDir, { disabled, groups, groupOrder });
                                // Theme installs auto-activate (and deactivate the previous
                                // theme) so the result is visible right after the refresh.
                                hot = true;
                                for (const name of added) {
                                    const live = pluginCategories(entry).includes('theme')
                                        ? await themes.activateTheme(name)
                                        : (await hotMount(host, activeProfileDir, name)).ok;
                                    if (!live)
                                        hot = false;
                                }
                                activation = {};
                                const live = liveNames();
                                for (const name of added) {
                                    activation[name] = verifyActivation(config.profile, name, live, activeProfileDir, disabled.has(name));
                                }
                            }
                        }
                        if (ok && addedPackages.length > 0) {
                            const after = assessProfile(config.profile, activeProfileDir);
                            const risks = introducedRisks(compatibilityBefore, after);
                            // Cross-layer name shadowing this install introduced (#230).
                            // Shares the rollback id with the peer risks when both fire:
                            // one operation, one thing to undo.
                            const shadowed = introducedDuplicateNames(compatibilityBefore, after);
                            // A client bundle that no longer parses (#222): pnpm can leave
                            // one half-written or patch-mangled, and today that surfaces
                            // as a blank settings page long after the install reported
                            // success, with nothing connecting the two.
                            const brokenBundles = newlyBrokenBundles(bundlesBefore, [
                                ...addedPackages
                                    .map(pkg => ({ name: pkg, check: checkClientBundle(config.profile, pkg, activeProfileDir) }))
                                    .filter(entry => !entry.check.ok)
                                    .map(entry => ({ name: entry.name, reason: entry.check.reason ?? 'parse failed' })),
                                ...brokenClientBundles(config.profile, activeProfileDir),
                            ].filter((entry, index, all) => all.findIndex(other => other.name === entry.name) === index));
                            if (risks.length > 0 || shadowed.length > 0 || brokenBundles.length > 0) {
                                const rollbackId = savePendingRollback({ kind: 'install', names: addedPackages });
                                compatibility = {
                                    code: 'soft-incompatible',
                                    risks,
                                    shadowedNames: shadowed.length > 0 ? shadowed : undefined,
                                    brokenBundles: brokenBundles.length > 0 ? brokenBundles : undefined,
                                    ...(rollbackId !== null
                                        ? { rollbackId }
                                        : { rollbackUnavailable: '安装完成后无法安全捕获 profile 状态，因此自动回滚不可用；需要时请手工卸载新安装的插件。 / The post-install profile state could not be captured safely, so automatic rollback is unavailable. Remove the newly installed plugin manually if needed.' }),
                                };
                                if (brokenBundles.length > 0) {
                                    logEvent('error', 'install-bundle', `${brokenBundles.map(entry => `${entry.name}: ${entry.reason}`).join('; ')}`);
                                }
                                if (risks.length > 0) {
                                    logEvent('warn', 'install-compat', `${addedPackages.join(', ')}: introduced host-compatibility risks — ${risks.map(risk => `${risk.peer}@${risk.range} vs ${risk.resolved}`).join('; ')}`);
                                }
                                if (shadowed.length > 0) {
                                    logEvent('warn', 'install-shadow', `${addedPackages.join(', ')}: introduced cross-layer duplicate loader names — ${shadowed.map(entry => `${entry.name} (${entry.layers.join(' + ')})`).join('; ')}`);
                                }
                            }
                        }
                        logEvent(ok || cancelled ? 'info' : 'error', 'install', `${target} exit=${String(result.exitCode)}${result.timedOut ? ' TIMEOUT' : ''}${cancelled ? ' CANCELLED' : ''}${ok ? ` hot=${String(hot)}` : cancelled ? '' : ` err=${failureDetail(result)}`}`);
                        const ignoredBuilds = blockedBuilds(result);
                        sendJson(response, ok || cancelled ? 200 : result.busy === true ? 409 : 502, {
                            ok,
                            cancelled: cancelled || undefined,
                            busy: result.busy || undefined,
                            hot,
                            partial: cancelDiff?.partial,
                            changed: cancelDiff?.changed,
                            activation,
                            compatibility,
                            ignoredBuilds,
                            // Named here rather than left for the next restart to find
                            // (#339). Empty on every healthy operation, so the client only
                            // ever sees this when something really is unbootable.
                            ...(() => { const orphans = orphanBundles(); return orphans.length > 0 ? { orphanBundles: orphans } : {}; })(),
                            // Only on a failure, and only for a subpath target: a stale
                            // catalog entry produces a pnpm error that reads like the
                            // user's fault (#346).
                            ...(ok || cancelled ? {} : await (async () => {
                                const stale = await staleSubpath(plainTarget ?? '');
                                return stale === null ? {} : { staleEntry: stale };
                            })()),
                            // Blocked build scripts are expected (pnpm >= 10 blocks them by
                            // default): surface the approve-builds banner instead of scaring
                            // the user with pnpm's raw stack.
                            // A loader-id clash is the most actionable failure of all: the
                            // plugin is fine, it just cannot coexist with this profile (#122).
                            // The UI renders `conflictGroups`; this string is the fallback
                            // for logs and non-UI callers. It attributes each id to the
                            // owner that actually declares it — a candidate can clash with
                            // several installed plugins at once, and naming only the first
                            // owner while listing every id blamed one plugin for another's
                            // ids.
                            conflictGroups: conflictGroups.length > 0 ? conflictGroups : undefined,
                            error: conflictGroups.length > 0
                                ? `「${conflicts[0].name}」与已安装的 ${conflictGroups.map(group => `「${group.owner}」（${group.ids.join('、')}）`).join('、')} 占用相同的 loader 条目 id，无法在同一环境中共存——保留会导致 DeepSeek Harness 下次启动失败，因此已自动移除。 / "${conflicts[0].name}" declares the same loader entry id(s) as the installed ${conflictGroups.map(group => `"${group.owner}" (${group.ids.join(', ')})`).join(', ')}; they cannot coexist in one environment — keeping it would stop DeepSeek Harness from starting, so it was removed.`
                                : addedNothing
                                    // Blaming allowBuilds here sent a reporter chasing a build
                                    // step for a plugin that ships a complete lib/ (#258). If
                                    // the profile did not change, the plugin is not the thing
                                    // that failed — the command that should have installed it
                                    // is.
                                    ? '安装命令报告成功，但 profile 没有任何变化——插件本身没问题，是执行安装的通道没有真正运行。若使用桌面端，请改用命令行 dsh plugin add 验证，并把导出日志附在 issue 中 / the install command reported success but the profile did not change — the plugin is not at fault, the channel that should have installed it did not actually run. On a desktop build, verify with `dsh plugin add` from a terminal and attach the exported log'
                                    : notAPlugin
                                        ? 'nothing installable: the plugin(s) need a build step (blocked by default, see allowBuilds) or ship no prebuilt artifacts / 没有可安装的内容：插件需要构建授权（allowBuilds，默认拦截）或未附带构建产物，详见导出日志'
                                        : Array.isArray(ignoredBuilds) && ignoredBuilds.length > 0
                                            // Names the button but NOT where it is: it was "above",
                                            // and this sentence is read inside the operations panel
                                            // where the button is not (#314). The panel now carries
                                            // the action on this very row, so the text can just say
                                            // what to press.
                                            ? `构建脚本被 pnpm 默认拦截（${ignoredBuilds.join(', ')}），点击「放行构建脚本并重试」即可放行并重装 / build scripts are blocked by pnpm by default (${ignoredBuilds.join(', ')}); use "Allow build scripts and retry" to approve and reinstall`
                                            : undefined,
                            exitCode: result.exitCode,
                            timedOut: result.timedOut,
                            stdout: result.stdout,
                            stderr: result.stderr,
                            installed,
                        });
                    });
                }
                catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    host.logger?.warn(`[dsh-market] install failed: ${message}`);
                    logEvent('error', 'install', `route error: ${message}`);
                    sendJson(response, 500, { error: message });
                }
            },
        }),
    ];
    return () => {
        disposed = true;
        configurePersistentLog(null);
        for (const dispose of disposers)
            dispose();
    };
}
