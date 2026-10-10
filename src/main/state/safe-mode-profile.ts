import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { isMap, isSeq, parseDocument } from 'yaml'

export const SAFE_MODE_PROFILE = 'desktop-safe-mode'
export const SAFE_MODE_BUNDLES = [
  '@deepseek-ai/dsh-base',
  '@deepseek-ai/dsh-web-app'
] as const

export const SAFE_MODE_PATCH = `# Managed by DSH Desktop Safe Mode.
# Third-party bundles and the normal web profile's patch layer are intentionally omitted.
[]
`

const SAFE_MODE_WORKSPACE = `packages:
  - .

nodeLinker: hoisted
autoInstallPeers: false
`

export const SAFE_MODE_MODEL_ENTRY_IDS: ReadonlySet<string> = new Set([
  'llm-pi-ai',
  'agent-default-model',
  'llm-deepseek',
  'llm-deepseek-account',
  'llm',
  'llm-retry',
  'deepseek-llm-api-extensions'
])

export function extractSafeModePatch(sourcePatchText: string): string {
  let doc
  try {
    doc = parseDocument(sourcePatchText)
  } catch {
    return SAFE_MODE_PATCH
  }
  const contents = doc.contents
  if (!isSeq(contents)) return SAFE_MODE_PATCH

  const kept = []
  for (const item of contents.items) {
    if (!isMap(item)) continue
    const id = item.get('id')
    if (typeof id === 'string' && SAFE_MODE_MODEL_ENTRY_IDS.has(id)) {
      kept.push(item)
    }
  }

  if (kept.length === 0) {
    return SAFE_MODE_PATCH
  }

  contents.items = kept
  const header = `# Managed by DSH Desktop Safe Mode.\n# Third-party bundles and non-model web profile patches are intentionally omitted.\n# Model configurations inherited from the normal profile are included below.\n`
  return `${header}${String(doc)}`
}

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
 * with the normal profile. It inherits model configurations (e.g. custom endpoints
 * and providers) from the normal profile, but intentionally omits third-party bundles
 * and non-model user patches.
 */
export async function ensureSafeModeProfile(dshHome: string, sourceProfile = 'web'): Promise<string> {
  const directory = join(dshHome, 'profiles', SAFE_MODE_PROFILE)
  await mkdir(directory, { recursive: true })
  const manifest = `${JSON.stringify({
    name: 'dsh-profile-desktop-safe-mode',
    private: true,
    dependencies: {},
    dsh: { profile: { bundles: [...SAFE_MODE_BUNDLES] } }
  }, null, 2)}\n`

  let patchContent = SAFE_MODE_PATCH
  try {
    const sourcePatchText = await readFile(join(dshHome, 'profiles', sourceProfile, 'cordis.patch.yml'), 'utf8')
    patchContent = extractSafeModePatch(sourcePatchText)
  } catch {
    // If the source profile cordis.patch.yml is unreadable or does not exist, use default patch.
  }

  await Promise.all([
    writeIfChanged(join(directory, 'package.json'), manifest),
    writeIfChanged(join(directory, 'cordis.patch.yml'), patchContent),
    writeIfChanged(join(directory, 'pnpm-workspace.yaml'), SAFE_MODE_WORKSPACE)
  ])
  return directory
}
