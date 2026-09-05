import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { patchPath } from './patch-path'

/**
 * The patch is the source of truth for this helper: `node_modules` may hold a
 * different Harness build than the one the patch targets, so read the added
 * lines straight out of the patch and evaluate them.
 */
async function loadLocalPathReference(): Promise<
  (value: string) => string | undefined
> {
  const patch = await readFile(
    patchPath('@deepseek-ai/dsh-client-ui-deliverables'),
    'utf8'
  )
  const added = patch
    .split('\n')
    .filter((line) => line.startsWith('+') && !line.startsWith('+++'))
    .map((line) => line.slice(1))
    .join('\n')
  // The function's closing brace is a context line, not an added one, so the
  // extracted body stops at the last `return` and is closed here.
  const source = added.match(
    /function localPathReference\(value\) \{[\s\S]*?\n\t\t\treturn void 0;/
  )?.[0]

  expect(source).toBeDefined()
  return new Function(
    `${source}\n}; return localPathReference`
  )() as (value: string) => string | undefined
}

describe('assistant local path links', () => {
  it('links Codex-style path references even when they are not turn deliverables', async () => {
    const patch = await readFile(
      patchPath('@deepseek-ai/dsh-client-ui-deliverables'),
      'utf8'
    )

    expect(patch).toContain('localPathReference(value)')
    expect(patch).toContain('paths ?? []')
    expect(patch).toContain('#L\\d+')
    expect(patch).toContain('[A-Za-z]:[\\\\/]')
    expect(patch).toContain('owner.openFile')
  })

  it('resolves real local paths', async () => {
    const localPathReference = await loadLocalPathReference()

    for (const value of [
      'src/main.ts',
      './scripts/build.mjs',
      '../sibling/file.txt',
      'C:\\Users\\me\\file.txt',
      '/etc/hosts',
      '~/notes.md',
      'package.json',
      'vitest.config.ts',
      'docs/',
    ]) {
      expect(localPathReference(value), value).toBe(value)
    }
  })

  it('keeps scoped package names and email addresses inert', async () => {
    const localPathReference = await loadLocalPathReference()

    for (const value of [
      '@deepseek-ai/cordis',
      '@deepseek-ai/dsh-client-ui-deliverables',
      '@foo/bar',
      '@plugin/name',
      'user@example.com',
      'first.last@sub.example.co',
    ]) {
      expect(localPathReference(value), value).toBeUndefined()
    }
  })

  it('still resolves paths that merely contain an @ segment', async () => {
    const localPathReference = await loadLocalPathReference()

    for (const value of [
      './@scope/pkg',
      '/tmp/@scope/pkg/index.js',
      'patches/@deepseek-ai+dsh-client-ui-deliverables+0.1.2-rc.1.patch',
      'node_modules/@foo/bar/lib/client.js',
    ]) {
      expect(localPathReference(value), value).toBe(value)
    }
  })

  it('keeps bare identifiers and commands inert', async () => {
    const localPathReference = await loadLocalPathReference()

    for (const value of ['npm install', 'someFunction', '', '   ']) {
      expect(localPathReference(value), value).toBeUndefined()
    }
  })

  it('strips line and column suffixes from resolved paths', async () => {
    const localPathReference = await loadLocalPathReference()

    expect(localPathReference('src/main.ts#L42')).toBe('src/main.ts')
    expect(localPathReference('src/main.ts:42:7')).toBe('src/main.ts')
  })
})
