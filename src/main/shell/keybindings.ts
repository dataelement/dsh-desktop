/** Device-local shortcut preferences in Electron userData; writes share one serialized coordinator. */
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { writeFileAtomic } from '@deepseek-ai/dsh-atomic-write'
import { ShortcutPersistence } from '@deepseek-ai/dsh-client-shortcuts/protocol'
import type { ShortcutConfigSnapshot, ShortcutPlatform } from '@deepseek-ai/dsh-client-shortcuts/protocol'

/**
 * Open the device configuration with atomic replacement.
 * @param userData - Electron-owned userData directory, never a renderer-supplied path.
 * @param platform - local input platform.
 * @param publish - updates the native binding index and trusted product page after commit.
 */
export function desktopKeybindings(
  userData: string,
  platform: ShortcutPlatform,
  publish: (snapshot: ShortcutConfigSnapshot) => void
): ShortcutPersistence {
  const path = join(userData, 'keybindings.json')
  return new ShortcutPersistence({
    read: async () => {
      try {
        return await readFile(path, 'utf8')
      } catch (error) {
        if (isMissingFile(error)) return null
        throw error
      }
    },
    write: raw => writeFileAtomic(path, raw, { mode: 0o600, dirMode: 0o700 })
  }, 'desktop', platform, false, publish)
}

function isMissingFile(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT'
}
