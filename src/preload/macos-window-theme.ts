import type { IpcRenderer } from 'electron'

/** Harness resolves explicit and system preferences before marking the body. */
export function mountMacosWindowTheme(doc: Document, ipc: Pick<IpcRenderer, 'invoke'>): () => void {
  const sync = (): void => {
    const source = doc.documentElement.getAttribute('data-ds-theme-source')
    // Forward the published source. A resolved dark boolean would pin "system".
    const themeSource = source === 'light' || source === 'dark' || source === 'system' ? source : undefined
    void ipc.invoke('desktop-titlebar:set-theme', doc.body.hasAttribute('data-ds-dark-theme'), themeSource)
      .catch((error: unknown) => console.warn('[desktop-theme] unable to synchronize window backdrop', error))
  }
  const observer = new MutationObserver(sync)
  observer.observe(doc.body, { attributes: true, attributeFilter: ['data-ds-dark-theme'] })
  // "Dark" -> "System" on a dark Mac changes only this root attribute.
  observer.observe(doc.documentElement, { attributes: true, attributeFilter: ['data-ds-theme-source'] })
  sync()
  return () => observer.disconnect()
}
