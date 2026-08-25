const APP_VERSION_ARGUMENT = '--sherlock-app-version='

export function appVersionArgument(version: string): string {
  return `${APP_VERSION_ARGUMENT}${encodeURIComponent(version)}`
}

export function appVersionFromArguments(arguments_: readonly string[]): string {
  const argument = arguments_.find((value) => value.startsWith(APP_VERSION_ARGUMENT))
  if (!argument) return '—'

  try {
    return decodeURIComponent(argument.slice(APP_VERSION_ARGUMENT.length)) || '—'
  } catch {
    return '—'
  }
}
