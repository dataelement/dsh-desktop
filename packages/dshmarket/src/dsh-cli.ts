/**
 * Process layer: re-invoking the dsh CLI that launched this host, spawning
 * `dsh plugin` commands with timeouts and live progress, and provisioning
 * pnpm. This is the only module that starts child processes.
 *
 * Installs run through node:child_process, not ctx.shell: the shell service is
 * the agent's sandboxed executor and denies writes to the profile directory.
 */

import { spawn } from 'node:child_process'
import type { ChildProcess, SpawnOptions } from 'node:child_process'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import { logEvent } from './log.ts'
import { createProgressTracker, type ProgressPhase } from './ndjson.ts'
import { pluginArgsFor } from './pnpm-compat.ts'
import { isDshProfileName, profileDir } from './profile.ts'
import { activeRegion, DEFAULT_NPM_REGISTRY, routesFor, type Region } from './regions.ts'
import { NPM_NAME_RE } from './sources.ts'
import { fetchNpmLatest } from './updates.ts'

// 15 min default (slow networks + git installs), overridable for CI/tests.
// (#6 by @qichuang321.)
/**
 * macOS apps launched from Finder/Dock inherit a minimal PATH without the
 * shell profile — Homebrew/npm/corepack all vanish and every install dies
 * with ENOENT/127 (#32, #38). Append the well-known bin directories so the
 * market's children find their tools regardless of how dsh was started.
 */
/**
 * Directories discovered at runtime that hold a usable pnpm — currently
 * npm's global bin, learned after a successful one-click setup (#149).
 * Every later spawn sees them, so the market does not have to be restarted
 * for the pnpm it just installed to become visible.
 */
const extraPathDirs: string[] = []

/**
 * The real Node executable for spawning children. On Android the kernel runs
 * node through the dynamic linker, so `process.execPath` is
 * `/apex/.../linker64` — spawning IT with `--expose-internals` makes the
 * linker treat the flag as the program path and die with
 * `error: expected absolute path: "--expose-internals"`. `process.argv0`
 * carries the real node binary; prefer it whenever it is an existing
 * absolute path, and fall back to execPath everywhere else.
 * @param argv0 - `process.argv0`, injectable for tests.
 * @param execPath - `process.execPath`, injectable for tests.
 */
export function nodeExecutable(argv0: string | undefined = process.argv0, execPath: string = process.execPath): string {
  if (argv0 !== undefined && argv0 !== '' && isAbsolute(argv0) && existsSync(argv0))
    return argv0
  return execPath
}

/**
 * The directory holding the Node binary running this process. `npm`,
 * `npm.cmd` and `corepack` are installed alongside it by every official Node
 * distribution, so it is the one place the toolchain can be looked for
 * without guessing — and unlike a PATH entry it cannot be absent, because
 * this process is executing out of it.
 *
 * #167: a Windows desktop host spawned dsh without the Node install
 * directory on PATH. Node itself was running (v24.18.1 in the log) while
 * both `corepack` and `npm` came back "not recognized as an internal or
 * external command", so the one-click setup had no way to succeed.
 */
export const nodeBinDir = dirname(nodeExecutable())

/**
 * Translate the machine's proxy environment into the ONE form pnpm reads.
 *
 * `HTTPS_PROXY` / `http_proxy` are what every other tool honours, and what
 * `net.ts` already routes the market's own catalog fetches through — but
 * pnpm ignores them completely. It reads npm config, so a proxy reaches it
 * only as `npm_config_https_proxy` / `npm_config_proxy` (or an .npmrc entry,
 * which is the user's file and not ours to rewrite).
 *
 * That gap is why the market could load its catalog through a proxy and
 * then hang installing anything at all — reported four separate times
 * (#148, #161, #188, #232), always from a network that needs one.
 *
 * An `npm_config_*` value the caller already set always wins: it is the more
 * specific statement of intent, and on Windows env keys are case-insensitive
 * so the check has to be too. NO_PROXY is forwarded verbatim because pnpm
 * reads `npm_config_noproxy` and a host excluding its own registry mirror
 * must keep excluding it.
 */
export function proxyEnvForPnpm(env: NodeJS.ProcessEnv = process.env, region: Region = 'global'): NodeJS.ProcessEnv {
  const has = (name: string): boolean => {
    const wanted = name.toLowerCase()
    return Object.keys(env).some(key => key.toLowerCase() === wanted && (env[key] ?? '').trim() !== '')
  }
  const pick = (...names: string[]): string | null => {
    for (const name of names) {
      const raw = env[name]
      if (raw !== undefined && raw.trim() !== '') return raw.trim()
    }
    return null
  }
  const out: NodeJS.ProcessEnv = {}
  // Three consumers, three vocabularies, one proxy. The market's own fetch
  // reads the standard vars (and, since #263, npm config too); pnpm reads
  // ONLY npm config; and `git` — which pnpm shells out to for every
  // git-hosted plugin — reads only the standard vars and never npm config.
  // Translating one direction left the third out: registry installs went
  // through the proxy while git installs went direct and failed with
  // "Failed to connect to github.com:443" (#274 by @rucsocial).
  //
  // Same precedence as undici's EnvHttpProxyAgent (lowercase over
  // uppercase, https falling back to http).
  const stdHttps = pick('https_proxy', 'HTTPS_PROXY') ?? pick('http_proxy', 'HTTP_PROXY')
  const stdHttp = pick('http_proxy', 'HTTP_PROXY') ?? stdHttps
  if (stdHttps !== null && !has('npm_config_https_proxy')) out.npm_config_https_proxy = stdHttps
  if (stdHttp !== null && !has('npm_config_proxy')) out.npm_config_proxy = stdHttp
  const stdNoProxy = pick('no_proxy', 'NO_PROXY')
  if (stdNoProxy !== null && !has('npm_config_noproxy')) out.npm_config_noproxy = stdNoProxy

  // The other direction, and ONLY when the standard vocabulary is empty.
  // A proxy known solely to npm config is the case that stranded git; if
  // the caller has said anything in the standard vars, that is their
  // statement about what git should do and copying npm's answer over it
  // would invent a setting they did not make — notably an HTTP_PROXY for
  // someone who deliberately proxied https only.
  if (stdHttps === null && stdHttp === null) {
    const npmHttps = pick('npm_config_https_proxy') ?? pick('npm_config_proxy')
    const npmHttp = pick('npm_config_proxy') ?? npmHttps
    if (npmHttps !== null) out.HTTPS_PROXY = npmHttps
    if (npmHttp !== null) out.HTTP_PROXY = npmHttp
    const npmNoProxy = pick('npm_config_noproxy')
    if (npmNoProxy !== null && stdNoProxy === null) out.NO_PROXY = npmNoProxy
  }
  // The download region's npm mirror, when it has one.
  //
  // Last, and conditionally: a registry the caller already named is their
  // statement about where packages come from, and a region setting must not
  // overrule it. Same rule the proxy translation above follows, for the same
  // reason — this function's job is to fill silence, not to overwrite speech.
  const mirror = routesFor(region).npmRegistry
  if (mirror !== DEFAULT_NPM_REGISTRY && !has('npm_config_registry')) {
    // npm's own config convention terminates the registry with a slash;
    // pnpm accepts either, but writing it the conventional way keeps the
    // value recognizable to anyone reading the spawned process's env.
    out.npm_config_registry = `${mirror}/`
  }
  return out
}

/**
 * Directories to append to PATH so a spawned pnpm can be found (#32, #38,
 * #167, #292).
 *
 * A GUI or desktop launch inherits none of the shell profile, so PATH holds
 * whatever the launcher had — usually not the directory the user's package
 * manager lives in. The market appends the places it is actually installed
 * to rather than telling the user to fix their environment.
 *
 * Windows used to get only the Node directory, which made the market's own
 * advice unfollowable: the error it prints recommends installing pnpm with
 * `iwr https://get.pnpm.io/install.ps1`, and then it did not look where that
 * installer puts it (#292). Both Windows layouts are covered now — the
 * standalone installer's `%LOCALAPPDATA%\pnpm`, and `%APPDATA%\npm` where
 * `npm i -g pnpm` writes `pnpm.cmd`.
 *
 * `PNPM_HOME` comes first on every platform: the installer sets it, so it is
 * the one answer that is right even when the layout is not the default one.
 *
 * @param platform - `process.platform`, injectable for tests.
 * @param env - environment, for PNPM_HOME and the Windows app-data roots.
 * @param home - home directory, injectable for tests.
 */
export function toolSearchDirs(
  platform: string = process.platform,
  env: NodeJS.ProcessEnv = process.env,
  home: string = homedir(),
): string[] {
  const dirs: string[] = []
  const pnpmHome = (env.PNPM_HOME ?? '').trim()
  if (pnpmHome !== '') dirs.push(pnpmHome)
  if (platform === 'win32') {
    const local = (env.LOCALAPPDATA ?? '').trim()
    const roaming = (env.APPDATA ?? '').trim()
    if (local !== '') dirs.push(join(local, 'pnpm'))
    if (roaming !== '') dirs.push(join(roaming, 'npm'))
  } else {
    dirs.push('/opt/homebrew/bin', '/usr/local/bin', join(home, '.local', 'bin'))
    // Where the standalone installer lands when PNPM_HOME is unset.
    dirs.push(join(home, 'Library', 'pnpm'), join(home, '.local', 'share', 'pnpm'))
  }
  dirs.push(nodeBinDir, ...extraPathDirs)
  // Deduped: PNPM_HOME usually names one of the defaults below it, and a
  // list that says the same directory twice reads as carelessness in the
  // one place a user goes looking for an answer.
  return [...new Set(dirs.filter(dir => dir.trim() !== ''))]
}

function spawnEnv(): NodeJS.ProcessEnv {
  // pnpm v10+ blocks forever on a silent interactive prompt without a TTY;
  // CI mode forces it to act or fail instead of asking.
  const separator = process.platform === 'win32' ? ';' : ':'
  const parts = (process.env.PATH ?? '').split(separator).filter(part => part !== '')
  for (const bin of toolSearchDirs()) {
    if (!parts.includes(bin)) parts.push(bin)
  }
  return { ...process.env, ...proxyEnvForPnpm(process.env, activeRegion()), CI: 'true', PATH: parts.join(separator) }
}

const INSTALL_TIMEOUT_MS = Number(process.env.DSH_MARKET_INSTALL_TIMEOUT_MS) || 15 * 60 * 1000

/**
 * Windows npm/corepack/pnpm are `.cmd` shims. Node's `spawn` without a shell
 * cannot start them (ENOENT / EINVAL). Same pattern as dsh's `plugin` forwarder.
 */
export const winCmdShim = process.platform === 'win32'

/** Characters cmd.exe treats as syntax even inside a token. */
const CMD_METACHARS = /[\s"&|<>^()%!]/

/**
 * Quote one argv token for a cmd.exe `/c` command line. cmd only groups with
 * double quotes, so a token that needs quoting gets wrapped and embedded
 * quotes are doubled.
 */
export function quoteCmdArg(arg: string): string {
  if (!CMD_METACHARS.test(arg)) return arg
  return `"${arg.replace(/"/g, '""')}"`
}

/**
 * Build a cmd.exe command line from argv. Only the Windows shim path uses
 * this: cmd re-parses the joined string, so every token is quoted before
 * joining.
 */
export function cmdCommandLine(argv: readonly string[]): string {
  return argv.map(quoteCmdArg).join(' ')
}

/**
 * Whether a profile name can cross the rare Windows `dsh.cmd` fallback.
 *
 * cmd.exe expands percent-delimited environment variables even inside a
 * quoted argument. Keep that fallback to names made only of letters, marks,
 * numbers, spaces, dots, underscores, and hyphens. The normal direct-Node
 * launcher remains argv-safe and accepts every DSH-valid profile name.
 */
export function isCmdSafeProfileName(profile: string): boolean {
  return isDshProfileName(profile) && /^[\p{L}\p{M}\p{N}._ -]+$/u.test(profile)
}

/** cmd.exe resolved once; the Windows shim path only. */
const COMSPEC = process.env.ComSpec ?? 'cmd.exe'

/** Spawn options plus the explicit shim switch used by callers. */
type SpawnShimOptions = SpawnOptions & { viaShell?: boolean }

/**
 * Spawn a command, avoiding Node's deprecated `shell: true` + argv
 * combination (DEP0190). Windows `.cmd` shims cannot start without a shell,
 * so the shim path routes through `cmd.exe /d /s /c` with an explicitly
 * built, quoted command line; every other invocation spawns directly with
 * `shell: false`.
 */
function spawnShim(file: string, args: readonly string[], options: SpawnShimOptions): ChildProcess {
  const { viaShell = false, ...spawnOptions } = options
  if (!viaShell) {
    return spawn(file, [...args], { ...spawnOptions, shell: false })
  }
  if (process.platform !== 'win32') {
    return spawn(file, [...args], { ...spawnOptions, shell: false })
  }
  return spawn(COMSPEC, ['/d', '/s', '/c', `"${cmdCommandLine([file, ...args])}"`], {
    ...spawnOptions,
    shell: false,
    windowsVerbatimArguments: true,
  })
}

/**
 * Argv re-invoking the CLI that launched this host process, so installs work
 * whether dsh runs from a global bin, a local install, or repo source
 * (`node --import tsx/esm .../bin.ts`). Falls back to a PATH `dsh`.
 */
export function dshArgv(): { file: string; args: string[]; cwd: string | undefined; viaShell: boolean } {
  const entry = process.argv[1]
  if (entry !== undefined && /[\\/](?:bin\.(?:js|ts)|dsh)$/.test(entry)) {
    // Absolute paths are required: source launches (`pnpm dsh`) pass a
    // relative entry, which the child resolves against its OWN cwd and dies
    // with MODULE_NOT_FOUND (#13). cwd near the entry keeps execArgv imports
    // (tsx/esm) resolvable on source launches.
    const abs = resolve(entry)
    return { file: nodeExecutable(), args: [...process.execArgv, abs], cwd: dirname(abs), viaShell: false }
  }
  // Bare `dsh` is a .cmd shim on Windows that only a shell can start (#13).
  return { file: 'dsh', args: [], cwd: undefined, viaShell: winCmdShim }
}

/** Outcome of one spawned plugin command. */
export interface InstallResult {
  exitCode: number | null
  timedOut: boolean
  stdout: string
  stderr: string
  /** True when the run ended because the user cancelled it. */
  cancelled: boolean
  /** Desktop's generation-wide package-operation gate rejected the start. */
  busy?: boolean
  /** Package names pnpm reported as having ignored build scripts (ndjson). */
  ignoredBuilds?: string[]
  /**
   * pnpm's OWN error message and code, from its structured ndjson stream
   * (#244).
   *
   * Without this the only thing a failure could report was the tail of
   * stderr — which for a market install is dsh's wrapper line, "pnpm failed
   * in profile directory …", identical for every possible cause. pnpm's
   * real error never went to stderr at all; it goes to the ndjson stdout
   * this already parses for progress, and was being thrown away on the way
   * out. Three separate reports (#244, #192, #138) are all "the UI shows a
   * stack tail and nothing else".
   */
  pnpmError?: string
  pnpmErrorCode?: string
}

/** The shape every orchestration function takes to run plugin commands (injectable in tests). */
export type PluginRunner = (profile: string, pluginArgs: string[]) => Promise<InstallResult>

/** Package-operation boundary consumed by the HTTP route layer. */
export interface PluginCommandRuntime {
  runPlugin: PluginRunner
  probePnpm(): Promise<boolean>
  provisionPnpm(): Promise<{ ok: boolean; hint?: string }>
  cancelActive(): boolean
  /** Whether this host can execute an immutable rollback add target. */
  supportsExactRollbackTarget?(target: string): boolean
}

/** One running package operation, however it was started. */
export interface DesktopPnpmHandleLike {
  readonly stdout: NodeJS.ReadableStream
  readonly stderr: NodeJS.ReadableStream
  readonly done: Promise<{
    readonly exitCode: number | null
    readonly signal: NodeJS.Signals | null
  }>
  cancel(): void
}

/**
 * Structural subset of DSH Desktop's public `desktopPnpm` contract.
 *
 * Anywhere Labs' DSH Desktop is ONE third-party client among several, and
 * this interface exists only for it. Nothing here is part of the official
 * DSH protocol — `desktopPnpm`, `installPlugin` and the install boundary
 * below appear nowhere in `@deepseek-ai/*`. Every other client the market
 * runs under, including other desktop apps, installs through the ordinary
 * `dsh plugin --profile <p> add` CLI, and so does the market itself when
 * none of these services are present.
 *
 * That is why every member past `runPlugin` is optional and reached by
 * feature detection. A host that does not publish one simply never enters
 * the branch, and the ordinary path it already used stays untouched — the
 * cost of accommodating one vendor must not be paid by the others, or by
 * the far larger number of people on plain `dsh web`.
 */
export interface DesktopPnpmLike {
  runPlugin(
    args: readonly string[],
    invokingDir: string,
    signal?: AbortSignal,
  ): DesktopPnpmHandleLike

  /**
   * Desktop 2.x refuses `add` through `runPlugin` — "plugin add must use the
   * recoverable install boundary" (#215, #219, #272) — and offers this
   * instead, which their launcher enables only for the selected market
   * provider. Same arguments, same handle, no recovery receipt and no
   * write-ahead log for the caller to reconcile.
   *
   * Optional because it is theirs: absent on every other host, including
   * the other third-party desktop client in #292, which installs perfectly
   * well through the ordinary CLI.
   *
   * Read from their published source rather than assumed: it accepts ONLY
   * `add` with exactly one target of the form `name@exact.version`
   * (`validateExternalMarketInstallArgs` in dsh-plugin-desktop/src/pnpm.ts).
   * A `github:owner/repo` target is rejected before any process starts, so
   * the 1085 catalog entries with no npm package — 57% of it — cannot be
   * installed on that host by any spelling this market could send. That is
   * a gap in their contract, not something to work around here.
   */
  runExternalMarketPluginInstall?(
    args: readonly string[],
    invokingDir: string,
    signal?: AbortSignal,
  ): DesktopPnpmHandleLike
}

/** An npm name with a fully pinned version — the only target their boundary takes. */
const EXACT_NPM_TARGET_RE = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*@\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/

/**
 * Rewrite an `add` argv into the shape Anywhere Labs' install boundary
 * accepts, or null when it cannot be expressed there.
 *
 * Their validator wants exactly one target of the form `name@1.2.3` — not a
 * bare name, not `@latest`, and not a `github:` source (read from
 * `validateExternalMarketInstallArgs`, dsh-plugin-desktop/src/pnpm.ts). The
 * market sends a bare name for a registry plugin and `dshmarket@latest` for
 * itself, so both need the version resolved before that boundary will take
 * them.
 *
 * Returning null is a normal outcome, not a failure: a github-sourced plugin
 * has no `name@version` spelling at all. The caller falls back to the
 * ordinary path, which on that host reports their own refusal — an accurate
 * message about their contract, rather than one this package invented.
 */
/**
 * Added to a refusal from a host whose install boundary only takes
 * `name@exact.version`. Their message is accurate and stays first; this says
 * which property of the plugin put it out of reach, because the user picked a
 * card and has no way to know the difference from the outside (#138).
 */
const NPM_ONLY_HOST_NOTE
  = '这个桌面客户端只能安装已发布到 npm 的插件，而该插件仅提供 GitHub 源，因此装不了——这是客户端的安装边界，不是插件或市场的问题。'
  + '可以改用普通 dsh web 安装，或请插件作者发布 npm 包。 / '
  + 'This desktop client can only install plugins published to npm, and this one is GitHub-only, so it cannot be installed here. '
  + 'That is the client\'s install boundary, not a fault in the plugin or the market. '
  + 'Install it from plain dsh web instead, or ask the author to publish to npm.'

async function exactNpmArgs(args: readonly string[]): Promise<string[] | null> {
  const targets = args.slice(1).filter(argument => !argument.startsWith('-'))
  const target = targets[0]
  if (targets.length !== 1 || target === undefined) return null
  if (EXACT_NPM_TARGET_RE.test(target)) return [...args]
  // A bare name, or one pinned to a dist-tag. Only a registry package can be
  // resolved; `github:owner/repo` and file paths stop here.
  const at = target.lastIndexOf('@')
  const name = at > 0 ? target.slice(0, at) : target
  if (!NPM_NAME_RE.test(name)) return null
  const version = await fetchNpmLatest(name)
  if (version === null) return null
  const rewritten = `${name}@${version}`
  if (!EXACT_NPM_TARGET_RE.test(rewritten)) return null
  logEvent('info', 'install', `desktop install boundary needs an exact version: ${target} -> ${rewritten}`)
  return args.map(argument => (argument === target ? rewritten : argument))
}

/** Desktop runtime also owns cleanup of any operation started by this fiber. */
export interface DesktopPluginRuntime extends PluginCommandRuntime {
  dispose(): Promise<void>
}

/**
 * Kill a spawned child and, on Windows, its whole process tree — `kill()`
 * there only terminates the wrapper, leaving pnpm children running.
 * (Contributed in #7 by @mraing.)
 */
export function killChild(child: ChildProcess): void {
  if (process.platform === 'win32' && child.pid !== undefined) {
    try {
      spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' })
      return
    } catch { /* fall through */ }
  }
  child.kill('SIGKILL')
}

/** The child of the operation currently running, for /dsh-market/cancel. */
let activeChild: ChildProcess | null = null
let cancelRequested = false

interface ActiveDesktopOperation {
  readonly owner: symbol
  readonly cancel: () => void
  readonly done: Promise<InstallResult>
  userCancelled: boolean
}

let activeDesktopOperation: ActiveDesktopOperation | null = null

/**
 * Kill a child and its whole tree, gracefully where the platform allows:
 * taskkill /T /F on Windows (plain kill() leaves pnpm children running),
 * SIGTERM with a 5s SIGKILL escalation elsewhere so pnpm can clean up.
 * (Cancel flow contributed in #6 by @qichuang321.)
 */
function killTree(child: ChildProcess): void {
  if (process.platform === 'win32' && child.pid !== undefined) {
    try {
      spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' })
      return
    } catch { /* fall through */ }
  }
  // POSIX: the dsh wrapper runs pnpm as a grandchild (spawnSync), which a
  // plain child.kill() leaves running — it keeps our stdio pipes open, so
  // the close event never fires and the market looks stuck "installing".
  // The child is spawned detached as its own process GROUP; kill the group.
  const signalTree = (signal: NodeJS.Signals): void => {
    if (child.pid === undefined) return
    try { process.kill(-child.pid, signal) } catch {
      try { child.kill(signal) } catch { /* already gone */ }
    }
  }
  signalTree('SIGTERM')
  const escalate = setTimeout(() => signalTree('SIGKILL'), 5000)
  escalate.unref?.()
}

/**
 * Cancel the plugin command currently running.
 * @returns true when there was one to cancel.
 */
export function cancelActive(): boolean {
  if (activeDesktopOperation !== null) {
    activeDesktopOperation.userCancelled = true
    progress.cancelling = true
    activeDesktopOperation.cancel()
    return true
  }
  if (activeChild === null) return false
  cancelRequested = true
  progress.cancelling = true
  killTree(activeChild)
  return true
}

/** Whether `pnpm` resolves on PATH; success is cached, absence is re-probed. */
let pnpmReady = false

/**
 * Why the last probe said no.
 *
 * `missing` and `failed` are different problems with different fixes, and
 * collapsing both into `false` made the market give one answer to both: it
 * told a user whose pnpm ran perfectly from their shell to go set PNPM_HOME
 * (#228). A binary that IS on the path and exits non-zero — a corepack shim
 * that cannot reach the network to fetch pnpm itself is the common one —
 * needs its own output shown, not a path to fix that is already right.
 */
let pnpmProbeFailure: { kind: 'missing' | 'failed'; output: string } | null = null

/** Why `pnpm --version` last failed, or null when it has not failed. */
export function lastPnpmProbeFailure(): { kind: 'missing' | 'failed'; output: string } | null {
  return pnpmProbeFailure
}

/** Probe `pnpm --version` on PATH. */
export function probePnpm(): Promise<boolean> {
  if (pnpmReady) return Promise.resolve(true)
  return new Promise((resolvePromise) => {
    // Piped, not ignored: the output of a pnpm that exists but will not run
    // IS the explanation, and throwing it away is what left #228 with a
    // failure nobody could act on.
    const child = spawnShim('pnpm', ['--version'], { stdio: ['ignore', 'pipe', 'pipe'], viaShell: winCmdShim, env: spawnEnv() })
    let output = ''
    const collect = (chunk: Buffer): void => { output = (output + chunk.toString()).slice(-2000) }
    child.stdout?.on('data', collect)
    child.stderr?.on('data', collect)
    child.on('error', (error) => {
      pnpmProbeFailure = { kind: 'missing', output: error.message }
      resolvePromise(false)
    })
    child.on('close', (code) => {
      pnpmReady = code === 0
      pnpmProbeFailure = pnpmReady ? null : { kind: 'failed', output: output.trim() }
      resolvePromise(pnpmReady)
    })
  })
}

function runQuiet(file: string, args: string[], timeoutMs: number): Promise<{ code: number | null; output: string }> {
  return new Promise((resolvePromise) => {
    const child = spawnShim(file, args, {
      env: spawnEnv(),
      stdio: ['ignore', 'pipe', 'pipe'],
      viaShell: winCmdShim,
    })
    let output = ''
    const timer = setTimeout(() => killChild(child), timeoutMs)
    const collect = (chunk: Buffer): void => { output = (output + chunk.toString()).slice(-8 * 1024) }
    child.stdout?.on('data', collect)
    child.stderr?.on('data', collect)
    child.on('error', (error) => { clearTimeout(timer); resolvePromise({ code: 127, output: error.message }) })
    child.on('close', (code) => { clearTimeout(timer); resolvePromise({ code, output }) })
  })
}

/**
 * Provision pnpm without user involvement: corepack (ships with Node) first,
 * a global npm install as fallback.
 * @returns true when `pnpm --version` succeeds afterwards.
 */
export async function provisionPnpm(): Promise<{ ok: boolean; hint?: string }> {
  const corepack = await runQuiet('corepack', ['enable', 'pnpm'], 60 * 1000)
  logEvent(corepack.code === 0 ? 'info' : 'warn', 'setup-pnpm', `corepack enable: exit=${String(corepack.code)} ${corepack.output.slice(-200)}`)
  if (await probePnpm()) return { ok: true }
  const npm = await runQuiet('npm', ['install', '-g', 'pnpm'], 3 * 60 * 1000)
  logEvent(npm.code === 0 ? 'info' : 'error', 'setup-pnpm', `npm -g: exit=${String(npm.code)} ${npm.output.slice(-200)}`)
  if (await probePnpm()) return { ok: true }
  // The install SUCCEEDED but the new binary is somewhere this process does
  // not look (#149: corepack exit=0, npm -g exit=0, and the market still
  // said "setup failed"). npm knows where it just put it, so ask — and if
  // pnpm runs from there, remember that directory for every later spawn
  // instead of telling the user a successful install failed.
  if (npm.code === 0 || corepack.code === 0) {
    const prefix = await runQuiet('npm', ['prefix', '-g'], 30 * 1000)
    const root = prefix.code === 0 ? prefix.output.trim().split('\n').pop() ?? '' : ''
    // `npm prefix -g` already is the executable directory on Windows
    // (`pnpm.cmd` lives directly under it). Unix keeps shims in `bin/`.
    const bin = root === '' ? '' : process.platform === 'win32' ? root : join(root, 'bin')
    if (bin !== '' && isAbsolute(bin) && !extraPathDirs.includes(bin)) {
      extraPathDirs.push(bin)
      logEvent('info', 'setup-pnpm', `added npm's global bin to the probe path: ${bin}`)
      if (await probePnpm()) return { ok: true }
      extraPathDirs.pop()
    }
  }
  const npmFound = toolOnPath('npm')
  if (!npmFound) logEvent('warn', 'setup-pnpm', `npm is not on any searched path (node lives in ${nodeBinDir})`)
  return { ok: false, hint: provisionHint(corepack.output, npm.output, npmFound, lastPnpmProbeFailure()) }
}

/** Executable suffixes a bare command name can carry on this platform. */
const EXECUTABLE_SUFFIXES = process.platform === 'win32'
  ? (process.env.PATHEXT ?? '.COM;.EXE;.BAT;.CMD').split(';').filter(part => part !== '')
  : ['']

/**
 * Whether a bare command name resolves to a file on the PATH the market
 * hands its children.
 *
 * The market cannot read the reason a spawn failed out of the child's
 * message: cmd.exe reports a missing command in the console's ANSI codepage
 * ("'npm' 不是内部或外部命令" on a Chinese Windows), which is neither the
 * string `ENOENT` nor even valid UTF-8 — so the #32 hint, written against
 * Node's own ENOENT wording, could never fire on Windows and the user was
 * left with no guidance at all (#167). Looking on disk answers the same
 * question in every locale.
 */
export function toolOnPath(name: string): boolean {
  const separator = process.platform === 'win32' ? ';' : ':'
  for (const dir of (spawnEnv().PATH ?? '').split(separator)) {
    if (dir === '') continue
    for (const suffix of EXECUTABLE_SUFFIXES) {
      if (existsSync(join(dir, name + suffix))) return true
    }
  }
  return false
}

/**
 * Why the one-click pnpm setup failed, in terms the user can act on.
 *
 * Every one of these was a real report where the market said only "自动准备
 * 没成功" while the log held the actual cause: EEXIST (#142 — corepack had
 * already placed a pnpm shim, so `npm -g` refused to overwrite it), EPERM
 * (#108 — Node installed somewhere the user cannot write), ENOENT (#32 —
 * a GUI launch with no Node on PATH at all).
 * @returns a bilingual, actionable hint, or undefined when unrecognized.
 */
export function provisionHint(
  corepackOutput: string,
  npmOutput: string,
  npmFound = true,
  probeFailure: { kind: 'missing' | 'failed'; output: string } | null = null,
): string | undefined {
  // Node itself unreachable: pointing the user back at this same button
  // would be a dead end (#32). `npmFound` answers this from disk, so it
  // holds on a Windows console that reports the same thing in a codepage we
  // cannot read (#167); the ENOENT match stays for callers without it.
  if (!npmFound || (/ENOENT/.test(corepackOutput) && /ENOENT/.test(npmOutput))) {
    // The searched list is spelled out because the previous wording named
    // only the Node directory, which was both incomplete and unhelpful: a
    // user who HAD installed pnpm could not tell whether we looked in the
    // right place (#292). And the restart note matters — the installer sets
    // PNPM_HOME for new sessions, so a dsh already running cannot see it.
    const searched = toolSearchDirs().join(process.platform === 'win32' ? ' ; ' : ' : ')
    return `这台机器的 dsh 进程找不到 npm/corepack（图形界面或桌面端启动时不继承终端 PATH）——多半是宿主内置的 Node 运行时不带 npm。已找过：${searched}。请改从终端启动 dsh，或单独装一个 pnpm：Windows 用 iwr https://get.pnpm.io/install.ps1 -useb | iex，macOS/Linux 用 brew install pnpm。装完后请重启 dsh——安装器只对新开的会话生效，正在运行的进程看不到它 / This dsh process cannot find npm/corepack (GUI and desktop launches skip your shell PATH); a bundled Node runtime without npm is the usual cause. Searched: ${searched}. Start dsh from a terminal, or install pnpm on its own: \`iwr https://get.pnpm.io/install.ps1 -useb | iex\` (Windows) or \`brew install pnpm\` (macOS/Linux). Restart dsh afterwards — the installer only affects new sessions, so an already-running process cannot see it`
  }
  if (/EEXIST|already exists|--force to overwrite/i.test(npmOutput)) {
    return 'pnpm 的可执行文件已存在（通常是 corepack 先放好了同名 shim），npm 拒绝覆盖。在终端里执行其一即可：corepack prepare pnpm@latest --activate（推荐，直接激活已有 shim）或 npm i -g pnpm --force / A pnpm executable already exists (usually a corepack shim), so npm refused to overwrite it. Run one of these in a terminal: `corepack prepare pnpm@latest --activate` (preferred — activates the shim already there) or `npm i -g pnpm --force`'
  }
  if (/EPERM|EACCES|permission denied|as root\/Administrator/i.test(`${corepackOutput}\n${npmOutput}`)) {
    return '没有权限写入 Node 的安装目录。请用管理员/sudo 执行一次 npm i -g pnpm，或改用无需写系统目录的安装方式：macOS/Linux 用 brew install pnpm，Windows 用 iwr https://get.pnpm.io/install.ps1 -useb | iex / No permission to write into the Node install directory. Run `npm i -g pnpm` once as Administrator/sudo, or install pnpm without touching system dirs: `brew install pnpm` (macOS/Linux) or `iwr https://get.pnpm.io/install.ps1 -useb | iex` (Windows)'
  }
  // Network-shaped failures: the corepack shim downloads pnpm on first run,
  // so a blocked registry or proxy leaves a shim that never works. The
  // button cannot fix that; a full install (or a mirror) can.
  if (/ETIMEDOUT|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|network|proxy|certificate/i.test(`${corepackOutput}\n${npmOutput}`)) {
    return '装 pnpm 时网络失败。若你在受限网络下，corepack 的 shim 也下载不到 pnpm 本体——请改用完整安装或指定镜像：brew install pnpm（macOS/Linux），或 npm i -g pnpm --registry <你的镜像> / Network failure while installing pnpm. On a restricted network the corepack shim cannot download pnpm either — install it fully or point at a mirror: `brew install pnpm`, or `npm i -g pnpm --registry <your mirror>`'
  }
  // Everything reported success and pnpm still will not run (#228 by
  // @ZhengXin1023: corepack exit=0, npm -g exit=0, npm found — and the
  // install button stayed locked with nothing said).
  //
  // This used to return undefined, which left the case that most needs an
  // explanation with none: the user is told "setup failed" while every step
  // they can see succeeded, and their complaint was exactly that — "又不告诉
  // 我怎么手动配置". Whatever the cause, the actionable question is the same
  // one, so ask it: where is pnpm, and is that anywhere this process looks?
  // pnpm IS on the path and exits non-zero. Telling this user to fix PNPM_HOME
  // would be advice for the opposite problem — theirs runs fine from a shell,
  // which is exactly what #228 reported. Its own output is the explanation.
  if (probeFailure?.kind === 'failed') {
    const detail = probeFailure.output === '' ? '' : `\n\n${probeFailure.output}`
    return `找到 pnpm 了，但运行 \`pnpm --version\` 失败——所以问题不在路径上，设 PNPM_HOME 没有用。最常见的原因是 corepack 的 shim 需要联网下载 pnpm 本体，而这台机器下不到。请在终端执行一次 \`pnpm --version\`：如果同样失败，按它的提示修（受限网络可用 \`brew install pnpm\` 或 \`npm i -g pnpm --registry <你的镜像>\` 装一个完整的 pnpm，绕开 shim）；如果在终端里正常，说明 dsh 进程的环境和你的终端不同，请从该终端启动 dsh。pnpm 的原始输出：${detail} / pnpm was found, but \`pnpm --version\` fails — so this is not a path problem and PNPM_HOME will not help. The usual cause is a corepack shim that has to download pnpm itself and cannot reach the network. Run \`pnpm --version\` in a terminal: if it fails the same way, follow what it says (on a restricted network install a real pnpm with \`brew install pnpm\` or \`npm i -g pnpm --registry <your mirror>\` to bypass the shim); if it works there, the dsh process has a different environment than your shell — start dsh from that terminal. pnpm's own output:${detail}`
  }
  const searched = toolSearchDirs().join(process.platform === 'win32' ? ' ; ' : ' : ')
  const locate = process.platform === 'win32' ? 'where pnpm' : 'which pnpm'
  return `pnpm 装好了，但这个 dsh 进程仍然启动不了它——安装步骤都成功，只是装到的位置不在它搜索的范围内。已找过：${searched}。请在终端执行 \`${locate}\` 看 pnpm 实际在哪：如果它不在上面这些目录里，把该目录设为 PNPM_HOME 后重启 dsh（\`export PNPM_HOME=<那个目录>\`），或者干脆从一个能直接运行 pnpm 的终端里启动 dsh。注意必须重启——正在运行的进程读不到新设的环境变量 / pnpm is installed but this dsh process still cannot start it: every step succeeded, the binary just landed somewhere this process does not look. Searched: ${searched}. Run \`${locate}\` in a terminal to see where pnpm actually is; if that directory is not in the list above, set PNPM_HOME to it and restart dsh (\`export PNPM_HOME=<that directory>\`), or simply start dsh from a terminal where \`pnpm\` already runs. The restart matters — a running process cannot see a newly set variable`
}

/** Live progress of the running plugin command, for the status route. */
export interface InstallProgress {
  active: boolean
  target: string
  startedAt: number
  lastLine: string
  /** Parsed from pnpm's ndjson stage events; null when none arrived. */
  phase: ProgressPhase
  /** Distinct packages resolved/fetched so far. */
  done: number
  total: number | null
  currentPackage: string | null
  downloaded: number | null
  size: number | null
  /** True when structured ndjson progress has been observed. */
  ndjson: boolean
  /** Last fatal error from the stream (only meaningful after a failure). */
  error: string | null
  /** True from the moment the user asks to cancel until the run ends. */
  cancelling: boolean
}

/** Singleton progress state; the status route reads it, runDshPlugin writes it. */
export const progress: InstallProgress = {
  active: false,
  target: '',
  startedAt: 0,
  lastLine: '',
  phase: null,
  done: 0,
  total: null,
  currentPackage: null,
  downloaded: null,
  size: null,
  ndjson: false,
  error: null,
  cancelling: false,
}

/** Identifies this host process; the client scopes its pending-restart flags to it. */
export const BOOT_ID = `${String(process.pid)}-${String(Date.now())}`

/**
 * Central allowlist for every spawn target, regardless of which route built
 * it (defense in depth on top of per-route validation — the win32 bare-dsh
 * fallback runs through a shell). Suggested in #16 by @anupamme.
 *
 * `^`, `~` and `=` are intentionally allowed: restore/install flows turn
 * manifest specs such as "dsh-better-sidebar": "^0.14.0" into targets like
 * `dsh-better-sidebar@^0.14.0`, and regex-valid semver ranges must not be
 * mistaken for shell injection (whitespace and shell metacharacters remain
 * rejected — the win32 bare-dsh fallback is the reason to keep them out).
 */
export const TARGET_RE = /^[A-Za-z0-9@:./_#+~^=-]+$/

/** Mutating pnpm commands get the structured reporter appended. */
const NDJSON_COMMANDS = new Set(['add', 'remove', 'install'])

/** Apply profile-specific pnpm compatibility and the structured reporter. */
function preparePluginArgs(profileDirectory: string, pluginArgs: readonly string[]): {
  args: string[]
  target: string
} | { error: string } {
  let args = pluginArgsFor(profileDirectory, [...pluginArgs])
  const target = args[args.length - 1] ?? ''
  if (!TARGET_RE.test(target)) {
    return { error: `unsafe plugin target rejected: ${JSON.stringify(target)}` }
  }
  if (NDJSON_COMMANDS.has(args[0])) args = [...args, '--reporter=ndjson']
  return { args, target }
}

/** Reset the singleton status snapshot before one operation starts. */
function beginProgress(target: string): ReturnType<typeof createProgressTracker> {
  progress.active = true
  progress.target = target
  progress.startedAt = Date.now()
  progress.lastLine = ''
  progress.phase = null
  progress.done = 0
  progress.total = null
  progress.currentPackage = null
  progress.downloaded = null
  progress.size = null
  progress.ndjson = false
  progress.error = null
  progress.cancelling = false
  return createProgressTracker()
}

/**
 * Line-buffered progress feed: pnpm's ndjson reporter emits one JSON object
 * per line on stdout, and chunk boundaries can split a line. Human fallback
 * lines (older pnpm without structured events) still update `lastLine`.
 */
function makeProgressFeeder(tracker: ReturnType<typeof createProgressTracker>): (chunk: string) => void {
  let lineBuffer = ''
  return (chunk: string): void => {
    lineBuffer += chunk
    let nl: number
    while ((nl = lineBuffer.indexOf('\n')) !== -1) {
      const line = lineBuffer.slice(0, nl)
      lineBuffer = lineBuffer.slice(nl + 1)
      const trimmed = line.trim()
      if (trimmed === '') continue
      tracker.feed(trimmed)
      // Human lines never start with '{'; JSON lines are consumed by the tracker.
      if (!trimmed.startsWith('{')) progress.lastLine = trimmed.slice(0, 200)
    }
  }
}

/** Run one `dsh plugin --profile <p> …` command with timeout and progress tracking. */
export function runDshPlugin(profile: string, pluginArgs: string[]): Promise<InstallResult> {
  const { file, args, cwd, viaShell } = dshArgv()
  if (viaShell && !isCmdSafeProfileName(profile)) {
    const error = `dsh-market: profile name ${JSON.stringify(profile)} cannot cross the Windows cmd.exe fallback safely; relaunch DSH through its Node entry point, or use a profile name containing only letters, numbers, spaces, dots, underscores, and hyphens`
    logEvent('error', 'install', error)
    return Promise.resolve({ exitCode: 1, timedOut: false, stdout: '', stderr: error, cancelled: false })
  }
  const prepared = preparePluginArgs(profileDir(profile), pluginArgs)
  if ('error' in prepared) {
    logEvent('error', 'install', prepared.error)
    return Promise.resolve({ exitCode: 1, timedOut: false, stdout: '', stderr: prepared.error, cancelled: false })
  }
  pluginArgs = prepared.args
  const tracker = beginProgress(prepared.target)
  const feed = makeProgressFeeder(tracker)
  return new Promise((resolvePromise) => {
    const child = spawnShim(file, [...args, 'plugin', '--profile', profile, ...pluginArgs], {
      cwd,
      // pnpm v10 blocks forever on a silent interactive prompt without a TTY
      // (observed on re-add over a pinned git spec); CI mode forces it to act
      // or fail instead of asking.
      env: spawnEnv(),
      stdio: ['ignore', 'pipe', 'pipe'],
      viaShell,
      // Own process group on POSIX so cancel/timeout can kill the whole
      // tree (dsh wrapper + pnpm grandchild) with one group signal.
      detached: process.platform !== 'win32',
    })
    activeChild = child
    cancelRequested = false
    let stdout = ''
    let stderr = ''
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      killTree(child)
    }, INSTALL_TIMEOUT_MS)
    child.stdout?.on('data', (chunk: Buffer) => {
      const text = chunk.toString()
      stdout = (stdout + text).slice(-256 * 1024)
      feed(text)
      syncProgress(tracker)
    })
    child.stderr?.on('data', (chunk: Buffer) => {
      const text = chunk.toString()
      stderr = (stderr + text).slice(-64 * 1024)
      feed(text)
      syncProgress(tracker)
    })
    child.on('error', (error) => {
      clearTimeout(timer)
      progress.active = false
      progress.cancelling = false
      if (activeChild === child) activeChild = null
      resolvePromise({ exitCode: 127, timedOut: false, stdout, stderr: `${stderr}\n${error.message}`, cancelled: false })
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      progress.active = false
      progress.cancelling = false
      if (activeChild === child) activeChild = null
      const failed = code !== 0 || timedOut
      if (failed) progress.error = tracker.snapshot.error
      const ignoredBuilds = tracker.snapshot.ignoredBuilds
      const { error: pnpmError, errorCode: pnpmErrorCode } = tracker.snapshot
      resolvePromise({
        exitCode: code,
        timedOut,
        stdout,
        stderr,
        cancelled: cancelRequested,
        ...(pnpmError !== null ? { pnpmError } : {}),
        ...(pnpmErrorCode !== null ? { pnpmErrorCode } : {}),
        ...(ignoredBuilds.length > 0 ? { ignoredBuilds } : {}),
      })
    })
  })
}

/**
 * Adapt DSH Desktop's generation-scoped package manager to the existing
 * market runner. There is no runtime import or dependency on Desktop: the
 * Host supplies this public service only when the package is mounted there.
 */
export function createDesktopPluginRuntime(
  service: DesktopPnpmLike,
  activeProfileDir: string,
  invokingDir = process.cwd(),
  timeoutMs = INSTALL_TIMEOUT_MS,
): DesktopPluginRuntime {
  if (!isAbsolute(activeProfileDir) || activeProfileDir.includes('\0')) {
    throw new Error('dsh-market: Desktop profile directory must be an absolute path without NUL')
  }
  if (!isAbsolute(invokingDir) || invokingDir.includes('\0')) {
    throw new Error('dsh-market: Desktop invoking directory must be an absolute path without NUL')
  }
  const owner = Symbol('dsh-market desktop runtime')
  let closed = false

  const runPlugin: PluginRunner = async (_profile, pluginArgs) => {
    if (closed) {
      return {
        exitCode: 127,
        timedOut: false,
        stdout: '',
        stderr: 'dsh-market: Desktop package runtime is disposed',
        cancelled: false,
      }
    }
    const prepared = preparePluginArgs(activeProfileDir, pluginArgs)
    if ('error' in prepared) {
      logEvent('error', 'install', prepared.error)
      return { exitCode: 1, timedOut: false, stdout: '', stderr: prepared.error, cancelled: false }
    }

    const abort = new AbortController()
    let handle: DesktopPnpmHandleLike
    /** Set when this host only installs npm packages and the target is not one. */
    let boundaryRefusesTarget = false
    try {
      // `add` goes through Anywhere Labs' install boundary when that host
      // publishes one, because their Desktop rejects `add` on `runPlugin`
      // outright. Feature-detected, never assumed: this method is theirs
      // alone, and on every other client — including the other desktop app
      // in #292 — the ordinary call below is what runs, unchanged.
      const boundary = prepared.args[0] === 'add' ? service.runExternalMarketPluginInstall : undefined
      const viaBoundary = boundary === undefined ? null : await exactNpmArgs(prepared.args)
      // A host that publishes the boundary accepts ONLY `name@exact.version`
      // through it, so a github-sourced plugin has nowhere to go: the
      // fallback below is a call that host refuses outright. Their refusal is
      // accurate but says nothing about why THIS plugin, and roughly half the
      // catalog has no npm package — reported in #138 after the user found
      // out by clicking Install and reading `exit 127`.
      boundaryRefusesTarget = boundary !== undefined && viaBoundary === null
      handle = boundary === undefined || viaBoundary === null
        ? service.runPlugin(prepared.args, invokingDir, abort.signal)
        : boundary.call(service, viaBoundary, invokingDir, abort.signal)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const busy = /another desktop pnpm operation is already running/i.test(message)
      return {
        exitCode: 127,
        timedOut: false,
        stdout: '',
        stderr: boundaryRefusesTarget ? `${message}\n${NPM_ONLY_HOST_NOTE}` : message,
        cancelled: false,
        ...(busy ? { busy: true } : {}),
      }
    }

    const tracker = beginProgress(prepared.target)
    const feed = makeProgressFeeder(tracker)
    let stdout = ''
    let stderr = ''
    let timedOut = false
    const collectStdout = (chunk: string | Buffer): void => {
      const text = chunk.toString()
      stdout = (stdout + text).slice(-256 * 1024)
      feed(text)
      syncProgress(tracker)
    }
    const collectStderr = (chunk: string | Buffer): void => {
      const text = chunk.toString()
      stderr = (stderr + text).slice(-64 * 1024)
      feed(text)
      syncProgress(tracker)
    }
    handle.stdout.on('data', collectStdout)
    handle.stderr.on('data', collectStderr)

    let active!: ActiveDesktopOperation
    let timer: NodeJS.Timeout | undefined
    const done = (async (): Promise<InstallResult> => {
      try {
        const outcome = await handle.done
        const failed = outcome.exitCode !== 0 || outcome.signal !== null || timedOut
        if (failed) progress.error = tracker.snapshot.error
        const ignoredBuilds = tracker.snapshot.ignoredBuilds
        const { error: pnpmError, errorCode: pnpmErrorCode } = tracker.snapshot
        return {
          exitCode: outcome.exitCode,
          timedOut,
          stdout,
          stderr,
          cancelled: active.userCancelled,
          ...(ignoredBuilds.length > 0 ? { ignoredBuilds } : {}),
          ...(pnpmError !== null ? { pnpmError } : {}),
          ...(pnpmErrorCode !== null ? { pnpmErrorCode } : {}),
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        progress.error = tracker.snapshot.error
        const detail = `${stderr}${stderr === '' ? '' : '\n'}${message}`
        return {
          exitCode: 127,
          timedOut,
          stdout,
          stderr: boundaryRefusesTarget ? `${detail}\n${NPM_ONLY_HOST_NOTE}` : detail,
          cancelled: active.userCancelled,
        }
      } finally {
        if (timer !== undefined) clearTimeout(timer)
        progress.active = false
        progress.cancelling = false
        handle.stdout.off('data', collectStdout)
        handle.stderr.off('data', collectStderr)
        if (activeDesktopOperation === active) activeDesktopOperation = null
      }
    })()
    active = { owner, cancel: () => { handle.cancel() }, done, userCancelled: false }
    activeDesktopOperation = active
    timer = setTimeout(() => {
      timedOut = true
      abort.abort(new Error('dsh-market: Desktop package operation timed out'))
      // The public handle owns an explicit process-tree cancellation path.
      // Use it as well as AbortSignal so a structurally compatible provider
      // that does not observe the signal cannot strand the route or teardown.
      handle.cancel()
    }, timeoutMs)
    timer.unref?.()
    return done
  }

  const cancelOwned = (userCancelled: boolean): boolean => {
    const active = activeDesktopOperation
    if (active?.owner !== owner) return false
    if (userCancelled) active.userCancelled = true
    progress.cancelling = true
    active.cancel()
    return true
  }

  return {
    runPlugin,
    // Anywhere Labs' optional external boundary accepts exact npm targets
    // only. Every Desktop host without that boundary retains the ordinary
    // CLI grammar, including immutable Git and archive targets.
    supportsExactRollbackTarget: target => TARGET_RE.test(target)
      && (service.runExternalMarketPluginInstall === undefined || EXACT_NPM_TARGET_RE.test(target)),
    // The service is backed by Desktop's packaged pnpm; system discovery and
    // global provisioning are neither needed nor allowed in this mode.
    probePnpm: () => Promise.resolve(true),
    provisionPnpm: () => Promise.resolve({ ok: true }),
    cancelActive: () => cancelOwned(true),
    dispose: async () => {
      closed = true
      const active = activeDesktopOperation
      if (active?.owner !== owner) return
      cancelOwned(false)
      await active.done.catch(() => {})
    },
  }
}

/** Copy the tracker's snapshot into the singleton the status route reads. */
function syncProgress(tracker: ReturnType<typeof createProgressTracker>): void {
  const snap = tracker.snapshot
  progress.phase = snap.phase
  progress.done = snap.done
  progress.total = snap.total
  progress.currentPackage = snap.currentPackage
  progress.downloaded = snap.downloaded
  progress.size = snap.size
  progress.ndjson = snap.seen
  if (snap.error !== null) progress.error = snap.error
}
