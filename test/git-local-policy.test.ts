import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const projectRoot = path.resolve(import.meta.dirname, '..')
const commitMessageHook = path.join(projectRoot, '.githooks', 'commit-msg')
const installer = path.join(projectRoot, 'scripts', 'install-local-git-policy.mjs')
const scratchDirectories: string[] = []

function checkMessage(message: string) {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'sherlock-commit-message-'))
  scratchDirectories.push(directory)
  const messagePath = path.join(directory, 'COMMIT_EDITMSG')
  writeFileSync(messagePath, `${message}\n`, 'utf8')
  return spawnSync(commitMessageHook, [messagePath], { encoding: 'utf8' })
}

afterEach(() => {
  for (const directory of scratchDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true })
  }
})

describe('local Git commit policy', () => {
  it('rejects a commit message without a Chinese explanation', () => {
    const result = checkMessage('fix: update bundled skill')

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('中文')
  })

  it('accepts a commit message that explains the change in Chinese', () => {
    const result = checkMessage('修复：同步正式版内置 Skill')

    expect(result.status).toBe(0)
  })

  it('installs the repository-owned hooks path into local Git configuration', () => {
    const repository = mkdtempSync(path.join(os.tmpdir(), 'sherlock-git-policy-'))
    scratchDirectories.push(repository)
    execFileSync('git', ['init', '-b', 'main'], { cwd: repository })
    mkdirSync(path.join(repository, '.githooks'))

    const result = spawnSync(process.execPath, [installer, '--repo', repository], {
      encoding: 'utf8'
    })

    expect(result.status).toBe(0)
    expect(
      execFileSync('git', ['config', '--local', '--get', 'core.hooksPath'], {
        cwd: repository,
        encoding: 'utf8'
      }).trim()
    ).toBe('.githooks')
  })
})
