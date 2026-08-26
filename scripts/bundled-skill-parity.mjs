import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readlinkSync, readdirSync } from 'node:fs'
import path from 'node:path'

function readMetadata(skillDirectory) {
  const metadataPath = path.join(skillDirectory, '_meta.json')
  if (!existsSync(metadataPath)) {
    throw new Error(`bundled skill metadata is missing: ${metadataPath}`)
  }
  const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'))
  if (
    typeof metadata.slug !== 'string' ||
    typeof metadata.version !== 'string' ||
    metadata.source !== 'eSkill'
  ) {
    throw new Error(`bundled skill metadata is invalid: ${metadataPath}`)
  }
  return metadata
}

export function bundledSkillFingerprint(root) {
  const hash = createHash('sha256')

  function visit(directory, relativeDirectory) {
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

export function verifyBundledSkillParity({
  sourceSkillDirectory,
  packagedSkillDirectory
}) {
  if (!existsSync(sourceSkillDirectory)) {
    throw new Error(`source bundled skill is missing: ${sourceSkillDirectory}`)
  }
  if (!existsSync(packagedSkillDirectory)) {
    throw new Error(`packaged bundled skill is missing: ${packagedSkillDirectory}`)
  }

  const sourceMetadata = readMetadata(sourceSkillDirectory)
  const packagedMetadata = readMetadata(packagedSkillDirectory)
  if (
    sourceMetadata.slug !== packagedMetadata.slug ||
    sourceMetadata.version !== packagedMetadata.version
  ) {
    throw new Error(
      `packaged bundled skill version does not match source: ${sourceMetadata.slug} ${sourceMetadata.version} != ${packagedMetadata.slug} ${packagedMetadata.version}`
    )
  }

  const sourceFingerprint = bundledSkillFingerprint(sourceSkillDirectory)
  const packagedFingerprint = bundledSkillFingerprint(packagedSkillDirectory)
  if (sourceFingerprint !== packagedFingerprint) {
    throw new Error(
      `packaged bundled skill content does not match source: ${sourceMetadata.slug} ${sourceMetadata.version}`
    )
  }

  return {
    slug: sourceMetadata.slug,
    version: sourceMetadata.version,
    fingerprint: sourceFingerprint
  }
}
