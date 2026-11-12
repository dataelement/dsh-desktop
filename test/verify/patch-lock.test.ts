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
    expect(patches).toHaveLength(44)
    expect(patches).toEqual(expect.arrayContaining([
      '@deepseek-ai+dsh-client-ui-layout+0.2.2-rc.1.patch',
      '@deepseek-ai+dsh-client-ui-skill+0.2.2-rc.1.patch',
      '@deepseek-ai+dsh-client-ui-input-trigger+0.2.2-rc.1.patch',
      '@deepseek-ai+dsh-system-prompt+0.2.2-rc.1.patch',
      '@deepseek-ai+dsh-agent-loop+0.2.2-rc.1.patch',
      '@deepseek-ai+node-addon-system+0.1.2.patch',
      'sherpa-onnx-node+1.13.8.patch'
    ]))
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