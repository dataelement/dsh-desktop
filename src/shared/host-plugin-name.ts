/**
 * Bare npm package name accepted for Desktop host plugins.
 * Mirrors the official Desktop PACKAGE_NAME (including `~`); anchors keep newlines out of generated YAML.
 */
export const HOST_PLUGIN_NAME = /^(?:@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*$/u

/**
 * Parse and validate explicit `dshDesktopHostPlugins` declarations from application metadata.
 * Returns `undefined` when absent; throws on malformed declarations so Main and Host fail closed identically.
 */
export function parseDeclaredHostPlugins(metadata: unknown): string[] | undefined {
  if (metadata === null || typeof metadata !== 'object' || Array.isArray(metadata)) return undefined
  const names: unknown = Reflect.get(metadata, 'dshDesktopHostPlugins')
  if (names === undefined) return undefined
  if (!Array.isArray(names) || !names.every((name: unknown): name is string => typeof name === 'string' && HOST_PLUGIN_NAME.test(name))) {
    throw new Error('dshDesktopHostPlugins must be an array of bare package names')
  }
  return [...new Set(names)]
}
