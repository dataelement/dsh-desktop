/**
 * macOS reports how a process was started through XPC_SERVICE_NAME. A GUI
 * launch carries an `application.<bundle id>.<n>.<n>` service name, while a
 * process launchd started from a LaunchAgent or LaunchDaemon carries that
 * job's own label.
 */
export function isDaemonLaunch(
  environment: NodeJS.ProcessEnv,
  platform: NodeJS.Platform
): boolean {
  if (platform !== 'darwin') return false
  const serviceName = environment.XPC_SERVICE_NAME
  if (serviceName === undefined || serviceName === '' || serviceName === '0') return false
  return !serviceName.startsWith('application.')
}

const scriptArgumentPattern = /\.[mc]?js$/i

/**
 * A LaunchAgent that daemonises the app binary can still slip past
 * `isDaemonLaunch` (its own env lies about how it was started, or it wasn't
 * caught before boot) and reach `requestSingleInstanceLock`'s second-instance
 * event on the already-running app. That handler must not treat every second
 * launch as the user asking for the window: a helper binary, or a script
 * argument meant for a runtime rather than a file to open, marks the launch
 * as synthetic instead.
 */
export function isUserInitiatedInstance(argv: string[]): boolean {
  if (argv.length === 0) return true
  const [binary, ...rest] = argv as [string, ...string[]]
  if (binary.includes('/Contents/Frameworks/')) return false
  const firstArgument = rest[0]
  if (firstArgument === undefined) return true
  return !scriptArgumentPattern.test(firstArgument)
}
