import { copyFile, cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = path.join(projectRoot, 'build', 'icon.png')
const sherlockSource = path.join(projectRoot, 'build', 'sherlock-logo.svg')
const sherlockResearchSource = path.join(projectRoot, 'build', 'sherlock-research.svg')
const destinationDirectory = path.join(
  projectRoot,
  'node_modules',
  '@deepseek-ai',
  'dsh-web-frontend',
  'dist'
)
const destination = path.join(destinationDirectory, 'sherlock-icon.png')
const legacyDestination = path.join(destinationDirectory, 'dsh-desktop-logo.png')
const sherlockDestination = path.join(destinationDirectory, 'sherlock-logo.svg')
const sherlockResearchDestination = path.join(destinationDirectory, 'sherlock-research.svg')
const indexPath = path.join(destinationDirectory, 'index.html')
const manifestPath = path.join(destinationDirectory, 'manifest.webmanifest')
const shippedPresetRoot = path.join(
  projectRoot,
  'node_modules',
  '@deepseek-ai',
  'dsh',
  'config',
  'agent-presets'
)
const sherlockPresetRoot = path.join(
  projectRoot,
  'node_modules',
  '@deepseek-ai',
  'dsh',
  'config',
  'sherlock-agent-presets'
)
const sherlockPersonaText = 'You are a coding agent powered by the {{model}} model. Your working directory is {{cwd}}. During multi-step work, provide concise user-facing progress updates in the user\'s language before substantial new work and after meaningful milestones. Each update should briefly state what has been established and what comes next, then continue the task without waiting for acknowledgment. Do not reveal private reasoning, raw commands, local paths, credentials, or repetitive tool logs. For long-running work, provide a useful update whenever you regain control after a meaningful phase instead of leaving the user with only a loading indicator. Keep the final answer focused on the outcome and do not repeat the entire progress transcript.'

function replaceRequired(contents, search, replacement, file) {
  if (contents.includes(replacement)) return contents
  if (!contents.includes(search)) {
    throw new Error(`Could not update Sherlock branding in ${file}: expected content was not found`)
  }
  return contents.replace(search, replacement)
}

function replaceRequiredAny(contents, searches, replacement, file) {
  if (contents.includes(replacement)) return contents
  const search = searches.find((candidate) => contents.includes(candidate))
  if (!search) {
    throw new Error(`Could not update Sherlock branding in ${file}: expected content was not found`)
  }
  return contents.replace(search, replacement)
}

await mkdir(destinationDirectory, { recursive: true })
await copyFile(source, destination)
await copyFile(sherlockSource, sherlockDestination)
await copyFile(sherlockResearchSource, sherlockResearchDestination)
await rm(legacyDestination, { force: true })
await rm(sherlockPresetRoot, { recursive: true, force: true })
await mkdir(sherlockPresetRoot, { recursive: true })
await cp(
  path.join(shippedPresetRoot, 'standard'),
  path.join(sherlockPresetRoot, 'standard'),
  { recursive: true }
)
const sherlockAgentPath = path.join(sherlockPresetRoot, 'standard', 'agent.cordis.yml')
const sherlockAgent = await readFile(sherlockAgentPath, 'utf8')
await writeFile(
  sherlockAgentPath,
  replaceRequired(
    sherlockAgent,
    'You are a coding agent powered by the {{model}} model. Your working directory is {{cwd}}.',
    sherlockPersonaText,
    path.relative(projectRoot, sherlockAgentPath)
  ),
  'utf8'
)

const index = await readFile(indexPath, 'utf8')
const brandedIndex = replaceRequiredAny(
  index,
  [
    '<link rel="icon" type="image/svg+xml" href="/favicon.svg" />',
    '<link rel="icon" type="image/png" href="/dsh-desktop-logo.png" />'
  ],
  '<link rel="icon" type="image/png" href="/sherlock-icon.png" />',
  path.relative(projectRoot, indexPath)
)
await writeFile(
  indexPath,
  replaceRequired(
    brandedIndex,
    '<title>DeepSeek Harness</title>',
    '<title>Sherlock</title>',
    path.relative(projectRoot, indexPath)
  )
)

const manifest = await readFile(manifestPath, 'utf8')
const namedManifest = replaceRequired(
  replaceRequired(
    manifest,
    '"name": "DeepSeek Harness"',
    '"name": "Sherlock"',
    path.relative(projectRoot, manifestPath)
  ),
  '"short_name": "DSH"',
  '"short_name": "Sherlock"',
  path.relative(projectRoot, manifestPath)
)
await writeFile(
  manifestPath,
  replaceRequiredAny(
    namedManifest,
    [
      '"src": "/favicon.svg",\n      "sizes": "any",\n      "type": "image/svg+xml"',
      '"src": "/dsh-desktop-logo.png",\n      "sizes": "1254x1254",\n      "type": "image/png"'
    ],
    '"src": "/sherlock-icon.png",\n      "sizes": "1254x1254",\n      "type": "image/png"',
    path.relative(projectRoot, manifestPath)
  )
)

console.log(`Installed Sherlock brand assets: ${[
  destination,
  sherlockDestination,
  sherlockResearchDestination,
  path.join(sherlockPresetRoot, 'standard')
].map((file) => path.relative(projectRoot, file)).join(', ')}`)
