import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const projectRoot = path.resolve(import.meta.dirname, '..')

describe('DSH Desktop sidebar branding', () => {

  it('keeps Harness 0.1.6 platform-aware collapsed titlebar spacing', async () => {
    const client = await readFile(
      path.join(projectRoot, 'node_modules/@deepseek-ai/dsh-client-ui-layout/lib/client.js'),
      'utf8'
    )

    expect(client).toContain('document.documentElement.dataset.platform === "darwin"')
    expect(client).toContain('document.documentElement.hasAttribute("data-windows-titlebar") ? 0 : 56')
    expect(client).toContain('sidebar === 0 ? collapsedWidth')
  })

  it('centers 36px rail controls inside the 56px collapsed sidebar', async () => {
    const client = await readFile(
      path.join(projectRoot, 'node_modules/@deepseek-ai/dsh-client-ui-sidebar/lib/client.js'),
      'utf8'
    )

    expect(client).toContain('padding:32px 10px 6px')
    expect(client).not.toContain('padding:32px 22px 6px')
  })

  it('exposes a compact switcher slot directly above the native New Session action', async () => {
    const client = await readFile(
      path.join(projectRoot, 'node_modules/@deepseek-ai/dsh-client-ui-sidebar/lib/client.js'),
      'utf8'
    )

    const switcher = client.indexOf('renderSlot("sidebar.quickSwitcher", { wide, startSession })')
    const newSession = client.indexOf('label: t("session.new.label")', switcher)
    expect(switcher).toBeGreaterThan(-1)
    expect(newSession).toBeGreaterThan(switcher)
    expect(client).toContain('"sidebar.quickSwitcher": {')
  })

  it('exposes a leading slot for workbench ownership icons on every session row', async () => {
    const client = await readFile(
      path.join(projectRoot, 'node_modules/@deepseek-ai/dsh-client-ui-workspace/lib/client.js'),
      'utf8'
    )

    expect(client).toContain('"sidebar.session.leading"')
    expect(client).toContain('renderSlot("sidebar.session.leading", { sessionId: node.id, size: 14 })')
    expect(client).toContain('renderSlot("sidebar.session.leading", { sessionId: result.id, size: 14 })')
  })

  it('installs the source logo into the Harness static frontend', async () => {
    const packageJson = JSON.parse(
      await readFile(path.join(projectRoot, 'package.json'), 'utf8')
    ) as { scripts: { postinstall: string } }

    expect(packageJson.scripts.postinstall).toContain('node scripts/install-brand-assets.mjs')
  })
})
