import { readFile, lstat } from 'node:fs/promises'
import { join, resolve, sep } from 'node:path'
import { createHash } from 'node:crypto'

export const digest = bytes => createHash('sha256').update(bytes).digest('hex')
const safe = value => typeof value === 'string' && /^[a-zA-Z0-9._/-]+$/.test(value)
  && value.split('/').every(part => part && part !== '.' && part !== '..')

/** Installation-owned, content-addressed template resources. */
export async function createTemplateLibrary(root) {
  const catalog = JSON.parse(await readFile(join(root, 'catalog.json'), 'utf8'))
  if (!Array.isArray(catalog) || catalog.length > 50) throw new Error('Invalid Office template catalogue')
  const entries = new Map()
  for (const item of catalog) {
    if (!/^[a-z0-9-]{1,96}$/.test(item.id) || entries.has(item.id) || !['word', 'excel'].includes(item.mode)
      || !/^[a-f0-9]{24}$/.test(item.revision) || typeof item.title !== 'string' || !item.title.trim()
      || !Array.isArray(item.pageAspectRatios) || item.pageAspectRatios.length !== item.pages || item.pageAspectRatios.some(ratio => !Number.isFinite(ratio) || ratio <= 0 || ratio > 20)
      || !Number.isInteger(item.pages) || item.pages < 1 || item.pages > 100 || !item.files?.[item.sampleFile]
      || !item.files['design.md'] || !item.files['thumbnail.webp']) throw new Error('Invalid Office template entry')
    for (const [file, hash] of Object.entries(item.files)) {
      if (!safe(file) || !/^[a-f0-9]{64}$/.test(hash)) throw new Error('Invalid Office resource revision')
    }
    for (let page = 1; page <= item.pages; page++) if (!item.files[`pages/${page}.webp`]) throw new Error('Office preview page revision is required')
    entries.set(item.id, item)
  }
  const entry = id => {
    const value = entries.get(id)
    if (!value) throw new Error('Choose a listed Office template')
    return value
  }
  const asset = async (id, file) => {
    const item = entry(id)
    if (!safe(file) || !Object.hasOwn(item.files, file)) throw new Error('Choose a registered Office resource')
    const path = resolve(root, id, file)
    if (!path.startsWith(resolve(root) + sep)) throw new Error('Invalid Office resource path')
    const info = await lstat(path)
    if (!info.isFile() || info.isSymbolicLink() || info.size > 32 * 1024 * 1024) throw new Error('Invalid Office resource file')
    const bytes = await readFile(path)
    if (digest(bytes) !== item.files[file]) throw new Error('Office template resource differs from its recorded revision')
    return bytes
  }
  return {
    entry, asset,
    async list() {
      return Promise.all(catalog.map(async ({ files, sampleFile, ...item }) => ({ ...item,
        thumbnail: `data:image/webp;base64,${(await asset(item.id, 'thumbnail.webp')).toString('base64')}` })))
    },
    async preview(id, page) {
      const item = entry(id)
      if (!Number.isInteger(page) || page < 1 || page > item.pages) throw new Error('Choose an available Office page')
      return { page, pages: item.pages, aspectRatio: item.pageAspectRatios[page - 1],
        image: `data:image/webp;base64,${(await asset(id, `pages/${page}.webp`)).toString('base64')}` }
    },
    async prepare(id, selection) {
      const item = entry(id)
      if (selection && (selection.id !== id || selection.mode !== item.mode || selection.revision !== item.revision)) throw new Error('Prepare the selected Office template revision')
      const files = await Promise.all(Object.keys(item.files).filter(file => !file.startsWith('pages/') && file !== 'thumbnail.webp')
        .map(async file => ({ path: file, data: (await asset(id, file)).toString('base64'), sha256: item.files[file] })))
      return { item, files, guide: (await asset(id, 'design.md')).toString('utf8') }
    }
  }
}
