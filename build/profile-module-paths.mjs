import { readdirSync, existsSync } from 'node:fs'
import { createRequire, register } from 'node:module'
import { join, delimiter, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const dshHome = process.env.DSH_HOME
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function collectProfileNodeModules(home) {
  if (!home) return []
  const profilesDir = join(home, 'profiles')
  try {
    return readdirSync(profilesDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => join(profilesDir, entry.name, 'node_modules'))
      .filter((dir) => existsSync(dir))
  } catch {
    return []
  }
}

const profileNodeModules = collectProfileNodeModules(dshHome)

if (profileNodeModules.length > 0) {
  const paths = profileNodeModules.join(delimiter)
  if (process.env.NODE_PATH) {
    process.env.NODE_PATH = process.env.NODE_PATH + delimiter + paths
  } else {
    process.env.NODE_PATH = paths
  }

  try {
    const require = createRequire(import.meta.url)
    const Module = require('node:module')
    if (Module.globalPaths) {
      for (const dir of profileNodeModules) {
        if (!Module.globalPaths.includes(dir)) {
          Module.globalPaths.push(dir)
        }
      }
    }
  } catch {
      // Best effort for CJS fallback
  }

  const resolverUrl = pathToFileURL(join(__dirname, 'profile-esm-resolver.mjs')).href
  register(resolverUrl, { data: { profileNodeModules } })
}
