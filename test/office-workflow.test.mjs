import { mkdtemp, readFile, readdir, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { zipSync, strToU8 } from 'fflate'
import { checkProject } from '../packages/dsh-office/lib/project.js'
import { compileProject } from '../packages/dsh-office/lib/compile.js'
import { inspectOffice } from '../packages/dsh-office/lib/inspect.js'
import { parseZip } from '../packages/dsh-office/lib/zip.js'
import { registerOfficeTools } from '../packages/dsh-office/lib/tools.js'
import { apply } from '../packages/dsh-office/index.js'
import { Context } from '@deepseek-ai/cordis'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'

const word = () => ({ version: 1, kind: 'word', title: '研发进展', blocks: [
  { type: 'heading', level: 1, text: '研发进展' },
  { type: 'paragraph', text: '中文 & English <保留原文>\n第二行' },
  { type: 'list', items: ['读取材料', '核对结果'] },
  { type: 'table', header: true, rows: [['事项', '状态'], ['研发', '完成']] }
] })
const excel = () => ({ version: 1, kind: 'excel', title: '采购汇总 示例', sheets: [
  { name: '采购', freezeRows: 1, filter: true, columnWidths: [24, 16, 16, 18], rows: [
    ['品类', '数量', '单价', '金额'], ['A', 3, 120, { formula: '=B2*C2', format: 'number' }],
    ['=literal', true, null, { formula: '=SUM(D2:D2)' }]
  ] },
  { name: '汇总', rows: [['总额'], [{ formula: "='采购'!D2" }]] }
] })
function mutateZip(bytes, fn) {
  const parts = Object.fromEntries(parseZip(bytes).parts)
  fn(parts)
  return Buffer.from(zipSync(parts))
}
async function harness(mode = 'workspace-write') {
  const root = await mkdtemp(path.join(tmpdir(), 'office-test-'))
  const auditRoot = await mkdtemp(path.join(tmpdir(), 'office-audit-'))
  const tools = new Map()
  const ctx = { tools: { register(t) { tools.set(t.name, t) } }, get: () => ({ resolve: () => ({ mode, workspaceRoot: root }) }) }
  registerOfficeTools(ctx, { root: auditRoot })
  return {
    root, auditRoot,
    async call(name, args) {
      const tool = tools.get(name)
      return tool.execute(args, { name, callId: 'call-1', signal: new AbortController().signal, agent: { id: 'agent-1', session: { id: 'session-1', header: { cwd: root } } } })
    }
  }
}

describe('Office native packages', () => {
  it('writes editable Word headings, Unicode text, list numbering and real tables', () => {
    const output = compileProject(word())
    const inspection = inspectOffice(output.bytes)
    expect(inspection.kind).toBe('word')
    expect(inspection.blocks[0].style).toBe('Heading1')
    expect(inspection.blocks[1].text).toBe('中文 & English <保留原文>\n第二行')
    expect(inspection.blocks.at(-1).rows).toEqual([['事项', '状态'], ['研发', '完成']])
    expect(parseZip(output.bytes).parts.get('word/document.xml').toString()).toContain('<w:numPr>')
    expect(inspection.nativeAcceptance).toBe('NOT_RUN')
  })
  it('keeps values, literal equals text, booleans, formulas and sheet relationships distinct', () => {
    const output = compileProject(excel())
    const inspection = inspectOffice(output.bytes)
    expect(inspection.sheets.map((s) => s.name)).toEqual(['采购', '汇总'])
    expect(inspection.sheets[0].cells.find((c) => c.ref === 'A3')).toEqual({ ref: 'A3', value: '=literal' })
    expect(inspection.sheets[0].cells.find((c) => c.ref === 'B3').value).toBe(true)
    expect(inspection.sheets[0].cells.find((c) => c.ref === 'D2')).toMatchObject({ formula: 'B2*C2', cached: false, value: null })
    expect(inspection.formulas).toEqual({ count: 3, missingCache: 3, errors: [], recalculation: 'NOT_RUN' })
    const sheet = parseZip(output.bytes).parts.get('xl/worksheets/sheet1.xml').toString()
    expect(sheet).toContain('state="frozen"')
    expect(sheet).toContain('<autoFilter ref="A1:D3"/>')
  })
  it('reads shared strings through workbook relationships and reports stored formula errors', () => {
    const bytes = mutateZip(compileProject(excel()).bytes, (p) => {
      p['xl/_rels/workbook.xml.rels'] = strToU8(p['xl/_rels/workbook.xml.rels'].toString().replace('</Relationships>', '<Relationship Id="shared" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/></Relationships>'))
      p['xl/sharedStrings.xml'] = strToU8('<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><si><t>共享字符串</t></si></sst>')
      p['xl/worksheets/sheet1.xml'] = strToU8(p['xl/worksheets/sheet1.xml'].toString().replace(/<c r="A1".*?<\/c>/u, '<c r="A1" t="s"><v>0</v></c>').replace(/<c r="D2".*?<\/c>/u, '<c r="D2" t="e"><f>1/0</f><v>#DIV/0!</v></c>'))
    })
    const inspection = inspectOffice(bytes)
    expect(inspection.sheets[0].cells[0].value).toBe('共享字符串')
    expect(inspection.formulas.errors).toEqual([{ sheet: '采购', cell: 'D2', error: '#DIV/0!' }])
    expect(inspection.formulas.recalculation).toBe('NOT_RUN')
  })
  it('reports truncated inspection explicitly', () => {
    const inspection = inspectOffice(compileProject(excel()).bytes, { maxItems: 2 })
    expect(inspection.truncated).toBe(true)
    expect(inspection.sheets.flatMap((s) => s.cells)).toHaveLength(2)
    expect(inspection.formulas.count).toBe(3)
  })
  it('reads subsequent cells across worksheets without losing or repeating data', () => {
    const bytes = compileProject(excel()).bytes
    const all = inspectOffice(bytes).sheets.flatMap((s) => s.cells)
    const collected = []
    let offset = 0
    do {
      const page = inspectOffice(bytes, { maxItems: 3, offset })
      collected.push(...page.sheets.flatMap((s) => s.cells))
      offset = page.nextOffset
    } while (offset !== null)
    expect(collected).toEqual(all)
  })
  it('reports external links without fetching them', () => {
    const bytes = mutateZip(compileProject(word()).bytes, (p) => {
      p['word/_rels/document.xml.rels'] = strToU8(p['word/_rels/document.xml.rels'].toString().replace('</Relationships>', '<Relationship Id="external" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://example.invalid/source" TargetMode="External"/></Relationships>'))
    })
    expect(inspectOffice(bytes).warnings).toEqual([{ code: 'external_relationship', part: 'word/_rels/document.xml.rels', target: 'https://example.invalid/source' }])
  })
  it.each(['malformed', 'dtd', 'relationship', 'crc', 'expansion'])('rejects %s packages', (kind) => {
    let bytes = compileProject(word()).bytes
    if (kind === 'malformed' || kind === 'dtd') bytes = mutateZip(bytes, (p) => { p['word/document.xml'] = strToU8(kind === 'malformed' ? '<w:p>' : '<!DOCTYPE x [<!ENTITY foo "bar">]><x>&foo;</x>') })
    if (kind === 'relationship') bytes = mutateZip(bytes, (p) => { delete p['word/styles.xml'] })
    if (kind === 'crc' || kind === 'expansion') {
      bytes = Buffer.from(bytes)
      const pos = bytes.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]))
      bytes.writeUInt32LE(kind === 'crc' ? 123 : 100 * 1024 * 1024, pos + (kind === 'crc' ? 16 : 24))
    }
    expect(() => inspectOffice(bytes)).toThrow()
  })
})

describe('Office authoring diagnostics', () => {
  it.each([
    ['ragged table', (p) => p.blocks.at(-1).rows.push(['broken'])],
    ['unknown field', (p) => p.blocks[0].fontSize = 2],
    ['invalid XML character', (p) => p.blocks[1].text = '\u0000'],
    ['wrong block property', (p) => p.blocks[1].level = 1]
  ])('returns paths and exports no bytes for %s', (_name, mutate) => {
    const project = word(); mutate(project)
    const result = compileProject(project)
    expect(result.status).toBe('needs_revision')
    expect(result.bytes).toBeUndefined()
    expect(result.issues[0].path).toMatch(/^\$\.blocks/u)
  })
  it.each(['=WEBSERVICE("https://example.invalid")', "='[source.xlsx]Sheet1'!A1", '=cmd|run', '=#REF!+1'])('rejects active or broken formula %s', (formula) => {
    const project = excel(); project.sheets[0].rows[1][3] = { formula }
    expect(checkProject(project).status).toBe('needs_revision')
  })
  it('rejects duplicate names and nonfinite numbers', () => {
    const project = excel(); project.sheets[1].name = '采购'; project.sheets[0].rows[1][1] = Infinity
    expect(checkProject(project).issues).toHaveLength(2)
  })
})

describe('Office governed workspace workflow', () => {
  it('dispatches through the real ToolRuntime and obeys a monotonic policy denial', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'office-registry-'))
    const ctx = new Context()
    new SystemPrompt(ctx, {})
    new ToolRuntime(ctx)
    registerOfficeTools({ tools: ctx.tools, get: () => ({ resolve: () => ({ mode: 'workspace-write' }) }) }, { root: path.join(root, 'audit') })
    const exec = { name: 'office_write_project', arguments: { project_path: 'draft.office.json', content: JSON.stringify(word()), expected_revision: null }, agent: { id: 'agent', session: { id: 'session', header: { cwd: root } } }, callId: 'registry-call', signal: new AbortController().signal }
    const allow = await ctx.tools.execute(exec)
    expect(allow.isError).toBe(false)
    expect(allow.value.status).toBe('written')
    ctx.tools.guard(() => 'Denied by policy')
    const denial = await ctx.tools.execute({ ...exec, arguments: { ...exec.arguments, project_path: 'denied.office.json' } })
    expect(denial.isError).toBe(true)
    expect(await readdir(root)).not.toContain('denied.office.json')
  })
  it('creates, checks, exports, inspects and revises a project while preserving its first deliverable', async () => {
    const h = await harness()
    const write = await h.call('office_write_project', { project_path: 'reports/week.office.json', content: JSON.stringify(word()), expected_revision: null })
    const check = await h.call('office_check', { project_path: write.path })
    const first = await h.call('office_export', { project_path: write.path, expected_revision: check.sha256, output_file: 'reports/week.docx' })
    const firstBytes = await readFile(path.join(h.root, first.path))
    const read = await h.call('office_read_project', { project_path: write.path })
    read.project.blocks[1].text = '已更新'
    const revision = await h.call('office_write_project', { project_path: write.path, content: JSON.stringify(read.project), expected_revision: read.sha256 })
    expect(revision.sha256).not.toBe(read.sha256)
    await expect(h.call('office_export', { project_path: write.path, expected_revision: read.sha256, output_file: 'reports/stale.docx' })).rejects.toThrow('Revision conflict')
    await expect(h.call('office_export', { project_path: write.path, expected_revision: revision.sha256, output_file: first.path })).rejects.toThrow()
    expect(await readFile(path.join(h.root, first.path))).toEqual(firstBytes)
    const second = await h.call('office_export', { project_path: write.path, expected_revision: revision.sha256, output_file: 'reports/week-v2.docx' })
    expect((await h.call('office_inspect', { file_path: second.path })).blocks[1].text).toBe('已更新')
    const audit = (await readFile(path.join(h.auditRoot, 'audit.ndjson'), 'utf8')).trim().split('\n').map(JSON.parse)
    expect(audit.some((row) => row.phase === 'result' && row.sha256 === second.sha256)).toBe(true)
    expect(audit.every((row) => row.agentId === 'agent-1' && row.callId === 'call-1')).toBe(true)
  })
  it('keeps the current project when a proposed revision is invalid or stale', async () => {
    const h = await harness()
    const args = { project_path: 'draft.office.json', content: JSON.stringify(word()), expected_revision: null }
    const created = await h.call('office_write_project', args)
    await expect(h.call('office_write_project', args)).rejects.toThrow('Revision conflict')
    const invalid = await h.call('office_write_project', { ...args, expected_revision: created.sha256, content: '{"version":1,"kind":"word"}' })
    expect(invalid.status).toBe('needs_revision')
    expect((await h.call('office_read_project', { project_path: args.project_path })).sha256).toBe(created.sha256)
  })
  it('rejects read-only writes and workspace traversal', async () => {
    const ro = await harness('read-only')
    await expect(ro.call('office_write_project', { project_path: 'draft.office.json', content: JSON.stringify(word()), expected_revision: null })).rejects.toThrow('workspace-write')
    expect(await readdir(ro.root)).toEqual([])
    const h = await harness()
    for (const file of ['../escape.office.json', '/tmp/escape.office.json', 'a/../escape.office.json', 'C:/escape.office.json']) await expect(h.call('office_write_project', { project_path: file, content: JSON.stringify(word()), expected_revision: null })).rejects.toThrow()
  })
  it('denies every advanced mutation under the session read-only policy before execution', async () => {
    const h = await harness('read-only')
    for (const name of ['office_build', 'office_word_edit', 'office_excel_edit', 'office_recalculate', 'office_preview']) {
      const args = name === 'office_build' ? { language: 'javascript', source: 'throw Error("must stay unexecuted")', output_file: 'result.docx' } : { file_path: 'source.docx', expected_revision: 'revision', output_file: 'result.docx', ...(name.endsWith('_edit') ? { operations: [] } : {}) }
      await expect(h.call(name, args)).rejects.toThrow('workspace-write')
    }
    expect(await readdir(h.root)).toEqual([])
  })
  it('loads each task reference through its registered reader', async () => {
    const h = await harness()
    for (const topic of ['word-design', 'word-create', 'word-edit', 'excel-design', 'excel-dashboard', 'excel-create', 'excel-edit-calculate', 'simple-project-format']) expect((await h.call('office_reference', { topic })).content.length).toBeGreaterThan(100)
    await expect(h.call('office_reference', { topic: '../index.js' })).rejects.toThrow('must be one of')
  })
  it('rejects symlink input and output parents', async () => {
    const h = await harness()
    await symlink(h.auditRoot, path.join(h.root, 'escape'))
    await expect(h.call('office_write_project', { project_path: 'escape/draft.office.json', content: JSON.stringify(word()), expected_revision: null })).rejects.toThrow('regular')
    await writeFile(path.join(h.auditRoot, 'source.docx'), compileProject(word()).bytes)
    await symlink(path.join(h.auditRoot, 'source.docx'), path.join(h.root, 'source.docx'))
    await expect(h.call('office_inspect', { file_path: 'source.docx' })).rejects.toThrow('regular')
  })
  it('registers discoverable Word and Excel skills with the executable format reference', async () => {
    let provider
    apply({ inject() {}, tools: { register() {} }, skills: { registerProvider(factory) { provider = factory() } }, connection: { rpc: { handle() {} } }, on() {} }, { root: '/tmp/office-test' })
    const skills = await provider.list()
    expect(skills).toHaveLength(188)
    expect(skills.slice(0, 2).map((s) => s.name)).toEqual(['dsh-word', 'dsh-excel'])
    for (const skill of skills.slice(0, 2)) {
      expect((await provider.get(skill)).content).toContain('office_export')
      expect((await provider.get(skill)).content).toContain('expected_revision')
    }
  })
})
