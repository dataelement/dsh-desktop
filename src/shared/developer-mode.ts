const DEVELOPER_MODE_ARGUMENT = '--sherlock-developer-mode'

export function developerModeArgument(enabled: boolean): string {
  return `${DEVELOPER_MODE_ARGUMENT}=${String(enabled)}`
}

export function developerModeEnabledFromArguments(arguments_: readonly string[]): boolean {
  return arguments_.includes(developerModeArgument(true))
}
