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
  it('adds an accessible edit action only for the latest text-only user message', async () => {
    const [patch, installed] = await Promise.all([
      readFile(patchPath, 'utf8'),
      readFile(installedPath, 'utf8')
    ])

    for (const source of [patch, installed]) {
      expect(source).toContain('IconEditOutline16')
      expect(source).toContain('aria-label": t("message.edit")')
      expect(source).toContain(
        'canEditMessage && data.content.every((block) => block.type === "text")'
      )
      expect(source).toContain('nodeStore.get(key)?.kind === "user"')
      expect(source).toContain(
        'canEditMessage: node.kind === "user" && node.key === lastUserMessageKey'
      )
      expect(source).toContain('"message.edit": "编辑消息"')
      expect(source).toContain('"message.edit": "Edit message"')
      expect(source).toContain('setEditing(true)')
    }
  })

  it('edits the sent message inline with cancel and send actions', async () => {
    const [patch, installed] = await Promise.all([
      readFile(patchPath, 'utf8'),
      readFile(installedPath, 'utf8')
    ])

    for (const source of [patch, installed]) {
      expect(source).toContain('function MessageInlineEditor')
      expect(source).toContain('className: "dsh-message-edit-textarea"')
      expect(source).toContain('children: t("message.edit.cancel")')
      expect(source).toContain('children: submitting ? t("message.edit.submitting")')
      expect(source).toContain('event.metaKey || event.ctrlKey')
    }
  })

  it('replaces the visible conversation only after the edited prompt is accepted', async () => {
    const [patch, installed] = await Promise.all([
      readFile(patchPath, 'utf8'),
      readFile(installedPath, 'utf8')
    ])

    for (const source of [patch, installed]) {
      expect(source).toContain(
        'Math.max(...[...snapshot.turnEnds.values()].filter((value) => value < seq))'
      )
      expect(source).toContain('atSeq: previousTurnEnd')
      expect(source).toContain('const result = await child.prompt([{ type: "text", text }], "queue")')
      expect(source).toContain('if (!result.ok) throw new Error(result.error.message)')
      expect(source).toContain('await workspaces.archiveSession(sessionId)')
      expect(source).toContain('await workspaces.archiveSession(childId).catch(() => {})')
      expect(source).toContain('sessions.open(childId)')
    }
  })

  it('preserves workspace, agent preset, and title when editing the first turn', async () => {
    const [patch, installed] = await Promise.all([
      readFile(patchPath, 'utf8'),
      readFile(installedPath, 'utf8')
    ])

    for (const source of [patch, installed]) {
      expect(source).toContain(
        'workspaces.list.getSnapshot().items.find((item) => item.sessionIds.includes(sessionId))'
      )
      expect(source).toContain('{ workspaceId: workspace.workspaceId }')
      expect(source).toContain('agentPreset: source.agentPreset')
      expect(source).toContain(
        'sessions.noteAgentPreset(childId, response.result.value.agentPreset)'
      )
      expect(source).toContain('const renamed = await child.rename(source.title)')
    }
  })

  it('does not move edited text into a different session composer', async () => {
    const installed = await readFile(installedPath, 'utf8')

    expect(installed).not.toContain('inputHub.shell(childId).setDraft(text)')
  })
})
