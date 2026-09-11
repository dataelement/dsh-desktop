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
    expect(patch).toContain('#L\\d+')
    expect(patch).toContain('[A-Za-z]:[\\\\/]')
    // Upstream bails out of `forClosing` when the turn produced and presented
    // nothing; the patch drops that guard so a mention still resolves against
    // an empty deliverable set.
    expect(patch).toContain('-\t\t\t\tif (paths === null && presented.length === 0) return void 0;')
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
      '@deepseek-ai/dsh@0.1.2-rc.1',
      '@foo/bar',
      '@foo/bar@1.0.0',
      '@plugin/name',
      '@plugin/name@2.3.4-beta.1',
      'user@example.com',
      'first.last@sub.example.co',
    ]) {
      expect(localPathReference(value), value).toBeUndefined()
    }
  })

  it('keeps bare version tokens inert', async () => {
    const localPathReference = await loadLocalPathReference()

    for (const value of [
      'v0.8.0',
      '0.8.0',
      '1.2.3-rc.1',
      '0.1.5-rc.1',
      'v1.0.0-beta.2',
    ]) {
      expect(localPathReference(value), value).toBeUndefined()
    }
  })

  it('still resolves paths that merely contain an @ segment', async () => {
    const localPathReference = await loadLocalPathReference()

    for (const value of [
      './@scope/pkg',
      '/tmp/@scope/pkg/index.js',
      'patches/@deepseek-ai+dsh-client-ui-deliverables+0.1.5-rc.2.patch',
      'node_modules/@foo/bar/lib/client.js',
      '@scope/pkg@1.2.3/dist/index.js',
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
