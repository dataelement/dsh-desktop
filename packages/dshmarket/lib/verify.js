/**
 * Post-install activation verification (P0-2): what "installed" actually
 * means for a package in a dsh profile.
 *
 * Two sources of truth, in strict order of authority:
 *
 * 1. The LOADER INVENTORY (observed): whatever the loader is running right
 *    now is live, full stop. A plain library with no `dsh` field can be
 *    loaded by name from someone else's bundle patch — the official
 *    dsh-base patch loads `@deepseek-ai/dsh-tools`, which has no `dsh`
 *    field at all — so no manifest check may overrule it (#135).
 * 2. The profile manifest (inferred): `<profile>/package.json` →
 *    `dsh.profile.bundles`, what the dsh CLI reconciled. This predicts what
 *    the NEXT boot will load, and is the only evidence available for a
 *    package that is not currently running.
 *
 * State taxonomy (IMPROVEMENT-PLAN P0-2):
 *   live    – running in the current composition (hot mount or loader entry)
 *   restart – installed and will activate on the next boot, but not live now
 *   inert   – installed but not a profile-layer plugin (plain dependency, or
 *             client-only — the market shim-mounts those at boot)
 *   broken  – would fail to load: listed as a bundle without a dsh surface,
 *             or a declared entry artifact that is missing
 *   missing – not present in node_modules
 */
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';
import { join } from 'node:path';
import { listHotMounts, parseSimplePatch } from "./hot.js";
import { userPatchPackageReferences } from "./patch.js";
import { bundlePatchInsertedIds, hasDshManifest, hasLoadableEntry, profileDir, readInstalled } from "./profile.js";
/** The profile manifest's `dsh.profile.bundles` — what the CLI reconciled. */
function readBundles(profile, explicitDir) {
    try {
        const manifest = JSON.parse(readFileSync(join(profileDir(profile, explicitDir), 'package.json'), 'utf8'));
        const bundles = manifest.dsh?.profile?.bundles;
        return new Set(Array.isArray(bundles) ? bundles.filter((n) => typeof n === 'string') : []);
    }
    catch {
        return new Set();
    }
}
/**
 * True when `live` contains the package itself or a subpath entry of it.
 *
 * The live set (see `liveNames` in routes.ts) holds loader entry names — the
 * `name:` field of each bundle patch row. Bundles usually name the bare
 * package (`dshmarket`, `@scope/pkg`), but may point at a subpath entry
 * (`@vectorize-io/hindsight-coding-agents/dsh`, `aegis/extensions/dsh/index.js`).
 * Either form means the package's fiber is up and it must read as live;
 * a different package sharing a name prefix (`@scope/pkg2` vs `@scope/pkg`)
 * must not — the `/` bound keeps the match a real subpath.
 */
function liveIncludes(live, packageName) {
    if (live.has(packageName))
        return true;
    const prefix = `${packageName}/`;
    for (const name of live)
        if (name.startsWith(prefix))
            return true;
    return false;
}
/**
 * True when a loader entry this package's OWN bundle patch inserts is up.
 *
 * A carrier bundle (#103) ships no plugin of its own: its patch mounts
 * ANOTHER package with configuration, so the live entry carries that other
 * package's name and `liveIncludes` can never match. The entry ID is the
 * part that belongs to this package — its patch created it — which is why
 * matching on it is both sufficient and precise: a neighbour that happens
 * to mount the same package does so under a different id.
 *
 * Without this the market kept telling users to restart for a plugin that
 * had been running since the restart (#156).
 */
function carriedRowLive(live, profileDirectory, packageName) {
    try {
        return bundlePatchInsertedIds(join(profileDirectory, 'node_modules', packageName))
            .some(id => live.has(`#${id}`));
    }
    catch {
        return false;
    }
}
function readPkgDsh(profile, name, explicitDir) {
    try {
        const manifest = JSON.parse(readFileSync(join(profileDir(profile, explicitDir), 'node_modules', name, 'package.json'), 'utf8'));
        return manifest.dsh ?? {};
    }
    catch {
        return null;
    }
}
function patchTextOf(profile, name, explicitDir) {
    try {
        return readFileSync(join(profileDir(profile, explicitDir), 'node_modules', name, 'cordis.patch.yml'), 'utf8');
    }
    catch {
        return null;
    }
}
/**
 * Verify the activation state of one installed package.
 * @param live - names live in the current composition; defaults to the
 * market's hot-mount table (injectable for tests).
 */
/**
 * Whether the profile's OWN `cordis.patch.yml` inserts this package by name.
 *
 * A third evidence source beside the loader inventory and the package's own
 * manifest, and the one that was missing (#165): a plugin the user wired up
 * themselves declares nothing, is not hot-mounted until the next boot, and so
 * fell through to `broken` — the market told them the install had failed
 * verification while the plugin was, in fact, working.
 *
 * Read with the same parser the uninstall guard uses. Unreadable returns
 * null, which is treated here as NO evidence rather than as evidence: this
 * only ever upgrades a verdict away from `broken`, so being unsure has to
 * leave the stricter answer standing.
 */
function patchLoads(activeProfileDir, name) {
    const references = userPatchPackageReferences(join(activeProfileDir, 'cordis.patch.yml'), name);
    return references !== null && references.length > 0;
}
export function verifyActivation(profile, name, live = new Set(listHotMounts()), explicitDir, isDisabled = false) {
    const activeProfileDir = profileDir(profile, explicitDir);
    const bundles = readBundles(profile, activeProfileDir);
    const inBundles = bundles.has(name);
    const dsh = readPkgDsh(profile, name, activeProfileDir);
    if (dsh === null) {
        return { state: 'missing', reasons: ['未安装 / not installed'], bundle: inBundles, hot: false };
    }
    // A user-disabled plugin reads as disabled, never as "restart to apply":
    // the switch state (market disable list or the user patch layer) is the
    // dominant fact, and the loader keeps it off on every boot.
    if (isDisabled) {
        return {
            state: 'disabled',
            reasons: ['已停用(市场开关或补丁层),重启后保持关闭 / disabled (market toggle or the patch layer) — stays off across restarts'],
            bundle: inBundles,
            hot: false,
        };
    }
    const dir = join(activeProfileDir, 'node_modules', name);
    // OBSERVED beats INFERRED (#135): the loader inventory is ground truth, so
    // a package the loader is running is live no matter what its manifest says.
    // Plain library packages legitimately carry no `dsh` field and are still
    // loaded by name from a bundle patch — @deepseek-ai/dsh-tools is loaded by
    // the official dsh-base patch and has no `dsh` field at all — so this check
    // has to come before any manifest-based verdict.
    const loaderLive = liveIncludes(live, name) || carriedRowLive(live, activeProfileDir, name);
    if (!hasDshManifest(dir)) {
        if (loaderLive) {
            return {
                state: 'live',
                reasons: ['已由 Loader 加载(该包未声明 dsh 元数据,由某个 bundle patch 按名加载)/ loaded by the loader (no dsh metadata of its own — a bundle patch loads it by name)'],
                bundle: inBundles,
                hot: true,
            };
        }
        // Not live and no dsh surface: for a package the profile lists as a
        // BUNDLE this is a real defect; for a plain dependency it is normal —
        // most dependencies are libraries, not plugins (#135).
        if (inBundles && !patchLoads(activeProfileDir, name)) {
            return {
                state: 'broken',
                reasons: ['已列入 profile bundle 层但未声明 dsh 元数据,加载会失败 / listed in the profile bundle layer but declares no dsh metadata — loading it fails'],
                bundle: true,
                hot: false,
            };
        }
        return inBundles
            ? {
                state: 'restart',
                reasons: ['由你自己的 cordis.patch.yml 按名加载,重启后生效 / loaded by name from your own cordis.patch.yml — live after a restart'],
                bundle: true,
                hot: false,
            }
            : {
                state: 'inert',
                reasons: ['普通依赖(未声明 dsh 元数据),不是 profile 层插件;若它由某个 bundle patch 按名加载,启动后会显示为已加载 / a plain dependency with no dsh metadata — not a profile-layer plugin; if some bundle patch loads it by name it will read as live once running'],
                bundle: false,
                hot: false,
            };
    }
    // Carrier bundles (#103) ship no entry of their own — what they mount is
    // the point — so judge by "is anything loadable", not by this package's
    // own artifact.
    if (!loaderLive && !hasLoadableEntry(activeProfileDir, name) && !patchLoads(activeProfileDir, name)) {
        return {
            state: 'broken',
            reasons: [
                '声明的入口产物缺失(源码检出或构建被拦),下次启动会失败 / the declared entry artifact is missing (source-only checkout or blocked build) — the next boot would fail',
            ],
            bundle: inBundles,
            hot: false,
        };
    }
    if (loaderLive) {
        const clientOnly = dsh.bundle === undefined && dsh.client !== undefined;
        return {
            state: 'live',
            reasons: [
                clientOnly
                    ? '已热加载(纯客户端插件 shim)/ live via the client-only shim'
                    : '已热加载(bundle patch)/ live via its bundle patch',
            ],
            bundle: inBundles,
            hot: true,
        };
    }
    if (inBundles) {
        const patch = patchTextOf(profile, name, activeProfileDir);
        const complex = patch !== null && parseSimplePatch(patch) === null;
        return {
            state: 'restart',
            reasons: [
                complex
                    ? 'bundle patch 含配置/表达式,热挂载仅支持纯 insert;重启后由 bundle 层生效 / the bundle patch contains config/expression rows; hot-mount only supports plain inserts — it activates on restart'
                    : '已进入 profile bundle 层但本次未能热挂载;重启后生效 / in the bundle layer but not hot-mounted this session — it activates on restart',
            ],
            bundle: true,
            hot: false,
        };
    }
    // Not a profile-layer plugin. Client-only packages never enter bundles
    // (the dsh CLI skips them), so the market shim-mounts them at boot —
    // they still work, but "installed" never means "bundle layer".
    if (dsh.client !== undefined) {
        return {
            state: 'inert',
            reasons: [
                '未声明 dsh.bundle,不会进入 profile bundle 层(纯客户端插件);重启后由市场自动挂载生效 / no dsh.bundle — client-only plugins never enter the bundle layer; the market shim-mounts them at the next boot',
            ],
            bundle: false,
            hot: false,
        };
    }
    return {
        state: 'inert',
        reasons: [
            '未声明 dsh.bundle,已作为普通依赖安装,不会成为 profile 层 / no dsh.bundle — installed as a plain dependency, never a profile-layer plugin',
        ],
        bundle: false,
        hot: false,
    };
}
/**
 * Correct a post-UPDATE verdict for a plugin that was already running.
 *
 * `verifyActivation` answers "is this name in the live loader inventory".
 * That is the right question after an install and the wrong one after an
 * update: the plugin was already live, so the answer stays "live" while the
 * process keeps serving the module it imported at boot. Replacing files under
 * a running composition does not re-import anything.
 *
 * Measured on a real host rather than reasoned about — updating the market
 * from 1.11.3 to 1.12.2 left `/dsh-market/status` reporting 1.11.3 with an
 * unchanged boot id, while the update route called it hot-loaded in the same
 * response. The browser half genuinely does refresh (the host re-serves the
 * client bundle from disk), which is what makes the wrong verdict credible:
 * the UI visibly becomes the new version while the server half does not.
 *
 * Only a plugin that was ALREADY live is affected. One that was missing,
 * broken or disabled beforehand has nothing loaded to shadow the new build,
 * so its fresh mount really does run the new code.
 *
 * Client-only packages are excluded for the same reason from the other end:
 * they have no host half to go stale, and the browser fetches their bundle
 * from disk on the next page load. Telling their users to restart would be
 * #156 again, in a narrower place — see `hasHostHalf`.
 * @param result the verdict computed from the loader inventory
 * @param hostHalfWasLive whether a HOST half was live BEFORE the replacement
 */
export function activationAfterReplace(result, hostHalfWasLive) {
    if (!hostHalfWasLive || result.state !== 'live')
        return result;
    return {
        ...result,
        state: 'restart',
        hot: false,
        reasons: ['新版本已就位,但运行中的进程仍在使用启动时加载的旧模块——重启后生效(页面本身会立即变成新版,服务端不会) / the new build is in place, but the running process still serves the module it imported at boot — restart to apply (the page itself updates immediately; the server half does not)'],
    };
}
/**
 * Whether a package has a host (Node) half at all.
 *
 * A `dsh.client`-only package — themes, skins, most pure-UI plugins — runs
 * no server code: the market shim-mounts it so the loader has a live row,
 * and the browser re-fetches its bundle from disk on the next page load. An
 * update to one takes effect on refresh, with no restart to ask for.
 */
export function hasHostHalf(profile, name, explicitDir) {
    const dsh = readPkgDsh(profile, name, explicitDir);
    if (dsh === null)
        return false;
    // Only a DEFINITE client-only package is excluded — the same test
    // verifyActivation uses for its own verdict. Testing `dsh.bundle` on its
    // own would read a package that declares neither key (`"dsh": {}`, which
    // the bundle layer still loads) as client-only, and quietly disable the
    // correction for it.
    return !(dsh.bundle === undefined && dsh.client !== undefined);
}
/**
 * The client bundle path a package's `exports["./client"]` names, relative
 * to the package root — or `null` when it cannot be resolved CONFIDENTLY.
 *
 * Returning null is the important half. This feeds a post-install check
 * whose only job is to catch a corrupt bundle, and a resolver that guessed
 * wrong would report a healthy plugin as broken — worse than the silence it
 * replaces. So every shape this does not fully understand resolves to null
 * and the check simply does not run: unresolvable is not evidence of damage.
 *
 * Handles the two shapes real plugins ship: a plain string, and a
 * conditional object. For the object, only `browser` and `default` are
 * consulted — those are the conditions the host's client loader actually
 * activates; `import`/`require` describe a Node resolution this file is not
 * modelling, and picking one of those could name a different artifact.
 * Nested conditions recurse; anything else (arrays, non-relative targets)
 * gives up.
 */
export function clientBundlePath(exportsField, depth = 0) {
    if (depth > 4)
        return null;
    if (typeof exportsField === 'string') {
        // Only a relative in-package path. A bare specifier or URL is a shape
        // this resolver does not model.
        return exportsField.startsWith('./') ? exportsField : null;
    }
    if (exportsField === null || typeof exportsField !== 'object' || Array.isArray(exportsField))
        return null;
    const conditions = exportsField;
    for (const key of ['browser', 'default']) {
        if (conditions[key] === undefined)
            continue;
        const resolved = clientBundlePath(conditions[key], depth + 1);
        if (resolved !== null)
            return resolved;
    }
    return null;
}
/**
 * Whether a package's client bundle still parses as JavaScript (#222).
 *
 * pnpm can leave a half-written or patch-mangled bundle behind — the report
 * describes a profile whose client bundle was broken after an update. The
 * browser is where that surfaces today, as a blank settings page long after
 * the operation reported success, with nothing connecting the two.
 *
 * `vm.Script` COMPILES without executing: it catches the syntax damage this
 * is looking for and never runs plugin code, so a hostile bundle gains
 * nothing. A missing `dsh.client`, an unresolvable exports field, or a file
 * that is simply absent all return ok — this check only ever fires on a file
 * it actually read and actually failed to parse. Everything ambiguous stays
 * silent, because a false "your plugin is corrupt" is the one outcome worse
 * than not checking.
 */
/**
 * V8's wording when a classic-script parse trips over module syntax.
 *
 * Matched on the message because there is no flag-free way to compile a
 * module here (`SourceTextModule` needs --experimental-vm-modules, which the
 * host process does not set). If V8 ever rewords these, the failure mode is
 * the false positive we had before rather than a missed real break — the
 * safer direction of the two.
 */
const MODULE_SYNTAX_ERROR = /Unexpected token 'export'|Cannot use import statement outside a module|await is only valid in async functions and the top level bodies of modules/;
/**
 * Every installed plugin whose client bundle will not parse (#222 by
 * @MicroMilo).
 *
 * The per-package check above only ever looked at what an operation added,
 * which misses the failure that was actually reported: pnpm re-extracts the
 * WHOLE tree on any install, so updating one plugin can restore another
 * plugin's pristine — and broken — bundle, or fail to re-apply a patch that
 * was holding it together. The damage then surfaces at the next boot as
 * "failed to load plugins", with nothing connecting it to the install that
 * caused it.
 *
 * Cheap enough to run on every operation: 0.40ms per plugin including the
 * read (measured on a 385KB bundle), so a 30-plugin profile costs ~12ms
 * against an install that takes seconds.
 *
 * Silent on ESM bundles, like the per-package check it calls — see there for
 * why. Widening the sweep is exactly what would have turned that one false
 * "corrupt" into one per ESM plugin in the profile.
 *
 * Callers compare a before-list with an after-list rather than reporting
 * this one directly — a profile can carry a broken bundle indefinitely, and
 * re-reporting a problem the user already had would put them in front of
 * something this operation did not cause and cannot undo.
 */
export function brokenClientBundles(profile, explicitDir) {
    const broken = [];
    for (const name of Object.keys(readInstalled(profile, explicitDir))) {
        const check = checkClientBundle(profile, name, explicitDir);
        if (!check.ok)
            broken.push({ name, reason: check.reason ?? 'parse failed' });
    }
    return broken;
}
/** Bundles broken after an operation that were intact before it. */
export function newlyBrokenBundles(before, after) {
    const seen = new Set(before.map(entry => entry.name));
    return after.filter(entry => !seen.has(entry.name));
}
export function checkClientBundle(profile, name, explicitDir) {
    const root = join(profileDir(profile, explicitDir), 'node_modules', name);
    let manifest;
    try {
        manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    }
    catch {
        return { ok: true, reason: null };
    }
    if (manifest.dsh?.client === undefined)
        return { ok: true, reason: null };
    const exportsField = manifest.exports;
    const relative = exportsField !== null && typeof exportsField === 'object' && !Array.isArray(exportsField)
        ? clientBundlePath(exportsField['./client'])
        : null;
    if (relative === null)
        return { ok: true, reason: null };
    let source;
    try {
        source = readFileSync(join(root, relative), 'utf8');
    }
    catch {
        // Declared but absent is verifyActivation's territory (a missing entry
        // artifact is already `broken` there); duplicating it here would report
        // one problem twice in two different vocabularies.
        return { ok: true, reason: null };
    }
    try {
        new Script(source, { filename: relative });
        return { ok: true, reason: null };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        // `new Script` compiles a CLASSIC script, so perfectly valid module
        // syntax is a SyntaxError to it: `export`, `import`, and top-level
        // `await` all throw. This package ships CJS, which is why nobody noticed
        // — but a plugin whose client bundle is ESM was being told its file was
        // corrupt, and offered a rollback for a file that is fine.
        //
        // That is the exact outcome this check's own contract forbids: a false
        // "your plugin is corrupt" is worse than not checking. Module syntax
        // means "cannot judge with this parser", not "broken".
        if (MODULE_SYNTAX_ERROR.test(message))
            return { ok: true, reason: null };
        return { ok: false, reason: message };
    }
}
