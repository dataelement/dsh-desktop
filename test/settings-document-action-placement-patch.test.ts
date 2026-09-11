import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const PATCH = 'patches/@deepseek-ai+dsh-client-ui-settings-general+0.1.2-rc.1.patch'

describe('settings document action placement', () => {
  it('moves the settings.action slot from the content header to the nav rail footer', async () => {
    const patch = await readFile(PATCH, 'utf8')

    // The nav rail gains a footer that hosts the open-document action.
    expect(patch).toContain('+\t\t\t\t\t\t\t"data-dsh-settings-nav-footer": "",')
    expect(patch).toContain('+\t\t\t\t\t\t\tchildren: renderSlot("settings.action", {})')

    // The content header no longer renders the action list next to close.
    expect(patch).toContain('-\t\t\t\t\t\t\t\tchildren: renderSlot("settings.action", {})')
    expect(patch).toContain('+\t\t\t\t\t\t\t"data-dsh-settings-header": "",')
    expect(patch).toContain('[data-dsh-settings-header]{justify-content:flex-end}')

    // The footer is pinned to the bottom and the button stretches across the rail.
    expect(patch).toContain('[data-dsh-settings-nav-footer]{flex:none;flex-direction:column;gap:8px;margin-top:auto;')
    expect(patch).toContain('[data-dsh-settings-document-action] button{width:100%;')
  })
})
