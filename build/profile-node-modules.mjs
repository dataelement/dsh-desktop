import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

// A specifier is "bare" when Node has to look it up in a node_modules directory.
// Relative paths, absolute paths, package imports (`#name`) and anything with a
// URL scheme — including Windows drive letters such as `C:\` — resolve against
// the importer and must never be redirected to a profile.
export function isBareSpecifier(specifier) {
  if (typeof specifier !== 'string' || specifier.length === 0) return false
  if (
    specifier.startsWith('.') ||
    specifier.startsWith('/') ||
    specifier.startsWith('\\') ||
    specifier.startsWith('#')
  ) {
    return false
  }
  return !/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(specifier)
}

export function parseProfileNames(value) {
  if (!value) return []
  return value
    .split(',')
    .map((name) => name.trim())
    .filter((name) => name.length > 0 && !name.includes('/') && !name.includes('\\'))
}

// Read on every lookup instead of snapshotting at startup: a profile only gains
// a node_modules directory when its first plugin is installed, which happens
// long after the harness process starts.
export function listProfileNodeModules(home, profiles = []) {
  if (!home) return []
  const profilesDir = join(home, 'profiles')
  const names = profiles.length > 0 ? profiles : readProfileNames(profilesDir)
  const directories = []
  for (const name of names) {
    const directory = join(profilesDir, name, 'node_modules')
    if (existsSync(directory)) directories.push(directory)
  }
  return directories
}

function readProfileNames(profilesDir) {
  try {
    return readdirSync(profilesDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()
  } catch {
    return []
  }
}
