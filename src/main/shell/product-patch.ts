import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
/** Product metadata is authoritative; never discover a product through a parent checkout. */
function hasEnterprisePlugin(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return false
  const plugins = (metadata as Record<string, unknown>).dshDesktopHostPlugins
  return Array.isArray(plugins) && plugins.includes('dsh-desktop-enterprise')
}

/**
 * Desktop profile overlay. Analytics and the official account page stay off.
 * The official sidebar brand is replaced by the product client UI.
 * The normal profile also mounts workbenches, the plugin market installer,
 * Office, and PPT. Safe Mode keeps the account and brand overlay only.
 */
const DESKTOP_PRODUCT_PATCH_BASE = `- id: desktop-product-telemetry
  disabled: true
- id: product-analytics
  disabled: true
- id: ui-settings-account
  disabled: true
- id: ui-brand-official
  disabled: true
- id: deepseek-account
  config:
    desktopPlatform: null
- insert:
    - id: dsh-desktop-client-ui
      name: dsh-desktop-client-ui
`

const DESKTOP_ENTERPRISE_ROW = `    - id: dsh-desktop-enterprise
      name: dsh-desktop-enterprise
`

const DESKTOP_WORKBENCH_ROW = `    - id: dsh-desktop-workbenches
      name: dsh-desktop-workbenches
      config:
        root: !!js dshHomePath('desktop-workbenches')
`

const DESKTOP_MARKET_ROW = `    - id: dsh-desktop-market-installer
      name: dsh-desktop-market-installer
`

const DESKTOP_OFFICE_ROW = `    - id: dsh-desktop-office
      name: dsh-desktop-office
      config:
        resources: !!js process.env.DSH_DESKTOP_OFFICE_RESOURCES
        cli: !!js process.env.DSH_DESKTOP_OFFICE_CLI
`

// Keep the existing kimi-ppt directory so projects created by the previous shell still open.
const DESKTOP_PPT_ROW = `    - id: dsh-ppt-composer
      name: dsh-ppt-composer
      config:
        root: !!js dshHomePath('kimi-ppt')
`

export const DESKTOP_SAFE_PRODUCT_PATCH = DESKTOP_PRODUCT_PATCH_BASE

export function buildDesktopProductPatch(metadata?: unknown): string {
  const enterprise = hasEnterprisePlugin(metadata) ? DESKTOP_ENTERPRISE_ROW : ''
  return `${DESKTOP_PRODUCT_PATCH_BASE}${enterprise}${DESKTOP_WORKBENCH_ROW}${DESKTOP_MARKET_ROW}${DESKTOP_OFFICE_ROW}${DESKTOP_PPT_ROW}`
}

export const DESKTOP_PRODUCT_PATCH = buildDesktopProductPatch()

export type DesktopProductPatchMode = 'desktop' | 'safe'

export async function writeDesktopProductPatch(dshHome: string, mode: DesktopProductPatchMode = 'desktop', metadata?: unknown): Promise<string> {
  await mkdir(dshHome, { recursive: true })
  const path = join(dshHome, 'desktop-product.patch.yml')
  const text = mode === 'safe' ? DESKTOP_SAFE_PRODUCT_PATCH : buildDesktopProductPatch(metadata)
  await writeFile(path, text)
  return path
}
