import { createHash } from 'node:crypto'
import {
  constants,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import path from 'node:path'

const RECEIPT_FILENAME = 'bundled-plugin-profile.json'

export interface BundledPluginProfileInstallOptions {
  userDataPath: string
  bundledProfilePath: string
  appVersion: string
  now?: Date
}

export interface BundledPluginProfileInstallResult {
  installed: boolean
  plugins: string[]
  backupDirectory?: string
}

interface ProfileManifest {
  dependencies?: Record<string, string>
  dsh?: {
    profile?: { bundles?: string[] }
    sherlock?: { plugins?: string[] }
  }
}

interface InstallReceipt {
  version: 1
  appVersion: string
  fingerprint: string
  installedAt: string
  plugins: string[]
  backupDirectory?: string
}

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, 'utf8')) as T
}

function safeTimestamp(date: Date): string {
  return date.toISOString().replaceAll(':', '-').replaceAll('.', '-')
}

function profileFingerprint(profilePath: string, appVersion: string): string {
  const hash = createHash('sha256')
  hash.update(`sherlock:${appVersion}\n`)
  for (const name of ['package.json', 'pnpm-lock.yaml', 'cordis.patch.yml']) {
    const filePath = path.join(profilePath, name)
    hash.update(`${name}\0`)
    if (existsSync(filePath)) hash.update(readFileSync(filePath))
    hash.update('\0')
  }
  return hash.digest('hex')
}

function copyProfile(source: string, target: string): void {
  cpSync(source, target, {
    recursive: true,
    force: true,
    preserveTimestamps: true,
    mode: constants.COPYFILE_FICLONE
  })
}

function currentReceipt(receiptPath: string): InstallReceipt | undefined {
  if (!existsSync(receiptPath)) return undefined
  try {
    const receipt = readJson<InstallReceipt>(receiptPath)
    return receipt.version === 1 ? receipt : undefined
  } catch {
    return undefined
  }
}

/**
 * Install the product-owned plugin profile before Harness starts.
 *
 * Only the profile directory is replaced. Credentials, model settings,
 * workspaces, sessions, and every other Harness path remain user-owned.
 * An older profile is renamed into a timestamped backup before the packaged
 * profile is made live so a failed copy can always be rolled back.
 */
export function installBundledPluginProfile(
  options: BundledPluginProfileInstallOptions
): BundledPluginProfileInstallResult {
  const bundledManifestPath = path.join(options.bundledProfilePath, 'package.json')
  if (!existsSync(bundledManifestPath)) return { installed: false, plugins: [] }

  const manifest = readJson<ProfileManifest>(bundledManifestPath)
  const plugins = manifest.dsh?.sherlock?.plugins ?? Object.keys(manifest.dependencies ?? {})
  const bundles = manifest.dsh?.profile?.bundles
  if (!Array.isArray(bundles) || !bundles.includes('dsh-file-drop')) {
    throw new Error('The packaged Sherlock plugin profile is missing its attachment bundle.')
  }

  const harnessPath = path.join(options.userDataPath, 'harness')
  const profilesPath = path.join(harnessPath, 'profiles')
  const targetProfilePath = path.join(profilesPath, 'web')
  const receiptPath = path.join(harnessPath, RECEIPT_FILENAME)
  const fingerprint = profileFingerprint(options.bundledProfilePath, options.appVersion)
  const receipt = currentReceipt(receiptPath)
  if (
    receipt?.fingerprint === fingerprint &&
    receipt.appVersion === options.appVersion &&
    existsSync(path.join(targetProfilePath, 'package.json'))
  ) {
    return { installed: false, plugins }
  }

  mkdirSync(harnessPath, { recursive: true })
  mkdirSync(profilesPath, { recursive: true })
  const stageRoot = mkdtempSync(path.join(harnessPath, '.bundled-plugin-profile-stage-'))
  const stagedProfilePath = path.join(stageRoot, 'web')
  const backupRoot = path.join(harnessPath, 'profile-sync-backups')
  let backupDirectory: string | undefined
  let oldProfileMoved = false
  let newProfileInstalled = false

  try {
    copyProfile(options.bundledProfilePath, stagedProfilePath)
    const packagedModulesPath = path.join(stagedProfilePath, 'modules')
    const installedModulesPath = path.join(stagedProfilePath, 'node_modules')
    if (!existsSync(packagedModulesPath) || existsSync(installedModulesPath)) {
      throw new Error('The packaged Sherlock plugin profile is missing its offline modules.')
    }
    renameSync(packagedModulesPath, installedModulesPath)

    if (existsSync(targetProfilePath)) {
      mkdirSync(backupRoot, { recursive: true })
      const backupContainer = mkdtempSync(
        path.join(backupRoot, `${safeTimestamp(options.now ?? new Date())}-bundled-`)
      )
      backupDirectory = path.join(backupContainer, 'web')
      renameSync(targetProfilePath, backupDirectory)
      oldProfileMoved = true
    }

    renameSync(stagedProfilePath, targetProfilePath)
    newProfileInstalled = true

    const nextReceipt: InstallReceipt = {
      version: 1,
      appVersion: options.appVersion,
      fingerprint,
      installedAt: (options.now ?? new Date()).toISOString(),
      plugins,
      ...(backupDirectory ? { backupDirectory } : {})
    }
    writeFileSync(receiptPath, `${JSON.stringify(nextReceipt, null, 2)}\n`, {
      encoding: 'utf8',
      mode: 0o600
    })
    return { installed: true, plugins, ...(backupDirectory ? { backupDirectory } : {}) }
  } catch (error) {
    if (newProfileInstalled) rmSync(targetProfilePath, { recursive: true, force: true })
    if (oldProfileMoved && backupDirectory && existsSync(backupDirectory)) {
      renameSync(backupDirectory, targetProfilePath)
    }
    throw error
  } finally {
    rmSync(stageRoot, { recursive: true, force: true })
  }
}
