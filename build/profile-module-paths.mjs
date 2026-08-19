import { createRequire, register } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  isBareSpecifier,
  listProfileNodeModules,
  parseProfileNames
} from './profile-node-modules.mjs'

// Plugins installed from the market live in DSH_HOME/profiles/<name>/node_modules,
// while the harness and its plugin loader run from the packaged app bundle. After
// packaging those are different trees, so a bare import of an installed plugin has
// to be able to fall back to the profile.
const dshHome = process.env.DSH_HOME
const profiles = parseProfileNames(process.env.DSH_DESKTOP_PROFILES)

if (dshHome) {
  installCommonJsFallback()
  installEsmFallback()
}

function installCommonJsFallback() {
  try {
    const require = createRequire(import.meta.url)
    const Module = require('node:module')
    const originalResolveFilename = Module._resolveFilename

    Module._resolveFilename = function (request, parent, isMain, options) {
      try {
        return originalResolveFilename.call(this, request, parent, isMain, options)
      } catch (error) {
        if (!isBareSpecifier(request)) throw error
        for (const directory of listProfileNodeModules(dshHome, profiles)) {
          try {
            return originalResolveFilename.call(this, request, parent, isMain, {
              ...options,
              paths: [directory]
            })
          } catch {
            // this profile does not provide the package
          }
        }
        throw error
      }
    }
  } catch (error) {
    warn('CommonJS', error)
  }
}

function installEsmFallback() {
  try {
    const resolver = join(dirname(fileURLToPath(import.meta.url)), 'profile-esm-resolver.mjs')
    register(pathToFileURL(resolver).href, { data: { dshHome, profiles } })
  } catch (error) {
    warn('ESM', error)
  }
}

function warn(loader, error) {
  const message = error instanceof Error ? error.message : String(error)
  process.stderr.write(
    `[dsh-desktop] profile plugin resolution is unavailable for ${loader} imports: ${message}\n`
  )
}
