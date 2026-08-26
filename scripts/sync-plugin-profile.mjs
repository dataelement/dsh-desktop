import { constants } from 'node:fs'
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  stat,
  symlink,
  writeFile
} from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const DIRECTIONS = new Set(['formal-to-dev', 'dev-to-formal'])
const RECEIPT_FILENAME = 'plugin-profile-sync.json'

async function pathExists(filePath) {
  try {
    await stat(filePath)
    return true
  } catch (error) {
    if (error?.code === 'ENOENT') return false
    throw error
  }
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value))
}

export function rewriteLocalPluginReferences(manifest, sourceCustomRoot, targetCustomRoot) {
  const result = cloneJson(manifest)
  const dependencies = result.dependencies ?? {}

  for (const [name, specifier] of Object.entries(dependencies)) {
    if (typeof specifier !== 'string') continue
    const protocol = ['file:', 'link:'].find((candidate) =>
      specifier.startsWith(`${candidate}${sourceCustomRoot}${path.sep}`)
    )
    if (!protocol) continue
    const sourcePrefix = `${protocol}${sourceCustomRoot}${path.sep}`
    dependencies[name] = `${protocol}${targetCustomRoot}${path.sep}${specifier.slice(sourcePrefix.length)}`
  }

  return result
}

function localPluginDirectories(manifest, customRoot) {
  return Object.entries(manifest.dependencies ?? {})
    .map(([name, specifier]) => {
      if (typeof specifier !== 'string') return undefined
      const protocol = ['file:', 'link:'].find((candidate) =>
        specifier.startsWith(`${candidate}${customRoot}${path.sep}`)
      )
      return protocol ? { name, directory: specifier.slice(protocol.length) } : undefined
    })
    .filter(Boolean)
}

async function copyTree(source, target) {
  try {
    await cp(source, target, {
      recursive: true,
      force: true,
      preserveTimestamps: true,
      mode: constants.COPYFILE_FICLONE
    })
  } catch (error) {
    if (error?.code !== 'ENOTSUP' && error?.code !== 'EINVAL') throw error
    await rm(target, { recursive: true, force: true })
    await cp(source, target, {
      recursive: true,
      force: true,
      preserveTimestamps: true
    })
  }
}

function safeTimestamp(date) {
  return date.toISOString().replaceAll(':', '-').replaceAll('.', '-')
}

async function rewriteStagedProfile(profileDirectory, sourceCustomRoot, targetCustomRoot) {
  const manifestPath = path.join(profileDirectory, 'package.json')
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  const rewritten = rewriteLocalPluginReferences(manifest, sourceCustomRoot, targetCustomRoot)
  await writeFile(manifestPath, `${JSON.stringify(rewritten, null, 2)}\n`, 'utf8')

  const lockfilePath = path.join(profileDirectory, 'pnpm-lock.yaml')
  if (await pathExists(lockfilePath)) {
    const lockfile = await readFile(lockfilePath, 'utf8')
    await writeFile(lockfilePath, lockfile.replaceAll(sourceCustomRoot, targetCustomRoot), 'utf8')
  }

  return rewritten
}

async function relinkLocalPlugins(profileDirectory, manifest, targetCustomRoot) {
  for (const { name, directory } of localPluginDirectories(manifest, targetCustomRoot)) {
    const pluginLink = path.join(profileDirectory, 'node_modules', name)
    await rm(pluginLink, { recursive: true, force: true })
    await mkdir(path.dirname(pluginLink), { recursive: true })
    await symlink(directory, pluginLink, process.platform === 'win32' ? 'junction' : 'dir')
  }
}

export async function syncHarnessPluginProfile({
  sourceUserData,
  targetUserData,
  direction,
  now = new Date()
}) {
  if (!DIRECTIONS.has(direction)) {
    throw new Error(`Unknown plugin sync direction: ${direction}`)
  }

  const sourceRoot = path.resolve(sourceUserData)
  const targetRoot = path.resolve(targetUserData)
  if (sourceRoot === targetRoot) {
    throw new Error('Plugin sync source and target must be different user-data directories.')
  }

  const sourceHarness = path.join(sourceRoot, 'harness')
  const targetHarness = path.join(targetRoot, 'harness')
  const sourceProfile = path.join(sourceHarness, 'profiles', 'web')
  const targetProfile = path.join(targetHarness, 'profiles', 'web')
  const sourceCustom = path.join(sourceHarness, 'custom-plugins')
  const targetCustom = path.join(targetHarness, 'custom-plugins')
  const sourceManifestPath = path.join(sourceProfile, 'package.json')

  if (!(await pathExists(sourceManifestPath))) {
    throw new Error(`Source plugin profile does not exist: ${sourceManifestPath}`)
  }

  const sourceManifest = JSON.parse(await readFile(sourceManifestPath, 'utf8'))
  for (const { name, directory } of localPluginDirectories(sourceManifest, sourceCustom)) {
    if (!(await pathExists(directory))) {
      throw new Error(`Local plugin source is missing for ${name}: ${directory}`)
    }
  }

  await mkdir(targetHarness, { recursive: true })
  const stageDirectory = await mkdtemp(path.join(targetHarness, '.plugin-profile-sync-stage-'))
  const stagedProfile = path.join(stageDirectory, 'web')
  const stagedCustom = path.join(stageDirectory, 'custom-plugins')
  const backupRoot = path.join(targetHarness, 'profile-sync-backups')
  await mkdir(backupRoot, { recursive: true })
  const backupDirectory = await mkdtemp(
    path.join(backupRoot, `${safeTimestamp(now)}-${direction}-`)
  )
  const backupProfile = path.join(backupDirectory, 'profiles', 'web')
  const backupCustom = path.join(backupDirectory, 'custom-plugins')

  let profileBackedUp = false
  let customBackedUp = false
  let profileInstalled = false
  let customInstalled = false

  try {
    await copyTree(sourceProfile, stagedProfile)
    const sourceHasCustomPlugins = await pathExists(sourceCustom)
    if (sourceHasCustomPlugins) await copyTree(sourceCustom, stagedCustom)
    const stagedManifest = await rewriteStagedProfile(
      stagedProfile,
      sourceCustom,
      targetCustom
    )
    await relinkLocalPlugins(stagedProfile, stagedManifest, targetCustom)

    if (await pathExists(targetProfile)) {
      await mkdir(path.dirname(backupProfile), { recursive: true })
      await rename(targetProfile, backupProfile)
      profileBackedUp = true
    }
    if (await pathExists(targetCustom)) {
      await mkdir(path.dirname(backupCustom), { recursive: true })
      await rename(targetCustom, backupCustom)
      customBackedUp = true
    }

    await mkdir(path.dirname(targetProfile), { recursive: true })
    await rename(stagedProfile, targetProfile)
    profileInstalled = true
    if (sourceHasCustomPlugins) {
      await rename(stagedCustom, targetCustom)
      customInstalled = true
    }

    const plugins = Object.keys(stagedManifest.dependencies ?? {})
    const receipt = {
      version: 1,
      direction,
      syncedAt: now.toISOString(),
      sourceUserData: sourceRoot,
      targetUserData: targetRoot,
      backupDirectory,
      plugins
    }
    await writeFile(
      path.join(targetHarness, RECEIPT_FILENAME),
      `${JSON.stringify(receipt, null, 2)}\n`,
      'utf8'
    )

    return { ...receipt, backupDirectory, plugins }
  } catch (error) {
    if (customInstalled) await rm(targetCustom, { recursive: true, force: true })
    if (profileInstalled) await rm(targetProfile, { recursive: true, force: true })
    if (customBackedUp && (await pathExists(backupCustom))) {
      await rename(backupCustom, targetCustom)
    }
    if (profileBackedUp && (await pathExists(backupProfile))) {
      await mkdir(path.dirname(targetProfile), { recursive: true })
      await rename(backupProfile, targetProfile)
    }
    throw error
  } finally {
    await rm(stageDirectory, { recursive: true, force: true })
  }
}

function applicationSupportDirectory() {
  if (process.platform === 'darwin') {
    return path.join(homedir(), 'Library', 'Application Support')
  }
  if (process.platform === 'win32') {
    if (!process.env.APPDATA) throw new Error('APPDATA is not set.')
    return process.env.APPDATA
  }
  return process.env.XDG_CONFIG_HOME ?? path.join(homedir(), '.config')
}

export function resolveSyncEndpoints(direction, appDataRoot = applicationSupportDirectory()) {
  if (!DIRECTIONS.has(direction)) {
    throw new Error('Use formal-to-dev or dev-to-formal.')
  }
  const formal = path.join(appDataRoot, 'sherlock-desktop')
  const development = path.join(appDataRoot, 'dsh-desktop-dev')
  return direction === 'formal-to-dev'
    ? { sourceUserData: formal, targetUserData: development }
    : { sourceUserData: development, targetUserData: formal }
}

async function main() {
  const direction = process.argv[2]
  const endpoints = resolveSyncEndpoints(direction)
  const result = await syncHarnessPluginProfile({ ...endpoints, direction })
  console.log(`Plugin profile sync complete: ${direction}`)
  console.log(`Plugins: ${result.plugins.join(', ') || '(none)'}`)
  console.log(`Backup: ${result.backupDirectory}`)
}

const entryUrl = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : undefined
if (entryUrl === import.meta.url) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
