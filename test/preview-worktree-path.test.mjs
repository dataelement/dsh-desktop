import { readFile, mkdtemp, mkdir, writeFile, stat, rm } from 'node:fs/promises'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'

function bundledFunction(source, name) {
  const start = source.indexOf('function ' + name + '(')
  const end = source.indexOf('\n\t\t}', start)
  if (start < 0 || end < 0) throw new Error('Missing bundled function: ' + name)
  return source.slice(start, end + 4)
}
async function helpers() {
  const chat = await readFile(new URL('../node_modules/@deepseek-ai/dsh-client-ui-chat/lib/client.js', import.meta.url), 'utf8')
  const preview = await readFile(new URL('../node_modules/@deepseek-ai/dsh-client-ui-sidebar-documentpreview/lib/client.js', import.meta.url), 'utf8')
  const functions = ['encodeSegment', 'encodePath', 'sessionFileAddress', 'isWindowsStylePath', 'isAbsoluteWorkspacePath', 'fileAddressFor']
    .map(name => bundledFunction(chat, name)).join('\n')
  return new Function('const FILE_ADDRESS_PREFIX = "dsh-resource://file/";\n' + functions + '\n'
    + bundledFunction(preview, 'isDriveSegment') + '\n' + bundledFunction(preview, 'parseFileAddress')
    + '\nreturn { fileAddressFor, parseFileAddress };')()
}

describe('file preview after changing Agent working directory', () => {
  it('retains the absolute file path even when the renderer still has the original workspace root', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'dsh-preview-cwd-'))
    try {
      const original = path.join(root, 'repo')
      const current = path.join(original, '.agents/worktrees/first/.agents/worktrees/second')
      const file = path.join(current, 'artifacts/models.json')
      await mkdir(path.dirname(file), { recursive: true })
      await writeFile(file, '{"data":[]}')
      const { fileAddressFor, parseFileAddress } = await helpers()
      const address = fileAddressFor('session-a', original, file)
      const parsed = parseFileAddress(address)
      expect(parsed).toEqual({ scope: 'session', sessionId: 'session-a', path: file.replace(/\\/g, '/') })
      const actual = path.resolve(current, parsed.path)
      expect(actual).toBe(file)
      expect((await stat(actual)).isFile()).toBe(true)
    } finally { await rm(root, { recursive: true, force: true }) }
  })

  it('keeps genuinely relative links relative and still binds them to the owning session', async () => {
    const { fileAddressFor, parseFileAddress } = await helpers()
    expect(parseFileAddress(fileAddressFor('a/session', '/repo', './artifacts/models.json')))
      .toEqual({ scope: 'session', sessionId: 'a/session', path: 'artifacts/models.json' })
    expect(parseFileAddress(fileAddressFor('session', '/repo', '../sibling/file.json')).path)
      .toBe('../sibling/file.json')
  })

  it.each([
    ['/repo', '/repo/中文 空格/report#1.json'],
    ['/repo', '/other/report.json'],
    [undefined, '/absolute/report.json'],
    ['C:/repo', 'C:/repo/.agents/worktrees/test/report.json'],
    ['C:/repo', 'D:/other/report.json'],
    ['//server/share', '//server/share/report.json'],
    ['C:\\repo', 'C:\\repo\\.agents\\worktrees\\test\\report.json'],
    ['\\\\server\\share', '\\\\server\\share\\report.json'],
    ['/repo', '/repo']
  ])('preserves absolute identity for cwd=%s path=%s', async (cwd, file) => {
    const { fileAddressFor, parseFileAddress } = await helpers()
    expect(parseFileAddress(fileAddressFor('session', cwd, file))).toEqual({
      scope: 'session', sessionId: 'session', path: file.replace(/\\/g, '/')
    })
  })
})
