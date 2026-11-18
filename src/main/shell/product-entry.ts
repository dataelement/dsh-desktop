import { existsSync } from 'node:fs'
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

function productEntryPath(metadata: unknown, appPath: string): string | undefined {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return undefined
  const entry = (metadata as Record<string, unknown>)[PRODUCT_ENTRY_FIELD]
  if (entry === undefined) return undefined
  if (typeof entry !== 'string' || entry.trim() === '' || isAbsolute(entry)) {
    throw new Error(`${PRODUCT_ENTRY_FIELD} must be a relative package entry path.`)
  }
  const root = resolve(appPath)
  const resolved = resolve(root, entry)
  const outside = relative(root, resolved)
  if (outside === '..' || outside.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) || isAbsolute(outside)) {
    throw new Error(`${PRODUCT_ENTRY_FIELD} must stay inside the installed application.`)
  }
  if (!existsSync(resolved)) throw new Error(`Desktop product entry does not exist: ${entry}`)
  return resolved
}

export async function loadDesktopProductEntry(metadata: unknown, appPath: string): Promise<void> {
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
