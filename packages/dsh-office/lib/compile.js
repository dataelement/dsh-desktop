import { zipSync, strToU8 } from 'fflate'
import { checkProject } from './project.js'

export const NS = {
  word: 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
  sheet: 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
  rel: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
  package: 'http://schemas.openxmlformats.org/package/2006/relationships'
}
const declaration = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
export const xml = (value) => String(value).replace(/[&<>"']/gu, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c])
export function columnName(index) {
  let result = ''
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) result = String.fromCharCode(65 + (n - 1) % 26) + result
  return result
}
const relationship = (id, type, target) => `<Relationship Id="${id}" Type="${NS.rel}/${type}" Target="${target}"/>`
const relationships = (content) => `${declaration}<Relationships xmlns="${NS.package}">${content}</Relationships>`
const override = (name, type) => `<Override PartName="/${name}" ContentType="application/vnd.openxmlformats-officedocument.${type}+xml"/>`

export function compileProject(project) {
  const validation = checkProject(project)
  if (validation.status !== 'valid') return { ...validation, bytes: undefined }
  const parts = project.kind === 'word' ? wordParts(project) : excelParts(project)
  parts['docProps/core.xml'] = `${declaration}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${xml(project.title)}</dc:title><dc:creator>DSH Desktop</dc:creator></cp:coreProperties>`
  const main = project.kind === 'word' ? 'word/document.xml' : 'xl/workbook.xml'
  parts['_rels/.rels'] = relationships(relationship('rId1', 'officeDocument', main) + '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>')
  const types = project.kind === 'word'
    ? override(main, 'wordprocessingml.document.main') + override('word/styles.xml', 'wordprocessingml.styles') + override('word/numbering.xml', 'wordprocessingml.numbering')
    : override(main, 'spreadsheetml.sheet.main') + override('xl/styles.xml', 'spreadsheetml.styles') + project.sheets.map((_, i) => override(`xl/worksheets/sheet${i + 1}.xml`, 'spreadsheetml.worksheet')).join('')
  parts['[Content_Types].xml'] = `${declaration}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>${types}</Types>`
  // Preserve the authored data separately as the revision source; Office packages contain native elements.
  const bytes = Buffer.from(zipSync(Object.fromEntries(Object.entries(parts).map(([name, content]) => [name, [strToU8(content), { mtime: new Date('2020-01-01T00:00:00Z') }]])), { level: 6 }))
  return { ...validation, bytes }
}

function runs(text) {
  return text.split('\n').map((line, i) => `${i ? '<w:r><w:br/></w:r>' : ''}<w:r><w:t xml:space="preserve">${xml(line)}</w:t></w:r>`).join('')
}
function paragraph(text, properties = '') { return `<w:p><w:pPr>${properties}</w:pPr>${runs(text)}</w:p>` }
function wordParts(project) {
  const body = project.blocks.map((block) => {
    if (block.type === 'paragraph') return paragraph(block.text)
    if (block.type === 'heading') return paragraph(block.text, `<w:pStyle w:val="Heading${block.level}"/>`)
    if (block.type === 'pageBreak') return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'
    if (block.type === 'list') return block.items.map((item) => paragraph(item, '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>')).join('')
    const width = Math.floor(9360 / block.rows[0].length)
    const edges = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((edge) => `<w:${edge} w:val="single" w:sz="4" w:color="D8DFE8"/>`).join('')
    return `<w:tbl><w:tblPr><w:tblW w:w="9360" w:type="dxa"/><w:tblBorders>${edges}</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="100" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${block.rows[0].map(() => `<w:gridCol w:w="${width}"/>`).join('')}</w:tblGrid>${block.rows.map((row, i) => `<w:tr><w:trPr>${block.header && i === 0 ? '<w:tblHeader/>' : ''}</w:trPr>${row.map((cell) => `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>${block.header && i === 0 ? '<w:shd w:fill="EDF2F8"/>' : ''}</w:tcPr>${paragraph(cell)}</w:tc>`).join('')}</w:tr>`).join('')}</w:tbl>`
  }).join('')
  const headings = [1, 2, 3].map((level) => `<w:style w:type="paragraph" w:styleId="Heading${level}"><w:name w:val="heading ${level}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="${level === 1 ? 320 : 240}" w:after="120"/><w:outlineLvl w:val="${level - 1}"/></w:pPr><w:rPr><w:b/><w:color w:val="193650"/><w:sz w:val="${[34, 28, 24][level - 1]}"/></w:rPr></w:style>`).join('')
  return {
    'word/document.xml': `${declaration}<w:document xmlns:w="${NS.word}"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1240" w:right="1273" w:bottom="1240" w:left="1273" w:header="600" w:footer="600"/></w:sectPr></w:body></w:document>`,
    'word/_rels/document.xml.rels': relationships(relationship('rId1', 'styles', 'styles.xml') + relationship('rId2', 'numbering', 'numbering.xml')),
    'word/styles.xml': `${declaration}<w:styles xmlns:w="${NS.word}"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Noto Sans CJK SC"/><w:sz w:val="22"/><w:color w:val="243444"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="320" w:lineRule="auto"/><w:widowControl/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>${headings}</w:styles>`,
    'word/numbering.xml': `${declaration}<w:numbering xmlns:w="${NS.word}"><w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="singleLevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/><w:pPr><w:tabs><w:tab w:val="num" w:pos="360"/></w:tabs><w:ind w:left="360" w:hanging="240"/></w:pPr></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num></w:numbering>`
  }
}

function excelParts(project) {
  const parts = {
    'xl/workbook.xml': `${declaration}<workbook xmlns="${NS.sheet}" xmlns:r="${NS.rel}"><sheets>${project.sheets.map((sheet, i) => `<sheet name="${xml(sheet.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets><calcPr calcId="0" fullCalcOnLoad="1" forceFullCalc="1"/></workbook>`,
    'xl/_rels/workbook.xml.rels': relationships(project.sheets.map((_, i) => relationship(`rId${i + 1}`, 'worksheet', `worksheets/sheet${i + 1}.xml`)).join('') + relationship('rIdStyles', 'styles', 'styles.xml')),
    'xl/styles.xml': `${declaration}<styleSheet xmlns="${NS.sheet}"><fonts count="2"><font><sz val="11"/><name val="Arial"/></font><font><b/><color rgb="FF193650"/><sz val="11"/><name val="Arial"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEDF2F8"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>${[4, 10, 44].map((n) => `<xf numFmtId="${n}" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>`).join('')}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`
  }
  project.sheets.forEach((sheet, i) => {
    const maxColumns = Math.max(1, ...sheet.rows.map((row) => row.length))
    const extent = `A1:${columnName(maxColumns - 1)}${sheet.rows.length}`
    const freeze = sheet.freezeRows ?? 0
    const rows = sheet.rows.map((row, r) => `<row r="${r + 1}"${r === 0 ? ' ht="26" customHeight="1"' : ''}>${row.map((cell, c) => {
      if (cell === null) return ''
      const ref = `${columnName(c)}${r + 1}`
      if (typeof cell === 'string') return `<c r="${ref}" t="inlineStr" s="${r === 0 ? 1 : 0}"><is><t xml:space="preserve">${xml(cell)}</t></is></c>`
      if (typeof cell === 'boolean') return `<c r="${ref}" t="b"><v>${cell ? 1 : 0}</v></c>`
      if (typeof cell === 'number') return `<c r="${ref}" t="n"><v>${cell}</v></c>`
      return `<c r="${ref}" s="${{ number: 2, percent: 3, currency: 4 }[cell.format] ?? 0}"><f>${xml(cell.formula.slice(1))}</f></c>`
    }).join('')}</row>`).join('')
    parts[`xl/worksheets/sheet${i + 1}.xml`] = `${declaration}<worksheet xmlns="${NS.sheet}"><dimension ref="${extent}"/><sheetViews><sheetView workbookViewId="0">${freeze ? `<pane ySplit="${freeze}" topLeftCell="A${freeze + 1}" activePane="bottomLeft" state="frozen"/>` : ''}</sheetView></sheetViews><sheetFormatPr defaultRowHeight="18"/><cols>${Array.from({ length: maxColumns }, (_, c) => `<col min="${c + 1}" max="${c + 1}" width="${sheet.columnWidths?.[c] ?? 18}" customWidth="1"/>`).join('')}</cols><sheetData>${rows}</sheetData>${sheet.filter ? `<autoFilter ref="${extent}"/>` : ''}<pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/></worksheet>`
  })
  return parts
}
