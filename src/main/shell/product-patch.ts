import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Scalar, stringify } from 'yaml'
import { HOST_PLUGIN_NAME } from '../../shared/host-plugin-name'

/** Product metadata is authoritative; never discover a product through a parent checkout. */

interface DesktopInsertRow {
  id: string
  name: string
  config?: Record<string, unknown>
}

type DesktopPatchEntry =
  | { id: string, disabled: true }
  | { id: string, config: Record<string, unknown> }
  | { insert: readonly DesktopInsertRow[] }

function jsExpr(expression: string): Scalar<string> {
  const node = new Scalar(expression)
  node.tag = '!!js'
  return node
}

function declaredHostPluginRows(metadata: unknown): DesktopInsertRow[] {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return []
  const plugins = (metadata as Record<string, unknown>).dshDesktopHostPlugins
  if (!Array.isArray(plugins)) return []
  const names = [
    ...new Set(
      plugins.filter((plugin): plugin is string => typeof plugin === 'string' && HOST_PLUGIN_NAME.test(plugin))
    )
  ]
  return names.map(name => ({ id: name, name }))
}

/**
 * Desktop profile overlay. Analytics and the official account page stay off.
 * The official sidebar brand is replaced by the product client UI.
 * The normal profile also mounts workbenches, the plugin market installer,
 * Office, and PPT. Safe Mode keeps the account and brand overlay only.
 */
const DESKTOP_PRODUCT_PATCH_BASE_ENTRIES: readonly DesktopPatchEntry[] = [
  { id: 'desktop-product-telemetry', disabled: true },
  { id: 'product-analytics', disabled: true },
  { id: 'ui-settings-account', disabled: true },
  { id: 'ui-account-notifications', disabled: true },
  { id: 'ui-brand-official', disabled: true },
  { id: 'deepseek-account', config: { desktopPlatform: null } }
]

const DESKTOP_CLIENT_UI_ROW: DesktopInsertRow = {
  id: 'dsh-desktop-client-ui',
  name: 'dsh-desktop-client-ui'
}

function desktopNormalRows(): DesktopInsertRow[] {
  return [
    {
      id: 'dsh-desktop-workbenches',
      name: 'dsh-desktop-workbenches',
      config: { root: jsExpr("dshHomePath('desktop-workbenches')") }
    },
    {
      id: 'dsh-desktop-market-installer',
      name: 'dsh-desktop-market-installer'
    },
    {
      id: 'dsh-desktop-office',
      name: 'dsh-desktop-office',
      config: {
        resources: jsExpr('process.env.DSH_DESKTOP_OFFICE_RESOURCES'),
        cli: jsExpr('process.env.DSH_DESKTOP_OFFICE_CLI')
      }
    },
    // Keep the existing kimi-ppt directory so projects created by the previous shell still open.
    {
      id: 'dsh-ppt-composer',
      name: 'dsh-ppt-composer',
      config: { root: jsExpr("dshHomePath('kimi-ppt')") }
    }
  ]
}

// Windows development only. The packaged overlay never includes this row.
// @deepseek-ai/dsh-hmr waits forever for a watcher ready event on Windows.
const WINDOWS_DEV_HMR_DISABLE_ENTRY: DesktopPatchEntry = {
  id: 'hmr',
  disabled: true
}

function desktopPatchEntries(
  mode: DesktopProductPatchMode,
  metadata?: unknown,
  options?: { skipBlockingHmr?: boolean }
): DesktopPatchEntry[] {
  const insertRows: DesktopInsertRow[] = mode === 'safe'
    ? [DESKTOP_CLIENT_UI_ROW]
    : [DESKTOP_CLIENT_UI_ROW, ...declaredHostPluginRows(metadata), ...desktopNormalRows()]
  return [
    ...DESKTOP_PRODUCT_PATCH_BASE_ENTRIES,
    { insert: insertRows },
    ...(options?.skipBlockingHmr === true ? [WINDOWS_DEV_HMR_DISABLE_ENTRY] : [])
  ]
}

export const DESKTOP_SAFE_PRODUCT_PATCH = stringify(desktopPatchEntries('safe'), { lineWidth: 0 })

export function buildDesktopProductPatch(metadata?: unknown): string {
  return stringify(desktopPatchEntries('desktop', metadata), { lineWidth: 0 })
}

export const DESKTOP_PRODUCT_PATCH = buildDesktopProductPatch()

export type DesktopProductPatchMode = 'desktop' | 'safe'

export async function writeDesktopProductPatch(
  dshHome: string,
  mode: DesktopProductPatchMode = 'desktop',
  metadata?: unknown,
  options?: { skipBlockingHmr?: boolean }
): Promise<string> {
  await mkdir(dshHome, { recursive: true })
  const path = join(dshHome, 'desktop-product.patch.yml')
  const text = stringify(desktopPatchEntries(mode, metadata, options), { lineWidth: 0 })
  await writeFile(path, text)
  return path
}
