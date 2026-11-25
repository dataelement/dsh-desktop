import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { checkImportDirection } from '../../scripts/verify/import-direction.mjs'

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const temporary: string[] = []

afterEach(async () => {
  await Promise.all(temporary.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

describe('import direction', () => {
  it('matches the current repository', async () => {
    expect(await checkImportDirection(root)).toEqual([])
  })

  it('rejects forbidden imports and keeps the shell product entries', async () => {
    const fixture = await mkdtemp(join(tmpdir(), 'dsh-import-direction-'))
    temporary.push(fixture)
    await writeSources(fixture, {
      'src/host/index.ts': "import electron from 'electron'\nimport '../main/shell/app.ts'\n",
      'src/shared/bridge.ts': "import { readFile } from 'node:fs/promises'\nimport '../main/app.ts'\nimport '../preload/app.ts'\n",
      'src/main/recovery/fatal-entry.ts': "import { app } from 'electron'\nimport '../shell/app.ts'\n",
      'src/main/profile/store.ts': "import { BrowserWindow } from 'electron'\n",
      'src/main/shell/app.ts': [
        "import { app } from 'electron'",
        "import { recordFatalFailure } from '../recovery/fatal-entry'",
        "import { checkForUpdates } from '../update/update-manager'",
        '// The mandatory-update overlay is not part of this shell.',
        ''
      ].join('\n'),
      'src/main/shell/legacy.ts': "import { start } from '../index'\nimport 'apps/desktop/src/mandatory-update-window.ts'\n"
    })
    const errors = await checkImportDirection(fixture)
    expect(errors).toEqual([
      { file: 'src/host/index.ts', specifier: '../main/shell/app.ts', rule: 'host-main-or-preload' },
      { file: 'src/host/index.ts', specifier: 'electron', rule: 'host-electron' },
      { file: 'src/main/profile/store.ts', specifier: 'electron', rule: 'profile-electron' },
      { file: 'src/main/recovery/fatal-entry.ts', specifier: '../shell/app.ts', rule: 'fatal-entry-shell' },
      { file: 'src/main/recovery/fatal-entry.ts', specifier: 'electron', rule: 'fatal-entry-electron' },
      { file: 'src/main/shell/legacy.ts', specifier: '../index', rule: 'shell-index' },
      { file: 'src/main/shell/legacy.ts', specifier: 'apps/desktop/src/mandatory-update-window.ts', rule: 'shell-mandatory-update' },
      { file: 'src/shared/bridge.ts', specifier: '../main/app.ts', rule: 'shared-main-or-preload' },
      { file: 'src/shared/bridge.ts', specifier: '../preload/app.ts', rule: 'shared-main-or-preload' },
      { file: 'src/shared/bridge.ts', specifier: 'node:fs/promises', rule: 'shared-privileged' }
    ])
  })
})

async function writeSources(root: string, files: Record<string, string>): Promise<void> {
  for (const [path, contents] of Object.entries(files)) {
    const target = join(root, path)
    await mkdir(join(target, '..'), { recursive: true })
    await writeFile(target, contents)
  }
}
