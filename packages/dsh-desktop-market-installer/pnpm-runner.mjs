/**
 * The pnpm entry every profile package operation goes through — DSH Desktop's
 * own installer and the community market alike, because both reach pnpm by
 * name and the packaged shim in `.desktop-bin` points here.
 *
 * Windows cannot replace a directory while something holds a handle inside it,
 * and pnpm finishes each package by renaming `<pkg>_tmp_<pid>_<n>` onto
 * `<pkg>`. With Harness running — it has the profile's modules loaded, and the
 * platform's own scanners open files behind everyone's back — that final
 * rename fails:
 *
 *   EPERM: operation not permitted, rename '…\argparse_tmp_19856_4' -> '…\argparse'
 *
 * Generation projection paths are removed from pnpm's manifest view before
 * this recovery is considered, so only shared-tree packages can reach the
 * replacement path below.
 *
 * Two recoveries, in order of how little they disturb: retry once (a scanner's
 * handle is gone within a second), then move the blocked target aside and
 * retry (a rename of the directory itself succeeds where replacing its
 * contents does not, and pnpm recreates the package under the free name). The
 * leftovers are swept before Harness next starts, when nothing holds them.
 *
 * Anything unrecognized is passed straight through: same exit code, same
 * output, one pnpm run.
 */
import { spawn } from 'node:child_process'
import { existsSync, watch } from 'node:fs'
import { readFile, readdir, rename, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const SIDELINE_MARKER = '.dsh-old-'
export const RETRY_DELAY_MS = 750
/**
 * How long a run may show no sign of life — no output, no change under the
 * profile — before this runner stops it. Generous on purpose: pnpm without a
 * TTY says nothing for long stretches, and packages download into a store that
 * lives outside the profile, so a quiet minute is ordinary. Five is not, and
 * failing there still beats the hosts' fifteen-minute ceiling, which is what
 * makes a wedged install feel like a hang.
 */
export const IDLE_TIMEOUT_MS = Number(process.env.DSH_DESKTOP_PNPM_IDLE_TIMEOUT_MS) || 300_000
/** How long a killed run may take to actually go away before it is written off. */
export const KILL_GRACE_MS = 5_000
/**
 * How long a run gets to exit on its own after it has already reported the
 * failure that decides it. pnpm raises the locked rename inside a worker and
 * has been seen never to unwind from it, so the outcome is known long before
 * the process admits it — waiting out the idle allowance there is pure delay.
 */
export const STALL_AFTER_FAILURE_MS =
  Number(process.env.DSH_DESKTOP_PNPM_FAILURE_STALL_MS) || 20_000
/** Prefix of every line this runner contributes to a package operation's output. */
export const MARKER = 'dsh-desktop pnpm runner:'

function errorText(error) {
  return error instanceof Error ? error.message : String(error)
}

/**
 * The destination pnpm could not claim, or undefined when the failure is not a
 * locked rename inside a profile's node_modules. Only a path under
 * node_modules qualifies: a rename failure anywhere else is not ours to
 * rearrange.
 * @param {string} output - the failed run's combined stdout and stderr.
 * @returns {string | undefined} the blocked destination path.
 */
export function lockedRenameTarget(output) {
  const failure =
    /(?:EPERM|EBUSY|EACCES|ENOTEMPTY|EEXIST)[^\n]*?rename[^\n]*?->\s*'([^']+)'/u.exec(output)
  if (failure === null) return undefined
  const target = failure[1]
  const inModules = target.split(/[\\/]/u).includes('node_modules')
  return inModules ? target : undefined
}

/**
 * Where a blocked directory is moved so pnpm can claim the name it wants: the
 * same path under a suffixed name, which keeps it a sibling without parsing
 * separators the host may not own. The marker is what the pre-launch sweep
 * looks for.
 * @param {string} target - the blocked destination path.
 * @param {number} now - timestamp making the name unique across attempts.
 * @returns {string} the sideline path.
 */
export function sidelinePath(target, now = Date.now()) {
  return `${target}${SIDELINE_MARKER}${now}`
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

const PROJECTION_VERSION = 1
const PACKAGE_NAME_PATTERN = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/iu
const GIT_PREPARE_KEY_PATTERN = /^(?<name>(?:@[A-Za-z0-9-~][A-Za-z0-9._~-]*\/)?[A-Za-z0-9-~][A-Za-z0-9._~-]*)@git\+ssh:\/\/git@github\.com\/(?<owner>[A-Za-z0-9_.-]+)\/(?<repo>[A-Za-z0-9_.-]+)\.git#(?<sha>[0-9a-f]{40})(?<subpath>&path:\/(?:(?!\.\.?\/)[A-Za-z0-9_.-]+\/)*(?!\.\.?$)[A-Za-z0-9_.-]+)?$/u
const ALLOW_BUILDS_BLOCK_PATTERN = /allowBuilds:[ \t]*\r?\n((?:[ \t]+[^\r\n]*\r?\n?)*)/gu

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

async function writeJsonAtomically(path, value) {
  const temporary = `${path}.${process.pid}.${Date.now()}.pnpm-projection.tmp`
  try {
    await writeFile(temporary, `${JSON.stringify(value, undefined, 2)}\n`, 'utf8')
    await rename(temporary, path)
  } finally {
    await rm(temporary, { force: true }).catch(() => undefined)
  }
}

async function writeTextAtomically(path, value) {
  const temporary = `${path}.${process.pid}.${Date.now()}.pnpm-policy.tmp`
  try {
    await writeFile(temporary, value, 'utf8')
    await rename(temporary, path)
  } finally {
    await rm(temporary, { force: true }).catch(() => undefined)
  }
}

function buildApprovalValues(workspaceYaml) {
  const values = new Map()
  for (const block of workspaceYaml.matchAll(ALLOW_BUILDS_BLOCK_PATTERN)) {
    for (const line of block[1].split(/\r?\n/u)) {
      const match = /^[ \t]+(\S.*?)\s*:\s*(true|false)\s*$/u.exec(line)
      if (match === null) continue
      let key = match[1]
      if (
        key.length >= 2 &&
        ((key.startsWith("'") && key.endsWith("'")) ||
          (key.startsWith('"') && key.endsWith('"')))
      ) {
        key = key.slice(1, -1)
      }
      values.set(key, match[2] === 'true')
    }
  }
  return values
}

/** The exact git resolution id pnpm 10 names in its own prepare rejection. */
export function gitPrepareApprovalKey(output) {
  if (!output.includes('ERR_PNPM_GIT_DEP_PREPARE_NOT_ALLOWED')) return undefined
  const hint = /onlyBuiltDependencies:[ \t]*\r?\n[ \t]*-[ \t]*["']([^"'\r\n]+)["']/u.exec(output)
  if (hint === null || !GIT_PREPARE_KEY_PATTERN.test(hint[1])) return undefined
  return hint[1]
}

/**
 * Add pnpm's commit/subpath-specific key only when dsh-market has already
 * recorded an approval for the same package and GitHub repository. This turns
 * the user's existing decision into the spelling bundled pnpm 10 consumes;
 * it never broadens an approval to another source.
 */
export function mergeApprovedGitPrepareKey(workspaceYaml, output) {
  const exact = gitPrepareApprovalKey(output)
  if (exact === undefined) return { workspaceYaml, key: undefined }
  const parsed = GIT_PREPARE_KEY_PATTERN.exec(exact)
  if (parsed?.groups === undefined) return { workspaceYaml, key: undefined }
  const { name, owner, repo, sha } = parsed.groups
  const values = buildApprovalValues(workspaceYaml)
  if (values.get(exact) === false) return { workspaceYaml, key: undefined }
  if (values.get(exact) === true) return { workspaceYaml, key: exact }
  const stable = `${name}@git+https://github.com/${owner}/${repo}.git`
  const codeload = `${name}@https://codeload.github.com/${owner}/${repo}/tar.gz/${sha}`
  if (values.get(stable) !== true && values.get(codeload) !== true) {
    return { workspaceYaml, key: undefined }
  }

  const block = ALLOW_BUILDS_BLOCK_PATTERN.exec(workspaceYaml)
  ALLOW_BUILDS_BLOCK_PATTERN.lastIndex = 0
  if (block === null || block.index === undefined) return { workspaceYaml, key: undefined }
  const eol = workspaceYaml.includes('\r\n') ? '\r\n' : '\n'
  const insertion = `${block[0].endsWith('\n') ? '' : eol}  ${JSON.stringify(exact)}: true${eol}`
  const end = block.index + block[0].length
  return {
    workspaceYaml: `${workspaceYaml.slice(0, end)}${insertion}${workspaceYaml.slice(end)}`,
    key: exact
  }
}

async function approveGitPrepareRetry(profileDirectory, output) {
  const workspacePath = join(profileDirectory, 'pnpm-workspace.yaml')
  let workspaceYaml
  try {
    workspaceYaml = await readFile(workspacePath, 'utf8')
  } catch (error) {
    if (error?.code === 'ENOENT') return undefined
    throw error
  }
  const merged = mergeApprovedGitPrepareKey(workspaceYaml, output)
  if (merged.key === undefined) return undefined
  if (merged.workspaceYaml !== workspaceYaml) {
    await writeTextAtomically(workspacePath, merged.workspaceYaml)
  }
  return merged.key
}

/**
 * Keep generation-owned Profile entries outside pnpm's mutable dependency set.
 *
 * The persistent manifest exposes installed versions to dsh-market, but the
 * package roots themselves are junctions owned by the cold-start projector.
 * Letting pnpm see the same names gives two writers one node_modules path and
 * makes pnpm attempt `<plugin>_tmp_* -> <plugin>` while Harness is live.
 *
 * The ownership marker survives the temporary manifest so a crash is safe:
 * cold start can always derive the visible fields again from desired.json.
 */
export async function suspendGenerationProjectionForPnpm(profileDirectory) {
  const manifestPath = join(profileDirectory, 'package.json')
  let text
  try {
    text = await readFile(manifestPath, 'utf8')
  } catch (error) {
    if (error?.code === 'ENOENT') return { plugins: [], restore: async () => undefined }
    throw error
  }

  let manifest
  try {
    manifest = JSON.parse(text)
  } catch (error) {
    throw new Error(`Profile manifest is invalid before pnpm projection isolation: ${errorText(error)}`)
  }
  if (!isRecord(manifest)) {
    throw new Error('Profile manifest root is invalid before pnpm projection isolation.')
  }

  const projection = manifest.dsh?.desktop?.generationProjection
  const projectedPlugins = projection?.version === PROJECTION_VERSION && isRecord(projection.plugins)
    ? Object.keys(projection.plugins).filter((name) => PACKAGE_NAME_PATTERN.test(name))
    : []
  if (projectedPlugins.length === 0) {
    return { plugins: [], restore: async () => undefined }
  }

  const dependencies = manifest.dependencies === undefined ? {} : manifest.dependencies
  const pnpm = manifest.pnpm === undefined ? {} : manifest.pnpm
  const overrides = pnpm.overrides === undefined ? {} : pnpm.overrides
  if (!isRecord(dependencies) || !isRecord(pnpm) || !isRecord(overrides)) {
    throw new Error('Profile dependency fields are invalid before pnpm projection isolation.')
  }

  const owned = new Map(projectedPlugins.map((name) => [name, {
    dependency: Object.hasOwn(dependencies, name)
      ? { present: true, value: dependencies[name] }
      : { present: false },
    override: Object.hasOwn(overrides, name)
      ? { present: true, value: overrides[name] }
      : { present: false }
  }]))
  let changed = false
  for (const name of projectedPlugins) {
    if (Object.hasOwn(dependencies, name)) {
      delete dependencies[name]
      changed = true
    }
    if (Object.hasOwn(overrides, name)) {
      delete overrides[name]
      changed = true
    }
  }
  if (!changed) return { plugins: [], restore: async () => undefined }

  manifest.dependencies = dependencies
  if (Object.keys(overrides).length > 0) pnpm.overrides = overrides
  else delete pnpm.overrides
  if (Object.keys(pnpm).length > 0) manifest.pnpm = pnpm
  else delete manifest.pnpm
  await writeJsonAtomically(manifestPath, manifest)

  let restored = false
  return {
    plugins: projectedPlugins,
    restore: async () => {
      if (restored) return
      const currentText = await readFile(manifestPath, 'utf8')
      let current
      try {
        current = JSON.parse(currentText)
      } catch (error) {
        throw new Error(`Profile manifest is invalid after pnpm projection isolation: ${errorText(error)}`)
      }
      if (!isRecord(current)) {
        throw new Error('Profile manifest root is invalid after pnpm projection isolation.')
      }
      const currentDependencies = isRecord(current.dependencies) ? current.dependencies : {}
      const currentPnpm = isRecord(current.pnpm) ? current.pnpm : {}
      const currentOverrides = isRecord(currentPnpm.overrides) ? currentPnpm.overrides : {}
      for (const [name, state] of owned) {
        if (state.dependency.present) currentDependencies[name] = state.dependency.value
        else delete currentDependencies[name]
        if (state.override.present) currentOverrides[name] = state.override.value
        else delete currentOverrides[name]
      }
      current.dependencies = currentDependencies
      if (Object.keys(currentOverrides).length > 0) currentPnpm.overrides = currentOverrides
      else delete currentPnpm.overrides
      if (Object.keys(currentPnpm).length > 0) current.pnpm = currentPnpm
      else delete current.pnpm
      await writeJsonAtomically(manifestPath, current)
      restored = true
    }
  }
}

/**
 * Run pnpm once, mirroring its streams to this process while keeping a copy
 * for failure classification.
 *
 * A run that has stopped doing anything is stopped rather than waited out —
 * the hosts above only bound the whole operation at fifteen minutes, which is
 * what makes a wedged install look like a hang. But silence alone does not
 * mean stuck: without a TTY pnpm drops its progress display, and resolution,
 * a cold download or a large link phase can pass without a single line. What
 * a live run cannot do is leave the profile untouched, so the store and the
 * profile's node_modules count as much as output does.
 */
function runPnpm(executable, args, options = {}) {
  const {
    spawnProcess = spawn,
    idleTimeoutMs = IDLE_TIMEOUT_MS,
    killGraceMs = KILL_GRACE_MS,
    stallAfterFailureMs = STALL_AFTER_FAILURE_MS,
    kill = killTree,
    watchActivity = watchProfileActivity,
    report = () => undefined
  } = options

  return new Promise((resolve, reject) => {
    const child = spawnProcess(executable, args, {
      stdio: ['inherit', 'pipe', 'pipe'],
      windowsHide: true,
      env: options.environment ?? process.env
    })
    let output = ''
    let idle
    let grace
    let stopped = false
    let settled = false
    let doomed = false
    let lastActivity = Date.now()
    const touch = () => {
      lastActivity = Date.now()
    }
    const stopWatching = idleTimeoutMs > 0 ? watchActivity(touch) : undefined

    const finish = (result) => {
      if (settled) return
      settled = true
      clearTimeout(idle)
      clearTimeout(grace)
      stopWatching?.()
      resolve({ ...result, output, idleTimedOut: stopped })
    }
    const heartbeat = () => {
      clearTimeout(idle)
      if (idleTimeoutMs <= 0) return
      const quietFor = Date.now() - lastActivity
      // Work seen since the last check keeps the run: a quiet pnpm that is
      // still writing packages is slow, not stuck.
      idle = setTimeout(() => {
        const silence = Date.now() - lastActivity
        if (silence < idleTimeoutMs) {
          heartbeat()
          return
        }
        stopped = true
        report(
          `pnpm produced no output and touched nothing for ${Math.round(
            silence / 1000
          )}s; stopping it`
        )
        kill(child)
        // A kill that does not land must not become the hang this guards
        // against, so the run is written off either way.
        grace = setTimeout(() => finish({ code: 1, signal: null }), killGraceMs)
        grace.unref?.()
      }, Math.max(idleTimeoutMs - quietFor, 1_000))
      idle.unref?.()
    }
    const stopWhenDoomed = () => {
      if (doomed || lockedRenameTarget(output) === undefined) return
      doomed = true
      report(
        `pnpm reported a blocked rename; giving it ${Math.round(
          stallAfterFailureMs / 1000
        )}s to exit before stopping it`
      )
      const stall = setTimeout(() => {
        if (settled) return
        stopped = true
        kill(child)
        grace = setTimeout(() => finish({ code: 1, signal: null }), killGraceMs)
        grace.unref?.()
      }, stallAfterFailureMs)
      stall.unref?.()
    }
    const observe = (chunk, stream) => {
      output = `${output}${chunk}`.slice(-256 * 1024)
      stream.write(chunk)
      touch()
      // pnpm can raise the locked rename in a worker and then never unwind.
      // The outcome is already decided, so the run is not owed the full idle
      // allowance from here.
      stopWhenDoomed()
    }

    child.stdout.on('data', (chunk) => observe(chunk, process.stdout))
    child.stderr.on('data', (chunk) => observe(chunk, process.stderr))
    child.once('error', (error) => {
      clearTimeout(idle)
      clearTimeout(grace)
      stopWatching?.()
      if (!settled) {
        settled = true
        reject(error)
      }
    })
    child.once('exit', (code, signal) => finish({ code: stopped ? 1 : code, signal }))
    heartbeat()
  })
}

/**
 * Signal progress whenever the profile's package directories change. pnpm runs
 * with the profile as its working directory, so that is where a live install
 * shows up even while it says nothing.
 * @param onActivity - called on any change; may fire often, so it stays cheap.
 * @returns a function that stops watching.
 */
function watchProfileActivity(onActivity, cwd = process.cwd()) {
  const watchers = []
  for (const directory of [cwd, join(cwd, 'node_modules'), join(cwd, 'node_modules', '.pnpm')]) {
    try {
      if (!existsSync(directory)) continue
      const watcher = watch(directory, { persistent: false }, onActivity)
      watcher.on('error', () => undefined)
      watchers.push(watcher)
    } catch {
      // An unwatchable directory just does not contribute liveness.
    }
  }
  return () => {
    for (const watcher of watchers) watcher.close()
  }
}

/**
 * Stop a pnpm run and everything it started. On Windows `kill` reaches only
 * the wrapper, so the tree goes through taskkill — but never *instead of* the
 * direct kill: a taskkill that does not land would leave this runner waiting
 * on an exit that never comes, which is the hang it exists to prevent.
 */
function killTree(child) {
  if (process.platform === 'win32' && child.pid !== undefined) {
    try {
      spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], {
        stdio: 'ignore',
        windowsHide: true
      })
    } catch {
      // The direct kill below is the guarantee.
    }
  }
  child.kill('SIGKILL')
}

/**
 * Run pnpm, recovering from a Windows locked rename. Returns the exit code of
 * the run that decided the outcome.
 */
async function runWithLockRecoveryUnisolated(executable, args, options = {}) {
  const {
    spawnProcess = spawn,
    moveAside = rename,
    exists = existsSync,
    listEntries = readEntries,
    // pnpm runs with the profile as its working directory, so that is where
    // the staging left by a failed run is found.
    profileDirectory = process.cwd(),
    wait = delay,
    now = Date.now,
    retryDelayMs = RETRY_DELAY_MS,
    idleTimeoutMs = IDLE_TIMEOUT_MS,
    killGraceMs = KILL_GRACE_MS,
    stallAfterFailureMs = STALL_AFTER_FAILURE_MS,
    kill = killTree,
    watchActivity = watchProfileActivity,
    // Every step announces itself on the same stream pnpm's own diagnostics
    // travel, because the market reports that stream verbatim: a report
    // without these lines is a report from a pnpm this runner never wrapped.
    report = (message) => process.stderr.write(`${MARKER} ${message}\n`)
  } = options

  let runEnvironment = options.environment ?? process.env
  const run = () =>
    runPnpm(executable, args, {
      spawnProcess,
      environment: runEnvironment,
      idleTimeoutMs,
      killGraceMs,
      stallAfterFailureMs,
      kill,
      watchActivity,
      report
    })

  let first = await run()
  if (first.code !== 0) {
    try {
      const key = await approveGitPrepareRetry(profileDirectory, first.output)
      if (key !== undefined) {
        report(`mapped the approved Git build to pnpm's pinned key; retrying ${key}`)
        runEnvironment = {
          ...runEnvironment,
          npm_config_pm_on_fail: 'ignore',
          PNPM_CONFIG_PM_ON_FAIL: 'ignore'
        }
        first = await run()
      }
    } catch (error) {
      report(`could not map the approved Git build (${errorText(error)})`)
    }
  }
  const blocked = first.code === 0 ? undefined : lockedRenameTarget(first.output)
  // Whether the run exited on its own or had to be stopped says nothing about
  // whether the blocked rename can be recovered — and a run that names its
  // blocker before hanging is exactly the one this recovery is for. Only a
  // failure with no diagnosis is left alone: retrying that is three times the
  // wait for the same answer.
  if (blocked === undefined) return first

  report(`${blocked} could not be replaced; retrying in ${retryDelayMs}ms (2 of 3)`)
  await wait(retryDelayMs)
  const second = await run()
  const named = second.code === 0 ? undefined : lockedRenameTarget(second.output)
  if (named === undefined) {
    if (second.code === 0) report('the retry succeeded')
    return second
  }

  // pnpm names one blocked destination per run — the first its workers hit —
  // but an update blocks on every package it has to replace. Freeing only the
  // named one buys a single package per attempt, so an update that replaces
  // four of them can never finish inside three. Every destination pnpm staged
  // for is already on disk next to its `<pkg>_tmp_<pid>_<n>`, so the whole set
  // is knowable from one failure, and the whole set is what gets freed here.
  const targets = await blockedTargets(named, profileDirectory, { listEntries, exists })
  const freed = []
  for (const target of targets) {
    const sideline = sidelinePath(target, now())
    try {
      await moveAside(target, sideline)
      freed.push(target)
    } catch (error) {
      // The directory itself is held too — nothing left to try for this one,
      // and the run's own diagnostics are already on stderr.
      report(`${target} could not be moved aside (${errorText(error)})`)
    }
  }

  if (freed.length === 0) {
    report(`nothing could be freed; leaving pnpm's own diagnosis in place`)
    return second
  }
  report(
    `freed ${freed.length} blocked ${
      freed.length === 1 ? 'destination' : 'destinations'
    } (${freed.join(', ')}); installing over them (3 of 3)`
  )
  const third = await run()
  report(third.code === 0 ? 'the install succeeded' : 'the install failed again')
  return third
}

/**
 * Run pnpm with generation projection names removed from its manifest view,
 * then restore the market-facing fields regardless of pnpm's outcome.
 */
export async function runWithLockRecovery(executable, args, options = {}) {
  const profileDirectory = options.profileDirectory ?? process.cwd()
  const isolateProjection = options.isolateProjection ?? suspendGenerationProjectionForPnpm
  const report = options.report ?? ((message) => process.stderr.write(`${MARKER} ${message}\n`))
  const isolation = await isolateProjection(profileDirectory)
  if (isolation.plugins.length > 0) {
    report(`excluded ${isolation.plugins.length} generation projection(s) from pnpm`)
  }
  try {
    return await runWithLockRecoveryUnisolated(executable, args, options)
  } finally {
    await isolation.restore()
    if (isolation.plugins.length > 0) {
      report(`restored ${isolation.plugins.length} generation projection(s) after pnpm`)
    }
  }
}

/** The `<pkg>_tmp_<pid>_<n>` staging name pnpm leaves beside its destination. */
const STAGING_PATTERN = /^(?<packageName>.+)_tmp_\d+_\d+$/u

/**
 * Every destination the failed run still has staging for, plus the one pnpm
 * named. A staging directory sits beside the destination it was built for, so
 * stripping the suffix names that destination without parsing pnpm's output
 * twice — and it finds the ones pnpm never got far enough to report.
 *
 * Nested node_modules are walked because a replaced dependency of a dependency
 * stages there, not at the top level.
 * @param named - the destination pnpm reported, always included when present.
 * @param root - the profile directory pnpm ran in.
 * @returns absolute destination paths, deduplicated, each one present on disk.
 */
export async function blockedTargets(named, root, options = {}) {
  const { listEntries = readEntries, exists = existsSync } = options
  const found = new Set()

  const walk = async (directory) => {
    for (const entry of await listEntries(directory)) {
      if (!entry.isDirectory() || entry.isSymbolicLink()) continue
      const path = join(directory, entry.name)
      const staged = STAGING_PATTERN.exec(entry.name)
      if (staged !== null) {
        found.add(join(directory, staged.groups.packageName))
        continue
      }
      await walk(entry.name.startsWith('@') ? path : join(path, 'node_modules'))
    }
  }
  await walk(join(root, 'node_modules'))

  // pnpm's own diagnosis leads, because it names what actually blocked the run.
  const ordered = [named, ...found].filter((path) => path !== undefined)
  return [...new Set(ordered)].filter((path) => exists(path))
}

async function readEntries(directory) {
  try {
    return await readdir(directory, { withFileTypes: true })
  } catch {
    return []
  }
}

/* v8 ignore start -- the process wrapper around the tested runner */
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [pnpmEntry, ...pnpmArguments] = process.argv.slice(2)
  if (pnpmEntry === undefined) {
    process.stderr.write('dsh-desktop: the pnpm runner needs the pnpm entry path.\n')
    process.exitCode = 1
  } else {
    const executable = process.execPath
    const result = await runWithLockRecovery(executable, [pnpmEntry, ...pnpmArguments])
    if (result.signal) {
      process.stderr.write(`dsh-desktop: pnpm terminated with ${result.signal}.\n`)
      process.exitCode = 1
    } else {
      process.exitCode = result.code ?? 1
    }
  }
}
/* v8 ignore stop */

export const RUNNER_PATH = fileURLToPath(import.meta.url)
