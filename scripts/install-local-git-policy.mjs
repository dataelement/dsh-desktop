import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'

function readOption(name) {
  const index = process.argv.indexOf(name)
  if (index === -1) return undefined
  const value = process.argv[index + 1]
  if (!value || value.startsWith('--')) throw new Error(`${name} 缺少路径参数。`)
  return value
}

try {
  const repository = path.resolve(readOption('--repo') ?? process.cwd())
  if (!existsSync(path.join(repository, '.githooks'))) {
    throw new Error(`仓库缺少 .githooks 目录：${repository}`)
  }
  execFileSync('git', ['-C', repository, 'rev-parse', '--git-dir'], { stdio: 'ignore' })
  execFileSync(
    'git',
    ['-C', repository, 'config', '--local', 'core.hooksPath', '.githooks'],
    { stdio: 'inherit' }
  )
  console.log('已启用 Sherlock 本地 Git 规范：core.hooksPath=.githooks')
} catch (error) {
  console.error(`安装本地 Git 规范失败：${error instanceof Error ? error.message : error}`)
  process.exitCode = 1
}
