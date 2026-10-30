import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  classifyDesktopInstall,
  desktopInstallStatePath,
  type DesktopInstallState
} from '../src/main/state/desktop-install-state'

const roots: string[] = []

async function freshRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'dsh-desktop-install-state-'))
  roots.push(root)
  return root
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

function classify(userDataPath: string, overrides: Partial<Parameters<typeof classifyDesktopInstall>[0]> = {}) {
  return classifyDesktopInstall({
    userDataPath,
    appVersion: '1.0.0',
    developmentBuild: false,
    now: new Date('2026-09-23T00:00:00.000Z'),
    ...overrides
  })
}

describe('desktop install classification', () => {
  it('classifies an empty production userData directory as new and persists it', async () => {
    const root = await freshRoot()
    const state = classify(root)
    expect(state).toEqual({
      schemaVersion: 1,
      classification: 'new',
      firstSeenVersion: '1.0.0',
      classifiedAt: '2026-09-23T00:00:00.000Z'
    })
    expect(JSON.parse(await readFile(desktopInstallStatePath(join(root, 'harness')), 'utf8'))).toEqual(state)
  })

  it.each([
    ['harness'],
    ['launch-root'],
    ['desktop-settings.json'],
    [join('desktop-service', 'installation.json')],
    ['window-state.json'],
    ['gpu-fallback.json']
  ])('classifies legacy evidence %s as existing', async evidence => {
    const root = await freshRoot()
    const evidencePath = join(root, evidence)
    if (evidence === 'harness' || evidence === 'launch-root') {
      await mkdir(evidencePath, { recursive: true })
    } else {
      await mkdir(dirname(evidencePath), { recursive: true })
      await writeFile(evidencePath, 'legacy')
    }
    expect(classify(root).classification).toBe('existing')
  })

  it('never changes a valid classification when the app version changes', async () => {
    const root = await freshRoot()
    const first = classify(root)
    const second = classify(root, {
      appVersion: '9.0.0',
      now: new Date('2030-01-01T00:00:00.000Z')
    })
    expect(second).toEqual(first)
  })

  it('fails closed when the existing marker is malformed', async () => {
    const root = await freshRoot()
    const marker = desktopInstallStatePath(join(root, 'harness'))
    await mkdir(dirname(marker), { recursive: true })
    await writeFile(marker, '{broken')
    expect(classify(root).classification).toBe('existing')
    expect(await readFile(marker, 'utf8')).toBe('{broken')
  })

  it('suppresses onboarding in development even with an empty directory', async () => {
    const root = await freshRoot()
    const state: DesktopInstallState = classify(root, { developmentBuild: true })
    expect(state.classification).toBe('existing')
  })

  it('fails closed instead of throwing when the marker cannot be written', async () => {
    const root = await freshRoot()
    await writeFile(join(root, 'harness'), 'not-a-directory')
    expect(classify(root).classification).toBe('existing')
  })
})
