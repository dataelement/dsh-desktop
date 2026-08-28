import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { chmod, copyFile, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import { delimiter, dirname, isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { SIDELINE_MARKER } from './pnpm-runner.mjs'
import { removeTree } from './remove-tree.mjs'

export const RECOMMENDED_MARKET_VERSION = 'latest'
export const MARKET_PACKAGE = 'dshmarket'
export const MARKET_PROFILE = 'web'
export const STATUS_PATH = '/dsh-desktop/market-installer/status'
export const INSTALL_PATH = '/dsh-desktop/market-installer/install'
export const UNINSTALL_PATH = '/dsh-desktop/market-installer/uninstall'

const OPERATION_TIMEOUT_MS = 15 * 60 * 1000
const MAX_LOG_BYTES = 32 * 1024

export const name = 'dsh-desktop-market-installer'
export const inject = []

function dshHome() {
  return process.env.DSH_HOME || join(homedir(), '.dsh')
}

export function profileDirectory(home = dshHome()) {
  return join(home, 'profiles', MARKET_PROFILE)
}

const OBSOLETE_PROFILE_NPMRC_KEYS = new Set(['package-import-method', 'child-concurrency'])

/**
 * Update the settings Desktop owns without discarding profile-specific pnpm
 * configuration. In particular, `store-dir` records where the existing
 * node_modules tree was linked from; losing it makes pnpm reject every later
 * plugin operation with ERR_PNPM_UNEXPECTED_STORE.
 */
export function updateProfileNpmrc(npmrc) {
  const lines = npmrc.replaceAll('\r\n', '\n').split('\n')
  if (lines.at(-1) === '') lines.pop()

  const updated = []
  let wroteSideEffectsCache = false
  for (const line of lines) {
    const key = /^\s*([^#;\s=]+)\s*=/u.exec(line)?.[1]?.toLowerCase()
    if (key === 'side-effects-cache') {
      if (!wroteSideEffectsCache) updated.push('side-effects-cache=false')
      wroteSideEffectsCache = true
      continue
    }
    if (key !== undefined && OBSOLETE_PROFILE_NPMRC_KEYS.has(key)) continue
    updated.push(line)
  }
  if (!wroteSideEffectsCache) updated.push('side-effects-cache=false')
  return `${updated.join('\n')}\n`
}

/** Leftovers of an interrupted pnpm run, or of a Windows locked-rename recovery. */
export function isDisposableModuleDirectory(name) {
  return name.includes('_tmp_') || name.includes(SIDELINE_MARKER)
}

/**
 * Sweep the leftovers of interrupted pnpm runs from a profile's node_modules.
 *
 * A package's own node_modules is swept too. Once the package being replaced
 * is a dependency of a dependency, that is where the leftovers land —
 * `cytoscape-fcose/node_modules/cose-base.dsh-old-…` — and a sweep that stops
 * at the top level leaves one copy behind per attempt.
 */
export async function cleanStaleTemporaryDirectories(home = dshHome()) {
  const directory = profileDirectory(home)
  const sweep = async (nodeModulesPath) => {
    let entries
    try {
      entries = await readdir(nodeModulesPath, { withFileTypes: true })
    } catch {
      // node_modules directory may not exist yet
      return
    }
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.isSymbolicLink()) continue
      const path = join(nodeModulesPath, entry.name)
      if (isDisposableModuleDirectory(entry.name)) {
        await removeTree(path).catch(() => undefined)
        continue
      }
      await sweep(entry.name.startsWith('@') ? path : join(path, 'node_modules'))
    }
  }
  await sweep(join(directory, 'node_modules'))
}

function readObject(text) {
  const value = JSON.parse(text)
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Expected a JSON object.')
  }
  return value
}

async function readJson(path) {
  try {
    return readObject(await readFile(path, 'utf8'))
  } catch (error) {
    if (error?.code === 'ENOENT') return undefined
    throw error
  }
}

export async function readMarketInstallation(home = dshHome()) {
  const directory = profileDirectory(home)
  const manifest = await readJson(join(directory, 'package.json'))
  const dependency = manifest?.dependencies?.[MARKET_PACKAGE]
  if (typeof dependency !== 'string') {
    return {
      dependency: undefined,
      installedVersion: undefined
    }
  }
  const installed = await readJson(join(directory, 'node_modules', MARKET_PACKAGE, 'package.json'))
  return {
    dependency,
    installedVersion: typeof installed?.version === 'string' ? installed.version : undefined
  }
}

function isLoopback(address) {
  return (
    address === '127.0.0.1' ||
    address === '::1' ||
    address === '::ffff:127.0.0.1'
  )
}

function hasForwardedAddress(req) {
  return Boolean(
    req.headers.forwarded ||
      req.headers['x-forwarded-for'] ||
      req.headers['x-real-ip'] ||
      req.headers['x-forwarded-host']
  )
}

export function isTrustedRequest(req, mutation = false) {
  if (!isLoopback(req.socket.remoteAddress) || hasForwardedAddress(req)) return false
  if (!mutation) return true

  const origin = req.headers.origin
  const host = req.headers.host
  if (typeof origin !== 'string' || typeof host !== 'string') return false
  try {
    const parsed = new URL(origin)
    return parsed.protocol === 'http:' && parsed.host === host && isLoopback(parsed.hostname)
  } catch {
    return false
  }
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body)
  })
  res.end(body)
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", `'\\''`)}'`
}

export function resolvePnpmEntry(requireFrom = import.meta.url) {
  const require = createRequire(requireFrom)
  // pnpm intentionally maps its package root export to package.json instead of
  // exporting the package.json subpath. Resolving the root therefore gives us
  // the stable package anchor without reaching through an unexported path.
  const manifest = require.resolve('pnpm')
  const root = dirname(manifest)
  const candidates = [join(root, 'bin', 'pnpm.cjs'), join(root, 'bin', 'pnpm.mjs')]
  const entry = candidates.find((candidate) => existsSync(candidate))
  if (!entry) throw new Error('The packaged pnpm entry was not found.')
  return entry
}

/**
 * Put the lock-recovery runner where the shims can invoke it.
 * @returns the staged runner path, or undefined when neither the staged copy
 * nor the packaged original can be used — the shims then call pnpm directly.
 */
export async function stagePnpmRunner(directory) {
  const source = fileURLToPath(new URL('./pnpm-runner.mjs', import.meta.url))
  const staged = join(directory, 'pnpm-runner.mjs')
  try {
    await copyFile(source, staged)
    return staged
  } catch {
    return existsSync(source) ? source : undefined
  }
}

export async function ensurePnpmShim(home = dshHome()) {
  const directory = join(home, '.desktop-bin')
  await mkdir(directory, { recursive: true })
  const pnpmEntry = resolvePnpmEntry()
  const executable = process.execPath

  // pnpm is reached through this shim by every profile package operation —
  // DSH Desktop's installer and the community market alike — so the runner it
  // points at is where a Windows locked rename gets recovered for both. A
  // runner that cannot be staged must not take the shims down with it: pnpm
  // still has to be reachable, just without the recovery, and the harness log
  // has to say so rather than leaving a stale shim to be mistaken for a fresh
  // one.
  const runnerPath = await stagePnpmRunner(directory)
  const pnpmCommand = runnerPath === undefined ? [pnpmEntry] : [runnerPath, pnpmEntry]
  process.stdout.write(
    runnerPath === undefined
      ? 'dsh-desktop: pnpm shim written without the lock-recovery runner\n'
      : `dsh-desktop: pnpm shim written via ${runnerPath}\n`
  )

  // The packaged executable is Electron on macOS, where Harness runs as a
  // utility process. Anything invoked through these shims expects Node
  // semantics — a leading node flag included — so the shims declare Node mode
  // themselves instead of relying on the caller's environment. The real Node
  // runtime bundled on the other platforms ignores the variable.
  if (process.platform === 'win32') {
    const pnpmPath = join(directory, 'pnpm.cmd')
    await writeFile(
      pnpmPath,
      `@chcp 65001 >nul\r\n@echo off\r\n@set ELECTRON_RUN_AS_NODE=1\r\n\"${executable}\" ${pnpmCommand.map((part) => `\"${part}\"`).join(' ')} %*\r\n`,
      'utf8'
    )
    const nodePath = join(directory, 'node.cmd')
    await writeFile(
      nodePath,
      `@chcp 65001 >nul\r\n@echo off\r\n@set ELECTRON_RUN_AS_NODE=1\r\n\"${executable}\" %*\r\n`,
      'utf8'
    )
  } else {
    const pnpmPath = join(directory, 'pnpm')
    await writeFile(
      pnpmPath,
      `#!/bin/sh\nexport ELECTRON_RUN_AS_NODE=1\nexec ${shellQuote(executable)} ${pnpmCommand.map(shellQuote).join(' ')} \"$@\"\n`,
      { encoding: 'utf8', mode: 0o755 }
    )
    await chmod(pnpmPath, 0o755)
    const nodePath = join(directory, 'node')
    await writeFile(
      nodePath,
      `#!/bin/sh\nexport ELECTRON_RUN_AS_NODE=1\nexec ${shellQuote(executable)} \"$@\"\n`,
      { encoding: 'utf8', mode: 0o755 }
    )
    await chmod(nodePath, 0o755)
  }

  // Also update .npmrc in profiles/web. package-import-method/child-concurrency
  // are intentionally removed so pnpm uses its defaults (hardlink, auto concurrency):
  // forcing clone-or-copy made every install do a full physical file copy
  // across the profile's 150+ packages, turning installs that should take
  // seconds into multi-minute (up to 30-minute) waits on Windows. The
  // Windows locked-rename problem this was meant to route around is handled
  // by the dedicated lock-recovery runner instead (see pnpm-runner.mjs).
  const profileDir = profileDirectory(home)
  await mkdir(profileDir, { recursive: true })
  const npmrcPath = join(profileDir, '.npmrc')
  let npmrcContent
  try {
    npmrcContent = await readFile(npmrcPath, 'utf8')
  } catch (error) {
    if (error?.code === 'ENOENT') npmrcContent = ''
  }
  try {
    if (npmrcContent !== undefined) {
      const updatedNpmrc = updateProfileNpmrc(npmrcContent)
      if (updatedNpmrc !== npmrcContent) await writeFile(npmrcPath, updatedNpmrc, 'utf8')
    }
  } catch {
    // ignore
  }

  const nodeDir = dirname(executable)
  const pathKey = process.platform === 'win32' ? 'Path' : 'PATH'
  const current = process.env[pathKey] ?? process.env.PATH ?? process.env.Path ?? ''
  const parts = current.split(delimiter).filter(Boolean)
  const additions = [directory, nodeDir].filter((dir) => !parts.includes(dir))
  if (additions.length > 0) {
    const updated = [...additions, current].filter(Boolean).join(delimiter)
    process.env.PATH = updated
    if (process.platform === 'win32') {
      process.env.Path = updated
    }
  }
  return directory
}

function processPath(environment) {
  return (
    (process.platform === 'win32' ? environment.Path : environment.PATH) ??
    environment.PATH ??
    environment.Path ??
    ''
  )
}

export function buildPnpmEnvironment(
  binDirectory,
  environment = process.env,
  executablePath = process.execPath
) {
  // The child is spawned as `process.execPath`, which on macOS is the Electron
  // helper binary: it only runs the dsh CLI as Node when ELECTRON_RUN_AS_NODE
  // is set. The harness entry (harness-node-entry.mjs) declares that flag in
  // its own environment so that children spawned here inherit Node mode —
  // deleting it here makes the helper exit 0 without ever running the CLI,
  // which the market then mistakes for a successful pnpm run. Pass it through;
  // the bundled-Node hosts (Windows, Linux) never set it and are unaffected.
  const result = { ...environment }

  const seen = new Set()
  const paths = [binDirectory, dirname(executablePath), ...processPath(environment).split(delimiter)]
    .map((entry) => entry.trim())
    .filter((entry) => {
      if (!entry) return false
      const identity = process.platform === 'win32' ? entry.toLowerCase() : entry
      if (seen.has(identity)) return false
      seen.add(identity)
      return true
    })
  const value = paths.join(delimiter)
  result.PATH = value
  if (process.platform === 'win32') result.Path = value
  result.CI = 'true'
  result.NO_COLOR = '1'
  result.npm_config_side_effects_cache = 'false'
  result.PNPM_CONFIG_SIDE_EFFECTS_CACHE = 'false'
  return result
}

export function createDesktopProfilesService(home = dshHome()) {
  const current = Object.freeze({
    name: MARKET_PROFILE,
    dir: profileDirectory(home)
  })
  return Object.freeze({
    current,
    list: () => [current],
    select: async (name) => {
      if (name !== MARKET_PROFILE) {
        throw new Error(`DSH Desktop only exposes the ${MARKET_PROFILE} profile.`)
      }
    }
  })
}

function validatePluginOperation(args, invokingDir) {
  if (!Array.isArray(args) || args.length === 0) {
    throw new Error('Desktop pnpm requires at least one plugin argument.')
  }
  if (args.some((argument) => typeof argument !== 'string' || !argument || argument.includes('\0'))) {
    throw new Error('Desktop pnpm arguments must be non-empty strings without NUL.')
  }
  if (typeof invokingDir !== 'string' || !isAbsolute(invokingDir) || invokingDir.includes('\0')) {
    throw new Error('Desktop pnpm requires an absolute invoking directory without NUL.')
  }
}

export function createDesktopPnpmService(options) {
  const {
    binDirectory,
    dshEntryPath = resolveDshEntry(),
    executablePath = process.execPath,
    environment = process.env,
    spawnProcess = spawn,
    home = dshHome()
  } = options
  let active
  let closed = false

  const runPlugin = (args, invokingDir, signal) => {
    validatePluginOperation(args, invokingDir)
    if (closed) throw new Error('The DSH Desktop pnpm service has been disposed.')
    if (signal?.aborted) throw signal.reason ?? new Error('The package operation was aborted.')
    if (active) throw new Error('Another desktop pnpm operation is already running.')

    void cleanStaleTemporaryDirectories(home).catch(() => undefined)

    const child = spawnProcess(
      executablePath,
      [dshEntryPath, 'plugin', '--profile', MARKET_PROFILE, ...args],
      {
        cwd: invokingDir,
        env: buildPnpmEnvironment(binDirectory, environment, executablePath),
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
        detached: process.platform !== 'win32'
      }
    )
    const cancel = () => killProcessTree(child)
    const done = new Promise((resolveDone, rejectDone) => {
      child.once('error', rejectDone)
      child.once('close', (exitCode, exitSignal) => {
        resolveDone({ exitCode, signal: exitSignal })
      })
    })
    const handle = {
      stdout: child.stdout,
      stderr: child.stderr,
      done,
      cancel
    }
    active = handle

    const abort = () => cancel()
    signal?.addEventListener('abort', abort, { once: true })
    if (signal?.aborted) abort()
    const release = () => {
      signal?.removeEventListener('abort', abort)
      if (active === handle) active = undefined
    }
    void done.then(release, release)
    return handle
  }

  return Object.freeze({
    runPlugin,
    async dispose() {
      closed = true
      const operation = active
      if (!operation) return
      operation.cancel()
      await operation.done.catch(() => undefined)
    }
  })
}

export function resolveDshEntry(argv = process.argv) {
  const entry = argv[1]
  if (!entry || !/[/\\]bin\.js$/u.test(entry)) {
    throw new Error('The running DSH entry could not be identified.')
  }
  return resolve(entry)
}

export function buildInstallArguments(dshEntry = resolveDshEntry()) {
  return [
    dshEntry,
    'plugin',
    '--profile',
    MARKET_PROFILE,
    'add',
    `${MARKET_PACKAGE}@${RECOMMENDED_MARKET_VERSION}`
  ]
}

export function buildUninstallArguments(dshEntry = resolveDshEntry()) {
  return [dshEntry, 'plugin', '--profile', MARKET_PROFILE, 'remove', MARKET_PACKAGE]
}

async function atomicWrite(path, contents) {
  const temporary = `${path}.dsh-desktop-${process.pid}-${Date.now()}.tmp`
  await writeFile(temporary, contents, 'utf8')
  await rename(temporary, path)
}

function killProcessTree(child) {
  if (!child || child.exitCode !== null || !child.pid) return
  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], {
      windowsHide: true,
      stdio: 'ignore'
    }).unref()
    return
  }
  try {
    process.kill(-child.pid, 'SIGTERM')
  } catch {
    child.kill('SIGTERM')
  }
}

export async function apply(ctx) {
  const home = dshHome()
  const directory = profileDirectory(home)
  const manifestPath = join(directory, 'package.json')
  let operationPromise
  let phase = 'idle'
  let detail
  let restartRequired = false

  // These generation-scoped services are the supported Desktop integration
  // boundary consumed by dsh-market 1.6+. The market therefore never probes
  // or provisions a system package manager and all mutations stay on the
  // packaged Node/pnpm pair.
  const binDirectory = await ensurePnpmShim(home)
  const desktopProfiles = createDesktopProfilesService(home)
  const desktopPnpm = createDesktopPnpmService({ binDirectory })
  ctx.provide('desktopProfiles', desktopProfiles)
  ctx.provide('desktopPnpm', desktopPnpm)
  ctx.effect(() => () => desktopPnpm.dispose(), 'dsh-desktop-market-installer: desktop pnpm')

  const runProfileCommand = async (args, action) => {
    const handle = desktopPnpm.runPlugin(args, directory)
    let output = ''
    const append = (chunk) => {
      output = `${output}${chunk.toString('utf8')}`.slice(-MAX_LOG_BYTES)
      const lines = output.trim().split(/\r?\n/u)
      detail = lines.at(-1)?.slice(0, 800)
    }
    handle.stdout.on('data', append)
    handle.stderr.on('data', append)

    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      handle.cancel()
    }, OPERATION_TIMEOUT_MS)

    try {
      const exit = await handle.done
      if (timedOut) throw new Error(`${action} timed out after 15 minutes.`)
      if (exit.exitCode !== 0) {
        throw new Error(
          detail ||
            `${action} exited with ${exit.signal ? `signal ${exit.signal}` : `code ${exit.exitCode}`}.`
        )
      }
    } finally {
      clearTimeout(timer)
      handle.stdout.off('data', append)
      handle.stderr.off('data', append)
    }
  }

  const status = async () => {
    const installation = await readMarketInstallation(home)
    if (phase === 'installing' || phase === 'uninstalling') {
      return {
        phase,
        ...installation,
        recommendedVersion: RECOMMENDED_MARKET_VERSION,
        detail,
        restartRequired: false
      }
    }
    if (phase === 'uninstalled') {
      return {
        phase,
        ...installation,
        recommendedVersion: RECOMMENDED_MARKET_VERSION,
        restartRequired: true
      }
    }
    if (installation.installedVersion) {
      return {
        phase: 'installed',
        ...installation,
        recommendedVersion: RECOMMENDED_MARKET_VERSION,
        restartRequired
      }
    }
    if (phase === 'error') {
      return {
        phase,
        ...installation,
        recommendedVersion: RECOMMENDED_MARKET_VERSION,
        detail,
        restartRequired: false
      }
    }
    return {
      phase: installation.dependency ? 'incomplete' : 'absent',
      ...installation,
      recommendedVersion: RECOMMENDED_MARKET_VERSION,
      restartRequired: false
    }
  }

  const runInstall = async () => {
    phase = 'installing'
    detail = undefined
    restartRequired = false
    const current = await readMarketInstallation(home)
    if (current.installedVersion) {
      phase = 'idle'
      return
    }

    await cleanStaleTemporaryDirectories(home)
    await ensurePnpmShim(home)
    await mkdir(directory, { recursive: true })
    let manifestSnapshot
    try {
      manifestSnapshot = await readFile(manifestPath, 'utf8')
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error
    }

    try {
      await runProfileCommand(
        ['add', `${MARKET_PACKAGE}@${RECOMMENDED_MARKET_VERSION}`],
        'Installation'
      )

      const installed = await readMarketInstallation(home)
      if (!installed.installedVersion) {
        throw new Error('pnpm completed, but dshmarket was not found in the web profile.')
      }
      phase = 'idle'
      detail = undefined
      restartRequired = true
    } catch (error) {
      await cleanStaleTemporaryDirectories(home).catch(() => undefined)
      if (manifestSnapshot !== undefined) {
        await atomicWrite(manifestPath, manifestSnapshot).catch(() => undefined)
      }
      const lockfilePath = join(directory, 'pnpm-lock.yaml')
      await rm(lockfilePath, { force: true }).catch(() => undefined)
      phase = 'error'
      detail = error instanceof Error ? error.message : String(error)
      ctx.logger.warn(error instanceof Error ? error : new Error(detail))
    }
  }

  const runUninstall = async () => {
    phase = 'uninstalling'
    detail = undefined
    restartRequired = false
    const current = await readMarketInstallation(home)
    if (!current.dependency && !current.installedVersion) {
      phase = 'uninstalled'
      restartRequired = true
      return
    }

    await cleanStaleTemporaryDirectories(home)
    await ensurePnpmShim(home)
    let manifestSnapshot
    try {
      manifestSnapshot = await readFile(manifestPath, 'utf8')
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error
    }

    try {
      await runProfileCommand(['remove', MARKET_PACKAGE], 'Uninstallation')

      const removed = await readMarketInstallation(home)
      if (removed.dependency || removed.installedVersion) {
        throw new Error('pnpm completed, but dshmarket is still present in the web profile.')
      }
      phase = 'uninstalled'
      detail = undefined
      restartRequired = true
    } catch (error) {
      await cleanStaleTemporaryDirectories(home).catch(() => undefined)
      const lockfilePath = join(directory, 'pnpm-lock.yaml')
      await rm(lockfilePath, { force: true }).catch(() => undefined)
      phase = 'error'
      detail = error instanceof Error ? error.message : String(error)
      ctx.logger.warn(error instanceof Error ? error : new Error(detail))
    }
  }

  ctx.inject(['webServer'], (webCtx) => webCtx.effect(() => {
    const disposeStatus = webCtx.webServer.register({
      kind: 'exact',
      path: STATUS_PATH,
      handler: async (req, res) => {
        if (req.method !== 'GET' || !isTrustedRequest(req)) {
          sendJson(res, req.method === 'GET' ? 403 : 405, { error: 'Request rejected.' })
          return
        }
        sendJson(res, 200, await status())
      }
    })
    const disposeInstall = webCtx.webServer.register({
      kind: 'exact',
      path: INSTALL_PATH,
      handler: async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed.' })
          return
        }
        if (!isTrustedRequest(req, true)) {
          sendJson(res, 403, { error: 'Request rejected.' })
          return
        }
        if (operationPromise) {
          sendJson(res, 409, await status())
          return
        }

        const current = await readMarketInstallation(home)
        if (current.installedVersion) {
          sendJson(res, 200, await status())
          return
        }

        operationPromise = runInstall()
          .catch((error) => {
            phase = 'error'
            detail = error instanceof Error ? error.message : String(error)
            webCtx.logger.warn(error instanceof Error ? error : new Error(detail))
          })
          .finally(() => {
            operationPromise = undefined
          })
        sendJson(res, 202, await status())
      }
    })
    const disposeUninstall = webCtx.webServer.register({
      kind: 'exact',
      path: UNINSTALL_PATH,
      handler: async (req, res) => {
        if (req.method !== 'POST') {
          sendJson(res, 405, { error: 'Method not allowed.' })
          return
        }
        if (!isTrustedRequest(req, true)) {
          sendJson(res, 403, { error: 'Request rejected.' })
          return
        }
        if (operationPromise) {
          sendJson(res, 409, await status())
          return
        }

        const current = await readMarketInstallation(home)
        if (!current.dependency && !current.installedVersion) {
          phase = 'uninstalled'
          restartRequired = true
          sendJson(res, 200, await status())
          return
        }

        operationPromise = runUninstall()
          .catch((error) => {
            phase = 'error'
            detail = error instanceof Error ? error.message : String(error)
            webCtx.logger.warn(error instanceof Error ? error : new Error(detail))
          })
          .finally(() => {
            operationPromise = undefined
          })
        sendJson(res, 202, await status())
      }
    })

    return async () => {
      disposeUninstall()
      disposeInstall()
      disposeStatus()
      await operationPromise?.catch(() => undefined)
    }
  }, 'dsh-desktop-market-installer: fixed package routes'))
}
