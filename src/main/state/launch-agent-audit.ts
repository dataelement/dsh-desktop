import { spawn } from 'node:child_process'
import { homedir, tmpdir } from 'node:os'
import { basename, isAbsolute, join, relative, resolve } from 'node:path'
import { copyFile, mkdir, mkdtemp, readdir, rename, rm, writeFile } from 'node:fs/promises'
import {
  readComponentLedger,
  recordComponentRepair,
  shouldEscalateRepairs
} from './component-ledger'
import {
  launchServiceIsStoppedAfterBootout,
  type LaunchctlCommandResult
} from './launchctl-service-state'

const LAUNCH_AGENT_LABEL_PATTERN = /^[a-z0-9._-]+$/i
const COMMAND_TIMEOUT_MS = 10_000
const COMMAND_OUTPUT_LIMIT = 64 * 1024

export interface LaunchAgentRecord {
  Label?: unknown
  Program?: unknown
  ProgramArguments?: unknown
  EnvironmentVariables?: unknown
  // A job definition carries any number of keys a repair must hand back.
  [key: string]: unknown
}

export interface CommandResult extends LaunchctlCommandResult {}

export type AuditAction = 'repaired' | 'quarantined' | 'disabled'

export interface AuditFinding {
  label: string
  plistPath: string
  action: AuditAction
  owner?: string
  backupPath?: string
  repairs?: number
}

export interface LaunchAgentAuditOptions {
  dshHome: string
  appBundlePath: string
  homeDirectory?: string
  platform?: NodeJS.Platform
  uid?: number | null
  readLaunchAgent?: (plistPath: string) => Promise<LaunchAgentRecord>
  writeLaunchAgent?: (plistPath: string, record: LaunchAgentRecord) => Promise<void>
  bootoutLaunchAgent?: (target: string) => Promise<CommandResult>
  inspectLaunchAgent?: (target: string) => Promise<CommandResult>
  bootstrapLaunchAgent?: (domain: string, plistPath: string) => Promise<CommandResult>
  disableLaunchAgent?: (target: string) => Promise<CommandResult>
  now?: () => Date
  log?: (message: string) => void
}

export interface LaunchAgentAuditResult {
  findings: AuditFinding[]
  failures: string[]
}

function pathInside(parent: string, child: string): boolean {
  const nested = relative(parent, child)
  return nested === '' || (!nested.startsWith('..') && !isAbsolute(nested))
}

function executablePath(record: LaunchAgentRecord): string | undefined {
  if (typeof record.Program === 'string' && isAbsolute(record.Program)) return record.Program
  const args = Array.isArray(record.ProgramArguments) ? record.ProgramArguments : []
  const first = args[0]
  return typeof first === 'string' && isAbsolute(first) ? first : undefined
}

function runsAsNode(record: LaunchAgentRecord): boolean {
  const environment = record.EnvironmentVariables
  if (typeof environment !== 'object' || environment === null) return false
  const flag = (environment as Record<string, unknown>).ELECTRON_RUN_AS_NODE
  return flag === '1' || flag === 1 || flag === true
}

/**
 * The same agent, corrected rather than removed: the job keeps its schedule,
 * its arguments and its own environment, and only gains the flag that makes
 * our binary run as plain node instead of booting the desktop application.
 */
export function repairedLaunchAgent(record: LaunchAgentRecord): LaunchAgentRecord {
  const environment = typeof record.EnvironmentVariables === 'object' && record.EnvironmentVariables !== null
    ? record.EnvironmentVariables as Record<string, unknown>
    : {}
  return {
    ...record,
    EnvironmentVariables: { ...environment, ELECTRON_RUN_AS_NODE: '1' }
  }
}

/**
 * A LaunchAgent that runs this application's own binary as a background job
 * without ELECTRON_RUN_AS_NODE is always a defect: launchd starts a full GUI
 * Electron process, which activates the app over whatever the user is doing
 * and then dies. The binary belongs to us, so the pattern is self-attributing
 * and needs no package ownership check.
 */
export function describesDaemonisedAppBinary(
  record: LaunchAgentRecord,
  appBundlePath: string
): boolean {
  return referencesAppBundleExecutable(record, appBundlePath) && !runsAsNode(record)
}

/**
 * Any background job whose executable lives inside the application bundle
 * must be stopped before an update replaces that bundle. This is deliberately
 * capability-based rather than tied to a package or service label: even a
 * correctly configured Node-mode helper can observe a missing or half-written
 * Electron framework while the updater swaps the application directory.
 */
export function referencesAppBundleExecutable(
  record: LaunchAgentRecord,
  appBundlePath: string
): boolean {
  const executable = executablePath(record)
  if (executable === undefined) return false
  return pathInside(resolve(appBundlePath), resolve(executable))
}

/**
 * The application bundle an executable belongs to. The outermost `.app` is the
 * right boundary: helper executables live in nested bundles inside it, and an
 * agent abusing any of them is abusing this installation.
 */
export function appBundlePathFromExecutable(executable: string): string | undefined {
  const segments = executable.split('/')
  const bundle = segments.findIndex((segment) => segment.endsWith('.app'))
  if (bundle === -1) return undefined
  return segments.slice(0, bundle + 1).join('/')
}

/**
 * The package a LaunchAgent was installed by, when one of its arguments still
 * points inside an installed package. Attribution only enriches what the app
 * tells the user; a broken agent is corrected whether or not it succeeds.
 */
export function pluginOwnerFromArguments(record: LaunchAgentRecord): string | undefined {
  const args = Array.isArray(record.ProgramArguments) ? record.ProgramArguments : []
  const candidates = [
    typeof record.Program === 'string' ? record.Program : undefined,
    ...args.filter((value): value is string => typeof value === 'string')
  ].filter((value): value is string => value !== undefined)

  for (const candidate of candidates) {
    const segments = candidate.split('/')
    const marker = segments.lastIndexOf('node_modules')
    if (marker === -1) continue
    const first = segments[marker + 1]
    if (first === undefined || first === '') continue
    if (first.startsWith('@')) {
      const second = segments[marker + 2]
      if (second !== undefined && second !== '') return `${first}/${second}`
      continue
    }
    return first
  }
  return undefined
}

function runCommand(command: string, args: readonly string[]): Promise<CommandResult> {
  return new Promise((resolveResult) => {
    const child = spawn(command, [...args], {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: COMMAND_TIMEOUT_MS,
      killSignal: 'SIGKILL'
    })
    let stdout = ''
    let stderr = ''
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (chunk: string) => {
      stdout = (stdout + chunk).slice(-COMMAND_OUTPUT_LIMIT)
    })
    child.stderr.on('data', (chunk: string) => {
      stderr = (stderr + chunk).slice(-COMMAND_OUTPUT_LIMIT)
    })
    child.once('error', (error) => resolveResult({ code: null, stdout, stderr: error.message }))
    child.once('close', (code) => resolveResult({ code, stdout, stderr }))
  })
}

async function defaultReadLaunchAgent(plistPath: string): Promise<LaunchAgentRecord> {
  const result = await runCommand('/usr/bin/plutil', ['-convert', 'json', '-o', '-', plistPath])
  if (result.code !== 0) throw new Error(result.stderr.trim() || `plutil exited ${String(result.code)}`)
  return JSON.parse(result.stdout) as LaunchAgentRecord
}

async function defaultWriteLaunchAgent(
  plistPath: string,
  record: LaunchAgentRecord
): Promise<void> {
  const staging = await mkdtemp(join(tmpdir(), 'dsh-launch-agent-'))
  const source = join(staging, 'agent.json')
  try {
    await writeFile(source, JSON.stringify(record))
    const result = await runCommand('/usr/bin/plutil', ['-convert', 'xml1', '-o', plistPath, source])
    if (result.code !== 0) {
      throw new Error(result.stderr.trim() || `plutil exited ${String(result.code)}`)
    }
  } finally {
    await rm(staging, { recursive: true, force: true })
  }
}

function defaultBootoutLaunchAgent(target: string): Promise<CommandResult> {
  return runCommand('/bin/launchctl', ['bootout', target])
}

function defaultInspectLaunchAgent(target: string): Promise<CommandResult> {
  return runCommand('/bin/launchctl', ['print', target])
}

function defaultBootstrapLaunchAgent(domain: string, plistPath: string): Promise<CommandResult> {
  return runCommand('/bin/launchctl', ['bootstrap', domain, plistPath])
}

function defaultDisableLaunchAgent(target: string): Promise<CommandResult> {
  return runCommand('/bin/launchctl', ['disable', target])
}

function timestamp(date: Date): string {
  return date.toISOString().replace(/[:.]/g, '-')
}

async function quarantineLaunchAgent(options: {
  dshHome: string
  plistPath: string
  label: string
  uid: number
  bootoutLaunchAgent: (target: string) => Promise<CommandResult>
  inspectLaunchAgent: (target: string) => Promise<CommandResult>
  now: () => Date
}): Promise<string> {
  const domain = `gui/${String(options.uid)}`
  const target = `${domain}/${options.label}`
  const bootout = await options.bootoutLaunchAgent(target)
  if (!await launchServiceIsStoppedAfterBootout(
    bootout,
    target,
    domain,
    options.inspectLaunchAgent
  )) {
    throw new Error(bootout.stderr.trim() || `launchctl bootout exited ${String(bootout.code)}`)
  }

  const quarantineDirectory = join(
    options.dshHome,
    'recovery',
    'quarantined-components',
    timestamp(options.now())
  )
  await mkdir(quarantineDirectory, { recursive: true })
  const quarantinePath = join(quarantineDirectory, basename(options.plistPath))
  await rename(options.plistPath, quarantinePath)
  return quarantinePath
}

/**
 * Stop and quarantine every user LaunchAgent that executes a binary from the
 * application bundle before the updater replaces it. The caller must stop the
 * Harness first so a third-party plugin cannot recreate the job in the gap.
 */
export async function quarantineAppBundleLaunchAgents(
  options: LaunchAgentAuditOptions
): Promise<LaunchAgentAuditResult> {
  const platform = options.platform ?? process.platform
  const findings: AuditFinding[] = []
  const failures: string[] = []
  if (platform !== 'darwin') return { findings, failures }

  const homeDirectory = options.homeDirectory ?? homedir()
  const launchAgentsDirectory = join(homeDirectory, 'Library', 'LaunchAgents')
  const readLaunchAgent = options.readLaunchAgent ?? defaultReadLaunchAgent
  const bootoutLaunchAgent = options.bootoutLaunchAgent ?? defaultBootoutLaunchAgent
  const inspectLaunchAgent = options.inspectLaunchAgent ?? defaultInspectLaunchAgent
  const now = options.now ?? (() => new Date())
  const uid = options.uid === undefined ? process.getuid?.() ?? null : options.uid

  let entries
  try {
    entries = await readdir(launchAgentsDirectory, { withFileTypes: true })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { findings, failures }
    const detail = error instanceof Error ? error.message : String(error)
    return { findings, failures: [`cannot inspect ${launchAgentsDirectory}: ${detail}`] }
  }

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.plist')) continue
    const plistPath = join(launchAgentsDirectory, entry.name)
    let record: LaunchAgentRecord
    try {
      record = await readLaunchAgent(plistPath)
    } catch {
      continue
    }
    if (!referencesAppBundleExecutable(record, options.appBundlePath)) continue

    const label = typeof record.Label === 'string' && LAUNCH_AGENT_LABEL_PATTERN.test(record.Label)
      ? record.Label
      : undefined
    if (label === undefined || typeof uid !== 'number') {
      failures.push(`${plistPath}: missing a safe LaunchAgent label or user id`)
      continue
    }

    try {
      const quarantinePath = await quarantineLaunchAgent({
        dshHome: options.dshHome,
        plistPath,
        label,
        uid,
        bootoutLaunchAgent,
        inspectLaunchAgent,
        now
      })
      const owner = pluginOwnerFromArguments(record)
      findings.push({ label, plistPath, action: 'quarantined', owner, backupPath: quarantinePath })
      options.log?.(`[launch-agents] quarantined ${label} before replacing the application bundle`)
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      failures.push(`${plistPath}: quarantine failed (${detail})`)
    }
  }

  return { findings, failures }
}

/**
 * Correct every LaunchAgent that would start this application as a background
 * desktop process. Repair is preferred over removal so the plugin behind the
 * agent keeps working; removal is the fallback when the repair cannot land.
 */
export async function auditLaunchAgents(
  options: LaunchAgentAuditOptions
): Promise<LaunchAgentAuditResult> {
  const platform = options.platform ?? process.platform
  const findings: AuditFinding[] = []
  const failures: string[] = []
  if (platform !== 'darwin') return { findings, failures }

  const homeDirectory = options.homeDirectory ?? homedir()
  const launchAgentsDirectory = join(homeDirectory, 'Library', 'LaunchAgents')
  const readLaunchAgent = options.readLaunchAgent ?? defaultReadLaunchAgent
  const writeLaunchAgent = options.writeLaunchAgent ?? defaultWriteLaunchAgent
  const bootoutLaunchAgent = options.bootoutLaunchAgent ?? defaultBootoutLaunchAgent
  const inspectLaunchAgent = options.inspectLaunchAgent ?? defaultInspectLaunchAgent
  const bootstrapLaunchAgent = options.bootstrapLaunchAgent ?? defaultBootstrapLaunchAgent
  const disableLaunchAgent = options.disableLaunchAgent ?? defaultDisableLaunchAgent
  const now = options.now ?? (() => new Date())
  const uid = options.uid === undefined ? process.getuid?.() ?? null : options.uid

  let entries
  try {
    entries = await readdir(launchAgentsDirectory, { withFileTypes: true })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { findings, failures }
    const detail = error instanceof Error ? error.message : String(error)
    return { findings, failures: [`cannot inspect ${launchAgentsDirectory}: ${detail}`] }
  }

  const ledger = await readComponentLedger(options.dshHome)

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.plist')) continue
    const plistPath = join(launchAgentsDirectory, entry.name)

    let record: LaunchAgentRecord
    try {
      record = await readLaunchAgent(plistPath)
    } catch {
      // An unreadable plist proves nothing about ownership and is left alone.
      continue
    }
    if (!describesDaemonisedAppBinary(record, options.appBundlePath)) continue

    const label = typeof record.Label === 'string' && LAUNCH_AGENT_LABEL_PATTERN.test(record.Label)
      ? record.Label
      : undefined
    if (label === undefined || typeof uid !== 'number') {
      failures.push(`${plistPath}: missing a safe LaunchAgent label or user id`)
      continue
    }

    const owner = pluginOwnerFromArguments(record)
    const previous = ledger[label]
    if (previous !== undefined && shouldEscalateRepairs(previous)) {
      try {
        const target = `gui/${String(uid)}/${label}`
        const disabled = await disableLaunchAgent(target)
        if (disabled.code !== 0) {
          throw new Error(
            disabled.stderr.trim() || `launchctl disable exited ${String(disabled.code)}`
          )
        }
        const quarantinePath = await quarantineLaunchAgent({
          dshHome: options.dshHome,
          plistPath,
          label,
          uid,
          bootoutLaunchAgent,
          inspectLaunchAgent,
          now
        })
        findings.push({
          label,
          plistPath,
          action: 'disabled',
          owner,
          backupPath: quarantinePath,
          repairs: previous.repairs
        })
        options.log?.(`[launch-agents] disabled ${label} after repeated unsafe recreation`)
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error)
        failures.push(`${plistPath}: disable/quarantine failed (${detail})`)
      }
      continue
    }

    const target = `gui/${String(uid)}/${label}`
    const domain = `gui/${String(uid)}`
    const stampDirectory = join(options.dshHome, 'recovery', 'repaired-components', timestamp(now()))
    const backupPath = join(stampDirectory, basename(plistPath))

    try {
      await mkdir(stampDirectory, { recursive: true })
      await copyFile(plistPath, backupPath)
      await bootoutLaunchAgent(target)
      await writeLaunchAgent(plistPath, repairedLaunchAgent(record))
      await bootstrapLaunchAgent(domain, plistPath)
      const recorded = await recordComponentRepair(options.dshHome, label, now)
      findings.push({ label, plistPath, action: 'repaired', owner, backupPath, repairs: recorded.repairs })
      options.log?.(`[launch-agents] repaired ${label} to run as node`)
      continue
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      failures.push(`${plistPath}: repair failed (${detail})`)
    }

    // The job still boots a desktop process, so stopping it beats leaving it.
    try {
      const quarantinePath = await quarantineLaunchAgent({
        dshHome: options.dshHome,
        plistPath,
        label,
        uid,
        bootoutLaunchAgent,
        inspectLaunchAgent,
        now
      })
      findings.push({ label, plistPath, action: 'quarantined', owner, backupPath: quarantinePath })
      options.log?.(`[launch-agents] quarantined ${label} after a failed repair`)
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      failures.push(`${plistPath}: quarantine failed (${detail})`)
    }
  }

  return { findings, failures }
}
