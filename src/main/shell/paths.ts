import { join } from 'node:path'

/** Profile paths under the product Harness home. The caller supplies that home; this does not read `~/.dsh`. */
export interface DesktopPaths {
  readonly profile: string
  readonly lock: string
}

export function resolveDesktopPaths(dshHome: string): DesktopPaths {
  return {
    profile: join(dshHome, 'profiles', 'desktop'),
    lock: join(dshHome, 'profiles', 'desktop', 'lock')
  }
}
