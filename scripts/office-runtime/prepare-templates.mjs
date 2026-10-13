import { cp, mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile, lstat } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { electronExecutable } from '../electron-node-loader.mjs'
import { createTemplateLibrary } from '../../packages/dsh-desktop-office/lib/templates.js'

const exec = promisify(execFile)
const project = resolve(import.meta.dirname, '../..')
const sources = join(project, 'packages/dsh-desktop-office/sources')
const hash = bytes => createHash('sha256').update(bytes).digest('hex')

async function files(root, prefix = '') {
  const result = []
  for (const entry of (await readdir(join(root, prefix), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const name = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isSymbolicLink()) throw new Error('Office template inputs must be regular files')
    if (entry.isDirectory()) result.push(...await files(root, name))
    else if (entry.isFile()) result.push(name)
  }
  return result
}

/** Generate all previews with the same installed Kit used by Office tasks. */
export async function prepareOfficeTemplates({ runtime = join(project, '.build/office-runtime'), cache = join(project, '.build/office-template-cache') } = {}) {
  const manifest = JSON.parse(await readFile(join(runtime, 'primary-runtime/runtime.json'), 'utf8'))
  const python = join(runtime, 'primary-runtime/dependencies/python', ...(manifest.platform === 'win32' ? ['python.exe'] : ['bin/python3']))
  const kit = JSON.parse(await readFile(join(project, 'node_modules/@deepseek-ai/libreoffice-kit/package.json'), 'utf8'))
  const inputs = await files(sources)
  const fingerprint = hash(Buffer.concat([
    Buffer.from(JSON.stringify({ format: 1, manifest, kit: kit.version })),
    await readFile(fileURLToPath(import.meta.url)), await readFile(join(import.meta.dirname, 'normalize-package.py')),
    await readFile(join(import.meta.dirname, 'check-templates.py')),
    ...await Promise.all(inputs.map(async path => Buffer.concat([Buffer.from(path), await readFile(join(sources, path))])))
  ]))
  const saved = join(cache, fingerprint)
  const output = join(runtime, 'templates')
  await rm(output, { recursive: true, force: true })
  await mkdir(cache, { recursive: true })
  let cached = false
  try { cached = (await lstat(saved)).isDirectory() } catch (error) { if (error.code !== 'ENOENT') throw error }
  if (!cached) {
    const staging = await mkdtemp(join(cache, '.templates-'))
    try {
      const legacy = JSON.parse(await readFile(join(sources, 'catalog.json'), 'utf8'))
      for (const item of legacy) await cp(join(sources, item.source), join(staging, item.id), { recursive: true })
      const ordered = [legacy.find(x => x.id === 'government-notice'),
        ...legacy.filter(x => x.mode === 'word' && x.id !== 'government-notice'), ...legacy.filter(x => x.mode === 'excel')]
      const catalog = []
      const cli = async args => {
        const { stdout } = await exec(electronExecutable(project), [join(project, 'build/office-cli.mjs'), ...args],
          { env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, timeout: 180_000, maxBuffer: 4 * 1024 * 1024, windowsHide: true })
        return JSON.parse(stdout.trim())
      }
      for (const source of ordered) {
        const { source: sourcePath, previewPages, ...item } = source
        const directory = join(staging, item.id)
        const sampleFile = item.sampleFile ?? (item.mode === 'word' ? 'example.docx' : 'example.xlsx')
        const sample = join(directory, sampleFile)
        if (item.id === 'government-notice') { item.title = '公文写作 · 通知'; item.titleEn = 'Official notice' }
        if (item.mode === 'excel') {
          const calculated = join(directory, 'calculated.xlsx')
          await cli(['recalculate', '--input', sample, '--output', calculated])
          await exec(python, ['-I', '-B', join(import.meta.dirname, 'normalize-package.py'), calculated], { timeout: 30_000 })
          await rename(calculated, sample)
        }
        const images = [], sheets = [], missingFonts = new Set()
        const render = async (extra = []) => {
          const result = await cli(['render', '--input', sample, '--output-dir', join(staging, `.render-${item.id}-${images.length}`), '--dpi', '100', ...extra])
          for (const font of result.missingFonts ?? []) missingFonts.add(font)
          return result.images
        }
        if (item.mode === 'word') {
          // Export the printable page: Writer tiles include editing boundaries.
          const pdf = join(staging, `.print-${item.id}.pdf`)
          const exported = await cli(['convert', '--input', sample, '--output', pdf])
          for (const font of exported.missingFonts ?? []) missingFonts.add(font)
          const printed = await cli(['render', '--input', pdf, '--output-dir', join(staging, `.render-${item.id}-print`), '--dpi', '100'])
          images.push(...printed.images)
        }
        else for (const page of previewPages) {
          console.log(`Office preview: ${item.id}, ${page.sheet} ${page.range}`)
          let sheet = sheets.find(x => x.name === page.sheet)
          if (!sheet) { sheet = { name: page.sheet, pages: [] }; sheets.push(sheet) }
          for (const image of await render(['--sheet', page.sheet, '--range', page.range])) {
            images.push(image); sheet.pages.push(images.length)
          }
        }
        const pageDirectory = join(directory, 'pages')
        await mkdir(pageDirectory)
        const normalize = `import sys,json\nfrom PIL import Image,ImageChops\nfrom pathlib import Path\nx=json.loads(sys.argv[1])\nfor i,p in enumerate(x['images'],1):\n im=Image.open(p['path']).convert('RGBA')\n bg=Image.new('RGBA',im.size,'white');bg.alpha_composite(im);bg=bg.convert('RGB')\n if ImageChops.difference(bg,Image.new('RGB',bg.size,bg.getpixel((0,0)))).getbbox() is None: raise RuntimeError('Office preview is blank')\n bg.save(Path(x['directory'])/'pages'/f'{i}.webp',format='WEBP',quality=86)\n if i==1:\n  bg.thumbnail((720,1020));bg.save(Path(x['directory'])/'thumbnail.webp',format='WEBP',quality=86)\n`
        await exec(python, ['-I', '-B', '-c', normalize, JSON.stringify({ images, directory })], { timeout: 30_000 })
        const revisions = Object.fromEntries(await Promise.all((await files(directory)).map(async file => [file, hash(await readFile(join(directory, file)))])))
        catalog.push({ ...item, sampleFile, pages: images.length, pageAspectRatios: images.map(x => x.width / x.height),
          ...(sheets.length ? { sheets } : {}), missingFonts: [...missingFonts], revision: hash(Buffer.from(JSON.stringify(revisions))).slice(0, 24), files: revisions })
        console.log(`Office example: ${item.id}, ${images.length} pages`)
      }
      for (const entry of await readdir(staging)) {
        if (entry.startsWith('.render-') || entry.startsWith('.print-')) await rm(join(staging, entry), { recursive: true, force: true })
      }
      await writeFile(join(staging, 'catalog.json'), JSON.stringify(catalog, null, 2) + '\n')
      await exec(python, ['-I', '-B', join(import.meta.dirname, 'check-templates.py'), staging, sources], { timeout: 30_000 })
      await rename(staging, saved)
    } finally { await rm(staging, { recursive: true, force: true }) }
  }
  const library = await createTemplateLibrary(saved)
  for (const item of await library.list()) for (const file of Object.keys(library.entry(item.id).files)) await library.asset(item.id, file)
  await exec(python, ['-I', '-B', join(import.meta.dirname, 'check-templates.py'), saved, sources], { timeout: 30_000 })
  await cp(saved, output, { recursive: true })
  console.log(`Office template resources prepared: ${fingerprint.slice(0, 12)}`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await prepareOfficeTemplates()
