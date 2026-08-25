import { mkdir, mkdtemp, readdir, rm, symlink, utimes, writeFile } from 'node:fs/promises'
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

  async function profile(): Promise<{ directory: string; nodeModules: string }> {
    const directory = await mkdtemp(join(tmpdir(), 'dsh-progress-'))
    roots.push(directory)
    const nodeModules = join(directory, 'node_modules')
    await mkdir(nodeModules, { recursive: true })
    return { directory, nodeModules }
  }

  /**
   * Windows moves the system clock in ~15ms steps, so a directory created and
   * written to inside one tick carries the same mtime for both samples. Aging
   * the tree first makes any later write strictly newer, which is what the
   * assertions are actually about — the poll interval is seconds, so the
   * granularity never matters in production.
   */
  async function ageTree(path: string): Promise<void> {
    const past = new Date(Date.now() - 60_000)
    const entries = await readdir(path, { withFileTypes: true })
    await Promise.all(
      entries
        .filter((entry) => entry.isDirectory() && !entry.isSymbolicLink())
        .map((entry) => ageTree(join(path, entry.name)))
    )
    await utimes(path, past, past)
  }

  afterEach(async () => {
    await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
  })

  // The layout this profile actually uses: nodeLinker is hoisted, so packages
  // land directly under node_modules and .pnpm never holds more than a
  // lockfile. A probe anchored at .pnpm reads a healthy install as motionless.
  describe('hoisted layout', () => {
    it('changes when a package appears at the top level', async () => {
      const { directory, nodeModules } = await profile()
      await mkdir(join(nodeModules, '.pnpm'), { recursive: true })
      await writeFile(join(nodeModules, '.pnpm', 'lock.yaml'), 'x', 'utf8')
      const before = await progressSignature(directory)
      await mkdir(join(nodeModules, 'dshmarket'), { recursive: true })
      expect(await progressSignature(directory)).not.toBe(before)
    })

    it('changes when a file lands inside a package already present', async () => {
      const { directory, nodeModules } = await profile()
      const packagePath = join(nodeModules, 'typescript', 'lib')
      await mkdir(packagePath, { recursive: true })
      await ageTree(nodeModules)
      const before = await progressSignature(directory)
      await writeFile(join(packagePath, 'tsc.js'), 'x', 'utf8')
      expect(await progressSignature(directory)).not.toBe(before)
    })
  })

  describe('isolated layout', () => {
    /** .pnpm/<id>/node_modules/<name>, as pnpm materializes it. */
    async function materialize(nodeModules: string, id: string, name: string): Promise<string> {
      const path = join(nodeModules, '.pnpm', id, 'node_modules', name)
      await mkdir(path, { recursive: true })
      return path
    }

    it('changes when a package is added to the virtual store', async () => {
      const { directory, nodeModules } = await profile()
      await mkdir(join(nodeModules, '.pnpm'), { recursive: true })
      const before = await progressSignature(directory)
      await materialize(nodeModules, 'left-pad@1.3.0', 'left-pad')
      expect(await progressSignature(directory)).not.toBe(before)
    })

    it('changes when a file lands deep inside a materialized package', async () => {
      const { directory, nodeModules } = await profile()
      const packagePath = await materialize(nodeModules, 'typescript@5.4.5', 'typescript')
      await mkdir(join(packagePath, 'lib'), { recursive: true })
      await ageTree(nodeModules)
      const before = await progressSignature(directory)
      await writeFile(join(packagePath, 'lib', 'tsc.js'), 'x', 'utf8')
      expect(await progressSignature(directory)).not.toBe(before)
    })
  })

  it('is stable while nothing is written', async () => {
    const { directory, nodeModules } = await profile()
    await mkdir(join(nodeModules, 'left-pad'), { recursive: true })
    expect(await progressSignature(directory)).toBe(await progressSignature(directory))
  })

  it('does not follow symlinks out of the profile', async () => {
    const { directory, nodeModules } = await profile()
    const packagePath = join(nodeModules, 'a')
    await mkdir(packagePath, { recursive: true })
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

  it('reports a missing node_modules without throwing', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'dsh-progress-empty-'))
    roots.push(directory)
    await expect(progressSignature(directory)).resolves.toBe('0:0')
  })
})
