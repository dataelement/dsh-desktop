import fs from 'node:fs/promises'
import path from 'node:path'

async function pathExists(candidate) {
  try {
    await fs.lstat(candidate)
    return true
  } catch (error) {
    if (error?.code === 'ENOENT') return false
    throw error
  }
}

/** Replace all generated package directories as one rollback-capable transaction. */
export async function replaceInstalledPackages(stages, options = {}) {
  const nodeModulesRoot = options.nodeModulesRoot ?? path.resolve('node_modules')
  const prepared = []
  const moved = []
  let preserveBackups = false
  try {
    for (const { packageName, source } of stages) {
      const target = path.join(nodeModulesRoot, packageName)
      const temporary = path.join(nodeModulesRoot, `.${packageName}-generated-${process.pid}`)
      const backup = path.join(nodeModulesRoot, `.${packageName}-backup-${process.pid}`)
      await fs.rm(temporary, { recursive: true, force: true })
      await fs.rm(backup, { recursive: true, force: true })
      await fs.cp(source, temporary, { recursive: true })
      prepared.push({ packageName, target, temporary, backup })
    }

    for (const [index, item] of prepared.entries()) {
      await options.beforeReplace?.(item.packageName, index)
      item.hadTarget = await pathExists(item.target)
      if (item.hadTarget) await fs.rename(item.target, item.backup)
      moved.push(item)
      await fs.rename(item.temporary, item.target)
    }
  } catch (error) {
    const rollbackErrors = []
    for (const item of moved.reverse()) {
      try {
        await fs.rm(item.target, { recursive: true, force: true })
        if (item.hadTarget && await pathExists(item.backup)) await fs.rename(item.backup, item.target)
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError)
      }
    }
    if (rollbackErrors.length > 0) {
      preserveBackups = true
      throw new AggregateError([error, ...rollbackErrors], 'PPT package projection failed and rollback was incomplete')
    }
    throw error
  } finally {
    for (const item of prepared) {
      await fs.rm(item.temporary, { recursive: true, force: true })
      if (!preserveBackups) await fs.rm(item.backup, { recursive: true, force: true })
    }
  }
}
