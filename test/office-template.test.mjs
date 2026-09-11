import { mkdtemp, readFile, readdir, rm, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, expect, it } from 'vitest'
import { registerOfficeTools } from '../packages/dsh-office/lib/tools.js'
import { sha256 } from '../packages/dsh-office/lib/workspace.js'
import { parseZip, LIMITS } from '../packages/dsh-office/lib/zip.js'
import { inspectOffice } from '../packages/dsh-office/lib/inspect.js'
import { listOfficeTemplates, officeTemplatePreview } from '../packages/dsh-office/lib/templates.js'

const roots = []
afterEach(async () => { for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true }) })
async function fixture(mode = 'workspace-write') {
  const root = await mkdtemp(path.join(tmpdir(), 'word-template-')); roots.push(root)
  const tools = new Map()
  registerOfficeTools({ tools: { register: tool => tools.set(tool.name, tool) }, get: () => ({ resolve: () => ({ mode }) }) }, { root: path.join(root, 'audit') })
  return { root, call: id => tools.get('office_template').execute({ template_id: id }, {
    name: 'office_template', callId: 'template-test', signal: new AbortController().signal, agent: { id: 'test', session: { id: 'test', header: { cwd: root } } }
  }) }
}
it('stages exact native samples and complete, revision-bound authoring inputs with audit records', async () => {
  const f = await fixture()
  for (const id of ['coffee-market', 'equity-research', 'government-notice', 'annual-business', 'port-cargo', 'bio-assay']) {
    const result = await f.call(id)
    expect(JSON.parse(JSON.stringify(result))).toEqual(result)
    const bytes = await readFile(path.join(f.root, result.example))
    expect(sha256(bytes)).toBe(result.sha256)
    expect(inspectOffice(bytes, { maxItems: 100 }).kind).toBe(result.mode)
    for (const input of result.inputs) expect(sha256(await readFile(path.join(f.root, input.path)))).toBe(input.sha256)
    for (const input of result.authoring?.inputs ?? []) expect(sha256(await readFile(path.join(f.root, input.file_path)))).toBe(input.expected_revision)
    expect(result.guide).toContain('版式')
    if (id === 'government-notice') {
      expect(bytes.length).toBe(18457553)
      expect(result.sha256).toBe('c763f627f09e543505b4cfaea34487a0b8cd724b549e4762633153da61ddf961')
      expect([...parseZip(bytes).parts.keys()].filter(p=>p.startsWith('word/fonts/'))).toHaveLength(4)
      for (let page=1; page<=4; page++) expect((await officeTemplatePreview(id,page)).image).toMatch(/^data:image\/webp;base64,/)
      await expect(officeTemplatePreview(id,5)).rejects.toThrow('available template page')
    }
    if (['port-cargo', 'bio-assay'].includes(id)) {
      expect(result.authoring.language).toBe('python')
      expect(result.authoring.source).toContain("wb.save(office['output'])")
      expect(result.authoring.inputs).toHaveLength(1)
    }
  }
  const audit = (await readFile(path.join(f.root, 'audit/audit.ndjson'), 'utf8')).trim().split('\n').map(JSON.parse)
  expect(audit.filter(item => item.phase === 'result')).toHaveLength(6)
  expect(audit.filter(item => item.phase === 'result').every(item => item.sha256 && item.inputs.length)).toBe(true)
})
it('enforces policy and canonical workspace paths before writing template resources', async () => {
  const readonly = await fixture('read-only')
  await expect(readonly.call('coffee-market')).rejects.toThrow('workspace-write policy')
  expect(await readdir(readonly.root)).toEqual([])
  const f = await fixture()
  await expect(f.call('../coffee-market')).rejects.toThrow('must be one of')
  const outside = await mkdtemp(path.join(tmpdir(), 'word-template-outside-')); roots.push(outside)
  await symlink(outside, path.join(f.root, 'office-templates'))
  await expect(f.call('coffee-market')).rejects.toThrow('regular files and directories')
  expect(await readdir(outside)).toEqual([])
})

it('publishes all worksheet segments with exact sample revision and rejects unavailable pages', async () => {
  const catalog = await listOfficeTemplates()
  for (const template of catalog.filter(t => t.mode === 'excel')) {
    expect(template.sheets.flatMap(s => s.pages)).toEqual(Array.from({ length:template.pages }, (_,i) => i+1))
    expect(new Set(template.sheets.map(s=>s.name)).size).toBe(template.sheets.length)
    for (const sheet of template.sheets) for (const page of sheet.pages) {
      const preview = await officeTemplatePreview(template.id, page)
      expect(preview.image).toMatch(/^data:image\/webp;base64,/)
      if (template.id === 'annual-business') {
        expect(preview.sheet).toBe(sheet.name)
        expect(preview.range).toMatch(/^A\d+:P\d+$/)
        expect(preview.aspectRatio).toBeGreaterThan(0)
      }
    }
  }
  const enhanced = catalog.find(t=>t.id==='annual-business')
  expect(enhanced.sheets).toHaveLength(6)
  await expect(officeTemplatePreview(enhanced.id,21)).rejects.toThrow('available template page')
  const f = await fixture(), prepared = await f.call(enhanced.id)
  expect(prepared.sha256).toBe('86f505bcdce34bc36f32a43b32c7f680196a1ab3b36731c09e30f5686a1e7fbe')
})

it('keeps a finite archive bound for embedded-font documents', () => {
  expect(()=>parseZip(Buffer.alloc(LIMITS.archiveBytes+1))).toThrow('Office package exceeds')
  expect(LIMITS.entryBytes).toBe(16*1024*1024)
  expect(LIMITS.totalBytes).toBe(64*1024*1024)
})
