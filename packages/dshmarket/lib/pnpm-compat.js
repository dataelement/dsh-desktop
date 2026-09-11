/**
 * pnpm compatibility layer — everything the market needs to know about how
 * different pnpm majors behave inside a dsh profile directory, kept pure and
 * separately testable (test/unit + test/integration exercise this module
 * against real pnpm 9/10/11).
 *
 * Verified behavior matrix (2026-08, pnpm 9.15.9 / 10.28.2 / 11.21.0):
 * - workspace root, `add` without -w:  pnpm 9 fails ERR_PNPM_ADDING_TO_ROOT;
 *   pnpm 10/11 succeed.
 * - `add -w` where NO pnpm-workspace.yaml exists: ALL majors fail with
 *   "--workspace-root may only be used inside a workspace".
 * - modules dir built by pnpm 9, then pnpm 10/11 mutate it: a modules-layout
 *   compatibility error (public-hoist-pattern on Unix; virtual-store path
 *   length can be the first mismatch pnpm reports on Windows).
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
/**
 * Decide the argv for a `dsh plugin <add|remove> …` call in the given profile.
 *
 * pnpm 9 refuses to add at a workspace root without -w (#17, #20); every
 * pnpm major refuses -w when the directory is NOT a workspace. So the flag
 * is injected exactly when the profile has a pnpm-workspace.yaml.
 * @param profileDir - resolved profile directory (owns pnpm-workspace.yaml, or not).
 * @param pluginArgs - the raw args, e.g. ['add', 'dshmarket@latest'].
 * @returns args with -w injected when — and only when — the profile is a workspace root.
 */
export function pluginArgsFor(profileDir, pluginArgs) {
    if (pluginArgs[0] !== 'add' && pluginArgs[0] !== 'remove')
        return pluginArgs;
    if (!existsSync(join(profileDir, 'pnpm-workspace.yaml')))
        return pluginArgs;
    return [pluginArgs[0], '-w', ...pluginArgs.slice(1)];
}
/** One recognized pnpm failure, with a bilingual explanation for the UI. */
/**
 * The namespace whose packages the dsh runtime provides rather than npm.
 *
 * A peer dependency on one of these is a statement about the host, not a
 * package to download — and several of them are never published at all.
 */
export const HOST_NAMESPACE_RE = /^@deepseek-ai\//;
/**
 * Momentary network failures — worth exactly one automatic retry (#83).
 * pnpm 5xx fetch codes, its meta-fetch give-up, and the raw socket errors
 * that surface through dsh's wrapper. Permanent shapes (404, auth) are
 * deliberately absent: retrying those just doubles the wait for bad news.
 */
export function isTransientPnpmFailure(output) {
    return /ERR_PNPM_FETCH_5\d\d|ERR_PNPM_META_FETCH_FAIL|FetchError|ECONNRESET|ETIMEDOUT|EAI_AGAIN|ENETUNREACH|socket hang up|network timeout/i.test(output);
}
/**
 * pnpm's per-request fetch timeout: the abort surfaces as a DOMException
 * ("The operation was aborted due to timeout", code 23) through undici —
 * pnpm logs it as `GET … error (23)` before giving up. This is the failure
 * shape for large tarballs (github: sources download the WHOLE repo, even
 * for a `#path:` subdirectory plugin) on slow networks: pnpm's default
 * 60-second limit is simply not enough, so a plain retry fails again at the
 * same limit. The market's recovery re-runs once with a longer
 * fetchTimeout (see withHoistRecovery).
 */
export function isFetchTimeoutFailure(output) {
    return /operation was aborted due to timeout|TimeoutError|error \(23\)/i.test(output);
}
/**
 * Add human diagnostics decoded from pnpm's NDJSON reporter to its raw output.
 *
 * Mutating market commands always use `--reporter=ndjson`, so an error's
 * message normally arrives as a JSON string: quotes are escaped and embedded
 * newlines are `\n`. Matching only the raw stream therefore misses the exact
 * production form even when it works against pnpm's pretty reporter.
 */
function withDecodedPnpmDiagnostics(output) {
    const messages = [];
    for (const line of output.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('{'))
            continue;
        try {
            const event = JSON.parse(trimmed);
            if (typeof event.message === 'string')
                messages.push(event.message);
            if (typeof event.err === 'object' && event.err !== null) {
                const message = event.err.message;
                if (typeof message === 'string')
                    messages.push(message);
            }
        }
        catch {
            // Human reporter output and truncated NDJSON remain available verbatim.
        }
    }
    return messages.length === 0 ? output : `${output}\n${messages.join('\n')}`;
}
/**
 * Every package pnpm named as having no lockfile integrity, in order.
 *
 * Two shapes, because pnpm 11 rewrote this diagnostic and the market has to
 * read both (verified against 10.28.2 / 11.21.0 / 11.22.0):
 *
 * - Up to pnpm 11.20, one package per error, quoted with its full URL:
 *   `Cannot install package "name@https://…": its lockfile entry has no
 *   "integrity" field`.
 * - From pnpm 11.21, a supply-chain policy pass verifies the WHOLE lockfile
 *   up front and reports every violator at once, as indented
 *   `  name@version <reason>` lines under an `N lockfile entries failed
 *   verification:` header (pnpm's own `formatEntry`; the mixed-code variant
 *   inserts `[MISSING_TARBALL_INTEGRITY]` before the reason).
 *
 * Only the first shape was recognized, so on current pnpm the market fell
 * back to a message that said an entry was bad without saying which one —
 * and since pnpm refuses even to uninstall the offender, naming it is the
 * whole of the user's recovery path (#422).
 *
 * The name is still never guessed. A candidate counts only when it carries a
 * version-shaped suffix, which is what keeps a bare URL out and stops
 * `alias@npm:real@1.0.0` from being read as `real` — `:` and `/` are absent
 * from the version character class, and the lookbehind rejects a name that
 * is really the tail of a longer token.
 * @param diagnostic - decoded pnpm output.
 * @returns the distinct package names, or an empty array when none is unambiguous.
 */
function integrityViolators(diagnostic) {
    const NAME = String.raw `(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*`;
    const found = [];
    const add = (name) => {
        if (name !== undefined && !found.includes(name))
            found.push(name);
    };
    add(new RegExp(String.raw `Cannot (?:install|fetch) package\s+"(${NAME})@https?:\/\/[^"\s]+"(?: from the lockfile)?:\s*(?:its lockfile entry|it) has no "integrity" field`, 'i')
        .exec(diagnostic)?.[1]);
    const listed = new RegExp(String.raw `(?<![\w./:@-])(${NAME})@[A-Za-z0-9._+-]+(?:\s+\[MISSING_TARBALL_INTEGRITY\])? has no "integrity" field`, 'gi');
    for (const match of diagnostic.matchAll(listed))
        add(match[1]);
    return found;
}
/**
 * Map a failed pnpm run's combined output to a known failure mode.
 *
 * dsh's own wrapper line ("dsh: pnpm failed in profile directory …") names no
 * cause, so the market must recognize pnpm's real diagnostics itself (#20).
 * @param output - stdout+stderr of the failed run.
 * @returns the classified failure, or null when unrecognized (raw output is then shown as-is).
 */
export function classifyPnpmFailure(output) {
    if (output.includes('ERR_PNPM_PUBLIC_HOIST_PATTERN_DIFF')
        || output.includes('ERR_PNPM_VIRTUAL_STORE_DIR_MAX_LENGTH_DIFF')) {
        return {
            code: 'hoist-pattern-diff',
            recoverable: true,
            message: 'profile 的 node_modules 是旧版 pnpm 创建的，与当前 pnpm 的默认配置不兼容，需要重建后重试 / this profile\'s node_modules was created by a different pnpm major; it must be rebuilt (pnpm install) before changes can be applied',
        };
    }
    // #244: the store recorded in node_modules/.modules.yaml is not the one
    // this pnpm resolves by default (a pnpm upgrade, or a machine where
    // ~/.pnpm-store predates the %LOCALAPPDATA% default). pnpm 11's
    // checkCompatibility then refuses EVERY add and remove, so nothing in the
    // market works until the profile is relinked.
    //
    // No automatic recovery, deliberately. The reporter established that on
    // pnpm 11 `store-dir` is honoured from NOTHING but the CLI flag — not the
    // project .npmrc, not the user .npmrc, not pnpm-workspace.yaml in either
    // casing — so the only self-heal available is to re-run with
    // --store-dir pointed at whatever .modules.yaml happens to name. That
    // silently adopts a store path which may be stale, wrong, or on a drive
    // that no longer exists, and it relinks the entire node_modules to do it:
    // a repair that goes wrong here leaves a profile in worse shape than the
    // clear error it replaced. The paths are in the message; the choice is
    // the user's.
    if (output.includes('ERR_PNPM_UNEXPECTED_STORE')) {
        const linked = /currently linked from the store at "([^"]+)"/.exec(output)?.[1];
        const wanted = /wants to use the store at "([^"]+)"/.exec(output)?.[1];
        const detail = linked !== undefined && wanted !== undefined
            ? `\n  node_modules → ${linked}\n  pnpm 现在想用 / pnpm now wants → ${wanted}`
            : '';
        return {
            code: 'unexpected-store',
            recoverable: false,
            message: `这个 profile 的 node_modules 链接到的 pnpm store，和当前 pnpm 默认使用的 store 不是同一个，pnpm 因此拒绝所有安装与卸载。${detail}\n在 profile 目录里执行一次 \`pnpm install --store-dir <上面第一个路径>\` 重新链接即可（dsh 运行时可能占用文件，必要时先退出 dsh）/ this profile's node_modules is linked to a different pnpm store than the one pnpm now resolves, so pnpm refuses every install and uninstall.${detail}\nRelink by running \`pnpm install --store-dir <the first path above>\` once in the profile directory (stop dsh first if files are locked)`,
        };
    }
    // #367: pnpm verifies every tarball resolution in the lockfile before it
    // performs ANY add/remove. One old or half-written entry without an
    // integrity hash therefore blocks unrelated plugin operations too.
    //
    // Do not auto-repair this. Computing and writing a hash means choosing to
    // trust the bytes currently served by the URL, which is a supply-chain
    // decision the market cannot safely make for the user. So the ONE thing
    // this message has to get right is WHICH entry to remove — see
    // integrityViolators for why that was previously lost on pnpm 11.
    if (output.includes('ERR_PNPM_MISSING_TARBALL_INTEGRITY')) {
        const named = integrityViolators(withDecodedPnpmDiagnostics(output));
        // Only a single unambiguous name goes in `pkg`: callers treat it as "the
        // package this failure is about", which a list is not.
        const pkg = named.length === 1 ? named[0] : undefined;
        const zh = named.length === 0 ? '' : `（${named.join('、')}）`;
        const en = named.length === 0 ? '' : ` (${named.join(', ')})`;
        return {
            code: 'missing-tarball-integrity',
            recoverable: false,
            pkg,
            message: `profile 的 pnpm-lock.yaml 里有 tarball 依赖${zh}缺少 integrity，pnpm 因此拒绝这个 profile 里的所有安装和卸载——包括卸载它自己，所以装不回来也删不掉。这种条目通常是旧版市场留下的：它把 GitHub 插件写成了带镜像前缀的 tarball 地址，pnpm 认不出那是 GitHub，就要求一个它自己从不为 GitHub 源写入的校验值。新版市场改为交给 pnpm 原生的 GitHub 地址，不会再产生这种条目（#385）。请在 pnpm-lock.yaml 里删掉上面点名的那条依赖记录后重试，市场会用当前方式把它重新装回来；不要删整个 pnpm-lock.yaml，那会让其余插件全部重新解析版本。市场不会自动为未经验证的字节生成校验值 / a tarball dependency${en} in this profile's pnpm-lock.yaml has no integrity, so pnpm refuses every install and uninstall in this profile — including uninstalling that dependency itself, so it can be neither repaired nor removed. Entries like this usually come from an older market version, which installed GitHub plugins from a mirror-prefixed tarball URL: pnpm cannot tell that is GitHub, so it demands a checksum it never writes for GitHub sources. Current versions hand pnpm its own native GitHub target instead and no longer produce such entries (#385). Delete the named dependency's entry from pnpm-lock.yaml and retry — the market will reinstall it the current way. Do not delete the whole pnpm-lock.yaml; that re-resolves the versions of every other plugin too. The market will not generate a checksum for unverified bytes automatically`,
        };
    }
    // #222 by @MicroMilo: a patch in the profile that no longer applies.
    //
    // pnpm exits 1 (verified against 10.29.3) but it has ALREADY written the
    // package — unpatched. So the profile is left holding the pristine version
    // the patch existed to fix, and the damage shows up at the next boot as
    // "failed to load plugins" rather than here, where it happened.
    //
    // Almost always the package moved the file the patch names: the reported
    // case patched `client/client.js` in a package that had started shipping
    // `lib/client.js`. That is not something the market can repair — the patch
    // is the user's, and guessing a new target would be inventing a change
    // they did not write — so it says exactly what is wrong and where.
    if (output.includes('ERR_PNPM_PATCH_FAILED')) {
        const patch = /Could not apply patch (\S+)/.exec(output)?.[1];
        const which = patch === undefined ? '' : `（${patch}）`;
        const whichEn = patch === undefined ? '' : ` (${patch})`;
        return {
            code: 'patch-failed',
            recoverable: false,
            message: `profile 里的一个 pnpm 补丁打不上了${which}。pnpm 会继续把这个包装上，但装的是没打补丁的原版——通常下次启动才会以「插件加载失败」暴露出来。多半是包升级后挪动了补丁指向的文件（例如补丁改的是 client/client.js，而新版本发的是 lib/client.js）。请更新或删掉这个补丁文件，以及 profile package.json 里 pnpm.patchedDependencies 中对应的那一条 / a pnpm patch in this profile no longer applies${whichEn}. pnpm still installs the package, but unpatched — which usually surfaces at the next boot as "failed to load plugins" rather than here. The usual cause is the package moving the file the patch targets (for example a patch against client/client.js when the release now ships lib/client.js). Update or remove that patch file and its entry under pnpm.patchedDependencies in the profile's package.json`,
        };
    }
    if (output.includes('ERR_PNPM_ADDING_TO_ROOT')) {
        return {
            code: 'adding-to-root',
            recoverable: false,
            message: 'pnpm 拒绝在 workspace 根目录安装（缺少 -w）。这是市场的 bug，请升级 dshmarket 到最新版 / pnpm refused to add at a workspace root (missing -w); this is a market bug — please update dshmarket',
        };
    }
    if (/--workspace-root may only be used inside a workspace/i.test(output)) {
        return {
            code: 'not-a-workspace',
            recoverable: false,
            message: 'profile 目录不是 pnpm workspace，却传入了 -w。这是市场的 bug，请升级 dshmarket 到最新版 / -w was passed but the profile is not a pnpm workspace; this is a market bug — please update dshmarket',
        };
    }
    // #39: once a release younger than minimumReleaseAge is in the lockfile
    // (fresh install or a force-update), pnpm 11 verifies the WHOLE lockfile
    // before ANY later mutation — uninstalling even an unrelated plugin fails
    // (MINIMUM_RELEASE_AGE_VIOLATION), and a later add can fail re-resolving
    // the young dep (NO_MATURE_MATCHING_VERSION). Recovery is a one-shot
    // --config.minimumReleaseAge=0 retry, automated in withHoistRecovery.
    if (output.includes('ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION')
        || output.includes('ERR_PNPM_NO_MATURE_MATCHING_VERSION')) {
        return {
            code: 'release-age-violation',
            recoverable: false,
            message: '这个 profile 里有一个刚发布不久的插件版本，pnpm 的安全等待期检查因此拒绝了本次改动（即使改的是别的插件）。市场已自动放行重试一次；若仍看到本条，请导出日志反馈 / a recently-published plugin version in this profile trips pnpm\'s fresh-release safety check, blocking any change (even to other plugins); the market retries once with a one-shot bypass — if you still see this, export the log and report it',
        };
    }
    // #69: pnpm >= 10 blocks dependency build scripts by default. The install
    // route has long surfaced this via the approve-builds banner (#6, #56),
    // but as a hard failure (pnpm 11 exits 1) the raw stack leaked through —
    // and the update route showed it verbatim.
    if (output.includes('ERR_PNPM_IGNORED_BUILDS')) {
        return {
            code: 'ignored-builds',
            recoverable: false,
            message: '有依赖需要执行构建脚本，被 pnpm 默认拦截。点击「允许构建脚本并重试」放行后重试即可 / a dependency needs to run build scripts, which pnpm blocks by default — click "Allow build scripts and retry" to approve and retry',
        };
    }
    // #68: git-hosted packages with a prepare/prepack script are rejected in
    // pnpm's FETCHER, before anything lands in node_modules — so the package
    // the user must approve is not installed yet, and pnpm's own hint names a
    // commit-pinned codeload URL that changes on every push.
    if (output.includes('ERR_PNPM_GIT_DEP_PREPARE_NOT_ALLOWED')) {
        return {
            code: 'git-prepare-not-allowed',
            recoverable: false,
            message: '这个 git 插件需要在安装时执行构建脚本，被 pnpm 默认拦截。点击「允许构建脚本并重试」放行后重试即可 / this git-hosted plugin needs to run its build script at install time, which pnpm blocks by default — click "Allow build scripts and retry" to approve and retry',
        };
    }
    // #65: a dependency that no longer resolves — an unpublished package left
    // in the manifest by an earlier failed operation (pnpm writes package.json
    // before it finishes), or a private-registry package without credentials.
    // pnpm re-resolves EVERY direct dependency on any add, so one ghost entry
    // blocks all later installs, of anything.
    if (output.includes('ERR_PNPM_FETCH_404')) {
        const pkg = /GET\s+\S*\/([^/\s]+):/.exec(output)?.[1].replace(/%2[Ff]/g, '/');
        const zh = pkg === undefined ? '' : `（${pkg}）`;
        const en = pkg === undefined ? '' : ` (${pkg})`;
        return {
            code: 'fetch-404',
            recoverable: false,
            pkg,
            message: `有一个依赖在 registry 上不存在${zh}，pnpm 因此拒绝任何安装操作。它可能是之前失败操作残留在 profile package.json 里的幽灵依赖（可手动删除该行），也可能是需要登录的私有包 / a dependency cannot be resolved from the registry${en}; pnpm refuses every install while it is present. It may be a ghost entry left in the profile's package.json by an earlier failed operation (remove that line by hand), or a private package needing registry credentials`,
        };
    }
    // #389 by @qq1054435284: on Windows, pnpm stages the new version in a
    // sibling `<name>_tmp_<pid>_<n>` directory and renames it over the old one.
    // Windows refuses that rename while any file underneath the target is open
    // — and for an UPDATE the target is a plugin the running dsh has loaded, so
    // its own files are exactly the ones held open. POSIX does not have this
    // problem: replacing an open file there leaves the old inode alive for
    // whoever still holds it.
    //
    // Not retried automatically. A retry from inside the same process cannot
    // win, because that process is the thing holding the handles; retrying
    // would only turn one clear failure into several slow ones. So this names
    // the cause and the two ways out instead of guessing.
    if (/ERR_PNPM_EPERM|EPERM: operation not permitted, rename/i.test(output)) {
        // Read through the NDJSON reporter like the integrity classifier does:
        // in production this arrives JSON-escaped, so every separator is doubled
        // and a single-character class silently matches nothing.
        const diagnostic = withDecodedPnpmDiagnostics(output);
        const pkg = /node_modules[\\/]+((?:@[a-z0-9][a-z0-9._-]*[\\/]+)?[a-z0-9][a-z0-9._-]*)_tmp_\d+/i
            .exec(diagnostic)?.[1]?.replace(/\\+/g, '/');
        const zh = pkg === undefined ? '' : `（${pkg}）`;
        const en = pkg === undefined ? '' : ` (${pkg})`;
        return {
            code: 'windows-file-locked',
            recoverable: false,
            ...(pkg === undefined ? {} : { pkg }),
            message: `Windows 不允许替换正在被打开的文件，而更新一个插件${zh}要替换的正是当前 DeepSeek Harness 已经加载的那些文件，所以 pnpm 改名失败、更新没有生效（原来的版本没有被破坏，仍可正常使用）。两种做法：完全退出 DeepSeek Harness 后在命令行执行一次更新；或先在「已安装」里停用该插件、重启、再更新。杀毒软件或文件索引临时占用目录也会造成同样的报错，若上述都不适用可稍后重试 / Windows will not replace a file that is open, and updating a plugin${en} replaces exactly the files the running DeepSeek Harness has loaded, so pnpm's rename failed and the update did not apply (the existing version is intact and still works). Two ways round it: quit DeepSeek Harness completely and run the update from the command line, or disable the plugin under Installed, restart, then update. Antivirus or a file indexer holding the directory produces the same error, so a later retry is worth trying if neither applies`,
        };
    }
    // #83: pnpm replays the WHOLE dependency tree on every add/remove, so a
    // moment of network flakiness against ANY already-installed dependency
    // (codeload tarball, registry meta) fails the run — and the market then
    // reported "install failed" for a plugin that was perfectly fine, only for
    // a plain retry to succeed seconds later. withHoistRecovery retries once;
    // this message covers the case where the retry lost too.
    if (isTransientPnpmFailure(output)) {
        return {
            code: 'transient-network',
            recoverable: false,
            message: '拉取依赖时网络临时失败（不一定是你正在装的插件——安装会重放整个依赖树，任何一个既有依赖抖动都会中断）。已自动重试一次仍失败，请稍后再试 / a transient network failure while fetching dependencies (not necessarily the plugin you are installing — installs replay the whole dependency tree, so any existing dependency can hiccup); one automatic retry failed too — please try again shortly',
        };
    }
    // pnpm's per-request fetch timeout (#…): large tarballs (github: sources
    // fetch the whole repo even for a `#path:` subdirectory) on slow networks
    // blow pnpm's default 60s limit. A plain retry fails again at the same
    // limit, so withHoistRecovery retries with a longer fetchTimeout.
    if (isFetchTimeoutFailure(output)) {
        return {
            code: 'fetch-timeout',
            recoverable: false,
            message: '下载超时：这个插件的安装包较大（github 源会下载整个仓库）或网络较慢，pnpm 默认的单次请求 60 秒限制不够用。市场已用更长的超时自动重试一次；若仍失败，请稍后再试或检查网络 / download timed out: this plugin ships a large tarball (github sources download the whole repository) or your network is slow, and pnpm\'s default 60-second per-request limit was not enough; the market retries once with a longer timeout — if it still fails, try again later or check the network',
        };
    }
    if (output.includes('pnpm not found on PATH')) {
        return {
            code: 'pnpm-missing',
            recoverable: false,
            message: '找不到 pnpm，请先在市场页顶部一键安装组件 / pnpm is not on PATH — use the one-click setup at the top of the market page',
        };
    }
    return null;
}
