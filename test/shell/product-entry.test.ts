import { mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { loadDesktopProductEntry } from '../../src/main/shell/product-entry'
import { disposeDesktopProduct, isDesktopProductRegistered } from '../../src/main/shell/product-runtime'

describe('installed Desktop product entry', () => {
  it('rejects entries outside the installed application', async () => {
    await expect(loadDesktopProductEntry({ dshDesktopProductEntry: '../product.mjs' }, '/tmp/desktop-app'))
      .rejects.toThrow('must stay inside')
  })

  it('rejects symlinks resolving outside the installed application', async () => {
    const root = await mkdtemp(join(tmpdir(), 'desktop-product-entry-app-'))
    const outside = await mkdtemp(join(tmpdir(), 'desktop-product-entry-out-'))
    try {
      const target = join(outside, 'escape.mjs')
      await writeFile(target, 'export function registerDesktopProduct() {}\n')
      await symlink(target, join(root, 'escape-link.mjs'))
      await expect(loadDesktopProductEntry({ dshDesktopProductEntry: 'escape-link.mjs' }, root))
        .rejects.toThrow('must stay inside')
    } finally {
      await rm(root, { recursive: true, force: true })
      await rm(outside, { recursive: true, force: true })
    }
  })

  it('loads the declared entry and registers against the host runtime', async () => {
    const root = await mkdtemp(join(tmpdir(), 'desktop-product-entry-'))
    try {
      await writeFile(join(root, 'product.mjs'), `
        export function registerDesktopProduct(register) {
          register(() => ({
            hostEnvironment: () => ({ PRODUCT_ENTRY: 'loaded' }),
            attachWindow: () => {},
            dispose: async () => {}
          }))
        }
      `)
      await loadDesktopProductEntry({ dshDesktopProductEntry: 'product.mjs' }, root)
      expect(isDesktopProductRegistered()).toBe(true)
    } finally {
      await disposeDesktopProduct()
      await rm(root, { recursive: true, force: true })
    }
  })
})
