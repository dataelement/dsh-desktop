import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { patchPath } from './patch-path'

describe('workspace session unread markers', () => {
  it('persists unread session ids without breaking older workspace view snapshots', async () => {
    const patch = await readFile(
      patchPath('@deepseek-ai/dsh-client-ui-workspace'),
      'utf8'
    )

    expect(patch).toContain('unreadSessionIds: []')
    expect(patch).toContain('s.unreadSessionIds ?? []')
    expect(patch).toContain('d.unreadSessionIds ?? (d.unreadSessionIds = [])')
    expect(patch).toContain('markSessionUnread')
    expect(patch).toContain('markSessionRead')
  })

  it('adds mark unread/read to the row menu and opens that menu on right click', async () => {
    const patch = await readFile(
      patchPath('@deepseek-ai/dsh-client-ui-workspace'),
      'utf8'
    )

    expect(patch).toContain('id: unread ? "markRead" : "markUnread"')
    expect(patch).toContain('"menu.markUnread": "标为未读"')
    expect(patch).toContain('"menu.markRead": "标为已读"')
    expect(patch).toContain('onContextMenu: (event) =>')
    expect(patch).toContain('event.preventDefault()')
    expect(patch).toContain('if (!row.blank) setMenuOpen(true)')
  })

  it('renders a durable unread treatment and clears it when the session is opened', async () => {
    const patch = await readFile(
      patchPath('@deepseek-ai/dsh-client-ui-workspace'),
      'utf8'
    )

    expect(patch).toContain('Rows_module_css_default.unreadTitle')
    expect(patch).toContain('StateDot, { state: "done" }')
    expect(patch).toContain('border: "1.5px solid currentColor"')
    expect(patch).toContain('background: "transparent"')
    expect(patch).toContain('boxShadow: "none"')
    expect(patch).toContain('children: t("status.unread")')
    expect(patch).toContain('actions.markSessionRead(sessionId)')
    expect(patch).toContain('open(sessionId)')
  })
})
