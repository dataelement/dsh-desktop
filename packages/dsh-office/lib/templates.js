import { readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { LIMITS } from './zip.js'
import { readBytes, resolveWorkspaceFile, sha256, writeBinaryAtomic } from './workspace.js'

const root = new URL('../templates/', import.meta.url)
const catalog = JSON.parse(await readFile(new URL('catalog.json', root), 'utf8'))
export function officeTemplate(id) {
  const template = catalog.find(item => item.id === id)
  if (!template) throw new Error('Choose a listed Office example')
  return template
}
async function asset(id, file, maximum = LIMITS.archiveBytes, fs) {
  const template = officeTemplate(id)
  const locator = new URL(`${id}/${file}`, root)
  let bytes
  if (fs) {
    const processPath = fs.processPathFromHostPath(fileURLToPath(locator))
    if (!processPath) throw new Error('Office example resources are unavailable in this filesystem')
    bytes = await readBytes(fs, await fs.resolve(processPath), maximum)
  } else {
    bytes = await readFile(locator)
    if (bytes.length > maximum) throw new Error(`Office example resource exceeds ${maximum} bytes`)
  }
  if (template.files[file] && sha256(bytes) !== template.files[file]) throw new Error('Office example resource differs from its bundled revision')
  return bytes
}
let list
export async function listOfficeTemplates(fs) {
  if (!fs && list) return list
  const load = Promise.all(catalog.map(async ({ id, title, description, category, pages, revision, pageAspectRatio, sheets, previewPages, mode = 'word' }) => ({
    id, title, description, category, pages, revision, pageAspectRatio, mode,
    ...(sheets ? { sheets } : {}), ...(previewPages ? { previewPages } : {}),
    thumbnail: `data:image/webp;base64,${(await asset(id, 'thumbnail.webp', 512 * 1024, fs)).toString('base64')}`
  })))
  if (fs) return load
  list ??= load.catch(error => { list = undefined; throw error })
  return list
}
export async function officeTemplatePreview(id, page, fs) {
  const template = officeTemplate(id)
  if (!Number.isInteger(page) || page < 1 || page > template.pages) throw new Error('Choose an available template page')
  return { templateId: id, page, pages: template.pages,
    ...(template.previewPages?.[page - 1] ?? {}),
    image: `data:image/webp;base64,${(await asset(id, `pages/${page}.webp`, 1024 * 1024, fs)).toString('base64')}` }
}
export async function officeTemplateGuide(id, fs) {
  return (await asset(id, 'design.md', 32 * 1024, fs)).toString('utf8')
}
export function registerTemplateTools(register, ctx) {
  register('office_template', 'Load a built-in Office example design and prepare its editable example, authoring reference and ordered example inputs in the current workspace. Use the returned design with the matching Word or Excel foundation workflow; replace example facts with current task material before office_build.', {
    template_id: { type: 'string', required: true, enum: catalog.map(item => item.id) }
  }, true, async (args, exec, { fs, policy }) => {
    const template = officeTemplate(args.template_id)
    const selected = ctx.sessionProjections?.stateOf(exec.agent.session, 'office')?.selectedTemplate ?? null
    if (selected && selected.id !== template.id) throw new Error(`Use the selected Office example ${selected.id}`)
    if (selected && (selected.mode !== (template.mode ?? 'word') || selected.revision !== template.revision)) throw new Error('The selected Office example revision is no longer available')
    // Load and verify the entire immutable bundle before publishing a new, uniquely named working copy.
    const files = await Promise.all(Object.keys(template.files).map(async file => ({ file, bytes: await asset(template.id, file, LIMITS.archiveBytes, fs) })))
    const relative = `office-templates/${template.id}-${randomUUID()}`
    const inputs = []
    for (const { file, bytes } of files) {
      exec.signal.throwIfAborted()
      const target = `${relative}/${file}`
      const destination = await resolveWorkspaceFile(fs, policy, target, exec.signal)
      await writeBinaryAtomic(fs, destination, bytes, { signal: exec.signal })
      inputs.push({ path: target, sha256: sha256(bytes) })
    }
    const authoringFile = template.authoringFile ?? 'reference.mjs'
    if (!['reference.mjs', 'reference.py'].includes(authoringFile)) throw new Error('Choose a supported authoring reference')
    const source = files.find(item => item.file === authoringFile)
    return { status: 'prepared', path: relative, templateId: template.id, revision: template.revision,
      sha256: template.sampleSha256, mode: template.mode ?? 'word', example: `${relative}/${template.sampleFile ?? 'example.docx'}`, guide: await officeTemplateGuide(template.id, fs), inputs,
      authoring: source ? { language: authoringFile.endsWith('.py') ? 'python' : 'javascript', source: source.bytes.toString('utf8'),
        inputs: template.inputs.map(file => ({ file_path: `${relative}/${file}`, expected_revision: template.files[file] })) } : null }
  })
}
