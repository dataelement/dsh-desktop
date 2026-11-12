import { mkdtemp, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { ensureLaunchRoot, launchRootPath } from '../src/main/profile/launch-root'

const temporaryRoots: string[] = []

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true })))
})

describe('Harness launch root', () => {
  it('uses an application-owned directory under Electron userData', () => {
    expect(launchRootPath('/application/user-data')).toBe(
      join('/application/user-data', 'launch-root')
    )
  })

  it('creates the launch root idempotently', async () => {
    const userData = await mkdtemp(join(tmpdir(), 'dsh-desktop-user-data-'))
    temporaryRoots.push(userData)

    const first = await ensureLaunchRoot(userData)
    const second = await ensureLaunchRoot(userData)

    expect(second).toBe(first)
    expect((await stat(first)).isDirectory()).toBe(true)
  })
})
