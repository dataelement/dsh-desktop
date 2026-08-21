import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { chmod, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import { delimiter, dirname, join, resolve } from 'node:path'

export const RECOMMENDED_MARKET_VERSION = '1.15.0'
export const MARKET_PACKAGE = 'dshmarket'
export const MARKET_PROFILE = 'web'
export const STATUS_PATH = '/dsh-desktop/market-installer/status'
export const INSTALL_PATH = '/dsh-desktop/market-installer/install'
export const UNINSTALL_PATH = '/dsh-desktop/market-installer/uninstall'

const OPERATION_TIMEOUT_MS = 15 * 60 * 1000
const MAX_LOG_BYTES = 32 * 1024

export const name = 'dsh-desktop-market-installer'
export const inject = ['webServer']

function dshHome() {
  return process.env.DSH_HOME || join(homedir(), '.dsh')
}

export function profileDirectory(home = dshHome()) {
  return join(home, 'profiles', MARKET_PROFILE)
}

export async function cleanStaleTemporaryDirectories(home = dshHome()) {
  const directory = profileDirectory(home)
  const nodeModulesPath = join(directory, 'node_modules')
  try {
    const entries = await readdir(nodeModulesPath, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.includes('_tmp_')) {
        await rm(join(nodeModulesPath, entry.name), { recursive: true, force: true }).catch(() => undefined)
      }
    }
  } catch {
    // node_modules directory may not exist yet
  }
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
  const installed = await readJson(join(directory, 'node_modules', MARKET_PACKAGE, 'package.json'))
  return {
    dependency: typeof dependency === 'string' ? dependency : undefined,
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

export async function ensurePnpmShim(home = dshHome()) {
  const directory = join(home, '.desktop-bin')
  await mkdir(directory, { recursive: true })
  const pnpmEntry = resolvePnpmEntry()
  const executable = process.execPath

  if (process.platform === 'win32') {
    const pnpmPath = join(directory, 'pnpm.cmd')
    await writeFile(
      pnpmPath,
      `@chcp 65001 >nul\r\n@echo off\r\n\"${executable}\" \"${pnpmEntry}\" %*\r\n`,
      'utf8'
    )
    const nodePath = join(directory, 'node.cmd')
    await writeFile(
      nodePath,
      `@chcp 65001 >nul\r\n@echo off\r\n\"${executable}\" %*\r\n`,
      'utf8'
    )
  } else {
    const pnpmPath = join(directory, 'pnpm')
    await writeFile(
      pnpmPath,
      `#!/bin/sh\nexec ${shellQuote(executable)} ${shellQuote(pnpmEntry)} \"$@\"\n`,
      { encoding: 'utf8', mode: 0o755 }
    )
    await chmod(pnpmPath, 0o755)
    const nodePath = join(directory, 'node')
    await writeFile(
      nodePath,
      `#!/bin/sh\nexec ${shellQuote(executable)} \"$@\"\n`,
      { encoding: 'utf8', mode: 0o755 }
    )
    await chmod(nodePath, 0o755)
  }

  // Also write .npmrc in profiles/web to prevent Windows file lock conflicts and racing worker threads
  const profileDir = profileDirectory(home)
  await mkdir(profileDir, { recursive: true })
  const npmrcPath = join(profileDir, '.npmrc')
  const npmrcContent = [
    'package-import-method=clone-or-copy',
    'child-concurrency=1',
    'side-effects-cache=false'
  ].join('\n') + '\n'
  try {
    if (!existsSync(npmrcPath)) {
      await writeFile(npmrcPath, npmrcContent, 'utf8')
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
    '--save-exact',
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
  if (!child || child.exitCode !== null) return
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

export function apply(ctx) {
  const home = dshHome()
  const directory = profileDirectory(home)
  const manifestPath = join(directory, 'package.json')
  let activeChild
  let operationPromise
  let phase = 'idle'
  let detail
  let restartRequired = false

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

    const pathKey = process.platform === 'win32' ? 'Path' : 'PATH'
    const envPath = process.env[pathKey] ?? process.env.PATH ?? process.env.Path ?? ''
    const child = spawn(process.execPath, buildInstallArguments(), {
      cwd: directory,
      env: {
        ...process.env,
        PATH: envPath,
        Path: envPath,
        CI: 'true',
        NO_COLOR: '1',
        PNPM_CONFIG_CHILD_CONCURRENCY: '1',
        PNPM_CONFIG_PACKAGE_IMPORT_METHOD: 'clone-or-copy',
        PNPM_CONFIG_SIDE_EFFECTS_CACHE: 'false'
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
      detached: process.platform !== 'win32'
    })
    activeChild = child

    let output = ''
    const append = (chunk) => {
      output = `${output}${chunk.toString('utf8')}`.slice(-MAX_LOG_BYTES)
      const lines = output.trim().split(/\r?\n/u)
      detail = lines.at(-1)?.slice(0, 800)
    }
    child.stdout.on('data', append)
    child.stderr.on('data', append)

    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      killProcessTree(child)
    }, OPERATION_TIMEOUT_MS)

    try {
      const exit = await new Promise((resolveExit, rejectExit) => {
        child.once('error', rejectExit)
        child.once('exit', (code, signal) => resolveExit({ code, signal }))
      })
      if (timedOut) throw new Error('Installation timed out after 15 minutes.')
      if (exit.code !== 0) {
        throw new Error(
          detail ||
            `The installer exited with ${exit.signal ? `signal ${exit.signal}` : `code ${exit.code}`}.`
        )
      }

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
    } finally {
      clearTimeout(timer)
      if (activeChild === child) activeChild = undefined
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

    const pathKey = process.platform === 'win32' ? 'Path' : 'PATH'
    const envPath = process.env[pathKey] ?? process.env.PATH ?? process.env.Path ?? ''
    const child = spawn(process.execPath, buildUninstallArguments(), {
      cwd: directory,
      env: {
        ...process.env,
        PATH: envPath,
        Path: envPath,
        CI: 'true',
        NO_COLOR: '1',
        PNPM_CONFIG_CHILD_CONCURRENCY: '1',
        PNPM_CONFIG_PACKAGE_IMPORT_METHOD: 'clone-or-copy',
        PNPM_CONFIG_SIDE_EFFECTS_CACHE: 'false'
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
      detached: process.platform !== 'win32'
    })
    activeChild = child

    let output = ''
    const append = (chunk) => {
      output = `${output}${chunk.toString('utf8')}`.slice(-MAX_LOG_BYTES)
      const lines = output.trim().split(/\r?\n/u)
      detail = lines.at(-1)?.slice(0, 800)
    }
    child.stdout.on('data', append)
    child.stderr.on('data', append)

    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      killProcessTree(child)
    }, OPERATION_TIMEOUT_MS)

    try {
      const exit = await new Promise((resolveExit, rejectExit) => {
        child.once('error', rejectExit)
        child.once('exit', (code, signal) => resolveExit({ code, signal }))
      })
      if (timedOut) throw new Error('Uninstallation timed out after 15 minutes.')
      if (exit.code !== 0) {
        throw new Error(
          detail ||
            `The uninstaller exited with ${exit.signal ? `signal ${exit.signal}` : `code ${exit.code}`}.`
        )
      }

      const removed = await readMarketInstallation(home)
      if (removed.dependency || removed.installedVersion) {
        throw new Error('pnpm completed, but dshmarket is still present in the web profile.')
      }
      phase = 'uninstalled'
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
    } finally {
      clearTimeout(timer)
      if (activeChild === child) activeChild = undefined
    }
  }

  ctx.effect(() => {
    const disposeStatus = ctx.webServer.register({
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
    const disposeInstall = ctx.webServer.register({
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
            ctx.logger.warn(error instanceof Error ? error : new Error(detail))
          })
          .finally(() => {
            operationPromise = undefined
          })
        sendJson(res, 202, await status())
      }
    })
    const disposeUninstall = ctx.webServer.register({
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
            ctx.logger.warn(error instanceof Error ? error : new Error(detail))
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
      killProcessTree(activeChild)
      await operationPromise?.catch(() => undefined)
    }
  }, 'dsh-desktop-market-installer: fixed package routes')

  ctx.effect(() => {
    void ensurePnpmShim(home).catch((error) => {
      ctx.logger.warn(error instanceof Error ? error : new Error(String(error)))
    })
  }, 'dsh-desktop-market-installer: packaged pnpm shim')
}
