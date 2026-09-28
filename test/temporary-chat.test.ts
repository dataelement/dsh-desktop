import { access, mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { Script } from 'node:vm'
import { afterEach, describe, expect, it } from 'vitest'
import {
  createTemporaryChatWorkspace,
  TEMPORARY_CHAT_DIRECTORY,
  TEMPORARY_CHAT_PARENT_DIRECTORY
} from '../src/main/temporary-chat'
import { patchPath, projectRoot } from './patch-path'

const roots: string[] = []

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

describe('temporary chat workspaces', () => {
  it('creates one isolated directory below the supplied OS user home', async () => {
    const home = await mkdtemp(path.join(tmpdir(), 'dsh-temp-chat-'))
    roots.push(home)

    const created = await createTemporaryChatWorkspace(home, {
      now: new Date('2026-09-15T01:02:03.000Z'),
      uniqueId: 'ab12-cd34-ef56'
    })

    expect(created.path).toBe(
      path.join(
        home,
        TEMPORARY_CHAT_PARENT_DIRECTORY,
        TEMPORARY_CHAT_DIRECTORY,
        'chat-20260915T010203Z-ab12cd34'
      )
    )
    await expect(access(created.path)).resolves.toBeUndefined()
  })

  it('keeps separate temporary-chat workspaces instead of sharing a scratch directory', async () => {
    const home = await mkdtemp(path.join(tmpdir(), 'dsh-temp-chat-'))
    roots.push(home)

    const first = await createTemporaryChatWorkspace(home, { uniqueId: 'first001' })
    const second = await createTemporaryChatWorkspace(home, { uniqueId: 'second02' })
    const entries = await readdir(
      path.join(home, TEMPORARY_CHAT_PARENT_DIRECTORY, TEMPORARY_CHAT_DIRECTORY)
    )

    expect(first.path).not.toBe(second.path)
    expect(entries).toHaveLength(2)
  })

  it('wires eager Session creation, the standard composer, and the dedicated sidebar group', async () => {
    const [main, preload, workspacePatch, conversationPatch, sidebarPatch] = await Promise.all([
      readFile(path.join(projectRoot, 'src/main/index.ts'), 'utf8'),
      readFile(path.join(projectRoot, 'src/preload/index.ts'), 'utf8'),
      readFile(patchPath('@deepseek-ai/dsh-client-ui-workspace'), 'utf8'),
      readFile(patchPath('@deepseek-ai/dsh-client-ui-conversation'), 'utf8'),
      readFile(patchPath('@deepseek-ai/dsh-client-ui-sidebar'), 'utf8')
    ])

    expect(main).toContain("ipcMain.handle('temporary-chat:create-workspace'")
    expect(main).toContain('assertTrustedMainWindowEvent(event)')
    expect(preload).toContain("ipcRenderer.invoke('temporary-chat:create-workspace')")
    expect(workspacePatch).toContain('TEMPORARY_CHAT_GROUP_KEY')
    expect(workspacePatch).toContain('"group.temporary": "临时会话"')
    expect(workspacePatch).toContain('async createTemporarySession()')
    expect(workspacePatch).toContain('this.createTemporarySession().catch')
    expect(conversationPatch).toContain('"workspace.temporary": "临时会话"')
    expect(conversationPatch).not.toContain('function TemporaryInputBar')
    expect(conversationPatch).not.toContain('data-temporary-chat-composer')
    expect(sidebarPatch).toContain('workspaceNavigation.startTemporarySession()')
  })

  it('leaves all three patched browser bundles syntactically valid', async () => {
    const packages = [
      'dsh-client-ui-workspace',
      'dsh-client-ui-conversation',
      'dsh-client-ui-sidebar'
    ]

    for (const packageName of packages) {
      const source = await readFile(
        path.join(projectRoot, 'node_modules', '@deepseek-ai', packageName, 'lib', 'client.js'),
        'utf8'
      )
      expect(() => new Script(source), packageName).not.toThrow()
    }
  })
})
