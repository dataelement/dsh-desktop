import {
  closeSync,
  fsyncSync,
  linkSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  unlinkSync,
  writeFileSync
} from 'node:fs'
import { dirname, join } from 'node:path'
import { randomUUID } from 'node:crypto'

export const DESKTOP_INSTALL_STATE_FILE = '.desktop-install-state.json'

export interface DesktopInstallState {
  schemaVersion: 1
  classification: 'new' | 'existing'
  firstSeenVersion: string
  classifiedAt: string
}

const LEGACY_EVIDENCE = [
  ['harness'],
  ['launch-root'],
  ['desktop-settings.json'],
  ['desktop-service', 'installation.json'],
  ['window-state.json'],
  ['gpu-fallback.json']
] as const

export function desktopInstallStatePath(dshHome: string): string {
  return join(dshHome, DESKTOP_INSTALL_STATE_FILE)
}

export function parseDesktopInstallState(value: unknown): DesktopInstallState | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const candidate = value as Record<string, unknown>
  if (
    candidate.schemaVersion !== 1 ||
    (candidate.classification !== 'new' && candidate.classification !== 'existing') ||
    typeof candidate.firstSeenVersion !== 'string' ||
    candidate.firstSeenVersion.length === 0 ||
    typeof candidate.classifiedAt !== 'string' ||
    !Number.isFinite(Date.parse(candidate.classifiedAt))
  ) return undefined
  return candidate as unknown as DesktopInstallState
}

export function readDesktopInstallState(dshHome: string): DesktopInstallState | undefined {
  try {
    return parseDesktopInstallState(JSON.parse(readFileSync(desktopInstallStatePath(dshHome), 'utf8')))
  } catch {
    return undefined
  }
}

function pathExists(path: string): boolean {
  try {
    lstatSync(path)
    return true
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false
    // An unreadable path is evidence that this is not a pristine install.
    return true
  }
}

function writeMarkerOnce(path: string, state: DesktopInstallState): DesktopInstallState {
  const directory = dirname(path)
  const temporary = join(directory, `.${DESKTOP_INSTALL_STATE_FILE}.${process.pid}.${randomUUID()}.tmp`)
  let fd: number | undefined
  try {
    mkdirSync(directory, { recursive: true })
    fd = openSync(temporary, 'wx', 0o600)
    writeFileSync(fd, `${JSON.stringify(state, null, 2)}\n`, 'utf8')
    fsyncSync(fd)
    closeSync(fd)
    fd = undefined

    // A hard link publishes the fully-written inode only if the destination
    // is still absent. This avoids both partial JSON and overwriting a marker
    // another process classified first.
    linkSync(temporary, path)
    return state
  } catch {
    const existing = readDesktopInstallState(dirname(path))
    return existing ?? {
      ...state,
      classification: 'existing'
    }
  } finally {
    if (fd !== undefined) {
      try { closeSync(fd) } catch { /* best effort */ }
    }
    try { unlinkSync(temporary) } catch { /* best effort */ }
  }
}

export interface ClassifyDesktopInstallOptions {
  userDataPath: string
  appVersion: string
  developmentBuild: boolean
  now?: Date
}

/**
 * Classify the installation exactly once, before startup creates any of the
 * legacy evidence paths. Missing, malformed, or unreadable state always
 * suppresses onboarding rather than risking a prompt for an existing user.
 */
export function classifyDesktopInstall(options: ClassifyDesktopInstallOptions): DesktopInstallState {
  const dshHome = join(options.userDataPath, 'harness')
  const marker = desktopInstallStatePath(dshHome)

  if (pathExists(marker)) {
    return readDesktopInstallState(dshHome) ?? {
      schemaVersion: 1,
      classification: 'existing',
      firstSeenVersion: options.appVersion,
      classifiedAt: (options.now ?? new Date()).toISOString()
    }
  }

  const hasLegacyEvidence = LEGACY_EVIDENCE.some(parts =>
    pathExists(join(options.userDataPath, ...parts))
  )
  const state: DesktopInstallState = {
    schemaVersion: 1,
    classification: !options.developmentBuild && !hasLegacyEvidence ? 'new' : 'existing',
    firstSeenVersion: options.appVersion,
    classifiedAt: (options.now ?? new Date()).toISOString()
  }
  return writeMarkerOnce(marker, state)
}
