import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { progressSignature } from '../src/main/runtime/profile-plugin-command'

/**
 * The signature exists to tell a slow install apart from a stalled one. Every
 * case below is a way an install can be making progress; reading any of them
 * as "unchanged" is what gets a healthy run killed mid-rename.
 */
describe('install progress signature', () => {
  const roots: string[] = []

  async function profile(): Promise<{ directory: string; store: string }> {
    const directory = await mkdtemp(join(tmpdir(), 'dsh-progress-'))
    roots.push(directory)
    const store = join(directory, 'node_modules', '.pnpm')
    await mkdir(store, { recursive: true })
    return { directory, store }
  }

  /** A package as pnpm materializes it: .pnpm/<id>/node_modules/<name>. */
  async function materialize(store: string, id: string, name: string): Promise<string> {
    const path = join(store, id, 'node_modules', name)
    await mkdir(path, { recursive: true })
    return path
  }

  afterEach(async () => {
    await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
  })

  it('changes when a package is added to the store', async () => {
    const { directory, store } = await profile()
    const before = await progressSignature(directory)
    await materialize(store, 'left-pad@1.3.0', 'left-pad')
    expect(await progressSignature(directory)).not.toBe(before)
  })

  // The case a top-level-only probe misses: one package copied file by file,
  // with child-concurrency pinned to 1, leaves .pnpm itself untouched for as
  // long as the copy takes.
  it('changes when a file lands deep inside a package already present', async () => {
    const { directory, store } = await profile()
    const packagePath = await materialize(store, 'typescript@5.4.5', 'typescript')
    await mkdir(join(packagePath, 'lib'), { recursive: true })
    const before = await progressSignature(directory)
    await writeFile(join(packagePath, 'lib', 'tsc.js'), 'x', 'utf8')
    expect(await progressSignature(directory)).not.toBe(before)
  })

  it('is stable while nothing is written', async () => {
    const { directory, store } = await profile()
    await materialize(store, 'left-pad@1.3.0', 'left-pad')
    expect(await progressSignature(directory)).toBe(await progressSignature(directory))
  })

  it('does not follow symlinks out of the store', async () => {
    const { directory, store } = await profile()
    const packagePath = await materialize(store, 'a@1.0.0', 'a')
    const outside = join(directory, 'outside')
    await mkdir(join(outside, 'nested'), { recursive: true })
    try {
      await symlink(outside, join(packagePath, 'linked'), 'junction')
    } catch {
      return // Unprivileged Windows without developer mode: nothing to assert.
    }
    const before = await progressSignature(directory)
    await writeFile(join(outside, 'nested', 'file.txt'), 'x', 'utf8')
    expect(await progressSignature(directory)).toBe(before)
  })

  it('reports a missing store without throwing', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'dsh-progress-empty-'))
    roots.push(directory)
    await expect(progressSignature(directory)).resolves.toBe('0:0')
  })
})
