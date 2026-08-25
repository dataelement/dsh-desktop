import { basename, dirname, join } from 'node:path'
import { constants, cpSync, existsSync, renameSync, rmSync, writeFileSync } from 'node:fs'

const VOLATILE_NAMES = new Set([
  'Cache',
  'Code Cache',
  'DawnCache',
  'DawnGraphiteCache',
  'DawnWebGPUCache',
  'GPUCache',
  'SingletonCookie',
  'SingletonLock',
  'SingletonSocket'
])
const MIGRATION_MARKER = '.sherlock-legacy-migration-complete'

/**
 * Copies durable data from the historical DSH directory into Sherlock's new
 * application identity. A sibling staging directory keeps interrupted copies
 * from making a later launch look like migration already completed.
 */
export function migrateLegacyUserData(legacyUserData: string, targetUserData: string): boolean {
  if (!existsSync(legacyUserData) || existsSync(join(targetUserData, MIGRATION_MARKER))) {
    return false
  }

  const copyOptions = {
    recursive: true,
    mode: constants.COPYFILE_FICLONE,
    filter: (source: string): boolean => !VOLATILE_NAMES.has(basename(source))
  } as const

  if (existsSync(targetUserData)) {
    cpSync(legacyUserData, targetUserData, {
      ...copyOptions,
      errorOnExist: false,
      force: false
    })
    writeFileSync(join(targetUserData, MIGRATION_MARKER), new Date().toISOString(), 'utf8')
    return true
  }

  const stagingDirectory = join(
    dirname(targetUserData),
    `.${basename(targetUserData)}.migrating-${process.pid}-${Date.now()}`
  )

  try {
    cpSync(legacyUserData, stagingDirectory, copyOptions)
    writeFileSync(join(stagingDirectory, MIGRATION_MARKER), new Date().toISOString(), 'utf8')
    renameSync(stagingDirectory, targetUserData)
    return true
  } catch (error) {
    rmSync(stagingDirectory, { force: true, recursive: true })
    throw error
  }
}
