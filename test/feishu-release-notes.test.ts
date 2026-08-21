import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('Feishu release notes pipeline', () => {
  const scriptPath = join(process.cwd(), '.github', 'scripts', 'feishu_release_notes.py')
  const workflowPath = join(process.cwd(), '.github', 'workflows', 'release.yml')

  const pythonEnv = { ...process.env, PYTHONIOENCODING: 'utf-8' }

  it('builds a prompt with valid metadata and evidence blocks', () => {
    const output = execFileSync('python3', [scriptPath, 'build-prompt', '--tag', 'v0.4.0'], {
      encoding: 'utf8',
      env: pythonEnv
    })

    expect(output).toContain("You are DSH Desktop's Release Bot.")
    expect(output).toContain('## DSH Desktop v0.4.0 Release Note')
    expect(output).toContain('📢 大家可以直接在客户端中更新。')
    expect(output).toContain('📢 You can update directly from the DSH Desktop app.')
    expect(output).toContain('<tag-release-note>')
    expect(output).toContain('<commit-details>')
    expect(output).toContain('<diff-statistics>')
    expect(output).toContain('<code-diff>')
  }, 60_000)

  it('generates deterministic fallback release notes that pass validation', () => {
    const tempFile = join(process.cwd(), '.temp-feishu-test-notes.md')
    try {
      execFileSync('python3', [scriptPath, 'generate-fallback', '--tag', 'v0.4.0', '--output', tempFile], {
        encoding: 'utf8',
        env: pythonEnv
      })

      const content = readFileSync(tempFile, 'utf8')
      expect(content).toContain('## DSH Desktop v0.4.0 Release Note')
      expect(content).toContain('📢 大家可以直接在客户端中更新。')
      expect(content).toContain('📢 You can update directly from the DSH Desktop app.')
      expect(content).toContain('---')

      // Validate passes without error
      const validateOutput = execFileSync('python3', [scriptPath, 'validate', '--tag', 'v0.4.0', '--input', tempFile], {
        encoding: 'utf8',
        env: pythonEnv
      })
      expect(validateOutput).toContain('validated successfully')
    } finally {
      try {
        unlinkSync(tempFile)
      } catch {}
    }
  }, 60_000)

  it('rejects invalid markdown with links or incorrect headings', () => {
    const tempFile = join(process.cwd(), '.temp-invalid-feishu-notes.md')
    try {
      // Invalid because it contains a link
      const invalidContent = `## DSH Desktop v0.4.0 Release Note

📢 大家可以直接在客户端中更新。

**🚀 1. 标题**

这是一个说明 [查看更多](https://example.com)。

---

## DSH Desktop v0.4.0 Release Note

📢 You can update directly from the DSH Desktop app.

**🚀 1. Title**

Description here.
`
      writeFileSync(tempFile, invalidContent, 'utf8')

      expect(() => {
        execFileSync('python3', [scriptPath, 'validate', '--tag', 'v0.4.0', '--input', tempFile], {
          encoding: 'utf8',
          stdio: 'pipe',
          env: pythonEnv
        })
      }).toThrow()
    } finally {
      try {
        unlinkSync(tempFile)
      } catch {}
    }
  })

  it('generates release notes using generate command with automatic validation', () => {
    const tempFile = join(process.cwd(), '.temp-generate-notes.md')
    try {
      execFileSync('python3', [scriptPath, 'generate', '--tag', 'v0.4.0', '--output', tempFile], {
        encoding: 'utf8',
        env: pythonEnv
      })

      const content = readFileSync(tempFile, 'utf8')
      expect(content).toContain('## DSH Desktop v0.4.0 Release Note')
      expect(content).toContain('📢 大家可以直接在客户端中更新。')
      expect(content).toContain('📢 You can update directly from the DSH Desktop app.')
    } finally {
      try {
        unlinkSync(tempFile)
      } catch {}
    }
  }, 60_000)

  it('integrates Feishu release notification into GitHub Actions workflow', () => {
    const workflow = readFileSync(workflowPath, 'utf8')
    expect(workflow).toContain('feishu_release_notes.py generate')
    expect(workflow).toContain('feishu_release_notes.py send')
    expect(workflow).toContain('FEISHU_RELEASE_WEBHOOK')
  })
})
