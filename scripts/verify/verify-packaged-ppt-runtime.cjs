const fs = require('node:fs/promises')
const path = require('node:path')
const os = require('node:os')
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
  if (path.basename(appRoot) === 'app.asar') {
    // Match the Harness entry's native-engine resolution before rendering.
    const { registerOfficeEngineResolution } = await import(pathToFileURL(path.join(path.dirname(appRoot), 'office-engine-resolution.mjs')).href)
    registerOfficeEngineResolution(path.join(appRoot, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js'))
  }
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

  const { loadPptdProject } = await import(pathToFileURL(path.join(core, 'lib', 'pptd.js')).href)
  const { renderOfficeTemplatePreview } = await import(pathToFileURL(path.join(core, 'lib', 'office-template-preview.js')).href)
  const project = await loadPptdProject(path.join(references, definitions[0].referenceDirectory, 'source'))
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'dsh-packaged-office-preview-'))
  try {
    const result = await renderOfficeTemplatePreview({ ...project, pages: project.pages.slice(0, 1) }, temporary, 960, 1)
    if (result.engine !== 'libreoffice-pdfium') throw new Error('Packaged Office preview engine mismatch')
    const png = await sharp(path.join(temporary, 'preview', 'pages', 'page-1.png')).metadata()
    if (png.width < 800 || png.height < 400) throw new Error('Packaged Office preview dimensions are incomplete')
    const { PersonalTemplateLibrary } = await import(pathToFileURL(path.join(core, 'lib', 'personal-templates.js')).href)
    const library = new PersonalTemplateLibrary({ root: path.join(temporary, 'import-host'), appendAudit: async () => {} })
    const source = await fs.readFile(path.join(temporary, 'preview-deck.pptx'))
    const upload = await library.uploadStart('packaged-regression', { fileName: 'Packaged.pptx', size: source.length })
    for (let offset = 0; offset < source.length; offset += upload.chunkBytes) {
      await library.uploadChunk('packaged-regression', { uploadId: upload.uploadId, offset, base64: source.subarray(offset, offset + upload.chunkBytes).toString('base64') })
    }
    const draft = await library.prepare('packaged-regression', { uploadId: upload.uploadId })
    if (draft.template.slideCount !== 1 || draft.template.previewMetadata.engine !== 'libreoffice-pdfium') throw new Error('Packaged isolated template import failed')
    await library.cancel('packaged-regression', draft.draftId)
    console.log('Packaged isolated template import and Office preview passed')
  } finally { await fs.rm(temporary, { recursive: true, force: true }) }

}

module.exports = async function verifyPackagedPptRuntime(context) {
  const product = context.packager.appInfo.productFilename
  const macContents = path.join(context.appOutDir, product + '.app', 'Contents')
  // Verify through the path the Desktop loads packages from: app.asar, read by
  // the Electron runtime, with native files served from app.asar.unpacked.
  const candidates = [
    path.join(context.appOutDir, 'resources', 'app.asar'),
    path.join(macContents, 'Resources', 'app.asar'),
    path.join(context.appOutDir, 'resources', 'app'),
    path.join(macContents, 'Resources', 'app')
  ]
  const appRoot = candidates.find(candidate => require('node:fs').existsSync(candidate))
  if (!appRoot) throw new Error('Cannot locate the packaged application runtime')
  // The packaged Electron executable is the only Node runtime the app ships;
  // macOS runs Node work through its Helper, as the Desktop does.
  const executable = process.platform === 'win32'
    ? path.join(context.appOutDir, product + '.exe')
    : path.join(macContents, 'Frameworks', product + ' Helper.app', 'Contents', 'MacOS', product + ' Helper')
  if (!require('node:fs').existsSync(executable)) throw new Error('Cannot locate the packaged Electron executable')
  await execFileAsync(executable, [__filename, '--verify-runtime', appRoot], {
    cwd: path.dirname(appRoot),
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
    timeout: 120_000,
    maxBuffer: 1024 * 1024
  })
}

if (require.main === module && process.argv[2] === '--verify-runtime') {
  verifyRuntime(path.resolve(process.argv[3])).catch(error => {
    console.error(error)
    process.exitCode = 1
  })
}
