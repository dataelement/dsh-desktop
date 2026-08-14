import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const projectRoot = path.resolve(import.meta.dirname, '..')
const patchPath = path.join(
  projectRoot,
  'patches',
  '@deepseek-ai+dsh-client-ui-conversation+0.1.0-rc.6.patch'
)
const installedPath = path.join(
  projectRoot,
  'node_modules',
  '@deepseek-ai',
  'dsh-client-ui-conversation',
  'lib',
  'client.js'
)

describe('sent-message editing patch', () => {
  it('adds an accessible edit action for text-only user messages', async () => {
    const [patch, installed] = await Promise.all([
      readFile(patchPath, 'utf8'),
      readFile(installedPath, 'utf8')
    ])

    for (const source of [patch, installed]) {
      expect(source).toContain('IconEditOutline16')
      expect(source).toContain('aria-label": t("message.edit")')
      expect(source).toContain('data.content.every((block) => block.type === "text")')
      expect(source).toContain('"message.edit": "编辑消息"')
      expect(source).toContain('"message.edit": "Edit message"')
    }
  })

  it('branches from the previous completed turn and restores the original text as a draft', async () => {
    const [patch, installed] = await Promise.all([
      readFile(patchPath, 'utf8'),
      readFile(installedPath, 'utf8')
    ])

    for (const source of [patch, installed]) {
      expect(source).toContain(
        'Math.max(...[...snapshot.turnEnds.values()].filter((value) => value < seq))'
      )
      expect(source).toContain('atSeq: previousTurnEnd')
      expect(source).toContain('inputHub.shell(childId).setDraft(text)')
      expect(source).toContain('editMessage(data.seq, text)')
    }
  })

  it('uses a clean session in the same workspace when editing the first turn', async () => {
    const [patch, installed] = await Promise.all([
      readFile(patchPath, 'utf8'),
      readFile(installedPath, 'utf8')
    ])

    for (const source of [patch, installed]) {
      expect(source).toContain(
        'workspaces.list.getSnapshot().items.find((item) => item.sessionIds.includes(sessionId))'
      )
      expect(source).toContain('workspaces.connectWorkspace(workspace.workspaceId)')
      expect(source).toContain(
        'sessions.create(source?.cwd === void 0 ? {} : { cwd: source.cwd })'
      )
      expect(source).toContain('agentPreset: source.agentPreset')
      expect(source).toContain(
        'sessions.noteAgentPreset(childId, response.result.value.agentPreset)'
      )
    }
  })
})
