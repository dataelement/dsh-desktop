const fs = require('node:fs/promises')
const path = require('node:path')
const { createRequire } = require('node:module')
const { execFile } = require('node:child_process')
const { pathToFileURL } = require('node:url')
const { promisify } = require('node:util')

const execFileAsync = promisify(execFile)

async function countFiles(root, suffix) {
  let count = 0
  for (const entry of await fs.readdir(root, { withFileTypes: true })) {
    const child = path.join(root, entry.name)
    if (entry.isDirectory()) count += await countFiles(child, suffix)
    else if (entry.isFile() && entry.name.endsWith(suffix)) count++
  }
  return count
}

async function verifyRuntime(appRoot) {
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

module.exports = async function verifyPackagedPptRuntime(context) {
  const product = context.packager.appInfo.productFilename
  const macContents = path.join(context.appOutDir, product + '.app', 'Contents')
  const candidates = [
    [path.join(context.appOutDir, 'resources', 'app'), null],
    [path.join(macContents, 'Resources', 'app'), null],
    [path.join(context.appOutDir, 'resources', 'app.asar'), path.join(context.appOutDir, product + (process.platform === 'win32' ? '.exe' : ''))],
    [path.join(macContents, 'Resources', 'app.asar'), path.join(macContents, 'MacOS', product)]
  ]
  const found = candidates.find(([candidate]) => require('node:fs').existsSync(candidate))
  if (!found) throw new Error('Cannot locate the packaged application')
  const [appRoot, executable] = found
  if (executable === null) return verifyRuntime(appRoot)
  if (!require('node:fs').existsSync(executable)) throw new Error('Cannot locate the packaged Electron runtime')
  // Electron's Node mode understands asar paths and resolves native modules
  // through app.asar.unpacked, just as the installed Desktop does.
  await execFileAsync(executable, [__filename, '--verify-asar', appRoot], {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
    timeout: 120_000,
    maxBuffer: 1024 * 1024
  })
}

if (require.main === module && process.argv[2] === '--verify-asar') {
  verifyRuntime(path.resolve(process.argv[3])).catch(error => {
    console.error(error)
    process.exitCode = 1
  })
}
