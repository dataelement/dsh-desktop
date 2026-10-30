import { join } from 'node:path'
import { createMarketInstallStore } from '../../../packages/dsh-desktop-workbenches/market-install.mjs'

/** Keep market ownership in step with a completed Profile removal. */
export async function forgetRemovedWorkbenchMarketInstall(
  dshHome: string,
  pluginName: string,
  note: (message: string) => void
): Promise<void> {
  try {
    await createMarketInstallStore(join(dshHome, 'desktop-workbenches')).forgetPlugin(pluginName)
  } catch (error) {
    // The Profile removal has already succeeded. Retain the record for a
    // later repair and report the cleanup error without reversing recovery.
    note(`could not clear the workbench market install for ${pluginName}: ${String(error)}`)
  }
}
