import { contextBridge, ipcRenderer } from 'electron'
import { refreshDesktopStoragePersistence } from './desktop-storage'
import { HARNESS_BOOT_DOCUMENT_CHANNEL, HARNESS_BOOT_CHANNEL, HARNESS_BOOT_FAILED_CHANNEL, isHarnessShellUrl, type HarnessBootPayload } from '../shared/harness-boot'

/** The upstream shell applies the typed injections before resolving its boot gate. */
export function installHarnessBootBridge(onFailure?: () => void): ((message: unknown) => Promise<unknown>) | undefined {
  if (!process.isMainFrame || !isHarnessShellUrl(location.href)) return
  const documentId = crypto.randomUUID()
  const registered = Promise.resolve(ipcRenderer.invoke(HARNESS_BOOT_DOCUMENT_CHANNEL, documentId))
  // A page can be replaced before the shell consumes this registration.
  void registered.catch(() => {})
  const reportFailure = (message: unknown): Promise<unknown> => {
    if (typeof message !== 'string') return Promise.reject(new Error('A boot failure message is required.'))
    onFailure?.()
    return registered.then(() => ipcRenderer.invoke(HARNESS_BOOT_FAILED_CHANNEL, message.slice(0, 20_000), documentId))
  }
  contextBridge.exposeInMainWorld('dshDesktopBoot', {
    ready: async (): Promise<HarnessBootPayload> => {
      await registered
      const payload: HarnessBootPayload = await ipcRenderer.invoke(HARNESS_BOOT_CHANNEL)
      refreshDesktopStoragePersistence()
      return payload
    },
    failed: reportFailure
  })
  return reportFailure
}
