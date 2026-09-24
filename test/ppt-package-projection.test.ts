import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { replaceInstalledPackages } from '../scripts/ppt-package-projection.mjs'

const roots: string[] = []

async function fixture(): Promise<{ root: string; nodeModules: string; stages: { packageName: string; source: string }[] }> {
  const root = await mkdtemp(path.join(tmpdir(), 'ppt-package-projection-'))
  roots.push(root)
  const nodeModules = path.join(root, 'node_modules')
  await mkdir(nodeModules)
  const stages = []
  for (const packageName of ['dsh-ppt', 'dsh-ppt-composer']) {
    const current = path.join(nodeModules, packageName)
    const source = path.join(root, 'stages', packageName)
    await mkdir(current, { recursive: true })
    await mkdir(source, { recursive: true })
    await writeFile(path.join(current, 'generation.txt'), 'old')
    await writeFile(path.join(source, 'generation.txt'), 'new')
    stages.push({ packageName, source })
  }
  return { root, nodeModules, stages }
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

describe('PPT package projection transaction', () => {
  it('publishes both staged packages together', async () => {
    const { nodeModules, stages } = await fixture()
    await replaceInstalledPackages(stages, { nodeModulesRoot: nodeModules })
    for (const { packageName } of stages) {
      expect(await readFile(path.join(nodeModules, packageName, 'generation.txt'), 'utf8')).toBe('new')
    }
  })

  it('restores the previous pair when the second replacement fails', async () => {
    const { nodeModules, stages } = await fixture()
    await expect(replaceInstalledPackages(stages, {
      nodeModulesRoot: nodeModules,
      beforeReplace: (_packageName: string, index: number) => {
        if (index === 1) throw new Error('simulated second-package failure')
      }
    })).rejects.toThrow('simulated second-package failure')
    for (const { packageName } of stages) {
      expect(await readFile(path.join(nodeModules, packageName, 'generation.txt'), 'utf8')).toBe('old')
    }
  })
})
