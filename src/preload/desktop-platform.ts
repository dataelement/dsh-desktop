/** Mark the product document as this desktop, without the old shell's web-shortcut flag. */
export interface DesktopPlatformRoot {
  dataset: {
    platform?: string
    dshDesktopWebShortcuts?: string
  }
}

export function applyDesktopPlatform(root: DesktopPlatformRoot, platform: string): void {
  root.dataset.platform = platform
  delete root.dataset.dshDesktopWebShortcuts
}

export function markDesktopPlatform(document: Document, platform: string): void {
  const mark = (): void => {
    const root = document.documentElement
    if (root !== null) applyDesktopPlatform(root, platform)
  }
  if (document.documentElement === null) document.addEventListener('DOMContentLoaded', mark, { once: true })
  else mark()
}
