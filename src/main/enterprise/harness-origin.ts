export function sameHarnessOrigin(webContentsUrl: string, runtimeUrl?: string): boolean {
  if (!runtimeUrl) return false
  try {
    return new URL(webContentsUrl).origin === new URL(runtimeUrl).origin
  } catch {
    return false
  }
}
