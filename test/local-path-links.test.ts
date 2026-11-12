import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { patchPath } from './patch-path'

interface LocalPath {
  path: string
  kind: 'file' | 'folder'
  line?: number
}

/**
 * The patch is the source of truth for this helper: `node_modules` may hold a
 * different Harness build than the one the patch targets, so read the added
 * lines straight out of the patch and evaluate them.
 */
async function loadLocalPathReference(): Promise<
  (value: string) => LocalPath | undefined
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
  const splitLineSuffix = extractFunction(added, 'splitLineSuffix')
  const source = extractFunction(added, 'localPathReference')
  const rawSuffix = extractFunction(added, 'rawSuffix')
  const extension = extractFunction(added, 'fileExtensionOf')
  expect(splitLineSuffix).toBeDefined()
  expect(source).toBeDefined()
  expect(rawSuffix).toBeDefined()
  expect(extension).toBeDefined()
  return new Function(
    `${splitLineSuffix}\n${source}\n${rawSuffix}\n${extension}\nreturn localPathReference`
  )() as (value: string) => LocalPath | undefined
}

/** Pull one `function name(...) { ... }` out of the patch's added source. */
function extractFunction(source: string, name: string): string | undefined {
  const start = source.indexOf(`function ${name}(`)
  if (start < 0) return undefined
  const open = source.indexOf('{', start)
  let depth = 0
  for (let index = open; index < source.length; index += 1) {
    const char = source[index]
    if (char === '{') depth += 1
    else if (char === '}') {
      depth -= 1
      if (depth === 0) return source.slice(start, index + 1)
    }
  }
  return undefined
}

describe('assistant local path links', () => {
  it('keeps produced paths ahead of the heuristic and opens folders outside preview', async () => {
    const patch = await readFile(
      patchPath('@deepseek-ai/dsh-client-ui-deliverables'),
      'utf8'
    )
    const primitives = await readFile(
      patchPath('@deepseek-ai/dsh-client-ui-primitives'),
      'utf8'
    )
    const chat = await readFile(
      patchPath('@deepseek-ai/dsh-client-ui-chat'),
      'utf8'
    )

    expect(patch).toContain('onlyPathWithBasename(paths, value)')
    expect(patch).toContain('localPathReference(value)')
    expect(patch).toContain('revealInFileManager: true')
    expect(patch).toContain('kind === "folder"')
    expect(patch).toContain('presented.openFolder')
    expect(patch).toContain('在文件管理器中打开 {name}')
    // Upstream bails out of `forClosing` when the turn produced and presented
    // nothing; the patch drops that guard so a mention still resolves against
    // an empty deliverable set.
    expect(patch).toContain('-\t\t\t\tif (paths === null && presented.length === 0) return void 0;')
    expect(primitives).toContain('mention.kind === "folder" ? "folder"')
    expect(primitives).toContain('kind?: "file" | "folder"')
    expect(chat).toContain('options?.revealInFileManager === true')
    expect(chat).toContain('openWorkspacePath({ path: hostPathForOpen(cwd, workingPath) })')
    expect(chat).toContain('if (!opened.ok) throw opened.error')
    expect(chat).toContain('requestOpenFile(fileOpenError.path, fileOpenError.options)')
    expect(chat).toContain('readonly revealInFileManager?: boolean')
  })

  it('resolves workspace files and explicit directories', async () => {
    const localPathReference = await loadLocalPathReference()

    expect(localPathReference('src/main.ts')).toEqual({ path: 'src/main.ts', kind: 'file' })
    expect(localPathReference('./scripts/build.mjs')).toEqual({
      path: './scripts/build.mjs',
      kind: 'file'
    })
    expect(localPathReference('../sibling/file.txt')).toEqual({
      path: '../sibling/file.txt',
      kind: 'file'
    })
    expect(localPathReference('C:\\Users\\me\\file.txt')).toEqual({
      path: 'C:\\Users\\me\\file.txt',
      kind: 'file'
    })
    expect(localPathReference('~/notes.md')).toEqual({ path: '~/notes.md', kind: 'file' })
    expect(localPathReference('node_modules/@foo/bar/lib/client.js')).toEqual({
      path: 'node_modules/@foo/bar/lib/client.js',
      kind: 'file'
    })
    expect(localPathReference('docs/')).toEqual({ path: 'docs/', kind: 'folder' })
    expect(localPathReference('/etc/hosts')).toEqual({ path: '/etc/hosts', kind: 'folder' })
    expect(localPathReference('/private/tmp/somedir')).toEqual({
      path: '/private/tmp/somedir',
      kind: 'folder'
    })
    expect(localPathReference('/private/tmp/dsh-market-installer.EZeHSP')).toEqual({
      path: '/private/tmp/dsh-market-installer.EZeHSP',
      kind: 'folder'
    })
    expect(localPathReference('dsh-main-acceptance.UWeor9')).toEqual({
      path: 'dsh-main-acceptance.UWeor9',
      kind: 'folder'
    })
    expect(localPathReference('dsh-rc7-audit.XvPgKX/desktop')).toEqual({
      path: 'dsh-rc7-audit.XvPgKX/desktop',
      kind: 'folder'
    })
  })

  it('keeps branch names, packages, emails, versions, and bare tokens inert', async () => {
    const localPathReference = await loadLocalPathReference()

    for (const value of [
      'codex/startup-timing-diagnostics',
      'codex/windows-titlebar-menu',
      'origin/main',
      'src/components',
      'application/json',
      'CI/CD',
      '@deepseek-ai/cordis',
      '@foo/bar@1.0.0',
      'user@example.com',
      'v0.8.0',
      '0.8.0',
      '1.2.3-rc.1',
      'console.log',
      'process.env',
      'package.json',
      'file:///tmp/report.txt',
      'https://example.com/src/main.ts',
      'ftp://host/report.txt',
      'ws://host/socket.js',
      'npm install',
      'someFunction',
      '',
      '   '
    ]) {
      expect(localPathReference(value), value).toBeUndefined()
    }
  })

  it('still resolves paths that merely contain an @ segment', async () => {
    const localPathReference = await loadLocalPathReference()

    expect(localPathReference('./@scope/pkg')).toEqual({ path: './@scope/pkg', kind: 'folder' })
    expect(localPathReference('/tmp/@scope/pkg/index.js')).toEqual({
      path: '/tmp/@scope/pkg/index.js',
      kind: 'file'
    })
    expect(localPathReference('patches/@deepseek-ai+dsh-client-ui-deliverables+0.1.6-alpha.2.patch')).toEqual({
      path: 'patches/@deepseek-ai+dsh-client-ui-deliverables+0.1.6-alpha.2.patch',
      kind: 'file'
    })
    expect(localPathReference('patches/@deepseek-ai+dsh-client-ui-deliverables+0.1.5-rc.2.patch')).toEqual({
      path: 'patches/@deepseek-ai+dsh-client-ui-deliverables+0.1.5-rc.2.patch',
      kind: 'file'
    })
    expect(localPathReference('@scope/pkg@1.2.3/dist/index.js')).toEqual({
      path: '@scope/pkg@1.2.3/dist/index.js',
      kind: 'file'
    })
  })

  it('strips line and column suffixes from resolved paths and preserves positive line numbers', async () => {
    const localPathReference = await loadLocalPathReference()

    expect(localPathReference('src/main.ts#L42')).toEqual({
      path: 'src/main.ts',
      kind: 'file',
      line: 42
    })
    expect(localPathReference('src/main.ts#L42C7')).toEqual({
      path: 'src/main.ts',
      kind: 'file',
      line: 42
    })
    expect(localPathReference('src/main.ts#L42-L50')).toEqual({
      path: 'src/main.ts',
      kind: 'file',
      line: 42
    })
    expect(localPathReference('src/main.ts:42:7')).toEqual({
      path: 'src/main.ts',
      kind: 'file',
      line: 42
    })
    expect(localPathReference('/Users/alex/Library/Logs/BISHENG/harness.log:10092')).toEqual({
      path: '/Users/alex/Library/Logs/BISHENG/harness.log',
      kind: 'file',
      line: 10092
    })
    expect(localPathReference('C:\\Users\\me\\file.txt:15')).toEqual({
      path: 'C:\\Users\\me\\file.txt',
      kind: 'file',
      line: 15
    })
    expect(localPathReference('src/main.ts:0')).toEqual({
      path: 'src/main.ts',
      kind: 'file'
    })
    expect(localPathReference('/private/tmp/somedir:10')).toEqual({
      path: '/private/tmp/somedir',
      kind: 'folder'
    })
  })

  it('forwards line numbers from produced and heuristic mentions to openFile', async () => {
    const deliverables = await readFile(
      'node_modules/@deepseek-ai/dsh-client-ui-deliverables/lib/client.js',
      'utf8'
    )
    const basenameFn = extractFunction(deliverables, 'basename')
    const producedFileMentionsFn = extractFunction(deliverables, 'producedFileMentions')
    const fileMentionFn = extractFunction(deliverables, 'fileMention')
    const splitLineSuffixFn = extractFunction(deliverables, 'splitLineSuffix')
    const localPathReferenceFn = extractFunction(deliverables, 'localPathReference')
    const rawSuffixFn = extractFunction(deliverables, 'rawSuffix')
    const fileExtensionOfFn = extractFunction(deliverables, 'fileExtensionOf')
    expect(basenameFn).toBeDefined()
    expect(producedFileMentionsFn).toBeDefined()

    const createMentions = new Function(
      `${basenameFn}\n${producedFileMentionsFn}\n${fileMentionFn}\n${splitLineSuffixFn}\n${localPathReferenceFn}\n${rawSuffixFn}\n${fileExtensionOfFn}\nreturn producedFileMentions`
    )() as (
      paths: readonly string[],
      openFile: (path: string, options?: { line?: number; revealInFileManager?: boolean }) => void,
      label: (path: string, kind?: string) => string
    ) => { resolve: (value: string) => { open: () => void; title: string; kind: string } | undefined }

    const calls: Array<{ path: string; options?: { line?: number; revealInFileManager?: boolean } }> = []
    const mentions = createMentions(
      ['/workspace/src/main.ts'],
      (path, options) => calls.push({ path, options }),
      (path) => path
    )

    const producedByBasename = mentions.resolve('main.ts:42:7')
    expect(producedByBasename?.title).toBe('/workspace/src/main.ts')
    producedByBasename?.open()

    const heuristicWithLine = mentions.resolve('/Users/alex/Library/Logs/BISHENG/harness.log:10092')
    expect(heuristicWithLine?.title).toBe('/Users/alex/Library/Logs/BISHENG/harness.log')
    heuristicWithLine?.open()

    expect(calls).toEqual([
      { path: '/workspace/src/main.ts', options: { line: 42 } },
      { path: '/Users/alex/Library/Logs/BISHENG/harness.log', options: { line: 10092 } }
    ])
  })

  it('parses colon and GitHub line suffixes in Markdown file links and normalizes chat openFile targets', async () => {
    const primitives = await readFile(
      'node_modules/@deepseek-ai/dsh-client-ui-primitives/lib/index.js',
      'utf8'
    )
    const parseFileLinkFn = extractFunction(primitives, 'parseFileLink')
    expect(parseFileLinkFn).toBeDefined()
    const parseFileLink = new Function(`${parseFileLinkFn}\nreturn parseFileLink`)() as (
      value: string
    ) => { path: string; line?: number } | undefined

    expect(parseFileLink('/Users/alex/Library/Logs/BISHENG/harness.log:10092')).toEqual({
      path: '/Users/alex/Library/Logs/BISHENG/harness.log',
      line: 10092
    })
    expect(parseFileLink('harness.log:10092')).toEqual({
      path: 'harness.log',
      line: 10092
    })
    expect(parseFileLink('src/main.ts:42:7')).toEqual({
      path: 'src/main.ts',
      line: 42
    })
    expect(parseFileLink('src/main.ts#L42C7-L50C2')).toEqual({
      path: 'src/main.ts',
      line: 42
    })
    expect(parseFileLink('http://example.com:8080')).toBeUndefined()
    expect(parseFileLink('localhost:8080')).toBeUndefined()

    const chat = await readFile(
      'node_modules/@deepseek-ai/dsh-client-ui-chat/lib/client.js',
      'utf8'
    )
    const normalizeFn = extractFunction(chat, 'normalizeOpenFileTarget')
    expect(normalizeFn).toBeDefined()
    const normalizeOpenFileTarget = new Function(`${normalizeFn}\nreturn normalizeOpenFileTarget`)() as (
      rawPath: string,
      options?: { line?: number; revealInFileManager?: boolean }
    ) => { path: string; options?: { line?: number; revealInFileManager?: boolean } }

    expect(normalizeOpenFileTarget('/Users/alex/Library/Logs/BISHENG/harness.log:10092')).toEqual({
      path: '/Users/alex/Library/Logs/BISHENG/harness.log',
      options: { line: 10092 }
    })
    expect(normalizeOpenFileTarget('src/main.ts#L18C3')).toEqual({
      path: 'src/main.ts',
      options: { line: 18 }
    })
    expect(normalizeOpenFileTarget('src/main.ts:18', { line: 99 })).toEqual({
      path: 'src/main.ts',
      options: { line: 99 }
    })
  })
})
