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

import { existsSync } from 'node:fs'
import { join } from 'node:path'


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
export function pluginArgsFor(profileDir: string, pluginArgs: string[]): string[] {
  if (pluginArgs[0] !== 'add' && pluginArgs[0] !== 'remove') return pluginArgs
  if (!existsSync(join(profileDir, 'pnpm-workspace.yaml'))) return pluginArgs
  return [pluginArgs[0], '-w', ...pluginArgs.slice(1)]
}

/** One recognized pnpm failure, with a bilingual explanation for the UI. */
/**
 * The namespace whose packages the dsh runtime provides rather than npm.
 *
 * A peer dependency on one of these is a statement about the host, not a
 * package to download — and several of them are never published at all.
 */
export const HOST_NAMESPACE_RE = /^@deepseek-ai\//

export interface PnpmFailure {
  code: 'adding-to-root' | 'not-a-workspace' | 'hoist-pattern-diff' | 'pnpm-missing' | 'release-age-violation'
    | 'ignored-builds' | 'git-prepare-not-allowed' | 'git-prepare-failed' | 'tarball-url-mismatch'
    | 'fetch-404' | 'transient-network' | 'fetch-timeout'
    | 'unexpected-store' | 'patch-failed' | 'missing-tarball-integrity' | 'windows-file-locked'
    | 'pnpm-unusable' | 'missing-local-dependency'
  /** Bilingual, actionable message shown to the user instead of the raw wall of text. */
  message: string
  /** True when re-running `pnpm install` in the profile is the documented recovery. */
  recoverable: boolean
  /**
   * Show this message INSTEAD of the captured output, not after it.
   *
   * Normally the raw text is worth keeping: it is pnpm's own account of what
   * happened, and the explanation sits under it. Set only where the captured
   * bytes carry nothing a user can read — cmd.exe writes its errors in the
   * OEM code page, which arrives here as replacement characters, so pasting
   * them under an explanation adds noise and hides the explanation (#502).
   */
  replaceOutput?: boolean
  /**
   * The package pnpm could not resolve, when the failure names one.
   *
   * Exposed because the NAME alone does not say what went wrong: the same
   * 404 is a ghost entry the user must delete when the package is a direct
   * dependency of the profile, and an unpublished host peer the market can
   * retry around when it is not (#289). Only a caller holding the profile
   * manifest can tell those apart, so the classifier reports the fact and
   * leaves the judgement to it.
   */
  pkg?: string
}

/**
 * Momentary network failures — worth exactly one automatic retry (#83).
 * pnpm 5xx fetch codes, its meta-fetch give-up, and the raw socket errors
 * that surface through dsh's wrapper. Permanent shapes (404, auth) are
 * deliberately absent: retrying those just doubles the wait for bad news.
 */
export function isTransientPnpmFailure(output: string): boolean {
  return /ERR_PNPM_FETCH_5\d\d|ERR_PNPM_META_FETCH_FAIL|FetchError|ECONNRESET|ETIMEDOUT|EAI_AGAIN|ENETUNREACH|socket hang up|network timeout/i.test(output)
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
export function isFetchTimeoutFailure(output: string): boolean {
  return /operation was aborted due to timeout|TimeoutError|error \(23\)/i.test(output)
}

/**
 * Add human diagnostics decoded from pnpm's NDJSON reporter to its raw output.
 *
 * Mutating market commands always use `--reporter=ndjson`, so an error's
 * message normally arrives as a JSON string: quotes are escaped and embedded
 * newlines are `\n`. Matching only the raw stream therefore misses the exact
 * production form even when it works against pnpm's pretty reporter.
 */
function withDecodedPnpmDiagnostics(output: string): string {
  const messages: string[] = []
  for (const line of output.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('{')) continue
    try {
      const event = JSON.parse(trimmed) as { message?: unknown; err?: unknown }
      if (typeof event.message === 'string') messages.push(event.message)
      if (typeof event.err === 'object' && event.err !== null) {
        const message = (event.err as Record<string, unknown>).message
        if (typeof message === 'string') messages.push(message)
      }
    } catch {
      // Human reporter output and truncated NDJSON remain available verbatim.
    }
  }
  return messages.length === 0 ? output : `${output}\n${messages.join('\n')}`
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
function integrityViolators(diagnostic: string): string[] {
  const NAME = String.raw`(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*`
  const found: string[] = []
  const add = (name: string | undefined): void => {
    if (name !== undefined && !found.includes(name)) found.push(name)
  }
  add(new RegExp(String.raw`Cannot (?:install|fetch) package\s+"(${NAME})@https?:\/\/[^"\s]+"(?: from the lockfile)?:\s*(?:its lockfile entry|it) has no "integrity" field`, 'i')
    .exec(diagnostic)?.[1])
  const listed = new RegExp(
    String.raw`(?<![\w./:@-])(${NAME})@[A-Za-z0-9._+-]+(?:\s+\[MISSING_TARBALL_INTEGRITY\])? has no "integrity" field`,
    'gi',
  )
  for (const match of diagnostic.matchAll(listed)) add(match[1])
  return found
}

/**
 * Map a failed pnpm run's combined output to a known failure mode.
 *
 * dsh's own wrapper line ("dsh: pnpm failed in profile directory …") names no
 * cause, so the market must recognize pnpm's real diagnostics itself (#20).
 * @param output - stdout+stderr of the failed run.
 * @param exitCode - the run's exit status, when the caller has it (null when
 *   the process was signalled). Only a
 *   failure whose whole signal IS the status reads it (#502); everything else
 *   is recognized from what pnpm said.
 * @returns the classified failure, or null when unrecognized (raw output is then shown as-is).
 */
export function classifyPnpmFailure(output: string, exitCode?: number | null): PnpmFailure | null {
  if (output.includes('ERR_PNPM_PUBLIC_HOIST_PATTERN_DIFF')
    || output.includes('ERR_PNPM_VIRTUAL_STORE_DIR_MAX_LENGTH_DIFF')) {
    return {
      code: 'hoist-pattern-diff',
      recoverable: true,
      message: 'profile 的 node_modules 是旧版 pnpm 创建的，与当前 pnpm 的默认配置不兼容，需要重建后重试 / this profile\'s node_modules was created by a different pnpm major; it must be rebuilt (pnpm install) before changes can be applied',
    }
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
    const linked = /currently linked from the store at "([^"]+)"/.exec(output)?.[1]
    const wanted = /wants to use the store at "([^"]+)"/.exec(output)?.[1]
    const detail = linked !== undefined && wanted !== undefined
      ? `\n  node_modules → ${linked}\n  pnpm 现在想用 / pnpm now wants → ${wanted}`
      : ''
    return {
      code: 'unexpected-store',
      recoverable: false,
      message: `这个 profile 的 node_modules 链接到的 pnpm store，和当前 pnpm 默认使用的 store 不是同一个，pnpm 因此拒绝所有安装与卸载。${detail}\n在 profile 目录里执行一次 \`pnpm install --store-dir <上面第一个路径>\` 重新链接即可（dsh 运行时可能占用文件，必要时先退出 dsh）/ this profile's node_modules is linked to a different pnpm store than the one pnpm now resolves, so pnpm refuses every install and uninstall.${detail}\nRelink by running \`pnpm install --store-dir <the first path above>\` once in the profile directory (stop dsh first if files are locked)`,
    }
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
    const named = integrityViolators(withDecodedPnpmDiagnostics(output))
    // Only a single unambiguous name goes in `pkg`: callers treat it as "the
    // package this failure is about", which a list is not.
    const pkg = named.length === 1 ? named[0] : undefined
    const zh = named.length === 0 ? '' : `（${named.join('、')}）`
    const en = named.length === 0 ? '' : ` (${named.join(', ')})`
    return {
      code: 'missing-tarball-integrity',
      recoverable: false,
      pkg,
      message: `profile 的 pnpm-lock.yaml 里有 tarball 依赖${zh}缺少 integrity，pnpm 因此拒绝这个 profile 里的所有安装和卸载——包括卸载它自己，所以装不回来也删不掉。这种条目通常是旧版市场留下的：它把 GitHub 插件写成了带镜像前缀的 tarball 地址，pnpm 认不出那是 GitHub，就要求一个它自己从不为 GitHub 源写入的校验值。新版市场改为交给 pnpm 原生的 GitHub 地址，不会再产生这种条目（#385）。请在 pnpm-lock.yaml 里删掉上面点名的那条依赖记录后重试，市场会用当前方式把它重新装回来；不要删整个 pnpm-lock.yaml，那会让其余插件全部重新解析版本。市场不会自动为未经验证的字节生成校验值 / a tarball dependency${en} in this profile's pnpm-lock.yaml has no integrity, so pnpm refuses every install and uninstall in this profile — including uninstalling that dependency itself, so it can be neither repaired nor removed. Entries like this usually come from an older market version, which installed GitHub plugins from a mirror-prefixed tarball URL: pnpm cannot tell that is GitHub, so it demands a checksum it never writes for GitHub sources. Current versions hand pnpm its own native GitHub target instead and no longer produce such entries (#385). Delete the named dependency's entry from pnpm-lock.yaml and retry — the market will reinstall it the current way. Do not delete the whole pnpm-lock.yaml; that re-resolves the versions of every other plugin too. The market will not generate a checksum for unverified bytes automatically`,
    }
  }
  // #455 by @Asheblog: pnpm 11's supply-chain check compares every lockfile tarball URL
  // against the registry's published metadata. A lockfile generated against
  // registry.npmjs.org fails wholesale when the profile resolves a mirror
  // registry (npmmirror), because the mirror's metadata names its own
  // tarball host. pnpm refuses every operation while the mismatch stands,
  // and the same check runs inside a git-hosted package's own build — which
  // is how a floating github: dependency can break updates of unrelated
  // plugins (the inner failure surfaces as ERR_PNPM_PREPARE_PACKAGE).
  if (output.includes('ERR_PNPM_TARBALL_URL_MISMATCH')) {
    const diagnostic = withDecodedPnpmDiagnostics(output)
    const NAME = String.raw`(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*`
    const named = [...diagnostic.matchAll(new RegExp(String.raw`(?<![\w./:@-])(${NAME})@[A-Za-z0-9._+-]+ has a tarball URL`, 'gi'))]
      .map(match => match[1])
      .filter((name, index, all) => all.indexOf(name) === index)
    const pkg = named.length === 1 ? named[0] : undefined
    const zh = named.length === 0 ? '' : `（${named.join('、')}）`
    const en = named.length === 0 ? '' : ` (${named.join(', ')})`
    return {
      code: 'tarball-url-mismatch',
      recoverable: false,
      ...(pkg === undefined ? {} : { pkg }),
      message: `pnpm-lock.yaml 里有一些条目的 tarball 地址与当前 registry 发布的元数据不一致${zh}，pnpm 11 的供应链检查因此拒绝这个 profile 里的所有操作。这通常发生在镜像 registry（如 npmmirror）与用 npmjs.org 生成的 lockfile 相遇时——例如某个 git 插件仓库自带的 lockfile。可以按 pnpm 的提示执行 pnpm clean --lockfile 后重新安装，或把 registry 切回生成该 lockfile 的源 / some entries in pnpm-lock.yaml have tarball URLs that do not match the current registry's published metadata${en}; pnpm 11's supply-chain check therefore refuses every operation in this profile. This usually happens when a mirror registry (e.g. npmmirror) meets a lockfile generated against npmjs.org — for example a git-hosted plugin repository's own lockfile. Run pnpm clean --lockfile and reinstall as pnpm suggests, or switch the registry back to the source the lockfile was generated against`,
    }
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
    const patch = /Could not apply patch (\S+)/.exec(output)?.[1]
    const which = patch === undefined ? '' : `（${patch}）`
    const whichEn = patch === undefined ? '' : ` (${patch})`
    return {
      code: 'patch-failed',
      recoverable: false,
      message: `profile 里的一个 pnpm 补丁打不上了${which}。pnpm 会继续把这个包装上，但装的是没打补丁的原版——通常下次启动才会以「插件加载失败」暴露出来。多半是包升级后挪动了补丁指向的文件（例如补丁改的是 client/client.js，而新版本发的是 lib/client.js）。请更新或删掉这个补丁文件，以及 profile package.json 里 pnpm.patchedDependencies 中对应的那一条 / a pnpm patch in this profile no longer applies${whichEn}. pnpm still installs the package, but unpatched — which usually surfaces at the next boot as "failed to load plugins" rather than here. The usual cause is the package moving the file the patch targets (for example a patch against client/client.js when the release now ships lib/client.js). Update or remove that patch file and its entry under pnpm.patchedDependencies in the profile's package.json`,
    }
  }
  if (output.includes('ERR_PNPM_ADDING_TO_ROOT')) {
    return {
      code: 'adding-to-root',
      recoverable: false,
      message: 'pnpm 拒绝在 workspace 根目录安装（缺少 -w）。这是市场的 bug，请升级 dshmarket 到最新版 / pnpm refused to add at a workspace root (missing -w); this is a market bug — please update dshmarket',
    }
  }
  if (/--workspace-root may only be used inside a workspace/i.test(output)) {
    return {
      code: 'not-a-workspace',
      recoverable: false,
      message: 'profile 目录不是 pnpm workspace，却传入了 -w。这是市场的 bug，请升级 dshmarket 到最新版 / -w was passed but the profile is not a pnpm workspace; this is a market bug — please update dshmarket',
    }
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
    }
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
    }
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
    }
  }
  // #455 by @Asheblog: a git-hosted package with a prepare/prepack script failed its own
  // build. pnpm runs `pnpm install` inside the fetched repository and
  // rethrows the inner failure as ERR_PNPM_PREPARE_PACKAGE with only a
  // one-line summary — the inner diagnostics (which package, which registry)
  // are not propagated, so the user sees "pnpm install Exit status 1" with no
  // cause. The most common cause on pnpm 11 is the repository's own
  // pnpm-lock.yaml failing the supply-chain check against a mirror registry
  // (tarball URLs pointing at registry.npmjs.org while the profile resolves
  // npmmirror); the repository's build script itself failing, or a network
  // problem, are the other ones.
  if (output.includes('ERR_PNPM_PREPARE_PACKAGE')) {
    const diagnostic = withDecodedPnpmDiagnostics(output)
    const named = /Failed to prepare git-hosted package fetched from "https:\/\/codeload\.github\.com\/[^"]+":\s*((?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*)@[A-Za-z0-9._+-]+/i
      .exec(diagnostic)?.[1]
    const zh = named === undefined ? '' : `（${named}）`
    const en = named === undefined ? '' : ` (${named})`
    return {
      code: 'git-prepare-failed',
      recoverable: false,
      ...(named === undefined ? {} : { pkg: named }),
      message: `git 插件${zh}在安装时需要执行它自己仓库里的构建脚本（pnpm install），但构建失败了。最常见的原因是仓库自带的 pnpm-lock.yaml 与你的 registry 不兼容：lockfile 里的 tarball 地址指向 registry.npmjs.org，而你的 registry 是镜像（如 npmmirror），pnpm 11 的供应链检查会拒绝整个 lockfile；也可能是仓库的构建脚本本身报错或网络问题。可以先把这个依赖固定到已知可用的 commit（github:owner/repo#<commit>）再更新其他插件，或临时把 registry 切到 npmjs.org 重试 / a git-hosted plugin${en} failed to run its own build (pnpm install) during install. The most common cause is the repository's pnpm-lock.yaml being incompatible with your registry: its tarball URLs point at registry.npmjs.org while your registry is a mirror (e.g. npmmirror), which pnpm 11's supply-chain check rejects; the repository's build script itself failing, or a network problem, are the other causes. Pin that dependency to a known-good commit (github:owner/repo#<commit>) before updating other plugins, or temporarily switch the registry to npmjs.org and retry`,
    }
  }
  // #65: a dependency that no longer resolves — an unpublished package left
  // in the manifest by an earlier failed operation (pnpm writes package.json
  // before it finishes), or a private-registry package without credentials.
  // pnpm re-resolves EVERY direct dependency on any add, so one ghost entry
  // blocks all later installs, of anything.
  if (output.includes('ERR_PNPM_FETCH_404')) {
    const pkg = /GET\s+\S*\/([^/\s]+):/.exec(output)?.[1].replace(/%2[Ff]/g, '/')
    const zh = pkg === undefined ? '' : `（${pkg}）`
    const en = pkg === undefined ? '' : ` (${pkg})`
    return {
      code: 'fetch-404',
      recoverable: false,
      pkg,
      message: `有一个依赖在 registry 上不存在${zh}，pnpm 因此拒绝任何安装操作。它可能是之前失败操作残留在 profile package.json 里的幽灵依赖（可手动删除该行），也可能是需要登录的私有包 / a dependency cannot be resolved from the registry${en}; pnpm refuses every install while it is present. It may be a ghost entry left in the profile's package.json by an earlier failed operation (remove that line by hand), or a private package needing registry credentials`,
    }
  }
  // #389 by @qq1054435284: on Windows, pnpm stages the new version in a
  // sibling `<name>_tmp_<pid>_<n>` directory and renames it over the old one.
  // Windows refuses that rename while any file underneath the target is open,
  // and the process holding them is usually the one asking. POSIX does not
  // have this problem: replacing an open file there leaves the old inode
  // alive for whoever still holds it.
  //
  // Worded for the RENAME, not for an update (#441 by @yandidan1). The
  // reporter met this while INSTALLING — a reinstall of a plugin they had
  // just uninstalled — and was told their update had not applied, that their
  // existing version was intact, and to disable the plugin under Installed,
  // which they had already removed. The package pnpm names here is also not
  // necessarily a plugin: theirs was `node-hid`, a dependency.
  //
  // The native-module sentence is the part that makes the advice usable in
  // that case. Node never unloads a native addon: once a `.node` is loaded
  // there is no dlclose, so disabling the plugin, unmounting it, or
  // uninstalling it cannot release the file — only ending the process does.
  // That is why "uninstall, then install again" fails on Windows for those
  // plugins while it works for every other one.
  //
  // Not retried automatically. A retry from inside the same process cannot
  // win, because that process is the thing holding the handles; retrying
  // would only turn one clear failure into several slow ones. So this names
  // the cause and the ways out instead of guessing.
  if (/ERR_PNPM_EPERM|EPERM: operation not permitted, rename/i.test(output)) {
    // Read through the NDJSON reporter like the integrity classifier does:
    // in production this arrives JSON-escaped, so every separator is doubled
    // and a single-character class silently matches nothing.
    const diagnostic = withDecodedPnpmDiagnostics(output)
    const pkg = /node_modules[\\/]+((?:@[a-z0-9][a-z0-9._-]*[\\/]+)?[a-z0-9][a-z0-9._-]*)_tmp_\d+/i
      .exec(diagnostic)?.[1]?.replace(/\\+/g, '/')
    const zh = pkg === undefined ? '' : `（${pkg}）`
    const en = pkg === undefined ? '' : ` (${pkg})`
    return {
      code: 'windows-file-locked',
      recoverable: false,
      ...(pkg === undefined ? {} : { pkg }),
      message: `Windows 不允许替换正在被打开的文件。pnpm 要用新目录替换${zh === '' ? '一个已装好的包' : ` ${pkg!}`}，而它的文件正被运行中的 DeepSeek Harness 打开着，改名因此失败，这一步没有生效——已经装好的内容没有被破坏。\n如果这个包带原生模块（.node 文件，例如 node-hid 这类），那么停用插件、甚至卸载插件都不够：原生模块一旦被加载，在进程退出前都不会释放。刚卸载完立刻重装同一个插件在 Windows 上失败，通常就是这个原因。\n可行的做法：完全退出 DeepSeek Harness（不是刷新页面），重新启动后再操作一次；或退出后在命令行执行。杀毒软件或文件索引临时占用目录也会报同样的错，若都不适用可稍后重试。 / Windows will not replace a file that is open. pnpm tried to swap a new directory over${en === '' ? ' an installed package' : en}, whose files the running DeepSeek Harness holds open, so the rename failed and this step did not apply — what was already installed is intact. If that package ships a native module (a .node file, node-hid and friends), disabling the plugin — even uninstalling it — is not enough: once a native module is loaded it is not released until the process exits, which is the usual reason reinstalling a plugin right after uninstalling it fails on Windows. What works: quit DeepSeek Harness completely (not a page refresh), start it again, and repeat the operation; or run it from the command line with the app closed. Antivirus or a file indexer holding the directory produces the same error, so a later retry is worth trying if neither applies.`,
    }
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
    }
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
    }
  }
  if (output.includes('pnpm not found on PATH')) {
    return {
      code: 'pnpm-missing',
      recoverable: false,
      message: '找不到 pnpm，请先在市场页顶部一键安装组件 / pnpm is not on PATH — use the one-click setup at the top of the market page',
    }
  }
  // Reported by @screamff on #436: a `file:` dependency whose tarball or
  // directory is no longer on disk. pnpm re-resolves every direct dependency
  // before ANY mutation, so one dead local path blocks every install and
  // uninstall in the profile — including uninstalling the market, which is
  // what the reporter was trying to do. Same family as the #65 ghost
  // registry entry; the local form has its own error, and it names the PATH
  // rather than the package, which is why "a plugin is missing" was never a
  // usable description of it.
  //
  // Measured on pnpm 10.28.2 and 11.21.0 (both exit 254): the wording only
  // differs in how the code is bracketed, and both carry the path and the
  // "direct dependency" line. Both are required — an ENOENT from a build
  // script is a different failure and must not wear this explanation.
  const localMiss = /ENOENT: no such file or directory, open '([^']+)'/.exec(output)
  if (localMiss !== null && output.includes('while installing a direct dependency')) {
    return {
      code: 'missing-local-dependency',
      recoverable: false,
      message: `profile 里有一个从本地文件安装的插件，它的文件已经不在了（${localMiss[1]}）。pnpm 在做任何改动前都会重新解析全部直接依赖，所以这一条会挡住这个 profile 里的所有安装和卸载——包括卸载别的插件。请在 profile 的 package.json 的 dependencies 里删掉值等于上面这个路径的那一行（或在市场的「已安装」里卸载它），然后重试。 / a plugin in this profile was installed from a local file that no longer exists (${localMiss[1]}). pnpm re-resolves every direct dependency before making any change, so this one entry blocks every install and uninstall in the profile — including uninstalling other plugins. Remove the dependency whose value is that path from the profile's package.json (or uninstall it from the market's Installed list) and retry.`,
    }
  }
  // #502 by @Ztyss: a pnpm WAS found on PATH and could not be started.
  //
  // Different from `pnpm-missing` in the one way that matters to the user:
  // the market's own setup does not fix it, because as far as PATH is
  // concerned pnpm is already there. The reported case is a `pnpm.cmd`
  // wrapper built out of environment variables that only exist in its
  // installer's own process — expanded in the market's child process it
  // collapses to an empty command, and cmd.exe answers 9009 with its message
  // in the OEM code page, which reaches us as replacement characters. Three
  // updates in a row failed showing the user nothing but that.
  //
  // 9009 is cmd.exe's "command not found" and is language-independent, so it
  // leads; the text forms catch the same failure in a log with no exit code.
  //
  // #509 by @awslmowms added the other way a present pnpm fails to run: the
  // spawn itself is refused, and dsh's wrapper rethrows Node's error
  // verbatim — `EACCES, syscall: 'spawnSync pnpm'` on Ubuntu. Same class
  // (pnpm is there, it will not run, and the market's own setup cannot help)
  // but a different repair, so the message names the reason it was given.
  //
  // Last in the chain deliberately: pnpm's own errors never exit 9009 and
  // never fail to spawn, and anything pnpm actually said has matched above.
  const spawnRefused = /spawnSync pnpm/.test(output)
    ? /EACCES/.test(output) ? 'EACCES' : /ENOENT/.test(output) ? 'ENOENT' : 'unknown'
    : null
  const cmdNotFound = exitCode === 9009
    || /is not recognized as an internal or external command|不是内部或外部命令|不是內部或外部命令/.test(output)
  if (cmdNotFound || spawnRefused !== null) {
    // Each cause gets the repair that fits it. One generic sentence would
    // send the EACCES reporter hunting for a missing wrapper variable and
    // the Windows reporter reaching for chmod.
    const why = spawnRefused === 'EACCES'
      ? {
          zh: '系统拒绝执行它（EACCES，权限不足）。多半是那个文件没有执行权限，或者它所在的分区是以 noexec 挂载的。用 `ls -l $(command -v pnpm)` 看一眼权限位，必要时 `chmod +x`；如果 pnpm 装在 noexec 的分区上，换个位置重装。',
          en: 'the system refused to execute it (EACCES, permission denied). Usually the file has no execute permission, or it lives on a partition mounted noexec. Check the permission bits with `ls -l $(command -v pnpm)` and `chmod +x` if needed; if pnpm sits on a noexec partition, reinstall it elsewhere.',
        }
      : spawnRefused === 'ENOENT'
        ? {
            zh: '要执行的文件已经不在了（ENOENT）。PATH 里那条记录指向的 pnpm 被删掉或改名了，重新装一次 pnpm 即可。',
            en: 'the file it tried to execute is gone (ENOENT). The pnpm that entry on PATH points at has been deleted or renamed; reinstall pnpm.',
          }
        : {
            zh: '命令行没能把它启动起来（退出码 9009）。可能是它其实没装好，也可能它是一个包装脚本、而脚本需要的环境变量在市场启动的子进程里不存在。',
            en: "the command line could not launch it (exit code 9009). Either it is not installed properly, or it is a wrapper script whose required environment variables are missing in the market's child process.",
          }
    return {
      code: 'pnpm-unusable',
      recoverable: false,
      replaceOutput: true,
      message: `找不到能用的 pnpm，插件没有任何改动。系统里确实有一个 pnpm，但${why.zh}\n在终端里执行一次 \`pnpm --version\` 可以确认：那里同样失败，说明要修的是这台机器上的 pnpm；那里正常，说明是启动市场的方式带来的环境差异，改用普通的 \`dsh web\` 启动可以绕开。 / pnpm could not be started, and nothing was changed. A pnpm does exist on PATH, but ${why.en}\nRun \`pnpm --version\` in a terminal to check: failing there too means pnpm itself needs fixing on this machine; working there means the difference comes from how the market was launched, and starting dsh with a plain \`dsh web\` avoids it.`,
    }
  }
  return null
}
