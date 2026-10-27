// Local identities are package names, never paths, versions or repository claims.
// Keep this small pure contract in sync with the single-file browser client.
const unsafeNames = new Set(['__proto__', 'prototype', 'constructor', 'node_modules', 'favicon.ico'])
const validPart = value => /^[a-z0-9-][a-z0-9._-]*$/.test(value) && !unsafeNames.has(value)
export function isLocalPackageName(value) {
  if (typeof value !== 'string' || !value.length || value.length > 214) return false
  const parts = value.startsWith('@') ? value.slice(1).split('/') : [value]
  return parts.length === (value.startsWith('@') ? 2 : 1) && parts.every(validPart)
}
export function localWorkbenchId(packageName) {
  if (!isLocalPackageName(packageName)) throw new TypeError('Invalid local workbench package name.')
  return `local:${packageName}`
}
export const isLocalWorkbenchId = value => typeof value === 'string' && value.startsWith('local:') && isLocalPackageName(value.slice(6))
export const isRepositoryWorkbenchId = value => typeof value === 'string'
  && /^[a-z0-9][a-z0-9_.-]*\/[a-z0-9][a-z0-9_.-]*$/.test(value) && value.length <= 255
