import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { patchPath, projectRoot } from './patch-path'

async function packageClient(name: string, file = 'lib/client.js'): Promise<string> {
  return readFile(path.join(projectRoot, 'node_modules', '@deepseek-ai', name, file), 'utf8')
}

describe('uploaded file preview', () => {
  it('finds only file receipts in the exact Session with the 0.2.2 attachment union', async () => {
    const source = await packageClient('dsh-client-file-upload', 'lib/index.js')
    const method = source.match(/findStagedFile\(agent, attachmentId\) \{[\s\S]*?\n\t\t\}/)?.[0]
    expect(method).toBeDefined()
    const find = new Function(`return ({ ${method} }).findStagedFile`)() as (this: unknown, agent: { session: object }, id: string) => unknown
    const session = {}
    const file = { attachmentId: 'same-id', name: 'report.pdf' }
    const stagedFiles = new WeakMap([[session, new Map([
      ['image', { attachment: { type: 'image', attachment: { attachmentId: 'same-id', mimeType: 'image/png' } } }],
      ['file', { attachment: { type: 'file', attachment: file } }]
    ])]])
    const host = { stagedFiles, assertOrdinaryAgent() {} }
    expect(find.call(host, { session }, 'same-id')).toBe(file)
    expect(find.call(host, { session: {} }, 'same-id')).toBeUndefined()
    expect(find.call(host, { session }, 'missing')).toBeUndefined()
    expect(() => find.call({ ...host, assertOrdinaryAgent() { throw new Error('subagent cannot upload') } }, { session }, 'same-id')).toThrow('subagent cannot upload')
  })

  it('opens relative links in the live working directory and keeps attachment-name precedence', async () => {
    const source = await packageClient('dsh-client-ui-chat')
    const helpersStart = source.indexOf('const FILE_ADDRESS_PREFIX =')
    const helpersEnd = source.indexOf('\n\t\t//#endregion', helpersStart)
    const callbackStart = source.indexOf('openFile: async (path, options) => {') + 'openFile: '.length
    const callbackEnd = source.indexOf(',\n\t\t\t\t\t\t\topenExternalLink:', callbackStart)
    expect(callbackEnd).toBeGreaterThan(callbackStart)
    let workingDirectory = '/workspace/nested'
    let attached = false
    const opened: unknown[] = []
    const revealed: unknown[] = []
    const session = {
      projections: { faceOf: () => ({ getSnapshot: () => workingDirectory }) },
      readFileHostPath: async () => attached ? { ok: true, value: { path: '/uploads/report.txt' } } : { ok: false }
    }
    const ctx = {
      sessions: { list: { getSnapshot: () => ({ byId: { session: { cwd: '/workspace' } } }) } },
      sidebarRightTabs: { candidates: () => ['preview'] },
      sidebarRight: { openResource: (...args: unknown[]) => opened.push(args) },
      remote: { session: { openWorkspacePath: async (request: unknown) => { revealed.push(request); return { ok: true } } } }
    }
    const open = new Function('ctx', 'session', 'sessionId', `${source.slice(helpersStart, helpersEnd)}; return (${source.slice(callbackStart, callbackEnd)});`)(ctx, session, 'session') as (path: string, options?: { line?: number; revealInFileManager?: boolean }) => Promise<void>
    await open('./report.txt', { line: 7 })
    expect(opened.pop()).toEqual(['dsh-resource://file/session/session/nested/report.txt', { params: { line: 7 } }])
    workingDirectory = '/workspace/changed'
    await open('report.txt')
    expect(opened.pop()).toEqual(['dsh-resource://file/session/session/changed/report.txt'])
    attached = true
    await open('report.txt', { line: 7 })
    expect(opened.pop()).toEqual(['dsh-resource://file/session/session//uploads/report.txt'])
    await open('./folder/', { revealInFileManager: true })
    expect(revealed).toEqual([{ path: '/workspace/changed/folder/' }])
  })

  it('propagates native opener failures and preserves preview line options', async () => {
    const chat = await packageClient('dsh-client-ui-chat')
    const start = chat.indexOf('async function openResolvedHostFile(')
    const end = chat.indexOf('\n\t\t//#endregion', start)
    const open = new Function('fileAddressFor', `${chat.slice(start, end)}; return openResolvedHostFile`)(
      () => 'authorized-file-address'
    ) as (ctx: unknown, sessionId: string, cwd: string, path: string, options?: { line: number }) => Promise<void>
    const opened: unknown[] = []
    const nativeError = { code: 'open-failed', message: 'native opener failed' }
    const ctx = {
      sidebarRightTabs: { candidates: () => [] as string[] },
      sidebarRight: { openResource: (...args: unknown[]) => opened.push(args) },
      remote: { session: { openWorkspacePath: async () => ({ ok: false, error: nativeError }) } }
    }
    await expect(open(ctx, 'session', '/workspace', '/workspace/file')).rejects.toEqual(nativeError)
    expect(opened).toEqual([])
    ctx.sidebarRightTabs.candidates = () => ['preview']
    await open(ctx, 'session', '/workspace', '/workspace/file', { line: 17 })
    expect(opened).toEqual([['authorized-file-address', { params: { line: 17 } }]])
  })

  it('exposes a session-authorized host path instead of file bytes', async () => {
    const host = await packageClient('dsh-api-session-controller', 'lib/index.js')
    const client = await packageClient('dsh-api-session-controller')
    const uploads = await readFile(
      path.join(projectRoot, 'node_modules', '@deepseek-ai', 'dsh-client-file-upload', 'lib', 'index.js'),
      'utf8'
    )

    expect(host).toContain('function referencedFile')
    expect(host).toContain('collectReferencedFilesByName')
    expect(host).toContain('collectReferencedImagesByName')
    expect(host).toContain('resolveAuthorizedFileRefByName')
    expect(host).toContain('ensureImagePreviewPath')
    expect(host).toContain('imageHostPath(match.ref)')
    expect(host).toContain('path: FILE_HOST_PATH')
    expect(host).toContain('/api/session/fileHostPath')
    expect(host).toContain('ctx.attachments.fileHostPath(ref)')
    expect(host).toContain('findStagedFile')
    expect(host).not.toContain('findStagedFilesByName')
    expect(host).toContain('attachmentId or name is required')
    expect(uploads).toContain('findStagedFile(agent, attachmentId)')
    expect(uploads).not.toContain('findStagedFilesByName')
    expect(client).toContain('async readFileHostPath(attachmentIdOrName)')
    expect(client).toContain('query.set("name", attachmentIdOrName.name)')
    expect(client).toContain('/api/session/fileHostPath')
  })

  it('opens uploaded files through one shared opener', async () => {
    const chat = await packageClient('dsh-client-ui-chat')
    const conversation = await packageClient('dsh-client-ui-conversation')
    const attachment = await packageClient('dsh-client-ui-attachment')

    expect(chat).toContain('ctx.provide("openUploadedAttachment"')
    expect(chat).toContain('binding.session.readFileHostPath(attachmentId)')
    expect(chat).toContain('openResolvedHostFile(ctx, sessionId, cwd, result.value.path)')
    expect(chat).toContain('sidebarRightTabs.candidates(address)')
    expect(chat).toContain('ctx.remote.session.openWorkspacePath({ path: hostPath })')
    expect(chat).toContain('ctx.sidebarRight.openResource')
    expect(chat).toContain('"sidebarRightTabs"')
    expect(chat).toContain('ctx.get("openUploadedAttachment").open(sessionId, attachmentId)')
    expect(chat).toContain('onOpenUploadedFile(attachment.file.attachmentId)')
    expect(chat).not.toContain('openFile(attachment.file.name)')
    expect(chat).not.toContain('openFile(attachment.name)')

    expect(conversation).toContain('ctx.get("openUploadedAttachment")')
    expect(conversation).toContain('opener.open(sessionId, attachmentId)')
    expect(conversation).toContain('onOpenUploadedFile: openUploadedFile')
    expect(conversation).not.toContain('binding.session.readFileHostPath(attachmentId)')
    expect(conversation).not.toContain('dsh-resource://file/session/')

    expect(attachment).toContain('onOpen: upload?.status === "ready"')
    expect(attachment).toContain('onOpenUploadedFile(upload.file.attachmentId)')
  })

  it('resolves assistant file mentions via unique attachment name before workspace path', async () => {
    const chat = await packageClient('dsh-client-ui-chat')

    expect(chat).toContain('session.readFileHostPath({ name: path })')
    expect(chat).toContain('openResolvedHostFile(ctx, sessionId, cwd, byName.value.path)')
    expect(chat).not.toContain('openResolvedHostFile(ctx, sessionId, cwd, byName.value.path, options)')
    expect(chat).toContain('hostPathForOpen(cwd, path)')
    expect(chat).not.toContain('openFile(attachment.file.name)')
  })

  it('matches attachment names case-insensitively on Windows only', async () => {
    const host = await packageClient('dsh-api-session-controller', 'lib/index.js')
    const source = host.match(
      /function basenameLeaf\(value\) \{[\s\S]*?\nfunction fileNameMatches\(refName, needle\) \{[\s\S]*?\n\}/
    )?.[0]
    expect(source).toBeDefined()
    expect(source).toContain('process.platform === "win32"')
    expect(source).toContain('left.toLowerCase() === right.toLowerCase()')

    const load = (platform: string) =>
      new Function(
        'process',
        `${source}; return fileNameMatches`
      )({ platform }) as (refName: string, needle: string) => boolean

    const onWindows = load('win32')
    const onPosix = load('darwin')
    expect(onWindows('周报.docx', '周报.DOCX')).toBe(true)
    expect(onWindows('README.md', 'readme.md')).toBe(true)
    expect(onWindows('src/Main.ts', 'main.ts')).toBe(true)
    expect(onPosix('README.md', 'readme.md')).toBe(false)
    expect(onPosix('周报.docx', '周报.docx')).toBe(true)
  })

  it('keeps the original image path when the preview alias cannot be created', async () => {
    const host = await packageClient('dsh-api-session-controller', 'lib/index.js')
    expect(host).toContain('session-controller: image preview alias failed:')
    expect(host).toContain('return hostPath')
    expect(host).not.toContain('if (error && typeof error === "object" && "code" in error && error.code === "EEXIST") return aliased;\n\t\tthrow error;')
  })

  it('records the preview patches', async () => {
    const sessionPatch = await readFile(patchPath('@deepseek-ai/dsh-api-session-controller'), 'utf8')
    const chatPatch = await readFile(patchPath('@deepseek-ai/dsh-client-ui-chat'), 'utf8')
    const conversationPatch = await readFile(patchPath('@deepseek-ai/dsh-client-ui-conversation'), 'utf8')
    const attachmentPatch = await readFile(patchPath('@deepseek-ai/dsh-client-ui-attachment'), 'utf8')
    const uploadPatch = await readFile(patchPath('@deepseek-ai/dsh-client-file-upload'), 'utf8')
    const deliverablesPatch = await readFile(
      patchPath('@deepseek-ai/dsh-client-ui-deliverables'),
      'utf8'
    )

    expect(sessionPatch).toContain('/api/session/fileHostPath')
    expect(sessionPatch).toContain('resolveAuthorizedFileRefByName')
    expect(sessionPatch).toContain('collectReferencedImagesByName')
    expect(sessionPatch).toContain('ensureImagePreviewPath')
    expect(sessionPatch).toContain('function fileNameEquals')
    expect(sessionPatch).toContain('image preview alias failed')
    expect(sessionPatch).not.toContain('findStagedFilesByName')
    expect(chatPatch).toContain('openUploadedAttachment')
    expect(chatPatch).toContain('readFileHostPath({ name: path })')
    expect(chatPatch).toContain('openResolvedHostFile(ctx, sessionId, cwd, byName.value.path)')
    expect(chatPatch).not.toContain('openResolvedHostFile(ctx, sessionId, cwd, byName.value.path, options)')
    expect(chatPatch).toContain('openResolvedHostFile')
    expect(chatPatch).toContain('openWorkspacePath')
    expect(conversationPatch).toContain('openUploadedAttachment')
    expect(conversationPatch).not.toContain('binding.session.readFileHostPath')
    expect(attachmentPatch).toContain('onOpenUploadedFile')
    expect(uploadPatch).toContain('findStagedFile')
    expect(uploadPatch).not.toContain('findStagedFilesByName')
    expect(deliverablesPatch).toContain('v?\\d+(?:\\.\\d+){1,4}')
    expect(deliverablesPatch).toContain('@[^\\\\/@\\s]+\\/[^\\\\/@\\s]+(?:@[^\\\\/\\s]+)?')
  })

  it('offers a local-open action when sidebar preview cannot render the file', async () => {
    const preview = await packageClient('dsh-client-ui-sidebar-documentpreview')
    const desktop = await readFile(
      path.join(projectRoot, 'packages', 'dsh-desktop-client-ui', 'client.js'),
      'utf8'
    )

    expect(preview).toContain('renderSlot("sidebar.right.tab.document.unpreviewable", fileOwner)')
    expect(desktop).toContain("ctx.slots.inject('sidebar.right.tab.document.unpreviewable'")
    expect(desktop).toContain("'data-textpreview-open-local': true")
    expect(desktop).toContain("ctx.remote.session.openWorkspacePath({ path })")
    expect(desktop).toContain('Open with local app')
    expect(desktop).toContain('用本地应用打开')
  })
})
