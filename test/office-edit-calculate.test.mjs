import { describe, expect, it } from 'vitest'
import { compileProject } from '../packages/dsh-office/lib/compile.js'
import { inspectOffice } from '../packages/dsh-office/lib/inspect.js'
import { readWord, editWord, editCells, pack, chartParts } from '../packages/dsh-office/lib/edit.js'
import { mergeCalculatedValues, prepareCalculation } from '../packages/dsh-office/lib/recalculate.js'
import { confinementArgv, runProcess } from '../packages/dsh-office/lib/runtime.js'
import { parseZip } from '../packages/dsh-office/lib/zip.js'

const word = () => compileProject({ version: 1, kind: 'word', title: 'Word', blocks: [{ type: 'paragraph', text: '原始文字 保留后缀' }, { type: 'paragraph', text: '第二段' }] }).bytes
const excel = () => compileProject({ version: 1, kind: 'excel', title: 'Excel', sheets: [{ name: '数据', rows: [['输入', '结果'], [3, { formula: '=A2*2' }], ['#标题', '=文字']] }] }).bytes
const mutate = (bytes, part, fn) => { const parts = parseZip(bytes).parts; parts.set(part, Buffer.from(fn(parts.get(part).toString()))); return pack(parts) }
const cached = (bytes, value, type = '') => mutate(bytes, 'xl/worksheets/sheet1.xml', text => text.replace('<f>A2*2</f>', `<f>A2*2</f><v>${value}</v>`).replace(/(<c r="B2")/u, `$1${type ? ` t="${type}"` : ''}`))

describe('Word preservation editing', () => {
  it('replaces text across runs and retains the suffix, run properties and all other parts', () => {
    const input = mutate(word(), 'word/document.xml', text => text.replace('原始文字 保留后缀', '原始</w:t></w:r><w:r><w:rPr><w:b/></w:rPr><w:t>文字 保留后缀'))
    const id = readWord(input).paragraphs[0].id
    const result = editWord(input, [{ type: 'replace_text', paragraph_id: id, find: '原始文字', replace: '新内容' }])
    expect(readWord(result.bytes).paragraphs.map(p => p.text)).toEqual(['新内容 保留后缀', '第二段'])
    expect(parseZip(result.bytes).parts.get('word/document.xml').toString()).toContain('<w:b/>')
    for (const [part, bytes] of parseZip(input).parts) if (part !== 'word/document.xml') expect(parseZip(result.bytes).parts.get(part)).toEqual(bytes)
    expect(result.preservation.newStructuralIssues).toBe(0)
  })
  it('keeps text identical in style-only edits', () => {
    const input = word(), id = readWord(input).paragraphs[0].id
    const result = editWord(input, [{ type: 'set_paragraph_style', paragraph_id: id, style_id: 'Heading1' }])
    expect(result.changes[0].before).toBe(result.changes[0].after)
    expect(readWord(result.bytes).paragraphs[0].style).toBe('Heading1')
  })
  it('rejects stale ids, ambiguous matches and unsupported tracked content', () => {
    const input = word(), id = readWord(input).paragraphs[0].id
    expect(() => editWord(input, [{ type: 'replace_text', paragraph_id: `${id}old`, find: '原始', replace: '新' }])).toThrow('target changed')
    const ambiguous = mutate(input, 'word/document.xml', text => text.replace('原始文字', '原始原始'))
    expect(() => editWord(ambiguous, [{ type: 'replace_text', paragraph_id: readWord(ambiguous).paragraphs[0].id, find: '原始', replace: '新' }])).toThrow('exactly once')
    const fields = mutate(input, 'word/document.xml', text => text.replace('<w:r>', '<w:r><w:fldChar w:fldCharType="begin"/>'))
    expect(readWord(fields).paragraphs[0].editable).toBe(false)
    expect(() => editWord(fields, [{ type: 'replace_text', paragraph_id: readWord(fields).paragraphs[0].id, find: '原始', replace: '新' }])).toThrow('dedicated')
  })
  it('validates a whole batch before producing any artifact', () => {
    const input = word(), copy = Buffer.from(input), id = readWord(input).paragraphs[0].id
    expect(() => editWord(input, [{ type: 'replace_text', paragraph_id: id, find: '原始', replace: '新' }, { type: 'replace_text', paragraph_id: id, find: '不存在', replace: '新' }])).toThrow()
    expect(input).toEqual(copy)
  })
  it('writes a matching UTF-8 declaration when editing a UTF-16 source part', () => {
    const parts = parseZip(word()).parts
    const text = parts.get('word/document.xml').toString().replace(/encoding="UTF-8"/u, 'encoding="UTF-16"')
    parts.set('word/document.xml', Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(text, 'utf16le')]))
    const input = pack(parts), id = readWord(input).paragraphs[0].id
    const result = editWord(input, [{ type: 'replace_text', paragraph_id: id, find: '原始', replace: '更新' }])
    expect(parseZip(result.bytes).parts.get('word/document.xml').toString()).toContain('encoding="UTF-8"')
    expect(readWord(result.bytes).paragraphs[0].text).toContain('更新文字')
  })
})

describe('Workbook preservation and calculation evidence', () => {
  it('edits typed cells and invalidates caches, retaining unrelated package bytes', () => {
    const input = cached(excel(), '6')
    const result = editCells(input, [{ sheet: '数据', cell: 'A2', value: 5 }, { sheet: '数据', cell: 'A3', value: '=literal' }])
    const inspection = inspectOffice(result.bytes)
    expect(inspection.formulas.missingCache).toBe(1)
    expect(inspection.sheets[0].cells.find(c => c.ref === 'A3').value).toBe('=literal')
    for (const [part, bytes] of parseZip(input).parts) if (!part.startsWith('xl/worksheets/')) expect(parseZip(result.bytes).parts.get(part)).toEqual(bytes)
  })
  it('removes stale caches before calculation and imports only verified fresh values', () => {
    const original = cached(excel(), '999')
    expect(inspectOffice(prepareCalculation(original)).formulas.missingCache).toBe(1)
    const result = mergeCalculatedValues(original, cached(excel(), '6'), [{ sheet: '数据', cell: 'B2', expected: 6 }])
    expect(result.independentChecks).toBe('PASS')
    expect(result.computed).toEqual([{ cell: '数据!B2', value: 6 }])
    expect(inspectOffice(result.bytes).sheets[0].cells.find(c => c.ref === 'A3').value).toBe('#标题')
    for (const [part, bytes] of parseZip(original).parts) if (!part.startsWith('xl/worksheets/')) expect(parseZip(result.bytes).parts.get(part)).toEqual(bytes)
  })
  it('fails on missing caches, formula errors, changed inputs/formulas or failed independent checks', () => {
    expect(() => mergeCalculatedValues(excel(), excel())).toThrow('no result')
    expect(() => mergeCalculatedValues(excel(), cached(excel(), '#DIV/0!', 'e'))).toThrow('failed')
    const changed = mutate(cached(excel(), '6'), 'xl/worksheets/sheet1.xml', t => t.replace('<v>3</v>', '<v>4</v>'))
    expect(() => mergeCalculatedValues(excel(), changed)).toThrow('changed input')
    const formula = mutate(cached(excel(), '6'), 'xl/worksheets/sheet1.xml', t => t.replace('A2*2', 'A2*3'))
    expect(() => mergeCalculatedValues(excel(), formula)).toThrow('changed formula')
    expect(() => mergeCalculatedValues(excel(), cached(excel(), '6'), [{ sheet: '数据', cell: 'B2', expected: 99 }])).toThrow('Independent check failed')
  })
  it('recognizes an intentionally empty formula string as a computed value', () => {
    const input = mutate(excel(), 'xl/worksheets/sheet1.xml', t => t.replace('A2*2', '&quot;&quot;'))
    const result = mutate(input, 'xl/worksheets/sheet1.xml', t => t.replace('<f>&quot;&quot;</f>', '<f>&quot;&quot;</f><v></v>').replace('<c r="B2"', '<c r="B2" t="str"'))
    expect(inspectOffice(result).formulas.missingCache).toBe(0)
    expect(mergeCalculatedValues(input, result).computed[0].value).toBe('')
  })
  it('requires a scalar local formula contract and retains ordinary # and = text', () => {
    const input = mutate(excel(), 'xl/worksheets/sheet1.xml', t => t.replace('<f>A2*2</f>', '<f t="array" ref="B2:B3">A2*2</f>'))
    expect(() => prepareCalculation(input)).toThrow('scalar')
    expect(() => editCells(input, [{ sheet: '数据', cell: 'B2', value: 2 }])).toThrow('Array')
  })
  it('preserves merged range ownership', () => {
    const input = mutate(excel(), 'xl/worksheets/sheet1.xml', t => t.replace('</worksheet>', '<mergeCells count="1"><mergeCell ref="A3:B3"/></mergeCells></worksheet>'))
    expect(() => editCells(input, [{ sheet: '数据', cell: 'B3', value: 2 }])).toThrow('anchor A3')
  })
})

describe('Office execution boundary', () => {
  it('requires an isolated platform runner and explicitly denies network', () => {
    expect(confinementArgv(['node', 'file'], '/tmp/job', ['/runtime'], { platform: 'darwin' }).join(' ')).toContain('(deny network*)')
    expect(confinementArgv(['node', 'file'], '/tmp/job', ['/runtime'], { platform: 'linux', bwrap: '/usr/bin/bwrap' })).toContain('--unshare-all')
    expect(() => confinementArgv(['node'], '/tmp/job', [], { platform: 'win32' })).toThrow('OFFICE_SANDBOX_UNAVAILABLE')
  })
  it('cancels hanging processes and bounds emitted output', async () => {
    await expect(runProcess([process.execPath, '-e', 'setInterval(()=>{},1000)'], { timeoutMs: 30 })).rejects.toThrow('time limit')
    await expect(runProcess([process.execPath, '-e', 'process.stdout.write("x".repeat(200000))'])).rejects.toThrow('output limit')
  })
})

it('resolves a default XLSX main content type while keeping explicit overrides authoritative', () => {
  const input = mutate(excel(), '[Content_Types].xml', t => t.replace(/<Override PartName="\/xl\/workbook.xml" ContentType="([^"]+)"\/>/, '<Default Extension="xml" ContentType="$1"/>').replace('<Default Extension="xml" ContentType="application/xml"/>', ''))
  expect(inspectOffice(input).kind).toBe('excel')
  const wrong = mutate(input, '[Content_Types].xml', t => t.replace('</Types>', '<Override PartName="/xl/workbook.xml" ContentType="application/xml"/></Types>'))
  expect(() => inspectOffice(wrong)).toThrow('Expected an XLSX main part')
})
it('discovers chart parts from content types across package layouts', () => {
  const parts = parseZip(excel()).parts
  const name = 'xl/drawings/charts/vendor-chart.xml'
  parts.set(name, Buffer.from('<chart/>'))
  parts.set('xl/charts/chart1.xml', Buffer.from('<ordinaryXml/>'))
  parts.set('[Content_Types].xml', Buffer.from(parts.get('[Content_Types].xml').toString().replace('</Types>', `<Override PartName="/${name}" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/></Types>`)))
  expect(chartParts(parts).map(([part]) => part)).toEqual([name])
})
