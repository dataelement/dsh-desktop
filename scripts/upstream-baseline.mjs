import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'

const SOURCE_PREFIXES = ['apps/desktop/src/', 'apps/desktop-host/src/']
const LOCK_PACKAGE = 'node_modules/@deepseek-ai/dsh'

export function parseBaseline(value) {
  if (!isRecord(value)) throw new Error('upstream-baseline.json 必须是对象')
  const repository = requiredString(value, 'repository')
  const commit = requiredString(value, 'commit')
  const dshVersion = requiredString(value, 'dshVersion')
  if (!Array.isArray(value.modules)) throw new Error('modules 必须是数组')
  if (!Array.isArray(value.skipped)) throw new Error('skipped 必须是数组')
  const modules = value.modules.map(parseModule)
  const skipped = value.skipped.map((item, index) => {
    if (typeof item !== 'string' || item.length === 0) throw new Error(`skipped[${index}] 必须是非空字符串`)
    return item
  })
  const paths = new Set()
  const upstream = new Set()
  for (const module of modules) {
    if (paths.has(module.path)) throw new Error(`模块路径重复: ${module.path}`)
    paths.add(module.path)
    for (const file of module.upstream) {
      if (upstream.has(file)) throw new Error(`上游文件重复登记: ${file}`)
      if (skipped.includes(file)) throw new Error(`上游文件同时出现在 modules 和 skipped: ${file}`)
      upstream.add(file)
    }
  }
  return { repository, commit, dshVersion, modules, skipped }
}

export function resolvedDshVersion(lock) {
  const installed = isRecord(lock) && isRecord(lock.packages) ? lock.packages[LOCK_PACKAGE] : undefined
  const version = isRecord(installed) ? installed.version : undefined
  if (typeof version !== 'string' || version.length === 0) {
    throw new Error('package-lock.json 没有 node_modules/@deepseek-ai/dsh 的 version')
  }
  return version
}

export function checkBaseline(baseline, { lockVersion, root }) {
  const errors = []
  if (baseline.dshVersion !== lockVersion) {
    errors.push({
      code: 'version-mismatch',
      message: `基线 dshVersion ${baseline.dshVersion} 与锁文件 ${lockVersion} 不一致`
    })
  }
  for (const module of baseline.modules) {
    if (!isInsideRoot(root, module.path)) {
      errors.push({ code: 'missing-path', path: module.path, message: `路径越界: ${module.path}` })
      continue
    }
    if (!existsSync(resolve(root, module.path))) {
      errors.push({ code: 'missing-path', path: module.path, message: `缺少 ${module.path}` })
    }
  }
  return errors
}

export function diffReport(before, after, baseline) {
  const registered = new Set([
    ...baseline.modules.flatMap(module => module.upstream),
    ...baseline.skipped
  ])
  const unregistered = [...after.keys()]
    .filter(file => !before.has(file) && !registered.has(file))
    .sort()
  const changes = []
  for (const module of baseline.modules) {
    const files = module.upstream.filter(file => before.get(file) !== after.get(file))
    if (files.length > 0) changes.push({ path: module.path, files })
  }
  return { changes, unregistered }
}

export function isUpstreamDesktopSource(file) {
  return SOURCE_PREFIXES.some(prefix => file.startsWith(prefix))
}

export async function ensureRepository(repository, cacheRoot) {
  if (!/^https?:\/\//.test(repository) && !repository.startsWith('git@')) return repository
  const dest = join(cacheRoot, 'repo.git')
  if (!existsSync(join(dest, 'HEAD'))) {
    await mkdir(cacheRoot, { recursive: true })
    await git(cacheRoot, ['clone', '--bare', repository, dest])
  }
  return dest
}

export async function readDesktopSources(repository, commit) {
  const listing = await git(repository, ['ls-tree', '-r', '--name-only', commit])
  const files = listing.split('\n').map(line => line.trim()).filter(isUpstreamDesktopSource).sort()
  const contents = new Map()
  for (const file of files) {
    contents.set(file, await git(repository, ['show', `${commit}:${file}`]))
  }
  return contents
}

export async function cacheDesktopSources(repository, commit, cacheRoot) {
  const dest = join(cacheRoot, commit)
  const marker = join(dest, '.complete')
  if (existsSync(marker) && await readFile(marker, 'utf8') === commit) return readCached(dest)
  const contents = await readDesktopSources(repository, commit)
  for (const [file, text] of contents) {
    const target = join(dest, file)
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, text)
  }
  await writeFile(marker, commit)
  return contents
}

function parseModule(value, index) {
  if (!isRecord(value)) throw new Error(`modules[${index}] 必须是对象`)
  const path = requiredString(value, 'path', `modules[${index}]`)
  if (!Array.isArray(value.upstream) || value.upstream.length === 0) {
    throw new Error(`modules[${index}].upstream 必须是非空数组`)
  }
  if (!Array.isArray(value.divergences)) throw new Error(`modules[${index}].divergences 必须是数组`)
  return {
    path,
    upstream: value.upstream.map((file, fileIndex) => {
      if (typeof file !== 'string' || file.length === 0) {
        throw new Error(`modules[${index}].upstream[${fileIndex}] 必须是非空字符串`)
      }
      return file
    }),
    divergences: value.divergences.map((item, itemIndex) => {
      if (typeof item !== 'string') throw new Error(`modules[${index}].divergences[${itemIndex}] 必须是字符串`)
      return item
    })
  }
}

async function readCached(dest) {
  const contents = new Map()
  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name === '.complete') continue
      const full = join(dir, entry.name)
      if (entry.isDirectory()) await walk(full)
      else if (entry.isFile()) contents.set(relative(dest, full).split(sep).join('/'), await readFile(full, 'utf8'))
    }
  }
  await walk(dest)
  return contents
}

function isInsideRoot(root, file) {
  if (typeof file !== 'string' || file.length === 0 || isAbsolute(file) || file.split('/').includes('..')) return false
  const full = resolve(root, file)
  const rel = relative(root, full)
  return rel !== '' && !rel.startsWith(`..${sep}`) && rel !== '..'
}

function requiredString(value, key, label = 'baseline') {
  const item = value[key]
  if (typeof item !== 'string' || item.length === 0) throw new Error(`${label}.${key} 必须是非空字符串`)
  return item
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function git(cwd, args) {
  return new Promise((resolvePromise, reject) => {
    execFile('git', args, { cwd, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }, (error, stdout) => {
      if (error) reject(error)
      else resolvePromise(stdout)
    })
  })
}
