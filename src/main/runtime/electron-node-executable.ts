import { posix } from 'node:path'

/**
 * The Electron binary that runs Node work outside Harness — Profile repair,
 * market baseline, generation installs and the `.desktop-bin` shims — always
 * with `ELECTRON_RUN_AS_NODE=1`. The Desktop no longer ships a standalone Node.
 *
 * macOS uses the app's Helper rather than the main executable: Harness itself
 * runs in a utility process whose `process.execPath` is that Helper, so the
 * shims the Harness-side installer writes point at it too, and a plugin that
 * copies `process.execPath` gets a binary with no Dock or single-instance
 * behaviour to trigger. Other platforms use the main executable.
 */
export function electronNodeExecutable(
  execPath: string,
  platform: NodeJS.Platform = process.platform
): string {
  if (platform !== 'darwin') return execPath
  // <App>.app/Contents/MacOS/<Name> → <App>.app/Contents/Frameworks/<Name> Helper.app/…
  const name = posix.basename(execPath)
  const contents = posix.dirname(posix.dirname(execPath))
  return posix.join(contents, 'Frameworks', `${name} Helper.app`, 'Contents', 'MacOS', `${name} Helper`)
}
