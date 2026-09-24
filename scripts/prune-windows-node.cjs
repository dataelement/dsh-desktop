const { access, rm } = require('node:fs/promises')
const { join } = require('node:path')

module.exports = async function pruneWindowsNode(context) {
  if (context.electronPlatformName !== 'win32') return
  const bundledNode = join(context.appOutDir, 'resources', 'app', 'node_modules', 'node', 'bin', 'node.exe')
  await rm(bundledNode, { force: true })
  try {
    await access(bundledNode)
    throw new Error(`Bundled node.exe remains in Windows package: ${bundledNode}`)
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
}
