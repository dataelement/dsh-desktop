import { randomUUID } from 'node:crypto'
import { lstat, open, readFile, realpath } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, relative } from 'node:path'
import { parseEnv } from 'node:util'
import { withFileLock, writeFileAtomic } from '@deepseek-ai/dsh-atomic-write'
import { isMap, isScalar, isSeq, parseDocument } from 'yaml'

export type ConfigProblemKind = 'model-image-limits' | 'model-url' | 'yaml-format' | 'legacy-workflow'

export interface StartupConfigProblem {
  kind: ConfigProblemKind
  path: string
  source: string
  /** Safe descriptions contain field names, never configuration values. */
  detail: string
  repair?: 'normalize' | 'reset-endpoint' | 'disable-legacy' | 'replace-legacy'
  manualOnly?: boolean
  blocking?: boolean
}

const LEGACY_WORKER = '@deepseek-ai/dsh-workflow-worker-thread'
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

export function validModelEndpoint(value: unknown, deepseek = false): boolean {
  if (typeof value !== 'string' || value.trim() !== value || value.length === 0) return false
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) && url.hostname.length > 0 &&
      !url.username && !url.password && (!deepseek || (!url.search && !url.hash))
  } catch { return false }
}

interface YamlAnalysis {
  problems: StartupConfigProblem[]
  text: string
  explicitDeepSeekEndpoint: boolean
}

/** Walk YAML nodes only: Cordis !!js expressions are preserved and never evaluated. */
function analyzeYaml(path: string, text: string, action?: StartupConfigProblem['repair']): YamlAnalysis {
  const document = parseDocument(text)
  const problems: StartupConfigProblem[] = []
  let changed = false
  let explicitDeepSeekEndpoint = false
  const problem = (
    kind: ConfigProblemKind,
    source: string,
    detail: string,
    repair?: StartupConfigProblem['repair'],
    blocking = true
  ): void => {
    problems.push({ kind, path, source, detail, ...(repair ? { repair } : {}), ...(blocking ? {} : { blocking: false }) })
  }
  if (document.errors.length || (!isSeq(document.contents) && !isMap(document.contents) && document.contents !== null)) {
    problem('yaml-format', 'YAML', 'Invalid YAML document or root structure')
    return { problems, text, explicitDeepSeekEndpoint }
  }
  if ((path.endsWith('.patch.yml') || basename(path) === 'agent.cordis.yml') &&
    document.contents !== null && !isSeq(document.contents)) {
    problem('yaml-format', 'YAML', 'Composition patches must contain a plugin list')
    return { problems, text, explicitDeepSeekEndpoint }
  }
  const endpoint = (config: unknown, source: string, deepseek: boolean): void => {
    if (!isMap(config) || !config.has('baseURL')) return
    if (deepseek) explicitDeepSeekEndpoint = true
    const value = config.get('baseURL')
    // Dynamic expressions belong to Harness; they cannot be safely evaluated here.
    const node = config.get('baseURL', true)
    if (isScalar(node) && node.tag !== undefined && node.tag !== 'tag:yaml.org,2002:str') return
    if (!validModelEndpoint(value, deepseek)) {
      // Model endpoint issues should NOT block Harness startup.
      // Keeping it non-blocking ensures the desktop app boots and settings remain editable in UI.
      problem(
        'model-url',
        source,
        'baseURL must be an HTTP(S) endpoint without embedded credentials',
        deepseek ? 'reset-endpoint' : undefined,
        false
      )
      if (action === 'reset-endpoint') { config.delete('baseURL'); changed = true }
    }
  }
  const deepseek = (config: unknown, source: string): void => {
    if (!isMap(config)) return
    endpoint(config, source, true)
    const models = config.get('models', true)
    if (!isSeq(models)) return
    for (const [index, model] of models.items.entries()) {
      if (!isMap(model)) continue
      const modalities = model.get('inputModalities', true)
      const knownTextOnly = modalities === undefined || (isSeq(modalities) && modalities.items.length > 0 &&
        modalities.items.every(item => isScalar(item) && item.value === 'text'))
      if (knownTextOnly && (model.has('imagePixelBudget') || model.has('imageMaxBytes'))) {
        problem('model-image-limits', `${source}.models[${index}]`, 'Text-only model retains image request limits', 'normalize')
        if (action === 'normalize') {
          model.delete('imagePixelBudget'); model.delete('imageMaxBytes'); changed = true
        }
      }
    }
  }
  const piAi = (config: unknown, source: string): void => {
    if (!isMap(config)) return
    const providers = config.get('providers', true)
    if (!isMap(providers)) return
    for (const [index, pair] of providers.items.entries()) endpoint(pair.value, `${source}.providers[${index}]`, false)
  }
  const visit = (node: unknown, source: string, preset?: ReturnType<typeof parseDocument>['contents']): void => {
    if (isSeq(node)) {
      for (const [index, item] of node.items.entries()) visit(item, `${source}[${index}]`, preset)
    } else if (isMap(node)) {
      if (node.get('disabled') === true) return
      const id = node.get('id')
      const name = node.get('name')
      const owner = name === '@deepseek-ai/dsh-agent-preset' ||
        (typeof id === 'string' && id.startsWith('preset-')) ? node : preset
      if (name === LEGACY_WORKER) {
        const ownerId = isMap(owner) ? owner.get('id') : id
        problem('legacy-workflow', typeof ownerId === 'string' ? `${source}; owner=${ownerId}` : source,
          'Removed workflow-worker-thread reference; replace with workflow-ptc', 'replace-legacy')
        if (action === 'replace-legacy' || action === 'disable-legacy') {
          node.set('name', '@deepseek-ai/dsh-workflow-ptc')
          if (node.get('id') === 'workflow-worker-thread') {
            node.set('id', 'workflow-ptc')
          }
          const config = node.get('config', true)
          if (isMap(config)) {
            if (!config.has('provider')) config.set('provider', 'spawn')
          } else {
            node.set('config', { provider: 'spawn' })
          }
          if (isMap(owner) && owner.get('disabled') === true) owner.delete('disabled')
          if (node.get('disabled') === true) node.delete('disabled')
          changed = true
        }
        return
      }
      if (id === 'llm-deepseek' || name === '@deepseek-ai/dsh-llm-deepseek-api-key') deepseek(node.get('config', true), source)
      if (id === 'llm-pi-ai' || name === '@deepseek-ai/dsh-llm-pi-ai') piAi(node.get('config', true), source)
      // Legacy settings.yaml stores model sections by namespace rather than entry id.
      if (node.has('llm-deepseek')) deepseek(node.get('llm-deepseek', true), `${source}.llm-deepseek`)
      if (node.has('llm-pi-ai')) piAi(node.get('llm-pi-ai', true), `${source}.llm-pi-ai`)
      for (const [index, pair] of node.items.entries()) visit(pair.value, `${source}.${index}`, owner)
    }
  }
  visit(document.contents, basename(path))
  return { problems, text: changed ? String(document) : text, explicitDeepSeekEndpoint }
}

async function readOptional(path: string): Promise<string | undefined> {
  try { return await readFile(path, 'utf8') } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined
    throw error
  }
}

export async function startupConfigPaths(dshHome: string, profile = 'web'): Promise<string[]> {
  const paths = [
    join(dshHome, 'settings.yaml'),
    join(dshHome, 'cordis.patch.yml'),
    join(dshHome, 'profiles', profile, 'cordis.patch.yml')
  ]
  // Inspect the effective converted patch, not retained originals that no longer participate in boot.
  return paths
}

export function inspectConfigText(path: string, text: string): StartupConfigProblem[] {
  return analyzeYaml(path, text).problems
}

export async function inspectStartupConfiguration(
  dshHome: string, profile = 'web', environment: NodeJS.ProcessEnv = {}, launchDirectory?: string
): Promise<StartupConfigProblem[]> {
  const problems: StartupConfigProblem[] = []
  let explicitEndpoint = false
  for (const path of await startupConfigPaths(dshHome, profile)) {
    const text = await readOptional(path)
    if (text === undefined) continue
    problems.push(...inspectConfigText(path, text))
    if (path.endsWith('.yml') || basename(path) === 'settings.yaml') {
      explicitEndpoint ||= analyzeYaml(path, text).explicitDeepSeekEndpoint
    }
  }
  // Harness rejects this bootstrap variable in either .env layer, even if a config overrides it.
  for (const directory of new Set([dshHome, ...(launchDirectory ? [launchDirectory] : [])])) {
    const path = join(directory, '.env')
    const text = await readOptional(path)
    if (text !== undefined && Object.keys(parseEnv(text)).some(key => key.toUpperCase() === 'DEEPSEEK_BASE_URL')) {
      problems.push({ kind: 'model-url', path, source: '.env:DEEPSEEK_BASE_URL', manualOnly: true,
        detail: 'Harness rejects DEEPSEEK_BASE_URL in .env files. Remove this entry and set the endpoint in Models or the launching environment.' })
    }
  }
  if (!explicitEndpoint) {
    const value = process.platform === 'win32'
      ? Object.entries(environment).find(([key]) => key.toUpperCase() === 'DEEPSEEK_BASE_URL')?.[1]
      : environment.DEEPSEEK_BASE_URL
    if (value !== undefined && !validModelEndpoint(value, true)) {
      problems.push({ kind: 'model-url', path: '', source: 'environment:DEEPSEEK_BASE_URL',
        detail: 'DEEPSEEK_BASE_URL is invalid; correct this source and restart the application',
        blocking: false })
    }
  }
  return problems
}

/** Refuse symlinks and paths escaping the app-owned home before privileged writes. */
async function assertRecoveryPath(dshHome: string, path: string): Promise<void> {
  const nested = relative(await realpath(dshHome), await realpath(dirname(path)))
  if (nested.startsWith('..') || isAbsolute(nested) || !(await lstat(path)).isFile()) {
    throw new Error('Configuration recovery path is not an owned regular file')
  }
  if (!(await startupConfigPaths(dshHome)).includes(path) &&
    !(await startupConfigPaths(dshHome, 'desktop-safe-mode')).includes(path)) {
    throw new Error('Configuration recovery target is not a known startup file')
  }
}

/** A stale scan or concurrent edit must never overwrite a newer file. */
export async function replaceRecoveryFile(dshHome: string, path: string, previous: string, next: string): Promise<string> {
  await assertRecoveryPath(dshHome, path)
  return withFileLock(path, async () => {
    await assertRecoveryPath(dshHome, path)
    if (await readFile(path, 'utf8') !== previous) throw new Error('Configuration changed; inspect it again before recovery')
    const backup = `${path}.dsh-recovery-${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID()}.bak`
    const handle = await open(backup, 'wx', 0o600)
    try { await handle.writeFile(previous, 'utf8'); await handle.sync() } finally { await handle.close() }
    await writeFileAtomic(path, next, { mode: 0o600, dirMode: 0o700 })
    return backup
  })
}

export async function repairStartupConfig(dshHome: string, problem: StartupConfigProblem): Promise<string> {
  if (!problem.repair) throw new Error('This configuration requires a corrected file')
  const previous = await readFile(problem.path, 'utf8')
  if (!inspectConfigText(problem.path, previous).some(row => row.kind === problem.kind)) {
    throw new Error('Configuration changed; inspect it again before recovery')
  }
  const next = analyzeYaml(problem.path, previous, problem.repair).text
  if (next === previous) throw new Error('No recognized recovery transformation applies')
  return replaceRecoveryFile(dshHome, problem.path, previous, next)
}

export async function importStartupConfig(dshHome: string, target: string, replacement: string): Promise<string> {
  const previous = await readFile(target, 'utf8')
  if (inspectConfigText(target, replacement).length) throw new Error('Replacement still has startup configuration problems')
  return replaceRecoveryFile(dshHome, target, previous, replacement)
}
