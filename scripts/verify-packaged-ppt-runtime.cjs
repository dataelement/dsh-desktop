const fs = require('node:fs/promises')
const path = require('node:path')
const { createRequire } = require('node:module')
const { pathToFileURL } = require('node:url')

async function countFiles(root, suffix) {
  let count = 0
  for (const entry of await fs.readdir(root, { withFileTypes: true })) {
    const child = path.join(root, entry.name)
    if (entry.isDirectory()) count += await countFiles(child, suffix)
    else if (entry.isFile() && entry.name.endsWith(suffix)) count++
  }
  return count
}

module.exports = async function verifyPackagedPptRuntime(context) {
  const product = context.packager.appInfo.productFilename
  const candidates = [
    path.join(context.appOutDir, 'resources', 'app'),
    path.join(context.appOutDir, product + '.app', 'Contents', 'Resources', 'app')
  ]
  const appRoot = candidates.find(candidate => require('node:fs').existsSync(candidate))
  if (!appRoot) throw new Error('Cannot locate the unpacked packaged application')

  for (const packageName of ['dsh-ppt', 'dsh-ppt-composer']) {
    const packageRoot = path.join(appRoot, 'node_modules', packageName)
    const info = await fs.lstat(packageRoot)
    if (info.isSymbolicLink()) throw new Error(packageName + ' was packaged as a checkout symlink')
    const manifest = JSON.parse(await fs.readFile(path.join(packageRoot, 'package.json'), 'utf8'))
    if (manifest.name !== packageName) throw new Error(packageName + ' manifest is missing or mismatched')
    await fs.access(path.join(packageRoot, 'lib', 'client.js'))
    await fs.access(path.join(packageRoot, 'cordis.patch.yml'))
  }

  const core = path.join(appRoot, 'node_modules', 'dsh-ppt')
  const adapter = path.join(appRoot, 'node_modules', 'dsh-ppt-composer')
  const references = path.join(core, 'skills', 'dsh-ppt', 'references')
  await fs.access(path.join(core, 'skills', 'dsh-ppt', 'SKILL.md'))

  const adapterRequire = createRequire(path.join(adapter, 'package.json'))
  const resolvedCore = await fs.realpath(adapterRequire.resolve('dsh-ppt/package.json'))
  if (resolvedCore !== await fs.realpath(path.join(core, 'package.json'))) {
    throw new Error('Packaged dsh-ppt-composer does not resolve its staged dsh-ppt sibling')
  }

  const coreRequire = createRequire(path.join(core, 'package.json'))
  const sharp = coreRequire('sharp')
  if (!sharp?.versions?.vips) throw new Error('Packaged dsh-ppt cannot load the sharp native runtime')
  await import(pathToFileURL(path.join(core, 'lib', 'index.js')).href)
  await import(pathToFileURL(path.join(adapter, 'lib', 'index.js')).href)

  const { definitions } = await import(pathToFileURL(path.join(core, 'lib', 'catalog.js')).href)
  if (!Array.isArray(definitions) || definitions.length !== 16) {
    throw new Error('Packaged dsh-ppt catalog does not contain sixteen templates')
  }
  for (const definition of definitions) {
    await fs.access(path.join(references, definition.referenceDirectory, 'source', 'deck.pptd'))
    await fs.access(path.join(references, definition.referenceDirectory, 'source-zh', 'deck.pptd'))
  }

  const { previewFiles } = await import(pathToFileURL(path.join(core, 'lib', 'preview-manifest.js')).href)
  for (const relative of Object.values(previewFiles)) await fs.access(path.join(references, relative))
  const previewCount = await countFiles(references, '.jpg')
  if (previewCount !== 192) throw new Error('Packaged dsh-ppt contains ' + previewCount + ' previews; expected 192')
}
