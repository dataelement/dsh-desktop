export interface LaunchctlCommandResult {
  code: number | null
  stdout: string
  stderr: string
}

export type LaunchctlInspector = (target: string) => Promise<LaunchctlCommandResult>

/**
 * Confirm that a failed bootout still reached the requested postcondition.
 *
 * A missing service and an inaccessible launchd domain both make
 * `launchctl print` fail. Checking the parent domain distinguishes those
 * states without depending on launchctl's localized or version-specific text.
 */
export async function launchServiceIsStoppedAfterBootout(
  bootout: LaunchctlCommandResult,
  serviceTarget: string,
  domainTarget: string,
  inspect: LaunchctlInspector
): Promise<boolean> {
  if (bootout.code === 0) return true

  try {
    const service = await inspect(serviceTarget)
    if (service.code === 0) return false

    const domain = await inspect(domainTarget)
    return domain.code === 0
  } catch {
    return false
  }
}
