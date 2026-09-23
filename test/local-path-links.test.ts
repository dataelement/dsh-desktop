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

function basename(path: string): string {
  const at = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
  return at === -1 ? path : path.slice(at + 1)
}

/** Mirrors `producedFileMentions`: exact path, then a unique basename, then the heuristic. */
function resolveProducedMention(
  paths: readonly string[],
  value: string,
  localPathReference: (value: string) => string | undefined
): string | undefined {
  const matches = paths.filter((path) => basename(path) === value)
  const onlyBasename = matches.length === 1 ? matches[0] : undefined
  return paths.includes(value) ? value : onlyBasename ?? localPathReference(value)
}

describe('assistant local path links', () => {
  it('links explicit path references even when they are not turn deliverables', async () => {
    const patch = await readFile(
      patchPath('@deepseek-ai/dsh-client-ui-deliverables'),
      'utf8'
    )

    expect(patch).toContain(
      'paths.includes(value) ? value : onlyPathWithBasename(paths, value) ?? localPathReference(value)'
    )
    expect(patch).toContain('#L\\d+')
    expect(patch).toContain('[A-Za-z]:[\\\\/]')
    expect(patch).toContain('[A-Za-z][A-Za-z0-9+.-]*:\\/\\/')
    // Upstream bails out of `forClosing` when the turn produced and presented
    // nothing; the patch drops that guard so a mention still resolves against
    // an empty deliverable set.
    expect(patch).toContain('-\t\t\t\tif (paths === null && presented.length === 0) return void 0;')
  })

  it('resolves directory paths and explicit prefixes', async () => {
    const localPathReference = await loadLocalPathReference()

    for (const value of [
      'src/main.ts',
      './scripts/build.mjs',
      '../sibling/file.txt',
      'C:\\Users\\me\\file.txt',
      'C:/Users/me/file.txt',
      '/etc/hosts',
      '~/notes.md',
      'docs/',
      'node_modules/@foo/bar/lib/client.js',
      '@scope/pkg@1.2.3/dist/index.js',
      'patches/@deepseek-ai+dsh-client-ui-deliverables+0.1.5-rc.2.patch',
      './@scope/pkg',
      '/tmp/@scope/pkg/index.js',
    ]) {
      expect(localPathReference(value), value).toBe(value)
    }
  })

  it('keeps ordinary inline code, bare names, and URIs inert', async () => {
    const localPathReference = await loadLocalPathReference()

    for (const value of [
      'console.log',
      'process.env',
      'JSON.parse',
      'application/json',
      'CI/CD',
      'and/or',
      '\\n',
      '\\t',
      '@deepseek-ai/dsh@0.1.2-rc.1',
      '@foo/bar',
      '@foo/bar@1.0.0',
      'user@example.com',
      'v0.8.0',
      '1.2.3-rc.1',
      'package.json',
      'vitest.config.ts',
      'README',
      'src/components',
      'owner/repo',
      'file:///tmp/report.txt',
      'ftp://host/report.txt',
      'ws://host/socket.js',
      'git+ssh://host/repo.js',
      'https://example.com/a.txt',
      'data:text/plain,hi',
      'javascript:alert(1)',
      'dir\\file.txt',
      'npm install',
      'someFunction',
      '',
      '   ',
    ]) {
      expect(localPathReference(value), value).toBeUndefined()
    }
  })

  it('strips line and column suffixes from resolved paths', async () => {
    const localPathReference = await loadLocalPathReference()

    expect(localPathReference('src/main.ts#L42')).toBe('src/main.ts')
    expect(localPathReference('src/main.ts:42:7')).toBe('src/main.ts')
    expect(localPathReference('~/notes.md#L10')).toBe('~/notes.md')
  })

  it('prefers a produced path or unique basename over the heuristic', async () => {
    const localPathReference = await loadLocalPathReference()

    expect(resolveProducedMention(['src/package.json'], 'package.json', localPathReference)).toBe(
      'src/package.json'
    )
    expect(
      resolveProducedMention(['src/package.json'], 'src/package.json', localPathReference)
    ).toBe('src/package.json')
    expect(
      resolveProducedMention(['a/index.ts', 'b/index.ts'], 'index.ts', localPathReference)
    ).toBeUndefined()
    expect(resolveProducedMention([], 'console.log', localPathReference)).toBeUndefined()
    expect(resolveProducedMention([], 'src/main.ts', localPathReference)).toBe('src/main.ts')
  })
})
