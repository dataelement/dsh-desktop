import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { Script } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { patchPath, projectRoot } from './patch-path'

describe('workspace Open in Finder integration', () => {
  it('keeps the workspace UI patch on the Harness 0.1.2 package', async () => {
    const patch = await readFile(
      patchPath('@deepseek-ai/dsh-client-ui-workspace'),
      'utf8'
    )
    const patchNames = await readdir(path.join(projectRoot, 'patches'))

    expect(patchNames).toContain(
      '@deepseek-ai+dsh-client-ui-workspace+0.1.2-alpha.1.patch'
    )
    expect(patchNames).not.toContain(
      '@deepseek-ai+dsh-client-ui-workspace+0.1.0-rc.8.patch'
    )
    expect(patch).toContain('id: "openInFinder"')
    expect(patch).toContain('t("menu.openInFinder")')
    expect(patch).toContain('window.dshDesktop.openInFinder(row.cwd)')
    expect(patch).toContain('"menu.openInFinder": "在 Finder 中打开"')
    expect(patch).toContain('"menu.openInFinder": "Open in Finder"')
  })

  it('exposes a validated main-process bridge for opening the directory', async () => {
    const [mainSource, preloadSource] = await Promise.all([
      readFile(path.join(projectRoot, 'src/main/index.ts'), 'utf8'),
      readFile(path.join(projectRoot, 'src/preload/index.ts'), 'utf8')
    ])

    expect(mainSource).toContain(
      "ipcMain.handle('harness:open-in-finder', async (event, path?: unknown) =>"
    )
    expect(mainSource).toContain('assertTrustedMainWindowEvent(event)')
    expect(mainSource).toContain("typeof path !== 'string' || path.length === 0")
    expect(mainSource).toContain('await shell.openPath(path)')
    expect(preloadSource).toContain(
      "ipcRenderer.invoke('harness:open-in-finder', path)"
    )
  })

  it('leaves the installed workspace bundle syntactically valid', async () => {
    const bundle = await readFile(
      path.join(
        projectRoot,
        'node_modules/@deepseek-ai/dsh-client-ui-workspace/lib/client.js'
      ),
      'utf8'
    )

    expect(() => new Script(bundle)).not.toThrow()
  })
})
