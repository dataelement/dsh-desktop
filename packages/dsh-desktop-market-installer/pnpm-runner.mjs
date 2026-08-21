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
import { readdir, rename } from 'node:fs/promises'
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
      windowsHide: true
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
export async function runWithLockRecovery(executable, args, options = {}) {
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

  const run = () =>
    runPnpm(executable, args, {
      spawnProcess,
      idleTimeoutMs,
      killGraceMs,
      stallAfterFailureMs,
      kill,
      watchActivity,
      report
    })

  const first = await run()
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
