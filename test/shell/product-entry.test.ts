import { mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { loadDesktopProductEntry } from '../../src/main/shell/product-entry'
import { disposeDesktopProduct, isDesktopProductRegistered } from '../../src/main/shell/product-runtime'

describe('installed Desktop product entry', () => {
  it('skips loading the product entry in Safe Mode even if metadata or entry throws', async () => {
    const root = await mkdtemp(join(tmpdir(), 'desktop-product-safe-mode-'))
    try {
      await expect(loadDesktopProductEntry({ dshDesktopProductEntry: '../escape.mjs' }, '/tmp/desktop-app', true))
        .resolves.toBeUndefined()
      await writeFile(join(root, 'throwing.mjs'), 'throw new Error("broken product entry")\n')
      await expect(loadDesktopProductEntry({ dshDesktopProductEntry: 'throwing.mjs' }, root, true))
        .resolves.toBeUndefined()
      expect(isDesktopProductRegistered()).toBe(false)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('guards shell product entry and runtime calls in Safe Mode', async () => {
    const source = await readFile(join(import.meta.dirname, '../../src/main/shell/app.ts'), 'utf8')
    expect(source).toContain('await loadDesktopProductEntry(readDesktopPackageMetadata(), app.getAppPath(), safeMode)')
    expect(source).toContain('...(safeMode ? {} : readDesktopProductEnvironment())')
    expect(source).toMatch(/if\s*\(!safeMode\)\s*\{[\s\S]*await startDesktopProduct\(/u)
  })

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
