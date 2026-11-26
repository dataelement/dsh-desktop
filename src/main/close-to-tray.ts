export function shouldKeepRunningInBackground(
  platform: NodeJS.Platform,
  quitting: boolean
): boolean {
  return (platform === 'darwin' || platform === 'win32') && !quitting
}
