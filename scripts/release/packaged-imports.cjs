const { isBuiltin } = require('node:module')

function packageName(id) {
  const parts = id.split('/')
  return id.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]
}

/** Reject imports left external when electron-builder will not ship their package. */
function packagedImportsPlugin(dependencies, preload = false) {
  const allowed = new Set(['electron', ...(preload ? [] : Object.keys(dependencies))])
  return {
    name: 'desktop-packaged-imports',
    moduleParsed(info) {
      for (const id of [...info.importedIds, ...info.dynamicallyImportedIds]) {
        if (!this.getModuleInfo(id)?.isExternal) continue
        if ((!preload && isBuiltin(id)) || allowed.has(packageName(id))) continue
        this.error(`Desktop module ${info.id} imports ${id}, which is not shipped as a runtime dependency`)
      }
    }
  }
}
module.exports = { packagedImportsPlugin }
