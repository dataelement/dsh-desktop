import { existsSync } from 'node:fs'
import { join } from 'node:path'

/** Light and dark wordmarks served to the phone pairing page. */
export interface DesktopBrandLogos {
  light: string
  dark: string
}

/** The first root that contains both pairing wordmarks. */
export function desktopBrandLogoPaths(roots: readonly string[]): DesktopBrandLogos | undefined {
  for (const root of roots) {
    const light = join(root, 'node_modules', '@deepseek-ai', 'dsh-web-frontend', 'dist', 'dsh-desktop-logo-light.png')
    const dark = join(root, 'node_modules', '@deepseek-ai', 'dsh-web-frontend', 'dist', 'dsh-desktop-logo-dark.png')
    if (existsSync(light) && existsSync(dark)) return { light, dark }
  }
  return undefined
}
