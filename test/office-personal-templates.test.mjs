import { mkdtemp, mkdir, readFile, writeFile, rm, symlink } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { afterEach, expect, it } from 'vitest'
import { createPersonalOfficeLibrary, personalOfficeRenderer } from '../packages/dsh-desktop-office/lib/personal-templates.js'
import { registerOfficeRoutes } from '../packages/dsh-desktop-office/lib/modes.js'
import { digest } from '../packages/dsh-desktop-office/lib/templates.js'

const roots = []
afterEach(async () => { for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true }) })
const builtin = { entry() { throw new Error('Choose a listed Office template') }, list: async () => [] }
async function setup() {
  const root = await mkdtemp(join(tmpdir(), 'office-native-')); roots.push(root)
  let renders = 0
  const render = async ({ directory, signal }) => {
    renders++; signal?.throwIfAborted(); await mkdir(join(directory, 'pages'))
    for (const name of ['thumbnail.webp', 'pages/1.webp']) await writeFile(join(directory, name), 'preview')
    return { pageAspectRatios: [0.7] }
  }
  return { root, render, library: await createPersonalOfficeLibrary(root, builtin, render), renders: () => renders }
}
const input = mode => ({ mode, fileName: mode === 'word' ? '企业模板.docx' : '经营模板.xlsx', data: Buffer.from(`native-${mode}`).toString('base64') })

it('returns a stable external-data error without exposing a worker traceback or filesystem paths', async () => {
  const { root } = await setup(), input = join(root, 'linked.docx')
  const python = resolve('.build/office-runtime/primary-runtime/dependencies/python', process.platform === 'win32' ? 'python.exe' : 'bin/python3')
  const prepared = spawnSync(python, ['-I', '-B', '-c', `import zipfile
with zipfile.ZipFile(${JSON.stringify(input)}, 'w') as z:
 z.writestr('[Content_Types].xml','<Types/>')
 z.writestr('word/document.xml','<doc/>')
 z.writestr('word/_rels/document.xml.rels','<Relationships><Relationship Type="http://x/image" TargetMode="External" Target="https://example.com/image.png"/></Relationships>')`], { encoding: 'utf8' })
  expect(prepared.status).toBe(0)
  const render = personalOfficeRenderer(resolve('.build/office-runtime'), resolve('build/office-cli.mjs'))
  await expect(render({ directory: root, input, mode: 'word' })).rejects.toThrow(/^OFFICE_TEMPLATE_EXTERNAL_DATA$/)
})

it.each(['word', 'excel'])('retains native %s bytes through import, metadata changes, restart and preparation', async mode => {
  const { root, render, library } = await setup(), payload = input(mode)
  const item = await library.import(payload)
  await library.update(item.id, item.revision, ' 新名称 ', ' 模拟用途 ')
  const restarted = await createPersonalOfficeLibrary(root, builtin, render)
  expect((await restarted.list())[0]).toMatchObject({ title: '新名称', description: '模拟用途', revision: item.revision, sourceSha256: digest(Buffer.from(payload.data, 'base64')) })
  const prepared = await restarted.prepare(item.id, item)
  expect(prepared.files[0].data).toBe(payload.data)
  expect((await restarted.preview(item.id, 1)).image).toContain('data:image/webp;base64,')
  await expect(restarted.prepare(item.id, { ...item, revision: 'f'.repeat(24) })).rejects.toThrow('revision')
  await expect(restarted.preview(item.id, 2)).rejects.toThrow('page')
  if (mode === 'excel') expect(prepared.files.some(file => file.path === 'xlsx-cache.py')).toBe(true)
})

it('loads healthy templates and accepts new uploads after skipping damaged records', async () => {
  const { root, render, library } = await setup()
  const item = await library.import(input('word'))
  const damagedId = 'personal-' + 'a'.repeat(32)
  const incompleteId = 'personal-' + 'b'.repeat(32)
  const damaged = join(root, damagedId, 'template.json')
  const incomplete = join(root, incompleteId, 'template.json')
  await mkdir(join(root, damagedId))
  await mkdir(join(root, incompleteId))
  await writeFile(damaged, '{')
  const manifest = JSON.parse(await readFile(join(root, item.id, 'template.json'), 'utf8'))
  await writeFile(incomplete, JSON.stringify({ ...manifest, id: incompleteId, files: {} }))

  const skipped = []
  const restarted = await createPersonalOfficeLibrary(root, builtin, render, id => skipped.push(id))
  expect(skipped.sort()).toEqual([damagedId, incompleteId])
  expect((await restarted.list()).map(template => template.id)).toEqual([item.id])
  expect((await restarted.prepare(item.id, item)).files[0].data).toBe(input('word').data)
  const newItem = await restarted.import(input('excel'))
  expect((await restarted.list()).map(template => template.id)).toEqual([item.id, newItem.id])
  expect(await readFile(damaged, 'utf8')).toBe('{')
})

it('serializes duplicate imports and archives/restores without modifying originals', async () => {
  const { root, library, renders } = await setup()
  const [a, b] = await Promise.all([library.import(input('word')), library.import(input('word'))])
  expect(a.id).toBe(b.id); expect(renders()).toBe(1)
  await library.archive(a.id, a.revision)
  expect(await library.list()).toEqual([])
  const original = await readFile(join(root, a.id, 'example.docx'))
  expect((await library.import(input('word'))).id).toBe(a.id)
  expect(await readFile(join(root, a.id, 'example.docx'))).toEqual(original)
})

it('rejects invalid inputs, stale metadata and archive requests, symlinks and modified resources', async () => {
  const { root, library } = await setup(), item = await library.import(input('word'))
  await expect(library.import({ ...input('word'), fileName: '../a.docx' })).rejects.toThrow('Upload')
  await expect(library.import({ ...input('word'), data: 'not-base64' })).rejects.toThrow('Upload')
  await expect(library.update(item.id, 'stale', 'new')).rejects.toThrow('current')
  await expect(library.update(item.id, item.revision, ' ')).rejects.toThrow('name')
  await expect(library.update(item.id, item.revision, 'new', 'x'.repeat(1001))).rejects.toThrow('description')
  await expect(library.archive('government-notice', item.revision)).rejects.toThrow('current')
  await writeFile(join(root, item.id, 'example.docx'), 'tampered')
  await expect(library.prepare(item.id, item)).rejects.toThrow('revision')
  const link = root + '-link'; roots.push(link); await symlink(root, link)
  await expect(createPersonalOfficeLibrary(link, builtin, () => {})).rejects.toThrow('regular')
})

it('admits bounded authenticated native uploads above the previous 16K request limit', async () => {
  const { library } = await setup()
  let route
  registerOfficeRoutes({ connection: { fetch: { register(value) { route = value } } } }, library, {})
  const rpc = async (endpoint, payload) => (await (await route.fetch(new Request('http://localhost/api/office-templates', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'client-request', rpcId: endpoint, method: 'office-templates', payload: { endpoint, ...payload } }) }))).json()).result
  const imported = await rpc('import', { ...input('word'), data: Buffer.alloc(24000, 1).toString('base64') })
  expect(imported.ok).toBe(true)
  const item = imported.value.templates[0]
  expect((await rpc('update', { templateId: item.id, revision: item.revision, name: '新名称', description: '演示' })).value.templates[0].title).toBe('新名称')
  expect((await rpc('archive', { templateId: item.id, revision: 'stale' })).ok).toBe(false)
  expect((await rpc('archive', { templateId: item.id, revision: item.revision })).value.templates).toEqual([])
})

it('inspects native packages while allowing ordinary links and rejecting active/external content', () => {
  const python = resolve('.build/office-runtime/primary-runtime/dependencies/python', process.platform === 'win32' ? 'python.exe' : 'bin/python3')
  const worker = resolve('packages/dsh-desktop-office/lib/personal-template.py')
  const program = `import io, json, pathlib, runpy, tempfile, zipfile
w=runpy.run_path(${JSON.stringify(worker)})
def package(extra={}, body=b'<doc/>'):
 out=io.BytesIO()
 with zipfile.ZipFile(out,'w') as z:
  z.writestr('[Content_Types].xml','<Types/>');z.writestr('word/document.xml',body)
  for k,v in extra.items():z.writestr(k,v)
 return out.getvalue()
with tempfile.TemporaryDirectory() as d:
 p=pathlib.Path(d)/'source.docx'
 p.write_bytes(package({'word/_rels/document.xml.rels':'<Relationships><Relationship Type="http://x/hyperlink" TargetMode="External" Target="https://example.com"/></Relationships>'}))
 assert w['inspect_package'](str(p),'word')['checked']
 ns='http://schemas.openxmlformats.org/wordprocessingml/2006/main'
 def word_field(field):
  return f'<w:document xmlns:w="{ns}">{field}</w:document>'
 def complex_field(*parts):
  begin='<w:r><w:fldChar w:fldCharType="begin"/></w:r>'
  separate='<w:r><w:fldChar w:fldCharType="separate"/></w:r>'
  end='<w:r><w:fldChar w:fldCharType="end"/></w:r>'
  return begin+''.join(f'<w:r><w:instrText>{part}</w:instrText></w:r>' for part in parts)+separate+end
 for allowed in ['<w:fldSimple w:instr="PAGE"/>', complex_field('PA', 'GE'), complex_field('INCLUDE')+complex_field('TEXT')]:
  p.write_bytes(package(body=word_field(allowed)))
  assert w['inspect_package'](str(p),'word')['checked']
 for field in ['<w:instrText>INCLUDETEXT</w:instrText>', '<w:fldSimple w:instr=" INCLUDETEXT "/>', '<w:fldSimple w:instr=" DDE "/>', complex_field('INCLUDE', 'TEXT')]:
  p.write_bytes(package(body=word_field(field)))
  try:w['inspect_package'](str(p),'word')
  except ValueError as error:assert str(error)=='External Word fields are not supported'
  else:raise AssertionError('External Word field was accepted')
 for extra,body in [({'../escape':'x'},b'<doc/>'),({'word/vbaProject.bin':'x'},b'<doc/>'),({'word/embeddings/item.bin':'x'},b'<doc/>'),({'word/_rels/document.xml.rels':'<Relationships><Relationship Type="http://x/image" TargetMode="External" Target="https://example.com"/></Relationships>'},b'<doc/>'),({},b'<!DOCTYPE d [<!ENTITY e "x">]><doc>&e;</doc>')]:
  p.write_bytes(package(extra,body))
  try:w['inspect_package'](str(p),'word')
  except ValueError:pass
  else:raise AssertionError('unsafe package accepted')
print('inspection-boundaries-pass')`
  const result = spawnSync(python, ['-I', '-B', '-c', program], { encoding: 'utf8' })
  expect(result.stderr).toBe(''); expect(result.status).toBe(0); expect(result.stdout).toContain('inspection-boundaries-pass')
})
