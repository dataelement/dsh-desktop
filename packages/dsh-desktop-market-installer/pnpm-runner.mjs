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
import { existsSync } from 'node:fs'
import { rename } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const SIDELINE_MARKER = '.dsh-old-'
export const RETRY_DELAY_MS = 750
/**
 * How long pnpm may stay silent before this runner stops it. pnpm narrates
 * resolution, fetching and linking as it goes, so silence this long is a stuck
 * run, not a slow one — and failing here beats the hosts' fifteen-minute
 * ceiling, which is what makes a failed install feel like a hang.
 */
export const IDLE_TIMEOUT_MS = Number(process.env.DSH_DESKTOP_PNPM_IDLE_TIMEOUT_MS) || 120_000
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
 * A run that stops saying anything is stopped rather than waited out: pnpm
 * narrates its progress line by line, so silence is not slow work, and the
 * hosts above only bound the whole operation at fifteen minutes — long enough
 * for a wedged install to look like a hang to the person watching.
 */
function runPnpm(executable, args, options = {}) {
  const {
    spawnProcess = spawn,
    idleTimeoutMs = IDLE_TIMEOUT_MS,
    report = () => undefined
  } = options

  return new Promise((resolve, reject) => {
    const child = spawnProcess(executable, args, {
      stdio: ['inherit', 'pipe', 'pipe'],
      windowsHide: true
    })
    let output = ''
    let idle
    let stopped = false

    const finish = (result) => {
      clearTimeout(idle)
      resolve({ ...result, output, idleTimedOut: stopped })
    }
    const heartbeat = () => {
      clearTimeout(idle)
      if (idleTimeoutMs <= 0) return
      idle = setTimeout(() => {
        stopped = true
        report(`pnpm said nothing for ${Math.round(idleTimeoutMs / 1000)}s; stopping it`)
        killTree(child)
      }, idleTimeoutMs)
      idle.unref?.()
    }
    const observe = (chunk, stream) => {
      output = `${output}${chunk}`.slice(-256 * 1024)
      stream.write(chunk)
      heartbeat()
    }

    child.stdout.on('data', (chunk) => observe(chunk, process.stdout))
    child.stderr.on('data', (chunk) => observe(chunk, process.stderr))
    child.once('error', (error) => {
      clearTimeout(idle)
      reject(error)
    })
    child.once('exit', (code, signal) => finish({ code: stopped ? 1 : code, signal }))
    heartbeat()
  })
}

function killTree(child) {
  if (process.platform === 'win32' && child.pid !== undefined) {
    try {
      spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], {
        stdio: 'ignore',
        windowsHide: true
      })
      return
    } catch {
      // fall through to the plain kill below
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
    wait = delay,
    now = Date.now,
    retryDelayMs = RETRY_DELAY_MS,
    idleTimeoutMs = IDLE_TIMEOUT_MS,
    // Every step announces itself on the same stream pnpm's own diagnostics
    // travel, because the market reports that stream verbatim: a report
    // without these lines is a report from a pnpm this runner never wrapped.
    report = (message) => process.stderr.write(`${MARKER} ${message}\n`)
  } = options

  const run = () => runPnpm(executable, args, { spawnProcess, idleTimeoutMs, report })

  const first = await run()
  const blocked = first.code === 0 ? undefined : lockedRenameTarget(first.output)
  // A run stopped for silence is not retried: whatever wedged it is still
  // there, and three stuck runs are three times the wait for the same answer.
  if (blocked === undefined || first.idleTimedOut) return first

  report(`${blocked} could not be replaced; retrying in ${retryDelayMs}ms (2 of 3)`)
  await wait(retryDelayMs)
  const second = await run()
  const target = second.code === 0 ? undefined : lockedRenameTarget(second.output)
  if (target === undefined) {
    if (second.code === 0) report('the retry succeeded')
    return second
  }

  if (!exists(target)) {
    report(`${target} is gone; leaving pnpm's own diagnosis in place`)
    return second
  }
  const sideline = sidelinePath(target, now())
  try {
    await moveAside(target, sideline)
  } catch (error) {
    // The directory itself is held too — nothing left to try, and the run's
    // own diagnostics are already on stderr.
    report(`${target} could not be moved aside either (${errorText(error)})`)
    return second
  }
  report(`moved ${target} to ${sideline}; installing over the freed name (3 of 3)`)
  const third = await run()
  report(third.code === 0 ? 'the install succeeded' : 'the install failed again')
  return third
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
