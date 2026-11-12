import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { cacheDesktopSources, diffReport, ensureRepository, parseBaseline } from './upstream-baseline.mjs'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const args = parseArgs(process.argv.slice(2))
const baselinePath = args.baseline ?? resolve(root, 'upstream-baseline.json')
const baseline = parseBaseline(JSON.parse(await readFile(baselinePath, 'utf8')))
const from = args.from ?? baseline.commit
const to = args.to
if (!to) {
  console.error('用法: node scripts/upstream-diff.mjs --to <commit> [--from <commit>] [--repository <path-or-url>] [--cache <dir>] [--baseline <file>]')
  process.exit(2)
}

const cacheRoot = args.cache ?? resolve(root, '.upstream-cache')
const repository = await ensureRepository(args.repository ?? `https://github.com/${baseline.repository}.git`, cacheRoot)
const before = await cacheDesktopSources(repository, from, cacheRoot)
const after = await cacheDesktopSources(repository, to, cacheRoot)
const report = diffReport(before, after, baseline)

if (report.changes.length === 0) console.log('没有模块改动')
for (const change of report.changes) {
  console.log(`模块 ${change.path}`)
  for (const file of change.files) console.log(`  ${file}`)
}

if (report.unregistered.length === 0) {
  console.log('没有未登记的新文件')
  process.exit(0)
}

console.error('未登记的新文件')
for (const file of report.unregistered) console.error(`  ${file}`)
process.exit(1)

function parseArgs(argv) {
  const result = {}
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (token === '--from' || token === '--to' || token === '--repository' || token === '--cache' || token === '--baseline') {
      const value = argv[index + 1]
      if (!value || value.startsWith('--')) throw new Error(`${token} 缺少参数`)
      result[token.slice(2)] = value
      index += 1
      continue
    }
    throw new Error(`未知参数 ${token}`)
  }
  return result
}
