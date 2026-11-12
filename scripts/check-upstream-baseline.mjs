import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkBaseline, parseBaseline, resolvedDshVersion } from './upstream-baseline.mjs'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const baseline = parseBaseline(JSON.parse(await readFile(resolve(root, 'upstream-baseline.json'), 'utf8')))
const lock = JSON.parse(await readFile(resolve(root, 'package-lock.json'), 'utf8'))
const errors = checkBaseline(baseline, { lockVersion: resolvedDshVersion(lock), root })

if (errors.length === 0) {
  console.log(`upstream baseline ${baseline.dshVersion} 与锁文件一致，已登记模块都在仓库里`)
  process.exit(0)
}

for (const error of errors) console.error(error.message)
console.error('upstream baseline 检查失败。已登记但尚未移植的模块会报路径缺失，补上文件后应消失。')
process.exit(1)
