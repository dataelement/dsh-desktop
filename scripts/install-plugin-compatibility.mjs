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

// rc.6 plugins registered `settings.plugin.item` as a list slot using `id`.
// rc.7+ made it a keyed slot that requires `options.key`, so legacy bundles
// fail to load with "keyed slot \"settings.plugin.item\" requires options.key".
// DSH Desktop cannot ship a fork of the Harness frontend, so we shim the
// minified SlotCore served to the browser: when the slot is `settings.plugin.item`
// and the registrant only has `id`, copy `id` into `key`. All other keyed
// slots stay strict.
const original = 'const u=l.spec,c=n.priority??0'
const compatible =
  'const u=l.spec;n.name==="settings.plugin.item"&&u.kind==="keyed"&&n.key===void 0&&n.id!==void 0&&(n={...n,key:n.id});const c=n.priority??0'

const index = await readFile(indexPath, 'utf8')
const assetUrl = index.match(/src="\/(assets\/index-[^"]+\.js)"/)?.[1]
if (assetUrl === undefined) {
  throw new Error(
    'Could not install plugin compatibility: DSH frontend asset was not found in dist/index.html'
  )
}

const assetPath = path.join(frontendDirectory, assetUrl)
const asset = await readFile(assetPath, 'utf8')

if (asset.includes(compatible)) {
  console.log(
    `Legacy plugin compatibility already installed: ${path.relative(projectRoot, assetPath)}`
  )
} else {
  const occurrences = asset.split(original).length - 1
  if (occurrences !== 1) {
    throw new Error(
      `Could not install plugin compatibility in ${path.relative(projectRoot, assetPath)}: expected exactly one SlotCore registration site, found ${occurrences}. The DSH frontend bundle shape has changed; update scripts/install-plugin-compatibility.mjs.`
    )
  }
  await writeFile(assetPath, asset.replace(original, compatible))
  console.log(
    `Installed legacy plugin compatibility: ${path.relative(projectRoot, assetPath)}`
  )
}
