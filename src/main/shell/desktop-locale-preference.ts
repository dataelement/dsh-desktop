import { stat, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { localePreferenceFromProfilePatch, localePreferenceFromSettings } from '../application-locale'
import { desktopLocale } from '../../shared/desktop-locale'
import type { DesktopLocale } from '../../shared/desktop-locale'

async function optionalText(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, 'utf8')
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return undefined
    throw error
  }
}

/** Read-only preview of the profile migration; never creates or mutates a profile. */
export async function savedDesktopLocalePreference(home: string, profile: string): Promise<DesktopLocale | undefined> {
  return desktopLocale(await savedDesktopLocaleValue(home, profile))
}

/** Keep explicit plugin/region tags intact when bootstrapping Harness. */
export async function savedDesktopLocaleValue(home: string, profile: string): Promise<string | undefined> {
  let source = profile
  if (profile === 'desktop') {
    try {
      await stat(join(home, 'profiles', 'desktop'))
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') source = 'web'
      else throw error
    }
  }
  const profileText = await optionalText(join(home, 'profiles', source, 'cordis.patch.yml'))
  const profilePreference = profileText === undefined ? undefined : localePreferenceFromProfilePatch(profileText)
  // An explicit future/plugin language is authoritative even if Desktop cannot
  // map it yet. Never replace it with an older, supported settings value.
  if (typeof profilePreference === 'string' && profilePreference.trim() !== '') {
    return profilePreference
  }
  const settingsText = await optionalText(join(home, 'settings.yaml'))
  const legacy = settingsText === undefined ? undefined : localePreferenceFromSettings(settingsText)
  return typeof legacy === 'string' && legacy.trim() !== '' ? legacy : undefined
}
