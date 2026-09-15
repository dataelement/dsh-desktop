import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { checkWorkbenchPackage } from '../scripts/check-workbench-package.mjs'

const roots = []
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))))

async function fixture(metadata = {}) {
  const root = await mkdtemp(join(tmpdir(), 'dsh-workbench-package-'))
  roots.push(root)
  await mkdir(join(root, 'lib'))
  await writeFile(join(root, 'lib', 'client.js'), 'export default {}')
  const manifest = {
    schemaVersion: 1,
    id: 'fixture-workbench',
    title: 'Fixture',
    description: 'Fixture workbench',
    version: '1.0.0',
    entry: './lib/client.js',
    compatibility: { desktopWorkbenches: '^0.1.0', harness: '^0.1.5' },
    capabilities: [],
    ...metadata
  }
  const pkg = {
    name: 'fixture-workbench', version: '1.0.0',
    dsh: { client: { inject: ['dsh-desktop-workbenches'] }, bundle: { patch: true } }
  }
  await writeFile(join(root, 'workbench.json'), JSON.stringify(manifest))
  await writeFile(join(root, 'package.json'), JSON.stringify(pkg))
  return root
}

const png = (extra = 0) => Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.alloc(extra)])

describe('workbench package market metadata', () => {
  it('keeps existing schemaVersion 1 packages without market metadata valid', async () => {
    await expect(checkWorkbenchPackage(await fixture())).resolves.toMatchObject({ id: 'fixture-workbench' })
  })

  it('accepts author variants and packaged screenshots with optional alt text', async () => {
    const root = await fixture({
      author: { name: 'Ada' },
      screenshots: [{ path: 'media/preview.png', alt: 'Workbench preview' }]
    })
    await mkdir(join(root, 'media'))
    await writeFile(join(root, 'media', 'preview.png'), png())
    await expect(checkWorkbenchPackage(root)).resolves.toMatchObject({ id: 'fixture-workbench' })

    const stringAuthor = await fixture({ author: 'Grace', screenshots: ['preview.webp'] })
    await writeFile(join(stringAuthor, 'preview.webp'), Buffer.from('RIFF\u0004\u0000\u0000\u0000WEBP'))
    await expect(checkWorkbenchPackage(stringAuthor)).resolves.toMatchObject({ id: 'fixture-workbench' })
  })

  it.each([
    [{ author: '' }, /author/],
    [{ screenshots: [] }, /1 to 5/],
    [{ screenshots: ['../outside.png'] }, /safe relative path/],
    [{ screenshots: ['/tmp/outside.png'] }, /safe relative path/],
    [{ screenshots: [{ path: 'preview.png', alt: '' }] }, /alt/],
    [{ screenshots: ['missing.png'] }, /existing regular file/]
  ])('rejects invalid optional metadata: %#', async (metadata, message) => {
    await expect(checkWorkbenchPackage(await fixture(metadata))).rejects.toThrow(message)
  })

  it('rejects unsupported signatures and screenshots over 2 MB', async () => {
    const bad = await fixture({ screenshots: ['preview.png'] })
    await writeFile(join(bad, 'preview.png'), 'not an image')
    await expect(checkWorkbenchPackage(bad)).rejects.toThrow(/PNG, JPEG, or WebP/)

    const large = await fixture({ screenshots: ['preview.png'] })
    await writeFile(join(large, 'preview.png'), png(2 * 1024 * 1024))
    await expect(checkWorkbenchPackage(large)).rejects.toThrow(/2 MB/)
  })
})
