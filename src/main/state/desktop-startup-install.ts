import { classifyDesktopInstall, type ClassifyDesktopInstallOptions } from './desktop-install-state'

/** Persist the first-install decision before startup services create legacy evidence. */
export function initializeDesktopInstall(
  options: ClassifyDesktopInstallOptions,
  initializeService: () => void
): void {
  classifyDesktopInstall(options)
  initializeService()
}
