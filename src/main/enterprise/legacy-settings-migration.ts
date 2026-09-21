import { readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { isMap, parseDocument } from 'yaml'

const LEGACY_PROVIDER = 'bisheng-enterprise'
const LEGACY_API_KEY_ENV = 'BISHENG_ENTERPRISE_TOKEN'
const LEGACY_SETTINGS = 'dsh-desktop-enterprise'

export interface LegacyEnterpriseSettingsMigration {
  changed: boolean
  removed: string[]
}

export interface LegacyEnterpriseSettingsFileIo {
  readFile: typeof readFile
  writeFile: typeof writeFile
  rename: typeof rename
  unlink: typeof unlink
}

const defaultFileIo: LegacyEnterpriseSettingsFileIo = {
  readFile,
  writeFile,
  rename,
  unlink
}

/**
 * Retire the settings written by the original Desktop enterprise preview.
 *
 * That preview registered BiSheng through llm-pi-ai and persisted its public
 * account snapshot in settings.yaml. The current built-in integration owns the
 * same provider route and stores the session in the OS credential vault. The
 * exact legacy API-key marker keeps this migration scoped to preview-owned data.
 */
export async function migrateLegacyEnterpriseSettings(
  dshHome: string,
  fileIo: Partial<LegacyEnterpriseSettingsFileIo> = {}
): Promise<LegacyEnterpriseSettingsMigration> {
  const io = { ...defaultFileIo, ...fileIo }
  const path = join(dshHome, 'settings.yaml')
  let source: string
  try {
    source = await io.readFile(path, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { changed: false, removed: [] }
    }
    throw error
  }

  const document = parseDocument(source)
  if (document.errors.length > 0 || !isMap(document.contents)) {
    return { changed: false, removed: [] }
  }

  const removed: string[] = []
  const llmPiAi = document.contents.get('llm-pi-ai', true)
  if (isMap(llmPiAi)) {
    const providers = llmPiAi.get('providers', true)
    if (isMap(providers)) {
      const provider = providers.get(LEGACY_PROVIDER, true)
      if (isMap(provider) && provider.get('apiKeyEnv') === LEGACY_API_KEY_ENV) {
        providers.delete(LEGACY_PROVIDER)
        removed.push(`llm-pi-ai.providers.${LEGACY_PROVIDER}`)
      }
    }
  }

  const legacySettings = document.contents.get(LEGACY_SETTINGS, true)
  if (
    isMap(legacySettings) &&
    (
      typeof legacySettings.get('platformUrl') === 'string' ||
      typeof legacySettings.get('modelBaseUrl') === 'string' ||
      typeof legacySettings.get('accountId') === 'string'
    )
  ) {
    document.contents.delete(LEGACY_SETTINGS)
    removed.push(LEGACY_SETTINGS)
  }

  if (removed.length === 0) return { changed: false, removed }
  const temporary = `${path}.${process.pid}.${Date.now()}.enterprise-migration`
  try {
    await io.writeFile(temporary, String(document), { encoding: 'utf8', mode: 0o600 })
    await io.rename(temporary, path)
  } catch (error) {
    // Leave the original settings.yaml in place if the replacement fails.
    await io.unlink(temporary).catch(() => undefined)
    throw error
  }
  return { changed: true, removed }
}
