export const WINDOWS_TITLEBAR_HEIGHT = 36

export const desktopMenuCommands = [
  'connect-phone',
  'restart-harness',
  'show-harness-log',
  'check-for-updates',
  'undo',
  'redo',
  'cut',
  'copy',
  'paste',
  'select-all',
  'reload',
  'toggle-devtools',
  'zoom-reset',
  'zoom-in',
  'zoom-out',
  'toggle-fullscreen',
  'about',
  'quit'
] as const

export type DesktopMenuCommand = (typeof desktopMenuCommands)[number]

const desktopMenuCommandSet = new Set<string>(desktopMenuCommands)

export function isZoomMenuCommand(command: DesktopMenuCommand): boolean {
  return command === 'zoom-reset' || command === 'zoom-in' || command === 'zoom-out'
}

export function formatZoomPercentage(zoomFactor: number): string {
  return `${Math.round(zoomFactor * 100)}%`
}

export function isDesktopMenuCommand(value: unknown): value is DesktopMenuCommand {
  return typeof value === 'string' && desktopMenuCommandSet.has(value)
}
