import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export const SAFE_MODE_PROFILE = 'desktop-safe-mode'
export const SAFE_MODE_BUNDLES = [
  '@deepseek-ai/dsh-base',
  '@deepseek-ai/dsh-web-app'
] as const

const SAFE_MODE_PATCH = `# Managed by DSH Desktop Safe Mode.
# Third-party bundles and the normal web profile's patch layer are intentionally omitted.
[]
`

const SAFE_MODE_WORKSPACE = `packages:
  - .

nodeLinker: hoisted
autoInstallPeers: false
`

async function writeIfChanged(path: string, content: string): Promise<void> {
  try {
    if (await readFile(path, 'utf8') === content) return
  } catch {
    // Missing or unreadable managed files are recreated below.
  }
  await writeFile(path, content, 'utf8')
}

/**
 * Materialize an isolated profile that resolves only installation-owned core
 * bundles. It shares DSH_HOME settings, credentials, sessions, and workspaces
 * with the normal profile, but never reads that profile's bundle list or user
 * patch layer.
 */
export async function ensureSafeModeProfile(dshHome: string): Promise<string> {
  const directory = join(dshHome, 'profiles', SAFE_MODE_PROFILE)
  await mkdir(directory, { recursive: true })
  const manifest = `${JSON.stringify({
    name: 'dsh-profile-desktop-safe-mode',
    private: true,
    dependencies: {},
    dsh: { profile: { bundles: [...SAFE_MODE_BUNDLES] } }
  }, null, 2)}\n`
  await Promise.all([
    writeIfChanged(join(directory, 'package.json'), manifest),
    writeIfChanged(join(directory, 'cordis.patch.yml'), SAFE_MODE_PATCH),
    writeIfChanged(join(directory, 'pnpm-workspace.yaml'), SAFE_MODE_WORKSPACE)
  ])
  return directory
}
