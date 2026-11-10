import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

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

export const DESKTOP_PRODUCT_PATCH = `${DESKTOP_PRODUCT_PATCH_BASE}${DESKTOP_WORKBENCH_ROW}${DESKTOP_MARKET_ROW}${DESKTOP_OFFICE_ROW}${DESKTOP_PPT_ROW}`

// Windows development only. The packaged overlay never includes this row.
const WINDOWS_DEV_HMR_DISABLE = `# @deepseek-ai/dsh-hmr waits forever for a watcher ready event on Windows.
- id: hmr
  disabled: true
`

export type DesktopProductPatchMode = 'desktop' | 'safe'

export async function writeDesktopProductPatch(
  dshHome: string,
  mode: DesktopProductPatchMode = 'desktop',
  options?: { skipBlockingHmr?: boolean }
): Promise<string> {
  await mkdir(dshHome, { recursive: true })
  const path = join(dshHome, 'desktop-product.patch.yml')
  const base = mode === 'safe' ? DESKTOP_SAFE_PRODUCT_PATCH : DESKTOP_PRODUCT_PATCH
  const text = options?.skipBlockingHmr === true ? `${base}${WINDOWS_DEV_HMR_DISABLE}` : base
  await writeFile(path, text)
  return path
}
