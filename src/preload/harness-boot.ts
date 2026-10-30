import { contextBridge, ipcRenderer } from 'electron'
import { refreshDesktopStoragePersistence } from './desktop-storage'
import { HARNESS_BOOT_CHANNEL, HARNESS_BOOT_FAILED_CHANNEL, isHarnessShellUrl, type HarnessBootPayload } from '../shared/harness-boot'

/** The upstream shell applies the typed injections before resolving its boot gate. */
export function installHarnessBootBridge(onFailure?: () => void): void {
  if (!process.isMainFrame || !isHarnessShellUrl(location.href)) return
  contextBridge.exposeInMainWorld('dshDesktopBoot', {
    ready: async (): Promise<HarnessBootPayload> => {
      const payload: HarnessBootPayload = await ipcRenderer.invoke(HARNESS_BOOT_CHANNEL)
      refreshDesktopStoragePersistence()
      return payload
    },
    failed: (message: unknown): Promise<unknown> => {
      if (typeof message !== 'string') return Promise.reject(new Error('A boot failure message is required.'))
      onFailure?.()
      return ipcRenderer.invoke(HARNESS_BOOT_FAILED_CHANNEL, message.slice(0, 20_000))
    }
  })
}
