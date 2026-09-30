import { lstat, readFile, readdir } from 'node:fs/promises'
import { extname, join, relative, sep } from 'node:path'

const CODE_EXTENSIONS = new Set(['.js', '.mjs', '.cjs'])
const SKIP_DIRECTORIES = new Set(['node_modules', 'test', 'tests', '__tests__', 'fixtures', 'examples', 'coverage'])
const MAX_FILES = 4000
const MAX_FILE_BYTES = 8 * 1024 * 1024
const MAX_MATCHES = 5

// This is an advisory check for the literal V3 wrapper in shipped code. Dynamic
// source construction still needs a producer-level test against the V4 codec.
const LEGACY_SOURCE = /\bsource\s*[:=]\s*\{[^{}]{0,512}\bkind\s*:\s*(['"])plugin\1/gu

function codePositions(text) {
  const positions = new Uint8Array(text.length)
  let state = 'code'
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const next = text[index + 1]
    if (state === 'line-comment') {
      if (char === '\n') state = 'code'
      continue
    }
    if (state === 'block-comment') {
      if (char === '*' && next === '/') { state = 'code'; index += 1 }
      continue
    }
    if (state !== 'code') {
      if (char === '\\') { index += 1; continue }
      if (char === state) state = 'code'
      continue
    }
    if (char === '/' && next === '/') { state = 'line-comment'; index += 1; continue }
    if (char === '/' && next === '*') { state = 'block-comment'; index += 1; continue }
    if (char === '"' || char === "'" || char === '`') { state = char; continue }
    positions[index] = 1
  }
  return positions
}

/** Scan only the installed plugin package, never its private dependencies. */
export async function scanGenerationV4MessageSources(generation) {
  const packageRoot = join(generation.directory, 'node_modules', generation.pluginName)
  const matches = []
  let inspected = 0
  let incomplete = false

  async function walk(directory) {
    if (inspected >= MAX_FILES || matches.length >= MAX_MATCHES) {
      incomplete = true
      return
    }
    const entries = await readdir(directory, { withFileTypes: true })
    for (const entry of entries) {
      if (inspected >= MAX_FILES || matches.length >= MAX_MATCHES) {
        incomplete = true
        break
      }
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
      const path = join(directory, entry.name)
      if (entry.isDirectory()) {
        if (!SKIP_DIRECTORIES.has(entry.name)) await walk(path)
        continue
      }
      if (!entry.isFile() || !CODE_EXTENSIONS.has(extname(entry.name))) continue
      inspected += 1
      const info = await lstat(path)
      if (!info.isFile() || info.size > MAX_FILE_BYTES) {
        incomplete = true
        continue
      }
      const code = await readFile(path, 'utf8')
      const positions = codePositions(code)
      for (const match of code.matchAll(LEGACY_SOURCE)) {
        if (positions[match.index] !== 1) continue
        const file = relative(packageRoot, path).split(sep).join('/')
        const line = code.slice(0, match.index).split('\n').length
        matches.push({ file, line })
        if (matches.length >= MAX_MATCHES) {
          incomplete = true
          break
        }
      }
    }
  }

  await walk(packageRoot)
  return { matches, incomplete }
}
