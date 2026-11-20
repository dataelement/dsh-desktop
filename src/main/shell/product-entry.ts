import { existsSync, realpathSync } from 'node:fs'
import { isAbsolute, relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  isDesktopProductRegistered,
  registerDesktopProduct,
  type DesktopProductFactory
} from './product-runtime'

const PRODUCT_ENTRY_FIELD = 'dshDesktopProductEntry'

type ProductEntryModule = {
  registerDesktopProduct?: (register: typeof registerDesktopProduct) => void | Promise<void>
}

function isOutsideRoot(root: string, target: string): boolean {
  const rel = relative(root, target)
  return rel === '..' || rel.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) || isAbsolute(rel)
}

function productEntryPath(metadata: unknown, appPath: string): string | undefined {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return undefined
  const entry = (metadata as Record<string, unknown>)[PRODUCT_ENTRY_FIELD]
  if (entry === undefined) return undefined
  if (typeof entry !== 'string' || entry.trim() === '' || isAbsolute(entry)) {
    throw new Error(`${PRODUCT_ENTRY_FIELD} must be a relative package entry path.`)
  }
  const root = resolve(appPath)
  const resolved = resolve(root, entry)
  if (isOutsideRoot(root, resolved)) {
    throw new Error(`${PRODUCT_ENTRY_FIELD} must stay inside the installed application.`)
  }
  if (!existsSync(resolved)) throw new Error(`Desktop product entry does not exist: ${entry}`)
  const canonicalRoot = realpathSync(root)
  const canonicalResolved = realpathSync(resolved)
  if (isOutsideRoot(canonicalRoot, canonicalResolved)) {
    throw new Error(`${PRODUCT_ENTRY_FIELD} must stay inside the installed application.`)
  }
  return canonicalResolved
}

export async function loadDesktopProductEntry(metadata: unknown, appPath: string, safeMode = false): Promise<void> {
  if (safeMode) return
  const entry = productEntryPath(metadata, appPath)
  if (entry === undefined) return
  let module: ProductEntryModule
  try {
    module = await import(pathToFileURL(entry).href) as ProductEntryModule
  } catch (error) {
    throw new Error(`Unable to load Desktop product entry: ${entry}`, { cause: error })
  }
  if (typeof module.registerDesktopProduct !== 'function') {
    throw new Error(`Desktop product entry must export registerDesktopProduct: ${entry}`)
  }
  await module.registerDesktopProduct(registerDesktopProduct)
  if (!isDesktopProductRegistered()) {
    throw new Error(`Desktop product entry did not register a product: ${entry}`)
  }
}

export type { DesktopProductFactory }
