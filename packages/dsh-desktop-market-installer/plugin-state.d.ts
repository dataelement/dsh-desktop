export const MARKET_STATE_FILE: string
export const USER_PATCH_FILE: string

/** Preserves custom row fields and source text; throws on invalid or matching ambiguous YAML. */
export function removePatchRowOverrides(
  text: string,
  rowIds: readonly string[],
  disabled: boolean
): { text: string; changed: boolean }

export function readMarketState(profileDir: string): Promise<{ state: Record<string, unknown>; disabled: string[] }>
export function readDisabledPlugins(profileDir: string): Promise<string[]>
export function setPluginDisabled(profileDir: string, pluginName: string, disabled: boolean): Promise<boolean>
/** Side-effect-free preflight. Present YAML is validated even when rowIds is empty. */
export function validatePluginSwitch(
  profileDir: string,
  pluginName: string,
  enabled: boolean,
  options?: { rowIds?: readonly string[] }
): Promise<void>
/** Revalidates current YAML before writes; caller must exclude concurrent writers. */
export function recordPluginSwitch(
  profileDir: string,
  pluginName: string,
  enabled: boolean,
  options?: { rowIds?: readonly string[] }
): Promise<void>
export function forgetPlugin(profileDir: string, pluginName: string): Promise<boolean>
