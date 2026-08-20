import { homedir } from 'node:os'
import { join } from 'node:path'

/**
 * Resolve the Harness data root used by the desktop shell.
 *
 * Production shares Harness's canonical ~/.dsh home so projects, sessions,
 * credentials, and presets remain available when switching between the CLI
 * and Desktop. Development builds stay isolated from real user data.
 */
export function resolveDesktopHarnessHome(
  userDataPath: string,
  developmentBuild: boolean,
  homeDirectory = homedir()
): string {
  return developmentBuild ? join(userDataPath, 'harness') : join(homeDirectory, '.dsh')
}
