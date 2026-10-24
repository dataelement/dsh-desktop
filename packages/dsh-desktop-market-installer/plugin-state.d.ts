export const MARKET_STATE_FILE: string
export const USER_PATCH_FILE: string

export function removePatchRowOverrides(
  text: string,
  rowIds: readonly string[],
  disabled: boolean
): { text: string; changed: boolean }

export function readMarketState(profileDir: string): Promise<{ state: Record<string, unknown>; disabled: string[] }>
export function readDisabledPlugins(profileDir: string): Promise<string[]>
export function setPluginDisabled(profileDir: string, pluginName: string, disabled: boolean): Promise<boolean>
export function recordPluginSwitch(
  profileDir: string,
  pluginName: string,
  enabled: boolean,
  options?: { rowIds?: readonly string[] }
): Promise<void>
export function forgetPlugin(profileDir: string, pluginName: string): Promise<boolean>
