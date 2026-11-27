import { lstat, mkdir, readFile, readdir, realpath, rename, rm, writeFile } from 'node:fs/promises'
import { join, resolve, isAbsolute, sep } from 'node:path'
import { randomUUID } from 'node:crypto'
import { execFile } from 'node:child_process'
import { digest, MAX_PERSONAL_OFFICE_BYTES, MAX_OFFICE_REQUEST_BYTES } from './templates.js'
import { docxWorkerArgv, docxWorkerEnvironment, docxWorkerPython } from './docx-workflow.js'
import { officePreviewFontArguments } from './preview-fonts.js'

export { MAX_PERSONAL_OFFICE_BYTES, MAX_OFFICE_REQUEST_BYTES } from './templates.js'
const ID = /^personal-[a-f0-9]{32}$/

/** Profile-owned native originals; removal archives only the library record. */
export async function createPersonalOfficeLibrary(root, builtins, render, onInvalidRecord = () => {}) {
  if (!isAbsolute(root)) throw new Error('Use a host-owned absolute Office library path')
  await mkdir(root, { recursive: true, mode: 0o700 })
  if ((await lstat(root)).isSymbolicLink()) throw new Error('Use a regular Office library directory')
  root = await realpath(root)
  const records = new Map()
  let tail = Promise.resolve()
  const locked = work => { const pending = tail.catch(() => {}).then(work); tail = pending; return pending }
  const regular = async path => {
    const info = await lstat(path), actual = await realpath(path)
    if (info.isSymbolicLink() || !info.isFile() || info.size > MAX_OFFICE_REQUEST_BYTES
      || actual !== resolve(path) || !actual.startsWith(root + sep)) throw new Error('Invalid personal Office resource')
    return readFile(path)
  }
  const recordPath = id => join(root, id, 'template.json')
  const loadRecord = async id => {
    if (!(await lstat(join(root, id))).isDirectory()) throw new Error('Invalid personal Office directory')
    const item = JSON.parse((await regular(recordPath(id))).toString('utf8'))
    if (!item || item.id !== id || item.origin !== 'personal' || !['word', 'excel'].includes(item.mode)
      || !/^[a-f0-9]{24}$/.test(item.revision) || typeof item.title !== 'string' || !item.title.trim()
      || !Number.isInteger(item.pages) || item.pages < 1 || item.pages > 50
      || !Array.isArray(item.pageAspectRatios) || item.pageAspectRatios.length !== item.pages
      || item.pageAspectRatios.some(value => !Number.isFinite(value) || value <= 0 || value > 20)
      || item.sampleFile !== (item.mode === 'word' ? 'example.docx' : 'example.xlsx')
      || !item.files || typeof item.files !== 'object' || Array.isArray(item.files)
      || Object.entries(item.files).some(([file, sha]) => !/^(example\.(docx|xlsx)|design\.md|thumbnail\.webp|pages\/[1-9][0-9]?\.webp)$/.test(file) || !/^[a-f0-9]{64}$/.test(sha))) throw new Error('Invalid personal Office record')
    const requiredFiles = [item.sampleFile, 'design.md', 'thumbnail.webp', ...item.pageAspectRatios.map((_, i) => `pages/${i + 1}.webp`)]
    if (requiredFiles.some(file => !Object.hasOwn(item.files, file))) throw new Error('Missing personal Office resources')
    return item
  }
  for (const id of await readdir(root)) {
    if (!ID.test(id)) continue
    try {
      const item = await loadRecord(id)
      if (!item.archived) records.set(id, item)
    } catch {
      onInvalidRecord(id)
    }
  }
  const entry = id => records.get(id) ?? builtins.entry(id)
  const asset = async (id, file) => {
    if (!records.has(id)) return builtins.asset(id, file)
    const item = entry(id)
    if (!Object.hasOwn(item.files, file)) throw new Error('Choose a registered personal Office resource')
    const bytes = await regular(join(root, id, file))
    if (digest(bytes) !== item.files[file]) throw new Error('Personal Office template revision differs')
    return bytes
  }
  const publicItem = async ({ files, sampleFile, ...item }) => ({ ...item, thumbnail: `data:image/webp;base64,${(await asset(item.id, 'thumbnail.webp')).toString('base64')}` })
  const persist = async item => {
    const temporary = `${recordPath(item.id)}.${randomUUID()}`
    try {
      await writeFile(temporary, JSON.stringify(item), { flag: 'wx', mode: 0o600 })
      await rename(temporary, recordPath(item.id))
    } finally { await rm(temporary, { force: true }) }
  }
  return {
    entry, asset,
    async list() { return [...await Promise.all([...records.values()].map(publicItem)), ...await builtins.list()] },
    async preview(id, page) {
      if (!records.has(id)) return builtins.preview(id, page)
      const item = entry(id)
      if (!Number.isInteger(page) || page < 1 || page > item.pages) throw new Error('Choose an available Office page')
      return { page, pages: item.pages, aspectRatio: item.pageAspectRatios[page - 1], image: `data:image/webp;base64,${(await asset(id, `pages/${page}.webp`)).toString('base64')}` }
    },
    async prepare(id, selection) {
      if (!records.has(id)) return builtins.prepare(id, selection)
      const item = entry(id)
      if (selection?.id !== id || selection.mode !== item.mode || selection.revision !== item.revision) throw new Error('Prepare the selected personal Office revision')
      const files = await Promise.all([item.sampleFile, 'design.md'].map(async path => ({ path, data: (await asset(id, path)).toString('base64'), sha256: item.files[path] })))
      let guide = (await asset(id, 'design.md')).toString('utf8')
      if (item.mode === 'excel') {
        const helper = await readFile(new URL('./xlsx-cache.py', import.meta.url))
        files.push({ path: 'xlsx-cache.py', data: helper.toString('base64'), sha256: digest(helper) })
        guide += '\n\nFormula caches for Desktop preview: after editing the native working copy, recalculate a separate temporary copy with the existing Office CLI. From the active workspace root, use the Python from load_workspace_dependencies to run the supplied xlsx-cache.py --source <edited-native.xlsx> --calculated <temporary-recalculated.xlsx> --output <new-final.xlsx>. This fixed helper copies only formula result caches and retains original formulas, styles and unrelated data. It rejects mismatched inputs and calculation errors. Present and preview the new final file with caches; do not present a file with empty cached values or the restyled recalculation result.'
        const design = files.find(file => file.path === 'design.md')
        design.data = Buffer.from(guide).toString('base64'); design.sha256 = digest(Buffer.from(guide))
      }
      return { item, files, guide }
    },
    import(input, signal) { return locked(async () => {
      signal?.throwIfAborted()
      const mode = input?.mode, fileName = input?.fileName, data = input?.data
      const extension = mode === 'word' ? '.docx' : mode === 'excel' ? '.xlsx' : null
      if (!extension || typeof fileName !== 'string' || fileName.length > 180 || /[\x00-\x1f/\\]/.test(fileName)
        || !fileName.toLowerCase().endsWith(extension) || !fileName.slice(0, -extension.length).trim() || typeof data !== 'string' || !data.length
        || data.length > Math.ceil(MAX_PERSONAL_OFFICE_BYTES / 3) * 4 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(data)) throw new Error('Upload a DOCX or XLSX template of at most 16 MiB')
      const bytes = Buffer.from(data, 'base64'), sha256 = digest(bytes), id = `personal-${sha256.slice(0, 32)}`
      if (!bytes.length || bytes.length > MAX_PERSONAL_OFFICE_BYTES) throw new Error('Office template is too large')
      if (records.has(id)) {
        if (records.get(id).mode !== mode) throw new Error('The file does not match the selected Office format')
        return publicItem(records.get(id))
      }
      if (records.size >= 100) throw new Error('Archive an unused template before adding another')
      const staging = join(root, `.import-${randomUUID()}`)
      await mkdir(staging, { mode: 0o700 })
      try {
        const sampleFile = `example${extension}`
        await writeFile(join(staging, sampleFile), bytes, { flag: 'wx', mode: 0o600 })
        const preview = await render({ directory: staging, input: join(staging, sampleFile), mode, signal })
        signal?.throwIfAborted()
        const guide = mode === 'word'
          ? 'User-uploaded native DOCX template. Preserve headers, footers, page settings, tables, drawings and styles. Fill body text through office_template_write using the returned paragraph/run IDs. Running headers and footers remain unchanged. Drawing/field/hyperlink paragraphs may be read but must not be replaced. Review and render the resulting file before delivery.'
          : 'User-uploaded native XLSX template. Open the working copy with office-xlsx; keep all worksheets, formulas, styles, charts and validations. Replace only the cells required by the current task; preserve unrelated existing data and formulas. Recalculate a separate temporary copy to check numeric results; never replace the styled delivery file with a conversion result. Use the supplied xlsx-cache.py to copy verified caches back to a new native output; keep automatic recalculation on open. Render and review before delivery. Never reconstruct the workbook from scratch.'
        await writeFile(join(staging, 'design.md'), guide, { flag: 'wx', mode: 0o600 })
        const files = {}
        for (const file of [sampleFile, 'design.md', 'thumbnail.webp', ...preview.pageAspectRatios.map((_, i) => `pages/${i + 1}.webp`)]) files[file] = digest(await readFile(join(staging, file)))
        const item = { id, mode, origin: 'personal', title: fileName.slice(0, -extension.length), revision: sha256.slice(0, 24), sourceSha256: sha256,
          sampleFile, pages: preview.pageAspectRatios.length, pageAspectRatios: preview.pageAspectRatios, files, createdAt: new Date().toISOString() }
        if (!item.pages || item.pages > 50 || item.pageAspectRatios.some(ratio => !Number.isFinite(ratio) || ratio <= 0 || ratio > 20)) throw new Error('Personal Office preview exceeds its page budget')
        await writeFile(join(staging, 'template.json'), JSON.stringify(item), { flag: 'wx', mode: 0o600 })
        try { await rename(staging, join(root, id)) } catch (error) {
          const existsConflict = ['EEXIST', 'ENOTEMPTY'].includes(error.code)
            || (process.platform === 'win32' && (error.code === 'EPERM' || error.code === 'EACCES'))
          if (!existsConflict) throw error
          let previous
          try { previous = await loadRecord(id) } catch { throw error }
          if (!previous.archived || previous.sourceSha256 !== sha256) throw error
          const restored = { ...previous, archived: false }
          await persist(restored); records.set(id, restored)
          return publicItem(restored)
        }
        records.set(id, item)
        return publicItem(item)
      } finally { await rm(staging, { recursive: true, force: true }) }
    }) },
    update(id, revision, name, description = '') { return locked(async () => {
      const item = records.get(id)
      if (!item || item.revision !== revision) throw new Error('Choose a current personal Office template')
      if (typeof name !== 'string' || !name.trim() || name.trim().length > 80 || /[\x00-\x1f]/.test(name)
        || typeof description !== 'string' || description.length > 1000 || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(description)) throw new Error('Use a template name of at most 80 characters and description of at most 1000 characters')
      const next = { ...item, title: name.trim(), description: description.trim() }
      await persist(next); records.set(id, next)
    }) },
    archive(id, revision) { return locked(async () => {
      const item = records.get(id)
      if (!item || item.revision !== revision) throw new Error('Choose a current personal Office template')
      await persist({ ...item, archived: true }); records.delete(id)
    }) }
  }
}

/** Only fixed installation-owned code processes untrusted Office packages. */
export function personalOfficeRenderer(resources, cli) {
  const [python, ...pythonArgs] = docxWorkerArgv(docxWorkerPython(resources))
  let worker, fontArguments
  return async ({ directory, input, mode, signal }) => {
    const combined = AbortSignal.any([AbortSignal.timeout(120_000), ...(signal ? [signal] : [])])
    // Electron can read the worker from app.asar; the external Python process cannot.
    worker ??= await readFile(new URL('./personal-template.py', import.meta.url), 'utf8')
    const run = (file, args, request) => new Promise((accept, reject) => {
      const env = file === python ? docxWorkerEnvironment(process, worker) : { ...(process.platform === 'win32' ? { SystemRoot: process.env.SystemRoot } : {}), ...(file === process.execPath && process.versions.electron ? { ELECTRON_RUN_AS_NODE: '1' } : {}) }
      const child = execFile(file, args, { cwd: directory, env, signal: combined, timeout: 120_000, killSignal: 'SIGKILL', maxBuffer: 1024 * 1024, windowsHide: true }, (error, stdout, stderr) => {
        if (error) reject(new Error(/External linked data|external linked data|External formula data|External Word fields/.test(stderr)
          ? 'OFFICE_TEMPLATE_EXTERNAL_DATA' : combined.aborted ? 'OFFICE_TEMPLATE_TIMEOUT'
            : file === python ? 'OFFICE_TEMPLATE_INVALID' : 'OFFICE_TEMPLATE_RENDER_FAILED', { cause: error }))
        else { try { accept(JSON.parse(stdout)) } catch (failure) { reject(failure) } }
      })
      child.stdin.end(request ? JSON.stringify(request) : undefined)
    })
    await run(python, pythonArgs, { command: 'inspect', input, mode })
    const output = join(directory, 'rendered')
    const rendered = await run(process.execPath, [cli, 'render', ...await (fontArguments ??= officePreviewFontArguments()), '--input', input, '--output-dir', output, ...(mode === 'word' ? ['--pages', 'all'] : []), '--dpi', '100', '--max-pages', '50'])
    if (!Array.isArray(rendered.images) || !rendered.images.length || rendered.images.length > 50 || (rendered.pageCount ?? 0) > 50) throw new Error('Office template has no bounded preview')
    const images = rendered.images.map(image => typeof image === 'string' ? image : image.path)
    if (images.some(path => typeof path !== 'string' || !resolve(path).startsWith(output + sep))) throw new Error('Office renderer returned an invalid preview path')
    const result = await run(python, pythonArgs, { command: 'previews', directory, images })
    await rm(output, { recursive: true, force: true })
    return result
  }
}
