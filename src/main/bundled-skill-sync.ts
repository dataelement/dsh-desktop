import {
  constants,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  readdirSync,
  renameSync,
  rmSync
} from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'

export interface BundledESkillSyncOptions {
  bundledSkillDirectory: string
  overrideSkillDirectories: string[]
  now?: Date
}

export interface BundledESkillUpgrade {
  slug: string
  fromVersion: string
  toVersion: string
  targetDirectory: string
  backupDirectory: string
}

export interface BundledESkillSyncResult {
  upgraded: BundledESkillUpgrade[]
}

interface ESkillMetadata {
  slug: string
  version: string
  source: string
}

function readESkillMetadata(skillDirectory: string): ESkillMetadata | undefined {
  try {
    const value = JSON.parse(
      readFileSync(path.join(skillDirectory, '_meta.json'), 'utf8')
    ) as Partial<ESkillMetadata>
    if (
      typeof value.slug !== 'string' ||
      typeof value.version !== 'string' ||
      value.source !== 'eSkill'
    ) {
      return undefined
    }
    return { slug: value.slug, version: value.version, source: value.source }
  } catch {
    return undefined
  }
}

function semanticVersion(version: string): [number, number, number] | undefined {
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(version)
  if (!match) return undefined
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

function compareVersions(left: string, right: string): number | undefined {
  const leftParts = semanticVersion(left)
  const rightParts = semanticVersion(right)
  if (!leftParts || !rightParts) return undefined
  for (const index of [0, 1, 2] as const) {
    const difference = leftParts[index] - rightParts[index]
    if (difference !== 0) return difference
  }
  return 0
}

function safeTimestamp(date: Date): string {
  return date.toISOString().replaceAll(':', '-').replaceAll('.', '-')
}

function directoryFingerprint(root: string): string {
  const hash = createHash('sha256')

  function visit(directory: string, relativeDirectory: string): void {
    const entries = readdirSync(directory, { withFileTypes: true }).sort((left, right) =>
      left.name.localeCompare(right.name, 'en')
    )
    for (const entry of entries) {
      const relativePath = path.posix.join(relativeDirectory, entry.name)
      const absolutePath = path.join(directory, entry.name)
      if (entry.isDirectory()) {
        hash.update(`directory\0${relativePath}\0`)
        visit(absolutePath, relativePath)
      } else if (entry.isFile()) {
        hash.update(`file\0${relativePath}\0`)
        hash.update(readFileSync(absolutePath))
        hash.update('\0')
      } else if (entry.isSymbolicLink()) {
        hash.update(`symlink\0${relativePath}\0${readlinkSync(absolutePath)}\0`)
      }
    }
  }

  visit(root, '')
  return hash.digest('hex')
}

function copySkill(source: string, target: string): void {
  cpSync(source, target, {
    recursive: true,
    force: true,
    preserveTimestamps: true,
    mode: constants.COPYFILE_FICLONE
  })
}

function replaceSkill(
  bundledSkillDirectory: string,
  targetDirectory: string,
  metadata: { slug: string; fromVersion: string; toVersion: string },
  now: Date
): BundledESkillUpgrade {
  const overrideRoot = path.dirname(targetDirectory)
  const backupRoot = path.join(overrideRoot, '.sherlock-skill-backups')
  mkdirSync(backupRoot, { recursive: true })
  const stageRoot = mkdtempSync(path.join(backupRoot, '.stage-'))
  const stagedSkillDirectory = path.join(stageRoot, metadata.slug)
  const backupContainer = mkdtempSync(
    path.join(backupRoot, `${safeTimestamp(now)}-${metadata.slug}-`)
  )
  const backupDirectory = path.join(backupContainer, 'skill')
  let oldSkillMoved = false
  let newSkillInstalled = false

  try {
    copySkill(bundledSkillDirectory, stagedSkillDirectory)
    renameSync(targetDirectory, backupDirectory)
    oldSkillMoved = true
    renameSync(stagedSkillDirectory, targetDirectory)
    newSkillInstalled = true
    return {
      slug: metadata.slug,
      fromVersion: metadata.fromVersion,
      toVersion: metadata.toVersion,
      targetDirectory,
      backupDirectory
    }
  } catch (error) {
    if (newSkillInstalled) rmSync(targetDirectory, { recursive: true, force: true })
    if (oldSkillMoved && existsSync(backupDirectory)) {
      renameSync(backupDirectory, targetDirectory)
    }
    throw error
  } finally {
    rmSync(stageRoot, { recursive: true, force: true })
  }
}

export function synchronizeBundledESkillOverrides(
  options: BundledESkillSyncOptions
): BundledESkillSyncResult {
  if (!existsSync(options.bundledSkillDirectory)) return { upgraded: [] }

  const upgraded: BundledESkillUpgrade[] = []
  for (const entry of readdirSync(options.bundledSkillDirectory, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const bundledSkill = path.join(options.bundledSkillDirectory, entry.name)
    const bundledMetadata = readESkillMetadata(bundledSkill)
    if (!bundledMetadata || bundledMetadata.slug !== entry.name) continue

    for (const overrideRoot of options.overrideSkillDirectories) {
      const targetDirectory = path.join(overrideRoot, entry.name)
      if (!existsSync(targetDirectory)) continue
      const targetMetadata = readESkillMetadata(targetDirectory)
      if (!targetMetadata || targetMetadata.slug !== bundledMetadata.slug) continue
      const versionDifference = compareVersions(targetMetadata.version, bundledMetadata.version)
      if (versionDifference === undefined || versionDifference > 0) continue
      if (
        versionDifference === 0 &&
        directoryFingerprint(targetDirectory) === directoryFingerprint(bundledSkill)
      ) {
        continue
      }
      upgraded.push(
        replaceSkill(
          bundledSkill,
          targetDirectory,
          {
            slug: bundledMetadata.slug,
            fromVersion: targetMetadata.version,
            toVersion: bundledMetadata.version
          },
          options.now ?? new Date()
        )
      )
    }
  }
  return { upgraded }
}
