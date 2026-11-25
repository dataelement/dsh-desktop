import { desktopResourceUrl, SAFE_MODE_PAGE } from '../desktop-protocol'
import type { SafeModeViewModel } from '../safe-mode'

/** Normal profile the Safe Mode page edits. The safe profile itself stays untouched. */
export const DESKTOP_PROFILE = 'desktop'

const PLUGIN_NAME = /^(?:@[A-Za-z0-9][A-Za-z0-9._-]*\/)?[A-Za-z0-9][A-Za-z0-9._-]*$/
const REMOVAL_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/

export type SafeModeManagerAction =
  | { type: 'apply'; plugins: string[] }
  | { type: 'enable'; plugins: string[] }
  | { type: 'restart' }
  | { type: 'quit' }
  | { type: 'upgrade'; plugins: string[] }
  | { type: 'recovery-open' }
  | { type: 'backup-open'; removalId: string }
  | { type: 'backup-restore'; removalId: string }
  | { type: 'backup-delete'; removalId: string }
  | { type: 'agent'; prompt?: string }

/** Page URL on the desktop scheme, so the application document can frame it. */
export function safeModePageUrl(model: SafeModeViewModel, seq: string, theme: string): string {
  return desktopResourceUrl(SAFE_MODE_PAGE, {
    state: JSON.stringify(model),
    theme,
    seq
  })
}

/**
 * Page actions the manager accepts. An unknown action is ignored by the caller.
 */
export function readSafeModeManagerAction(action: unknown, selection: unknown): SafeModeManagerAction | undefined {
  if (action === 'restart') return { type: 'restart' }
  if (action === 'quit') return { type: 'quit' }
  if (action === 'recovery-open') return { type: 'recovery-open' }
  if (action === 'agent') {
    const prompt = typeof selection === 'object' && selection !== null && 'prompt' in selection
      ? selection.prompt
      : undefined
    if (prompt !== undefined && (typeof prompt !== 'string' || prompt.length === 0 || prompt.length > 16_000)) return undefined
    return prompt === undefined ? { type: 'agent' } : { type: 'agent', prompt }
  }
  if (action === 'backup-open' || action === 'backup-restore' || action === 'backup-delete') {
    const removalId = typeof selection === 'object' && selection !== null && 'removalId' in selection
      ? selection.removalId
      : undefined
    if (typeof removalId !== 'string' || !REMOVAL_ID.test(removalId)) return undefined
    return { type: action, removalId }
  }
  if (action !== 'apply' && action !== 'enable' && action !== 'upgrade') return undefined
  const plugins = readPluginSelection(selection)
  if (plugins === undefined) return undefined
  return { type: action, plugins }
}

function readPluginSelection(selection: unknown): string[] | undefined {
  if (typeof selection !== 'object' || selection === null || !('plugins' in selection)) return undefined
  const plugins = selection.plugins
  if (!Array.isArray(plugins) || plugins.length === 0 || plugins.length > 200) return undefined
  const names: string[] = []
  for (const plugin of plugins) {
    if (typeof plugin !== 'string' || !PLUGIN_NAME.test(plugin) || names.includes(plugin)) return undefined
    names.push(plugin)
  }
  return names
}
