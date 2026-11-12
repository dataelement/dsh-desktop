/**
 * Compare tracked patch-package filenames with the lockfile release set.
 * The lockfile version and sha512 integrity are the published package record.
 */
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * @param {string} root
 * @returns {Promise<Array<{ file: string, rule: 'filename' | 'version' | 'integrity' }>>}
 */
export async function checkPatchLock(root) {
  const lock = await readLock(root)
  const files = (await readdir(join(root, 'patches'))).filter(name => name.endsWith('.patch')).sort()
  const errors = []
  for (const file of files) {
    const parsed = parsePatchName(file)
    if (parsed === undefined) {
      errors.push({ file, rule: 'filename' })
      continue
    }
    const entry = lock[`node_modules/${parsed.name}`]
    const version = typeof entry?.version === 'string' ? entry.version : undefined
    const integrity = typeof entry?.integrity === 'string' ? entry.integrity : undefined
    if (version !== parsed.version) {
      errors.push({ file, rule: 'version' })
      continue
    }
    if (!isSha512Integrity(integrity)) errors.push({ file, rule: 'integrity' })
  }
  errors.sort((left, right) => left.file.localeCompare(right.file) || left.rule.localeCompare(right.rule))
  return errors
}

/**
 * @param {string} file
 * @returns {{ name: string, version: string } | undefined}
 */
function parsePatchName(file) {
  if (!file.endsWith('.patch')) return undefined
  const base = file.slice(0, -'.patch'.length)
  const split = base.lastIndexOf('+')
  if (split <= 0) return undefined
  const version = base.slice(split + 1)
  const name = base.slice(0, split).replaceAll('+', '/')
  if (name.length === 0 || version.length === 0) return undefined
  return { name, version }
}

/**
 * @param {string | undefined} integrity
 */
function isSha512Integrity(integrity) {
  return typeof integrity === 'string' && integrity.startsWith('sha512-') && integrity.length > 'sha512-'.length
}

/**
 * @param {string} root
 * @returns {Promise<Record<string, { version?: string, integrity?: string }>>}
 */
async function readLock(root) {
  const value = JSON.parse(await readFile(join(root, 'package-lock.json'), 'utf8'))
  if (!value || typeof value !== 'object' || !value.packages || typeof value.packages !== 'object') return {}
  return value.packages
}
