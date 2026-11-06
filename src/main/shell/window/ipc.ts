import type { IpcMainInvokeEvent } from 'electron'

/** IPC channel names private to the desktop bundle. Product handlers arrive with their modules. */
export const DESKTOP_IPC = {
  fileSave: 'dsh-desktop:file-save',
  clipboardImageRead: 'dsh-desktop:clipboard-image-read',
  shortcutsInput: 'dsh-desktop:shortcuts-input',
  shortcutsCloseWindow: 'dsh-desktop:shortcuts-close-window',
  shortcutsGet: 'dsh-desktop:shortcuts-get',
  shortcutsEdit: 'dsh-desktop:shortcuts-edit',
  shortcutsChanged: 'dsh-desktop:shortcuts-changed',
  shortcutsRecording: 'dsh-desktop:shortcuts-recording',
  boot: 'dsh-desktop:boot',
  enterWorkspace: 'dsh-desktop:enter-workspace',
  onboardingActive: 'dsh-desktop:onboarding-active',
  onboardingApiKey: 'dsh-desktop:onboarding-api-key',
  bootFailed: 'dsh-desktop:boot-failed',
  webImportAction: 'dsh-desktop:web-import-action',
  safeModeFrame: 'dsh-desktop:safe-mode-frame',
  safeModeAction: 'dsh-desktop:safe-mode-action',
  mobileOpen: 'dsh-desktop:mobile-open',
  mobileStatus: 'dsh-desktop:mobile-status',
  mobileStatusChanged: 'dsh-desktop:mobile-status-changed',
  repairOpen: 'dsh-desktop:repair-open',
  repairDraftGet: 'dsh-desktop:repair-draft-get',
  repairDraftAck: 'dsh-desktop:repair-draft-ack',
  browserAcquire: 'dsh-desktop:browser-acquire',
  browserRelease: 'dsh-desktop:browser-release',
  browserOpenRequested: 'dsh-desktop:browser-open-requested',
  directoryPick: 'dsh-desktop:directory-pick',
  fileDragPrepare: 'dsh-desktop:file-drag-prepare',
  fileDragCancel: 'dsh-desktop:file-drag-cancel',
  fileDragStart: 'dsh-desktop:file-drag-start',
  fileDragRelease: 'dsh-desktop:file-drag-release',
  deviceInfo: 'dsh-desktop:device-info',
  localeBootstrap: 'dsh-desktop:locale-bootstrap',
  localeChanged: 'dsh-desktop:locale-changed',
  updatesStatus: 'dsh-desktop:updates-status',
  updatesOpen: 'dsh-desktop:updates-open',
  updatesPresentation: 'dsh-desktop:updates-presentation',
  nativeThemeSet: 'dsh-desktop:native-theme-set',
  windowFullscreen: 'dsh-desktop:window-fullscreen',
  windowsAppearance: 'dsh-desktop:windows-appearance',
  windowsMenu: 'dsh-desktop:windows-menu'
} as const

/** Platform bridge channels. They live here until `platform-ipc.ts` is ported. */
export const PLATFORM_IPC = {
  bootstrap: 'dsh-platform:bootstrap',
  localeChanged: 'dsh-platform:locale-changed',
  open: 'dsh-platform:open',
  bounds: 'dsh-platform:bounds',
  close: 'dsh-platform:close'
} as const

export type PlatformLocale = 'en_US' | 'zh_CN'

/** Scheme of desktop-owned application documents. */
export const SCHEME = 'dsh-app'

/** Reject IPC whose frame is not one of the desktop document hosts. */
export function assertDesktopSender(event: IpcMainInvokeEvent, hostnames: readonly string[]): void {
  const senderFrame = event.senderFrame
  if (senderFrame === null) throw new Error('dsh desktop: rejected IPC without a sender frame')
  const url = new URL(senderFrame.url)
  if (url.protocol !== `${SCHEME}:` || !hostnames.includes(url.hostname)) {
    throw new Error('dsh desktop: rejected IPC from an unowned renderer')
  }
}
