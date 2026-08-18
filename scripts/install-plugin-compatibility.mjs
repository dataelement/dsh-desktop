import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const frontendDirectory = path.join(
  projectRoot,
  'node_modules',
  '@deepseek-ai',
  'dsh-web-frontend',
  'dist'
)
const indexPath = path.join(frontendDirectory, 'index.html')

const index = await readFile(indexPath, 'utf8')
const assetUrl = index.match(/src="\/(assets\/index-[^"]+\.js)"/)?.[1]
if (assetUrl === undefined) {
  throw new Error('Could not install plugin compatibility: DSH frontend asset was not found')
}

const assetPath = path.join(frontendDirectory, assetUrl)
const original = 'const u=s.spec,c=r.priority??0'
const compatible =
  'const u=s.spec;r.name==="settings.plugin.item"&&u.kind==="keyed"&&r.key===void 0&&r.id!==void 0&&(r={...r,key:r.id});const c=r.priority??0'
const asset = await readFile(assetPath, 'utf8')

if (!asset.includes(compatible)) {
  const occurrences = asset.split(original).length - 1
  if (occurrences !== 1) {
    throw new Error(
      `Could not install plugin compatibility in ${path.relative(projectRoot, assetPath)}: expected one SlotCore registration site, found ${occurrences}`
    )
  }
  await writeFile(assetPath, asset.replace(original, compatible))
}

console.log(
  `Installed legacy plugin compatibility: ${path.relative(projectRoot, assetPath)}`
)
