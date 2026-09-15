import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { patchPath, projectRoot } from './patch-path'

async function packageClient(name: string, file = 'lib/client.js'): Promise<string> {
  return readFile(path.join(projectRoot, 'node_modules', '@deepseek-ai', name, file), 'utf8')
}

describe('uploaded file preview', () => {
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
    expect(chat).toContain('opener.open(sessionId, attachmentId)')
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
    const previewPatch = await readFile(
      patchPath('@deepseek-ai/dsh-client-ui-sidebar-documentpreview'),
      'utf8'
    )

    expect(preview).toContain('function canOfferLocalOpen')
    expect(preview).toContain('failure.code !== "workspace-file/not-found"')
    expect(preview).toContain('data-textpreview-open-local')
    expect(preview).toContain('openLocally: "用本地应用打开"')
    expect(preview).toContain('openLocally: "Open with local app"')
    expect(preview).toContain('ctx.remote.session.openWorkspacePath({ path })')
    expect(preview).toContain('"remote.session"')
    expect(preview).not.toContain('window.dshDesktop.openInFinder')
    expect(previewPatch).toContain('openLocally')
    expect(previewPatch).toContain('data-textpreview-open-local')
  })
})
