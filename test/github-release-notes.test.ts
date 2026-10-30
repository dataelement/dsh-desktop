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

const VALID = `[中文](#cn-9.9.9) | [English](#en-9.9.9)

本版本汇总了自上个版本以来的主要改动。

<h3 id="cn-9.9.9">新增功能</h3>

- 一条面向用户的改进。

### 问题修复

- 修复了若干稳定性问题。

---

This release summarizes key changes since the previous version.

<h3 id="en-9.9.9">Features</h3>

- A user-facing improvement.

### Bug Fixes

- Fixed multiple stability issues.
`

describe('github_release_notes build-prompt', () => {
  // Reading repository history and generating diffs can exceed the default
  // five seconds on native Intel CI. Keep the subprocess independently bounded.
  it('emits the evidence blocks, the style reference, and the bilingual contract', { timeout: 30_000 }, async () => {
    const dir = await work()
    const out = path.join(dir, 'prompt.txt')
    await run(['build-prompt', '--tag', 'v9.9.9', '--output', out])
    const prompt = await readFile(out, 'utf8')
    for (const tag of ['<commit-details>', '<diff-statistics>', '<code-diff>', '<style-reference>']) {
      expect(prompt).toContain(tag)
    }
    expect(prompt).toContain('[中文](#cn-9.9.9) | [English](#en-9.9.9)')
    expect(prompt).toContain('新增功能')
    expect(prompt).toContain('Features')
  })
})

describe('github_release_notes validate', () => {
  it('accepts a well-formed bilingual note', async () => {
    const dir = await work()
    const file = path.join(dir, 'n.md')
    await writeFile(file, VALID, 'utf8')
    await expect(run(['validate', '--tag', 'v9.9.9', '--input', file])).resolves.toBeDefined()
  })

  it('rejects missing navigation, missing divider, external links, empty files, and single-language notes', async () => {
    const dir = await work()
    const cases: Record<string, string> = {
      'no-nav.md': VALID.replace('[中文](#cn-9.9.9) | [English](#en-9.9.9)', ''),
      'no-divider.md': VALID.replace('---', ''),
      'external-link.md': VALID.replace('一条面向用户的改进。', '见 https://github.com/x/y/pull/1'),
      'empty.md': '',
      'cn-only.md': VALID.slice(0, VALID.indexOf('---')),
      'en-only.md': `[中文](#cn-9.9.9) | [English](#en-9.9.9)\n---\n` + VALID.slice(VALID.indexOf('---') + 3)
    }
    for (const [name, body] of Object.entries(cases)) {
      const file = path.join(dir, name)
      await writeFile(file, body, 'utf8')
      await expect(run(['validate', '--tag', 'v9.9.9', '--input', file])).rejects.toBeDefined()
    }
  })
})

describe('github_release_notes generate-fallback', () => {
  it('produces a bilingual note that passes validate and starts with the navigation bar', { timeout: 30_000 }, async () => {
    const dir = await work()
    const file = path.join(dir, 'fb.md')
    await run(['generate-fallback', '--tag', 'v9.9.9', '--output', file])
    const body = await readFile(file, 'utf8')
    expect(body.startsWith('[中文](#cn-9.9.9) | [English](#en-9.9.9)')).toBe(true)
    expect(body).toContain('---')
    expect(body).toContain('Features')
    await expect(run(['validate', '--tag', 'v9.9.9', '--input', file])).resolves.toBeDefined()
  })
})
