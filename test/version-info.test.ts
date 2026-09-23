import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { aboutDetail, bundledHarnessVersion } from '../src/main/version-info'

const temporaryRoots: string[] = []

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true })))
})

describe('desktop version information', () => {
  it('reports the version of the Harness package that is actually bundled', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-version-info-'))
    temporaryRoots.push(root)
    const harnessRoot = join(root, 'node_modules', '@deepseek-ai', 'dsh')
    await mkdir(harnessRoot, { recursive: true })
    await writeFile(join(root, 'package.json'), JSON.stringify({
      dependencies: { '@deepseek-ai/dsh': '0.1.0-rc.7' }
    }))
    await writeFile(join(harnessRoot, 'package.json'), JSON.stringify({
      version: '0.1.0-rc.8'
    }))

    expect(bundledHarnessVersion(root)).toBe('0.1.0-rc.8')
  })

  it('falls back to the app dependency when installed package metadata is unavailable', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-version-info-'))
    temporaryRoots.push(root)
    await writeFile(join(root, 'package.json'), JSON.stringify({
      dependencies: { '@deepseek-ai/dsh': '0.1.0-rc.8' }
    }))

    expect(bundledHarnessVersion(root)).toBe('0.1.0-rc.8')
  })

  it('explains that Harness updates arrive with Desktop', () => {
    expect(aboutDetail('0.1.1', '0.1.0-rc.8', 'zh')).toContain('内置 Harness 版本：0.1.0-rc.8')
    expect(aboutDetail('0.1.1', '0.1.0-rc.8', 'en')).toContain(
      'Harness is updated with BISHENG Work.'
    )
  })
})
