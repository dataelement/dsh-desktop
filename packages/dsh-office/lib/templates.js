import { readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { LIMITS } from './zip.js'
import { atomicWrite, boundedRead, sha256, workspacePath } from './workspace.js'

const root = new URL('../templates/', import.meta.url)
const catalog = JSON.parse(await readFile(new URL('catalog.json', root), 'utf8'))
export function officeTemplate(id) {
  const template = catalog.find(item => item.id === id)
  if (!template) throw new Error('Choose a listed Office example')
  return template
}
async function asset(id, file, maximum = LIMITS.archiveBytes) {
  const template = officeTemplate(id)
  const bytes = await boundedRead(new URL(`${id}/${file}`, root), maximum)
  if (template.files[file] && sha256(bytes) !== template.files[file]) throw new Error('Office example resource differs from its bundled revision')
  return bytes
}
let list
export async function listOfficeTemplates() {
  list ??= Promise.all(catalog.map(async ({ id, title, description, category, pages, revision, pageAspectRatio, sheets, previewPages, mode = 'word' }) => ({
    id, title, description, category, pages, revision, pageAspectRatio, mode,
    ...(sheets ? { sheets } : {}), ...(previewPages ? { previewPages } : {}),
    thumbnail: `data:image/webp;base64,${(await asset(id, 'thumbnail.webp', 512 * 1024)).toString('base64')}`
  }))).catch(error => { list = undefined; throw error })
  return list
}
export async function officeTemplatePreview(id, page) {
  const template = officeTemplate(id)
  if (!Number.isInteger(page) || page < 1 || page > template.pages) throw new Error('Choose an available template page')
  return { templateId: id, page, pages: template.pages,
    ...(template.previewPages?.[page - 1] ?? {}),
    image: `data:image/webp;base64,${(await asset(id, `pages/${page}.webp`, 1024 * 1024)).toString('base64')}` }
}
export async function officeTemplateGuide(id) {
  return (await asset(id, 'design.md', 32 * 1024)).toString('utf8')
}
export function registerTemplateTools(register) {
  register('office_template', 'Load a built-in Office example design and prepare its editable example, authoring reference and ordered example inputs in the current workspace. Use the returned design with the matching Word or Excel foundation workflow; replace example facts with current task material before office_build.', {
    template_id: { type: 'string', required: true, enum: catalog.map(item => item.id) }
  }, true, async (args, exec, workspace) => {
    const template = officeTemplate(args.template_id)
    // Load and verify the entire immutable bundle before publishing a new, uniquely named working copy.
    const files = await Promise.all(Object.keys(template.files).map(async file => ({ file, bytes: await asset(template.id, file) })))
    const relative = `office-templates/${template.id}-${randomUUID()}`
    const inputs = []
    for (const { file, bytes } of files) {
      exec.signal.throwIfAborted()
      const target = `${relative}/${file}`
      await atomicWrite(await workspacePath(workspace, target, true), bytes)
      inputs.push({ path: target, sha256: sha256(bytes) })
    }
    const authoringFile = template.authoringFile ?? 'reference.mjs'
    if (!['reference.mjs', 'reference.py'].includes(authoringFile)) throw new Error('Choose a supported authoring reference')
    const source = files.find(item => item.file === authoringFile)
    return { status: 'prepared', path: relative, templateId: template.id, revision: template.revision,
      sha256: template.sampleSha256, mode: template.mode ?? 'word', example: `${relative}/${template.sampleFile ?? 'example.docx'}`, guide: await officeTemplateGuide(template.id), inputs,
      authoring: source ? { language: authoringFile.endsWith('.py') ? 'python' : 'javascript', source: source.bytes.toString('utf8'),
        inputs: template.inputs.map(file => ({ file_path: `${relative}/${file}`, expected_revision: template.files[file] })) } : null }
  })
}
