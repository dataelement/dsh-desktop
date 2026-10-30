import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { initializeDesktopInstall } from '../src/main/state/desktop-startup-install'
import { desktopInstallStatePath } from '../src/main/state/desktop-install-state'

const roots: string[] = []

async function userData(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'dsh-startup-install-'))
  roots.push(root)
  return root
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

describe('desktop startup install classification', () => {
  it('persists a new install before the desktop service creates legacy evidence', async () => {
    const root = await userData()
    let classificationAtServiceStart: string | undefined
    initializeDesktopInstall({
      userDataPath: root,
      appVersion: '0.11.0',
      developmentBuild: false
    }, () => {
      classificationAtServiceStart = JSON.parse(
        // The real DesktopService creates installation.json at this point.
        readFileSync(desktopInstallStatePath(join(root, 'harness')), 'utf8')
      ).classification
      mkdirSync(join(root, 'desktop-service'), { recursive: true })
      writeFileSync(join(root, 'desktop-service', 'installation.json'), '{}')
    })

    expect(classificationAtServiceStart).toBe('new')
    expect(JSON.parse(await readFile(desktopInstallStatePath(join(root, 'harness')), 'utf8')).classification).toBe('new')
  })

  it('keeps an existing install ineligible when the service starts', async () => {
    const root = await userData()
    await mkdir(join(root, 'launch-root'))
    let classificationAtServiceStart: string | undefined
    initializeDesktopInstall({ userDataPath: root, appVersion: '0.11.0', developmentBuild: false }, () => {
      classificationAtServiceStart = readFileSync(
        desktopInstallStatePath(join(root, 'harness')), 'utf8'
      )
    })
    expect(JSON.parse(classificationAtServiceStart ?? '').classification).toBe('existing')
  })
})
