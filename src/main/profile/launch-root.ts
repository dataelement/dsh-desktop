import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

export function launchRootPath(userDataPath: string): string {
  return join(userDataPath, 'launch-root')
}

export async function ensureLaunchRoot(userDataPath: string): Promise<string> {
  const launchRoot = launchRootPath(userDataPath)
  await mkdir(launchRoot, { recursive: true })
  return launchRoot
}
