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
    expect(chat).toContain('fileAddressFor(sessionId, cwd, result.value.path)')
    expect(chat).toContain('ctx.sidebarRight.openResource')
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
    expect(chat).toContain('fileAddressFor(sessionId, cwd, byName.value.path)')
    expect(chat).toContain('fileAddressFor(sessionId, cwd, path)')
    expect(chat).not.toContain('openFile(attachment.file.name)')
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
    expect(sessionPatch).not.toContain('findStagedFilesByName')
    expect(chatPatch).toContain('openUploadedAttachment')
    expect(chatPatch).toContain('readFileHostPath({ name: path })')
    expect(conversationPatch).toContain('openUploadedAttachment')
    expect(conversationPatch).not.toContain('binding.session.readFileHostPath')
    expect(attachmentPatch).toContain('onOpenUploadedFile')
    expect(uploadPatch).toContain('findStagedFile')
    expect(uploadPatch).not.toContain('findStagedFilesByName')
    expect(deliverablesPatch).toContain('v?\\d+(?:\\.\\d+){1,4}')
    expect(deliverablesPatch).toContain('@[^\\\\/@\\s]+\\/[^\\\\/@\\s]+(?:@[^\\\\/\\s]+)?')
  })
})
