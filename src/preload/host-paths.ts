/**
 * The stock composer (`dsh-client-ui-conversation`) looks for
 * `globalThis.__DSH_HOST_PATHS__` to tell the Desktop shell from a browser.
 * With it, dropped, picked and pasted files and folders that have a real path
 * become `@path` references instead of uploads; without it, dropping a folder
 * is refused as "desktop app only". Upstream Desktop exposes the same single
 * method from its preload (apps/desktop/src/preload-app.ts).
 */
export const HOST_PATHS_BRIDGE = '__DSH_HOST_PATHS__'

export interface HostPathsBridge {
  /** Host path of a File, or '' for in-memory bytes such as pasted images. */
  pathFor: (file: File) => string
}

/** Build the bridge from Electron's `webUtils.getPathForFile`. */
export function createHostPathsBridge(getPathForFile: (file: File) => string): HostPathsBridge {
  return Object.freeze({
    pathFor: (file: File): string => getPathForFile(file)
  })
}
