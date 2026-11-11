import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { checkPatchLock } from '../../scripts/verify/patch-lock.mjs'

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const temporary: string[] = []

afterEach(async () => {
  await Promise.all(temporary.splice(0).map(path => rm(path, { recursive: true, force: true })))
})

describe('patch lock', () => {
  it('matches the tracked patches to the lockfile release set', async () => {
    const patches = (await readdir(join(root, 'patches'))).filter(name => name.endsWith('.patch'))
    expect(patches).toHaveLength(42)
    for (const pkg of ['dsh-client-ui-skill', 'dsh-client-ui-input-trigger', 'dsh-system-prompt', 'dsh-agent-loop']) expect(patches).toContain('@deepseek-ai+' + pkg + '+0.2.2-rc.1.patch')
    expect(patches).toContain('@deepseek-ai+dsh-client-ui-layout+0.2.2-rc.1.patch')
    expect(await checkPatchLock(root)).toEqual([])
  })

  it('rejects a patch whose version or integrity is not the locked release', async () => {
    const fixture = await mkdtemp(join(tmpdir(), 'dsh-patch-lock-'))
    temporary.push(fixture)
    await mkdir(join(fixture, 'patches'))
    await writeFile(join(fixture, 'patches', '@deepseek-ai+dsh+0.0.0.patch'), '')
    await writeFile(join(fixture, 'patches', 'not-a-patch-name.patch'), '')
    await writeFile(join(fixture, 'patches', 'undici+8.11.2.patch'), '')
    await writeFile(join(fixture, 'package-lock.json'), JSON.stringify({
      packages: {
        'node_modules/@deepseek-ai/dsh': { version: '0.2.2-rc.1', integrity: 'sha512-published' },
        'node_modules/undici': { version: '8.11.2' }
      }
    }))
    expect(await checkPatchLock(fixture)).toEqual([
      { file: '@deepseek-ai+dsh+0.0.0.patch', rule: 'version' },
      { file: 'not-a-patch-name.patch', rule: 'filename' },
      { file: 'undici+8.11.2.patch', rule: 'integrity' }
    ])
  })
})