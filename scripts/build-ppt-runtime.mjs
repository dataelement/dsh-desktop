/** Build the shipped PPT plugins from maintained sources into ignored staging output. */
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { promisify } from 'node:util'
import { execFile } from 'node:child_process'
import crypto from 'node:crypto'
import sharp from 'sharp'
import { replaceInstalledPackages } from './ppt-package-projection.mjs'

const run = promisify(execFile)
const root = path.resolve('packages/ppt-runtime')
const templateRoot = path.resolve(process.env.DSH_PPT_TEMPLATE_OUTPUT ?? '.build/ppt-runtime/templates')
const outputRoot = path.resolve('.build/ppt-runtime/packages')
const scratch = await fs.mkdtemp(path.join(os.tmpdir(), 'dsh-ppt-build-'))
const specs = []
for (const category of await fs.readdir(templateRoot)) {
  for (const directory of await fs.readdir(path.join(templateRoot, category))) {
    specs.push(JSON.parse(await fs.readFile(path.join(templateRoot, category, directory, 'metadata.json'), 'utf8')))
  }
}
specs.sort((a, b) => a.definition.id.localeCompare(b.definition.id))
if (specs.length !== 16) throw Error('Expected exactly sixteen maintained templates')

const previews = {}
const previewFiles = {}
const generatedPages = new Map()
const checks = []

try {
  await fs.rm(outputRoot, { recursive: true, force: true })
  await fs.mkdir(outputRoot, { recursive: true })

  for (const { definition } of specs) {
    const directory = path.join(templateRoot, definition.referenceDirectory)
    const { stdout } = await run(process.execPath, [path.join(root, 'core/lib/bin.js'), 'check', path.join(directory, 'source'), '--json'])
    const check = JSON.parse(stdout)
    if (check.errorCount) throw Error(definition.id + ': ' + stdout)
    checks.push({ id: definition.id, ...check })

    const pngDirectory = path.join(scratch, 'screenshots', definition.id)
    await run(process.execPath, [path.join(root, 'core/lib/bin.js'), 'screenshot', path.join(directory, 'source'), '-o', pngDirectory, '--scale', '1.3333333333', '--json'])
    const pngs = JSON.parse(await fs.readFile(path.join(pngDirectory, 'index.json'), 'utf8')).pages.map(page => page.file)
    if (pngs.length !== definition.referencePageCount) throw Error('Incomplete preview set')

    const pageDirectory = path.join(scratch, 'previews', definition.id)
    await fs.mkdir(pageDirectory, { recursive: true })
    for (const [index, file] of pngs.entries()) {
      await sharp(path.join(pngDirectory, file))
        .jpeg({ quality: 87 })
        .toFile(path.join(pageDirectory, `${String(index + 1).padStart(2, '0')}.jpg`))
    }
    generatedPages.set(definition.id, pageDirectory)

    previews[definition.id] = await Promise.all(definition.previewSlides.map(async number => {
      const relative = path.join(definition.referenceDirectory, 'pages', `${String(number).padStart(2, '0')}.jpg`).split(path.sep).join('/')
      const bytes = await fs.readFile(path.join(pageDirectory, `${String(number).padStart(2, '0')}.jpg`))
      const hash = crypto.createHash('sha256').update(bytes).digest('hex')
      previewFiles[hash] = relative
      return `/dsh-ppt/previews/${hash}.jpg`
    }))
  }

  const packages = {}
  const packageStages = []
  for (const kind of ['core', 'adapter']) {
    const packageName = kind === 'core' ? 'dsh-ppt' : 'dsh-ppt-composer'
    const stage = path.join(outputRoot, packageName)
    await fs.cp(path.join(root, kind), stage, {
      recursive: true,
      filter: source => !path.basename(source).startsWith('._') && path.basename(source) !== '.DS_Store'
    })
    await fs.cp(path.join(root, 'upstream'), path.join(stage, 'licenses'), { recursive: true })

    let client = await fs.readFile(path.join(stage, 'lib/client.js'), 'utf8')
    if (!client.includes('/* GENERATED_PPT_PREVIEWS */ {}')) throw Error('Missing preview insertion marker')
    client = client.replace('/* GENERATED_PPT_PREVIEWS */ {}', JSON.stringify(previews))
    await fs.writeFile(path.join(stage, 'lib/client.js'), client)

    if (kind === 'core') {
      await fs.writeFile(path.join(stage, 'lib/preview-manifest.js'), '// Generated from the current preview build; paths stay inside bundled template references.\nexport const previewFiles = ' + JSON.stringify(previewFiles) + ';\n')
      await fs.writeFile(path.join(stage, 'lib/catalog.js'), '// Generated from the maintained template catalog.\nexport const definitions = ' + JSON.stringify(specs.map(spec => spec.definition)) + ';\nexport const semantics = ' + JSON.stringify(Object.fromEntries(specs.map(spec => [spec.definition.id, spec.semantics]))) + ';\n')
      for (const { definition } of specs) {
        const target = path.join(stage, 'skills/dsh-ppt/references', definition.referenceDirectory)
        const referenceSource = path.join(templateRoot, definition.referenceDirectory)
        await fs.cp(referenceSource, target, {
          recursive: true,
          filter: source => source !== path.join(referenceSource, 'metadata.json') && source !== path.join(referenceSource, 'pages')
        })
        await fs.cp(generatedPages.get(definition.id), path.join(target, 'pages'), { recursive: true })
      }
    }

    packageStages.push({ packageName, source: stage })
    packages[kind] = {
      name: packageName,
      path: path.relative(process.cwd(), stage).split(path.sep).join('/')
    }
  }

  await replaceInstalledPackages(packageStages)

  const manifest = {
    packages,
    checks: checks.map(check => ({ id: check.id, pages: check.pageCount, errors: check.errorCount, warnings: check.warningCount }))
  }
  await fs.writeFile(path.join(outputRoot, 'build.json'), JSON.stringify(manifest, null, 2) + '\n')
  console.log(JSON.stringify(manifest, null, 2))
} finally {
  await fs.rm(scratch, { recursive: true, force: true })
}
