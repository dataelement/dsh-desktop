import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  fingerprintInputs,
  planPptBuild,
  PPT_PACKAGES,
  recordPptBuild
} from '../scripts/ppt-build-cache.mjs'

let root: string
let outputRoot: string
let nodeModulesRoot: string

async function write(file: string, contents: string): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, contents)
}

async function stageCompletedBuild(): Promise<void> {
  await write(path.join(outputRoot, 'packages', 'build.json'), '{}')
  for (const name of PPT_PACKAGES) {
    await write(path.join(outputRoot, 'packages', name, 'package.json'), '{}')
    await mkdir(path.join(nodeModulesRoot, name), { recursive: true })
  }
}

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'dsh-ppt-cache-'))
  outputRoot = path.join(root, '.build', 'ppt-runtime')
  nodeModulesRoot = path.join(root, 'node_modules')
  await write(path.join(root, 'src', 'a.txt'), 'a')
  await write(path.join(root, 'src', 'nested', 'b.txt'), 'b')
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

describe('PPT build input fingerprint', () => {
  it('is stable and changes when a file changes, is added, or is renamed', async () => {
    const first = await fingerprintInputs(root, ['src'])
    expect(await fingerprintInputs(root, ['src'])).toBe(first)

    await writeFile(path.join(root, 'src', 'a.txt'), 'changed')
    const edited = await fingerprintInputs(root, ['src'])
    expect(edited).not.toBe(first)

    await write(path.join(root, 'src', 'c.txt'), '')
    const added = await fingerprintInputs(root, ['src'])
    expect(added).not.toBe(edited)

    await rm(path.join(root, 'src', 'c.txt'))
    await write(path.join(root, 'src', 'd.txt'), '')
    expect(await fingerprintInputs(root, ['src'])).not.toBe(added)
  })

  it('ignores nested node_modules and macOS metadata files', async () => {
    const before = await fingerprintInputs(root, ['src'])
    await write(path.join(root, 'src', 'node_modules', 'dep', 'index.js'), 'x')
    await write(path.join(root, 'src', '.DS_Store'), 'x')
    await write(path.join(root, 'src', '._a.txt'), 'x')
    expect(await fingerprintInputs(root, ['src'])).toBe(before)
  })

  it('treats a missing input as absent rather than failing', async () => {
    expect(await fingerprintInputs(root, ['src', 'missing'])).toBe(await fingerprintInputs(root, ['src']))
  })
})

describe('PPT build plan', () => {
  it('builds fully without a recorded stamp', async () => {
    await stageCompletedBuild()
    expect(await planPptBuild({ outputRoot, nodeModulesRoot, fingerprint: 'f1' })).toBe('full')
  })

  it('skips a recorded build whose installed packages carry the same fingerprint', async () => {
    await stageCompletedBuild()
    await recordPptBuild({ outputRoot, nodeModulesRoot, fingerprint: 'f1' })
    expect(await planPptBuild({ outputRoot, nodeModulesRoot, fingerprint: 'f1' })).toBe('fresh')
  })

  it('rebuilds when the inputs changed', async () => {
    await stageCompletedBuild()
    await recordPptBuild({ outputRoot, nodeModulesRoot, fingerprint: 'f1' })
    expect(await planPptBuild({ outputRoot, nodeModulesRoot, fingerprint: 'f2' })).toBe('full')
  })

  it('only reprojects after npm replaced the installed packages', async () => {
    await stageCompletedBuild()
    await recordPptBuild({ outputRoot, nodeModulesRoot, fingerprint: 'f1' })
    await rm(path.join(nodeModulesRoot, 'dsh-ppt-composer'), { recursive: true })
    await mkdir(path.join(nodeModulesRoot, 'dsh-ppt-composer'))
    expect(await planPptBuild({ outputRoot, nodeModulesRoot, fingerprint: 'f1' })).toBe('project')
  })

  it('rebuilds when a staged package or the build manifest is missing', async () => {
    await stageCompletedBuild()
    await recordPptBuild({ outputRoot, nodeModulesRoot, fingerprint: 'f1' })
    await rm(path.join(outputRoot, 'packages', 'dsh-ppt'), { recursive: true })
    expect(await planPptBuild({ outputRoot, nodeModulesRoot, fingerprint: 'f1' })).toBe('full')

    await stageCompletedBuild()
    await rm(path.join(outputRoot, 'packages', 'build.json'))
    expect(await planPptBuild({ outputRoot, nodeModulesRoot, fingerprint: 'f1' })).toBe('full')
  })

  it('rebuilds instead of failing on a corrupt stamp', async () => {
    await stageCompletedBuild()
    await write(path.join(outputRoot, 'build-inputs.json'), '{not json')
    expect(await planPptBuild({ outputRoot, nodeModulesRoot, fingerprint: 'f1' })).toBe('full')
  })
})
