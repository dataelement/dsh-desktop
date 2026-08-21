import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readdir, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'

import { removeTree, removeTreeIfPossible } from '../src/main/state/remove-tree'

const roots: string[] = []

async function scratch(name: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), `dsh-remove-tree-${name}-`))
  roots.push(root)
  return root
}

/** A profile-shaped tree: nested directories, files, and an empty directory. */
async function packageTree(root: string, name: string): Promise<string> {
  const pkg = join(root, name)
  await mkdir(join(pkg, 'lib', 'types'), { recursive: true })
  await mkdir(join(pkg, 'empty'), { recursive: true })
  await writeFile(join(pkg, 'package.json'), '{"name":"x"}')
  await writeFile(join(pkg, 'lib', 'index.js'), 'export default 1')
  await writeFile(join(pkg, 'lib', 'types', 'index.d.ts'), 'export {}')
  return pkg
}

afterAll(async () => {
  for (const root of roots) await rm(root, { recursive: true, force: true }).catch(() => undefined)
})

describe('removeTree', () => {
  it('removes a package tree whose path is not ASCII', async () => {
    // The reason this module exists. Node's recursive `rm` reports success and
    // removes nothing under such a path on Windows, so every cleanup built on
    // it silently stopped working for anyone whose account name is not ASCII.
    const root = await scratch('unicode')
    const home = join(root, '数据项素', 'node_modules')
    await mkdir(home, { recursive: true })
    const pkg = await packageTree(home, 'cose-base')

    await removeTree(pkg)

    expect(existsSync(pkg)).toBe(false)
    expect(await readdir(home)).toEqual([])
  })

  it('removes an ASCII tree the same way', async () => {
    const root = await scratch('ascii')
    const pkg = await packageTree(root, 'layout-base')

    await removeTree(pkg)

    expect(existsSync(pkg)).toBe(false)
  })

  it('treats a missing path as already removed', async () => {
    const root = await scratch('missing')

    await expect(removeTree(join(root, 'never-there'))).resolves.toBeUndefined()
  })

  it('detaches a symlink without following it', async () => {
    // pnpm's layout links into a shared store. Following one would take the
    // store's contents with it, which is a far worse outcome than a leftover.
    const root = await scratch('symlink')
    const store = await packageTree(root, 'store-copy')
    const link = join(root, 'linked')
    try {
      await symlink(store, link, 'junction')
    } catch {
      return // an unprivileged Windows session cannot create links; nothing to assert
    }

    await removeTree(link)

    expect(existsSync(link)).toBe(false)
    expect(existsSync(join(store, 'package.json'))).toBe(true)
  })

  it('removes a single file', async () => {
    const root = await scratch('file')
    const file = join(root, 'pnpm-lock.yaml')
    await writeFile(file, 'lockfileVersion: 9')

    await removeTree(file)

    expect(existsSync(file)).toBe(false)
  })

  it('reports whether the path is gone rather than throwing', async () => {
    const root = await scratch('report')
    const pkg = await packageTree(root, 'dshmarket')

    await expect(removeTreeIfPossible(pkg)).resolves.toBe(true)
    await expect(removeTreeIfPossible(join(root, 'absent'))).resolves.toBe(true)
  })

})
