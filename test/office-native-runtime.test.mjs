import { beforeAll, describe, expect, it } from 'vitest'
import { mkdtemp, mkdir, readFile, writeFile, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { registerOfficeTools } from '../packages/dsh-office/lib/tools.js'
import { parseZip } from '../packages/dsh-office/lib/zip.js'
import { sha256 } from '../packages/dsh-office/lib/workspace.js'

const enabled = Boolean(process.env.DSH_OFFICE_TEST_PYTHON && process.env.DSH_OFFICE_TEST_LIBREOFFICE)
describe.skipIf(!enabled)('Office real isolated authoring and calculation', () => {
  let root, call
  beforeAll(async () => {
    const base = process.env.DSH_OFFICE_TEST_OUTPUT || tmpdir()
    await mkdir(base, { recursive: true }); root = await mkdtemp(path.join(base, 'verified-'))
    const tools = new Map()
    registerOfficeTools({ tools: { register(tool) { tools.set(tool.name, tool) } }, get: () => ({ resolve: () => ({ mode: 'workspace-write', workspaceRoot: root }) }) }, {
      root: path.join(root, 'audit'), python: process.env.DSH_OFFICE_TEST_PYTHON, libreOffice: process.env.DSH_OFFICE_TEST_LIBREOFFICE
    })
    call = (name, args) => tools.get(name).execute(args, { name, callId: `real-${name}`, signal: new AbortController().signal, agent: { id: 'office-native-test', session: { id: 'test', header: { cwd: root } } } })
  })
  it('creates a native Word with headers, footer, footnote and table, edits it and renders the final revision', async () => {
    const source = `import {writeFile} from 'node:fs/promises';
const {Document,Paragraph,TextRun,HeadingLevel,Header,Footer,PageNumber,FootnoteReferenceRun,Table,TableRow,TableCell,Packer}=docx;
const paragraph=text=>new Paragraph({children:[new TextRun({text,font:{ascii:'Arial',eastAsia:'PingFang SC'},size:22})],spacing:{after:140}});
const doc=new Document({styles:{default:{document:{run:{font:{ascii:'Arial',eastAsia:'PingFang SC'},size:22}}}},
footnotes:{1:{children:[paragraph('统计口径：本轮采购计划。')]}},
sections:[{properties:{page:{margin:{top:1200,bottom:1200,left:1440,right:1440}}},
headers:{default:new Header({children:[paragraph('采购计划')]})},footers:{default:new Footer({children:[new Paragraph({children:[new TextRun({children:[PageNumber.CURRENT]})],alignment:'center'})]})},
children:[new Paragraph({text:'九月采购进展',heading:HeadingLevel.TITLE}),paragraph('本轮采购预算为 760 元，材料与数量已经核对。'),
new Paragraph({children:[new TextRun('采购依据'),new FootnoteReferenceRun(1)]}),
new Table({columnWidths:[3600,1600,2200],rows:[['材料','数量','金额'],['材料 A','3','360 元'],['材料 B','5','400 元']].map(row=>new TableRow({children:row.map(text=>new TableCell({children:[paragraph(text)]}))}))})]}]});
await writeFile(office.output,await Packer.toBuffer(doc));`
    const built = await call('office_build', { language: 'javascript', source, output_file: '采购进展.docx' })
    const read = await call('office_word_read', { file_path: built.path })
    expect(read.paragraphs.some(p => p.part.startsWith('word/header'))).toBe(true)
    const target = read.paragraphs.find(p => p.text.includes('760'))
    const edited = await call('office_word_edit', { file_path: built.path, expected_revision: read.sha256, output_file: '采购进展调整.docx', operations: [
      { paragraph_id: target.id, type: 'replace_text', find: '760', replace: '880' },
      { paragraph_id: read.paragraphs.find(p => p.text === '3').id, type: 'replace_text', find: '3', replace: '4' },
      { paragraph_id: read.paragraphs.find(p => p.text === '360 元').id, type: 'replace_text', find: '360', replace: '480' }
    ] })
    const original = parseZip(await readFile(path.join(root, built.path))).parts
    const changed = parseZip(await readFile(path.join(root, edited.path))).parts
    for (const [name, bytes] of original) if (name !== 'word/document.xml') expect(changed.get(name)).toEqual(bytes)
    const preview = await call('office_preview', { file_path: edited.path, expected_revision: edited.sha256, output_file: '采购进展预览.pdf' })
    expect(preview.rendering).toBe('PASS')
    await writeFile(path.join(root, 'word-evidence.json'), JSON.stringify({ built, edited, preview }, null, 2))
  }, 60000)
  it('creates charts and conditional formatting, edits inputs, recalculates all formulas and preserves original objects', async () => {
    const reference = await call('office_reference', { topic: 'excel-create' })
    let source = reference.content.match(/```python\n([\s\S]*?)```/u)[1]
    source = source.replace("wb.save(office['output'])", "ws['E2']='=\"\"'\nws['E3']='=B2>0'\nws['A20']='#标签'\nws['B20']='=literal'\nws['B20'].data_type='s'\nwb.save(office['output'])")
    const built = await call('office_build', { language: 'python', source, output_file: '采购.xlsx' })
    const edited = await call('office_excel_edit', { file_path: built.path, expected_revision: built.sha256, output_file: '采购调整.xlsx', operations: [{ sheet: '采购', cell: 'B2', value: 4 }] })
    const calculated = await call('office_recalculate', { file_path: edited.path, expected_revision: edited.sha256, output_file: '采购已核对.xlsx', checks: [{ sheet: '采购', cell: 'D2', expected: 480 }, { sheet: '采购', cell: 'D4', expected: 880 }, { sheet: '采购', cell: 'E2', expected: '' }, { sheet: '采购', cell: 'E3', expected: true }] })
    expect(calculated.calculation).toBe('PASS'); expect(calculated.computedCount).toBe(5)
    expect(calculated.chartWarnings).toEqual([])
    const original = parseZip(await readFile(path.join(root, edited.path))).parts
    const final = parseZip(await readFile(path.join(root, calculated.path))).parts
    expect([...final.keys()].filter(p => /^xl\/charts\/chart\d+\.xml$/u.test(p))).toHaveLength(1)
    for (const [name, bytes] of original) if (!name.startsWith('xl/worksheets/') && !/^xl\/charts\/chart\d+\.xml$/u.test(name)) expect(final.get(name)).toEqual(bytes)
    expect(final.get('xl/worksheets/sheet1.xml').toString()).toContain('conditionalFormatting')
    expect(calculated.inspection.formulas.missingCache).toBe(0)
    const preview = await call('office_preview', { file_path: calculated.path, expected_revision: calculated.sha256, output_file: '采购预览.pdf' })
    await expect(call('office_recalculate', { file_path: edited.path, expected_revision: edited.sha256, output_file: '错误预期.xlsx', checks: [{ sheet: '采购', cell: 'D4', expected: 999 }] })).rejects.toThrow('Independent check failed')
    expect(await readdir(root)).not.toContain('错误预期.xlsx')
    await writeFile(path.join(root, 'excel-evidence.json'), JSON.stringify({ built, edited, calculated, preview }, null, 2))
  }, 60000)
  it('enforces filesystem and network isolation and strips inherited secrets', async () => {
    const outside = path.join(root, 'private-test.txt'); await writeFile(outside, 'private fixture')
    process.env.OFFICE_TEST_SECRET = 'private fixture'
    const source = `import fs from 'node:fs'; import net from 'node:net';
if(process.env.OFFICE_TEST_SECRET) throw Error('inherited secret');
if(fs.readFileSync(office.inputs[0],'utf8')!=='private fixture') throw Error('declared input copy missing');
try{fs.readFileSync(${JSON.stringify(outside)});throw Error('read escaped')}catch(e){if(!['EPERM','EACCES'].includes(e.code))throw e}
try{fs.writeFileSync(${JSON.stringify(path.join(root, 'escaped.txt'))},'x');throw Error('write escaped')}catch(e){if(!['EPERM','EACCES'].includes(e.code))throw e}
await new Promise((resolve,reject)=>{const s=net.connect(9,'127.0.0.1');s.on('connect',()=>reject(Error('network escaped')));s.on('error',e=>['EPERM','EACCES'].includes(e.code)?resolve():reject(e));});
fs.writeFileSync(office.output,await docx.Packer.toBuffer(new docx.Document({sections:[{children:[new docx.Paragraph('隔离验证通过')]}]})));`
    try {
      const declared = await call('office_source', { file_path: 'private-test.txt' })
      const args = { language: 'javascript', source, inputs: [{ file_path: declared.path, expected_revision: declared.sha256 }], output_file: '隔离验证.docx' }
      const result = await call('office_build', args)
      expect(result.confinement.network).toBe('denied')
      expect(sha256(await readFile(outside))).toBe(sha256(Buffer.from('private fixture')))
      await expect(call('office_build', { ...args, inputs: [{ file_path: declared.path, expected_revision: 'stale' }] })).rejects.toThrow('Revision conflict')
      await expect(call('office_build', { language: 'javascript', source: `import fs from 'node:fs';fs.symlinkSync(${JSON.stringify(outside)},office.output);`, output_file: 'symlink.docx' })).rejects.toThrow('regular')
    } finally { delete process.env.OFFICE_TEST_SECRET }
    await writeFile(path.join(root, 'verification-location.json'), JSON.stringify({ root }))
  }, 30000)
})
