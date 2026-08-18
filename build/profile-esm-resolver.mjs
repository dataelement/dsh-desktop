import { pathToFileURL } from 'node:url'

let profileNodeModules = []

export function initialize(data) {
  if (data?.profileNodeModules) {
    profileNodeModules = data.profileNodeModules
  }
}

export async function resolve(specifier, context, nextResolve) {
  if (profileNodeModules.length === 0) {
    return nextResolve(specifier, context)
  }

  const isBareSpecifier = !specifier.startsWith('.') &&
    !specifier.startsWith('/') &&
    !specifier.startsWith('file://') &&
    !specifier.startsWith('node:') &&
    !specifier.includes('://')

  if (!isBareSpecifier) {
    return nextResolve(specifier, context)
  }

  try {
    return await nextResolve(specifier, context)
  } catch (defaultError) {
    for (const nodeModulesDir of profileNodeModules) {
      const syntheticParent = pathToFileURL(nodeModulesDir + '/.resolve-anchor/anchor.js').href
      try {
        return await nextResolve(specifier, {
          ...context,
          parentURL: syntheticParent
        })
      } catch {
        // try next profile
      }
    }
    throw defaultError
  }
}
