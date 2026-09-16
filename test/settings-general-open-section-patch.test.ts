import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { patchPath, projectRoot } from './patch-path'

const settingsGeneralClient = path.join(
  projectRoot,
  'node_modules',
  '@deepseek-ai',
  'dsh-client-ui-settings-general',
  'lib',
  'client.js'
)

describe('DSH Desktop settings section opener patch', () => {
  it('opens a requested settings section from a private browser event', async () => {
    const client = await readFile(settingsGeneralClient, 'utf8')

    expect(client).toContain('const openRequestedSection = (event) => {')
    expect(client).toContain('if (!(event instanceof CustomEvent)) return;')
    expect(client).toContain('const id = event.detail?.id;')
    expect(client).toContain('openSection(id);')
    expect(client).toContain('window.addEventListener("dsh-desktop:open-settings-section", openRequestedSection)')
    expect(client).toContain('window.removeEventListener("dsh-desktop:open-settings-section", openRequestedSection)')
  })

  it('captures the event listener in the reproducible dependency patch', async () => {
    const patch = await readFile(
      patchPath('@deepseek-ai/dsh-client-ui-settings-general'),
      'utf8'
    )

    expect(patch).toContain('dsh-desktop:open-settings-section')
    expect(patch).toContain('openRequestedSection')
    expect(patch).toContain('openSection(id);')
  })
})
