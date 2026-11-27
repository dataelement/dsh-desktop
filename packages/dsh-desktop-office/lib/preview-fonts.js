import { readdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

/** Explicit public font sources avoid the optional, privacy-protected Office cloud cache.
 * The engine already disables implicit Office discovery when font directories are supplied.
 * Source document font assignments remain unchanged; installed app fonts stay available.
 */
export async function officePreviewFontArguments({ platform = process.platform, home = homedir(), list = readdir } = {}) {
  if (platform !== 'darwin') return []
  const roots = ['/System/Library/AssetsV2', '/System/Library/AssetsV2/PreinstalledAssetsV2/InstallWithOs']
  const directories = ['/System/Library/Fonts', '/Library/Fonts', join(home, 'Library/Fonts'),
    '/Applications/Microsoft Word.app/Contents/Resources/DFonts', '/Applications/Microsoft Excel.app/Contents/Resources/DFonts']
  for (const root of roots) {
    let names
    try { names = await list(root) } catch (error) { if (['ENOENT', 'ENOTDIR', 'EPERM', 'EACCES'].includes(error.code)) continue; throw error }
    directories.push(...names.filter(name => /^com_apple_MobileAsset_Font[0-9]+$/.test(name)).map(name => join(root, name)))
  }
  return directories.flatMap(path => ['--font-directory', path])
}
