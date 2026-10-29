import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { composeEntries, loadOverlayPatches } from '@deepseek-ai/dsh-app-boot'
import { projectRoot } from './patch-path'

describe('Desktop browser default', () => {
  const web = loadOverlayPatches('test', join(projectRoot, 'node_modules/@deepseek-ai/dsh-web-app/cordis.patch.yml'))
  const desktop = loadOverlayPatches('test', join(projectRoot, 'build/dsh-desktop.patch.yml'))

  it('enables exactly one upstream browser without changing the web Profile', () => {
    const upstream = composeEntries([web]).find((entry) => entry.id === 'ui-sidebar-browser')
    expect(upstream).toBeDefined()
    expect(upstream?.disabled).not.toBe(false)

    const browsers = composeEntries([web, desktop]).filter((entry) => entry.id === 'ui-sidebar-browser')
    expect(browsers).toHaveLength(1)
    expect(browsers[0]).toMatchObject({
      name: '@deepseek-ai/dsh-client-ui-sidebar-browser',
      disabled: false
    })
  })

  it('allows a later disable overlay to switch the browser off', () => {
    const entries = composeEntries([web, desktop, [{ id: 'ui-sidebar-browser', disabled: true }]])
    expect(entries.find((entry) => entry.id === 'ui-sidebar-browser')?.disabled).toBe(true)
  })
})
