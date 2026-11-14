/**
 * Scan the import directions that the current directory rules already require.
 * The shell may import the product entries named in src/main/shell/AGENTS.md.
 */
import { readdir, readFile } from 'node:fs/promises'
import { dirname, relative, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs'])
const PRIVILEGED_SPECIFIERS = new Set([
  'fs',
  'fs/promises',
  'node:fs',
  'node:fs/promises',
  'child_process',
  'node:child_process',
  'worker_threads',
  'node:worker_threads',
  'vm',
  'node:vm'
])

const SPECIFIER_PATTERNS = [
  /\bfrom\s+['"]([^'"]+)['"]/g,
  /\bimport\s+['"]([^'"]+)['"]/g,
  /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g
]

/**
 * @param {string} root - repository root, or a fixture with the same layout.
 * @returns {Promise<Array<{ file: string, specifier: string, rule: string }>>}
 */
export async function checkImportDirection(root) {
  const files = await sourceFiles(root)
  const errors = []
  for (const file of files) {
    const text = stripComments(await readFile(file, 'utf8'))
    const repoFile = toRepoPath(root, file)
    for (const specifier of specifiersIn(text)) {
      const target = relativeTarget(file, specifier, root)
      for (const rule of violatedRules(repoFile, specifier, target)) {
        errors.push({ file: repoFile, specifier, rule })
      }
    }
  }
  errors.sort((left, right) => left.file.localeCompare(right.file)
    || left.specifier.localeCompare(right.specifier)
    || left.rule.localeCompare(right.rule))
  return errors
}

/**
 * @param {string} file - path relative to the repository, using `/`.
 * @param {string} specifier - the import specifier after comments are removed.
 * @param {string | undefined} target - resolved relative target, when the specifier is relative.
 * @returns {string[]}
 */
export function violatedRules(file, specifier, target) {
  const rules = []
  if (file.startsWith('src/host/')) {
    if (isElectron(specifier)) rules.push('host-electron')
    if (isUnder(target, 'src/main') || isUnder(target, 'src/preload')) rules.push('host-main-or-preload')
  }
  if (file.startsWith('src/shared/')) {
    if (isElectron(specifier)) rules.push('shared-electron')
    if (PRIVILEGED_SPECIFIERS.has(specifier)) rules.push('shared-privileged')
    if (isUnder(target, 'src/main') || isUnder(target, 'src/preload')) rules.push('shared-main-or-preload')
  }
  if (file === 'src/main/recovery/fatal-entry.ts') {
    if (isElectron(specifier)) rules.push('fatal-entry-electron')
    if (isUnder(target, 'src/main/shell')) rules.push('fatal-entry-shell')
  }
  if (file.startsWith('src/main/profile/')) {
    if (isElectron(specifier)) rules.push('profile-electron')
    if (isUnder(target, 'src/main/shell')) rules.push('profile-shell')
  }
  if (file.startsWith('src/main/shell/')) {
    if (isMainIndex(target)) rules.push('shell-index')
    if (specifier.includes('mandatory-update')) rules.push('shell-mandatory-update')
  }
  return rules
}

async function sourceFiles(root) {
  const roots = ['src/host', 'src/shared', 'src/main/recovery', 'src/main/profile', 'src/main/shell']
  const files = []
  for (const directory of roots) {
    await collect(resolve(root, directory), files)
  }
  return files
}

async function collect(directory, files) {
  let entries
  try {
    entries = await readdir(directory, { withFileTypes: true })
  } catch (error) {
    if (errorCode(error) === 'ENOENT') return
    throw error
  }
  for (const entry of entries) {
    if (entry.name === 'node_modules') continue
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) {
      await collect(path, files)
      continue
    }
    if (!entry.isFile()) continue
    if (entry.name.endsWith('.d.ts')) continue
    const extension = entry.name.slice(entry.name.lastIndexOf('.'))
    if (SOURCE_EXTENSIONS.has(extension)) files.push(path)
  }
}

function specifiersIn(source) {
  const found = new Set()
  for (const pattern of SPECIFIER_PATTERNS) {
    pattern.lastIndex = 0
    for (const match of source.matchAll(pattern)) {
      const specifier = match[1]
      if (specifier !== undefined && specifier.length > 0) found.add(specifier)
    }
  }
  return found
}

function relativeTarget(fromFile, specifier, root) {
  if (!specifier.startsWith('.')) return undefined
  const absolute = resolve(dirname(fromFile), specifier)
  return toRepoPath(root, absolute)
}

function toRepoPath(root, path) {
  return relative(root, path).split(sep).join('/')
}

function isElectron(specifier) {
  return specifier === 'electron' || specifier.startsWith('electron/')
}

function isUnder(target, directory) {
  return target === directory || target?.startsWith(`${directory}/`) === true
}

function isMainIndex(target) {
  return target === 'src/main/index' || target === 'src/main/index.ts' || target === 'src/main/index.js'
}

function stripComments(source) {
  let output = ''
  let quote = ''
  for (let index = 0; index < source.length; index += 1) {
    const current = source[index]
    const next = source[index + 1]
    if (quote === '' && current === '/' && next === '/') {
      while (index < source.length && source[index] !== '\n') index += 1
      output += '\n'
      continue
    }
    if (quote === '' && current === '/' && next === '*') {
      index += 2
      while (index < source.length && !(source[index] === '*' && source[index + 1] === '/')) index += 1
      index += 1
      output += ' '
      continue
    }
    if (quote === '' && (current === '"' || current === "'" || current === '`')) {
      quote = current
      output += current
      continue
    }
    if (quote !== '') {
      output += current
      if (current === '\\') {
        index += 1
        output += source[index] ?? ''
        continue
      }
      if (current === quote) quote = ''
      continue
    }
    output += current
  }
  return output
}

function errorCode(error) {
  return typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string'
    ? error.code
    : undefined
}

const executedDirectly = process.argv[1] !== undefined
  && import.meta.url === pathToFileURL(resolve(process.argv[1])).href

if (executedDirectly) {
  const root = resolve(fileURLToPath(new URL('../..', import.meta.url)))
  const errors = await checkImportDirection(root)
  if (errors.length === 0) {
    console.log('import direction matches the current directory rules')
  } else {
    for (const error of errors) console.error(`${error.rule} ${error.file} ${error.specifier}`)
    process.exitCode = 1
  }
}
