import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { isBareSpecifier, listProfileNodeModules } from './profile-node-modules.mjs'

// The package was found in the profile but cannot be used from there. That is a
// better error than the generic "not found" the original importer produced, so
// it is reported instead of being swallowed by the next candidate.
const PROFILE_PACKAGE_ERRORS = new Set([
  'ERR_PACKAGE_PATH_NOT_EXPORTED',
  'ERR_PACKAGE_IMPORT_NOT_DEFINED',
  'ERR_INVALID_PACKAGE_CONFIG',
  'ERR_INVALID_PACKAGE_TARGET',
  'ERR_UNSUPPORTED_DIR_IMPORT'
])

let dshHome
let profiles = []

export function initialize(data) {
  dshHome = data?.dshHome
  profiles = data?.profiles ?? []
}

// Two levels below node_modules, so that Node's own lookup walks up into
// <profile>/node_modules/<package> and applies package.json exports,
// conditions and subpaths exactly as it would for a local dependency.
function anchorFor(nodeModulesDirectory) {
  return pathToFileURL(join(nodeModulesDirectory, '.dsh-desktop-anchor', 'anchor.js')).href
}

export async function resolve(specifier, context, nextResolve) {
  const parentURL = context.parentURL

  try {
    // Default resolution first: the app bundle keeps ownership of its own
    // dependency tree, and profiles only fill in what it cannot provide.
    return await nextResolve(specifier, context)
  } catch (error) {
    if (!isBareSpecifier(specifier)) throw error

    const directories = listProfileNodeModules(dshHome, profiles)
    for (const directory of directories) {
      try {
        return await nextResolve(specifier, { ...context, parentURL: anchorFor(directory) })
      } catch (profileError) {
        if (PROFILE_PACKAGE_ERRORS.has(profileError?.code)) throw profileError
      }
    }

    // nextResolve merges the context it is handed into the shared context
    // object, so the synthetic parent has to be undone before giving up.
    context.parentURL = parentURL
    throw error
  }
}
