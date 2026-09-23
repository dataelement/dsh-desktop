import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { harnessPreferredPort, mobileBridgePort } from '../src/main/desktop-ports'

const projectRoot = path.resolve(import.meta.dirname, '..')

describe('BISHENG Work installation identity', () => {
  it('keeps Windows setup from touching the DSH Desktop data directory', async () => {
    const installer = await readFile(path.join(projectRoot, 'build', 'installer.nsh'), 'utf8')

    expect(installer).not.toContain('$APPDATA\\dsh-desktop')
    expect(installer).toContain('$APPDATA\\bisheng-work')
    expect(installer).toContain('Delete "$APPDATA\\bisheng-work\\desktop-service\\session.json"')
  })

  it('does not import an existing ~/.dsh home during startup', async () => {
    const main = await readFile(path.join(projectRoot, 'src', 'main', 'index.ts'), 'utf8')

    expect(main).not.toContain('maybeImportWebHome')
    expect(main).not.toContain('shouldOfferWebHomeImport')
    expect(main).toContain("join(app.getPath('appData'), 'bisheng-work')")
    expect(main).toContain("join(app.getPath('appData'), 'bisheng-work-dev')")
    expect(main).not.toContain("join(app.getPath('appData'), 'dsh-desktop')")
  })

  it('uses a user-data directory the Windows smoke test can find', async () => {
    const workflow = await readFile(
      path.join(projectRoot, '.github', 'workflows', 'release.yml'),
      'utf8'
    )

    expect(workflow).toContain("&& 'bisheng-work' || 'bisheng-work-dev'")
    expect(workflow).not.toContain("&& 'dsh-desktop' || 'dsh-desktop-dev'")
  })

  it('listens on ports that stay free while DSH Desktop is running', () => {
    const dshPorts = new Set([43127, 43128, 43129, 43130])
    const bishengPorts = [
      mobileBridgePort(false),
      mobileBridgePort(true),
      harnessPreferredPort(false),
      harnessPreferredPort(true)
    ]

    expect(new Set(bishengPorts).size).toBe(bishengPorts.length)
    for (const port of bishengPorts) expect(dshPorts.has(port)).toBe(false)
  })
})
