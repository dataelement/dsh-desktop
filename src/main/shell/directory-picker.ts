import type { HarnessLocale } from '../application-locale'
import { nativeLocaleMessages } from './native-locale-messages'

/** Heading of the native workspace panel; macOS controls use the startup AppleLanguages domain. */
export function workspaceDirectoryPrompt(locale: HarnessLocale): string {
  return nativeLocaleMessages[locale].directory
}
