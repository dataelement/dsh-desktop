import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('Sherlock desktop shell controls', () => {
  it('centers the Better Sidebar panel toggles lower in the macOS titlebar', async () => {
    const preload = await readFile('src/preload/index.ts', 'utf8')
    const shellStyles = await readFile('src/preload/shell-style.ts', 'utf8')

    expect(preload).toContain('mountDesktopShellStyles(document)')
    expect(shellStyles).toContain('.t8lSSG_toggleCluster')
    expect(shellStyles).toContain('top: calc(8px + env(safe-area-inset-top)) !important')
  })
})
