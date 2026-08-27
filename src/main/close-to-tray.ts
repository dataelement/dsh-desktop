export function shouldKeepRunningInBackground(
  platform: NodeJS.Platform,
  quitting: boolean
): boolean {
  return platform === 'win32' && !quitting
}
