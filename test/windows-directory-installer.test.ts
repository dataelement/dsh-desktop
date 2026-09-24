import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { directoryInstallSection, directoryInstallerExits } from '../scripts/windows-directory-installer.mjs'

const require = createRequire(import.meta.url)
const template = join(dirname(require.resolve('app-builder-lib/package.json')), 'templates', 'nsis', 'installSection.nsh')

describe('pinned NSIS directory transaction', () => {
  it('stages before app shutdown and promotes before registration', async () => {
    const source = await readFile(template, 'utf8')
    const adapted = directoryInstallSection(source)
    expect(adapted.indexOf('!insertmacro dshStageApplication'))
      .toBeLessThan(adapted.indexOf('!insertmacro CHECK_APP_RUNNING'))
    expect(adapted.indexOf('Call dshPromoteDirectories'))
      .toBeLessThan(adapted.indexOf('!insertmacro registryAddInstallInfo'))
    expect(adapted).not.toContain('!insertmacro installApplicationFiles\n!insertmacro registryAddInstallInfo')
    expect(directoryInstallerExits('Quit\n')).toContain('Call dshCleanupDirectories')
  })

  it('rejects a changed electron-builder template', () => {
    expect(() => directoryInstallSection('!include installer.nsh'))
      .toThrow('electron-builder NSIS template changed')
  })
})
