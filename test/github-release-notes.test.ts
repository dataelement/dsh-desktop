import { execFile as execFileCallback } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { afterEach, describe, expect, it } from 'vitest'

const execFile = promisify(execFileCallback)
const projectRoot = path.resolve(import.meta.dirname, '..')
const script = path.join(projectRoot, '.github/scripts/github_release_notes.py')
const roots: string[] = []

afterEach(async () => {
  await Promise.all(roots.splice(0).map((r) => rm(r, { recursive: true, force: true })))
})

async function work(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), 'dsh-ghnotes-'))
  roots.push(dir)
  return dir
}

const run = (args: string[]) => execFile('python3', [script, ...args], { cwd: projectRoot, timeout: 20_000 })

const VALID = `# DSH Desktop v9.9.9 — 测试主题

## 更新内容

### 分组一

- 一条面向用户的改进。

## 说明

- 客户端内可直接更新。
`

describe('github_release_notes build-prompt', () => {
  // Reading repository history and generating diffs can exceed the default
  // five seconds on native Intel CI. Keep the subprocess independently bounded.
  it('emits the evidence blocks, the style reference, and the Chinese contract', { timeout: 30_000 }, async () => {
    const dir = await work()
    const out = path.join(dir, 'prompt.txt')
    await run(['build-prompt', '--tag', 'v9.9.9', '--output', out])
    const prompt = await readFile(out, 'utf8')
    for (const tag of ['<commit-details>', '<diff-statistics>', '<code-diff>', '<style-reference>']) {
      expect(prompt).toContain(tag)
    }
    expect(prompt).toContain('# DSH Desktop v9.9.9 — ')
    expect(prompt).toContain('## 更新内容')
    expect(prompt).toContain('## 问题修复')
    expect(prompt).toContain('## 升级说明')
    expect(prompt).toContain('## 说明')
  })
})

describe('github_release_notes validate', () => {
  it('accepts a well-formed Chinese note', async () => {
    const dir = await work()
    const file = path.join(dir, 'n.md')
    await writeFile(file, VALID, 'utf8')
    await expect(run(['validate', '--tag', 'v9.9.9', '--input', file])).resolves.toBeDefined()
  })

  it('rejects a wrong title prefix, a stray H2, a link, an empty file, and shell-only notes', async () => {
    const dir = await work()
    const cases: Record<string, string> = {
      'bad-title.md': VALID.replace('# DSH Desktop v9.9.9 — 测试主题', '# Something else'),
      'stray-h2.md': `${VALID}\n## 内部重构\n\n- x\n`,
      'link.md': VALID.replace('一条面向用户的改进。', '见 https://github.com/x/y/pull/1'),
      'empty.md': '',
      'title-only-shell.md': '# DSH Desktop v9.9.9 — 版本更新\n',
      'no-h2.md': '# DSH Desktop v9.9.9 — 测试主题\n\n- 仅有正文无分类标题\n'
    }
    for (const [name, body] of Object.entries(cases)) {
      const file = path.join(dir, name)
      await writeFile(file, body, 'utf8')
      await expect(run(['validate', '--tag', 'v9.9.9', '--input', file])).rejects.toBeDefined()
    }
  })
})

describe('github_release_notes generate-fallback', () => {
  it('produces a note that passes validate and starts with the contract title', { timeout: 30_000 }, async () => {
    const dir = await work()
    const file = path.join(dir, 'fb.md')
    await run(['generate-fallback', '--tag', 'v9.9.9', '--output', file])
    const body = await readFile(file, 'utf8')
    expect(body.startsWith('# DSH Desktop v9.9.9 — ')).toBe(true)
    // A fixes-only branch legitimately emits 问题修复 without 更新内容.
    expect(body).toMatch(/^## (更新内容|问题修复)$/m)
    await expect(run(['validate', '--tag', 'v9.9.9', '--input', file])).resolves.toBeDefined()
  })
})
