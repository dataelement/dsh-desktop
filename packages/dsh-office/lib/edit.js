import { DOMParser, XMLSerializer } from '@xmldom/xmldom'
import { zipSync } from 'fflate'
import { parseZip } from './zip.js'
import { inspectOffice, parseXml } from './inspect.js'
import { NS } from './compile.js'
import { sha256 } from './workspace.js'

export const elements = (node, local, namespace) => Array.from(node.getElementsByTagNameNS(namespace, local))
export const direct = (node, local, namespace) => Array.from(node.childNodes).find(n => n.localName === local && n.namespaceURI === namespace)
export const serialize = node => new XMLSerializer().serializeToString(node).replace(/^(<\?xml\b[^?]*\bencoding=)["'][^"']+["']/iu, '$1"UTF-8"')
export function xml(bytes, name) {
  parseXml(bytes, name) // bounded, DTD-free validation before DOM allocation
  let text = Buffer.from(bytes).toString('utf8')
  if (bytes[0] === 0xff && bytes[1] === 0xfe) text = Buffer.from(bytes).subarray(2).toString('utf16le')
  if (bytes[0] === 0xfe && bytes[1] === 0xff) text = Buffer.from(bytes).subarray(2).swap16().toString('utf16le')
  return new DOMParser({ errorHandler: { warning() {}, error(message) { throw new Error(message) }, fatalError(message) { throw new Error(message) } } }).parseFromString(text, 'application/xml')
}
export const pack = parts => Buffer.from(zipSync(Object.fromEntries(parts), { level: 6 }))
const wordPart = name => /^word\/(?:document|header\d+|footer\d+|footnotes|endnotes)\.xml$/u.test(name)
const paragraphText = node => {
  let text = ''
  const walk = n => {
    if (n.namespaceURI === NS.word && n.localName === 't') text += n.textContent
    else if (n.namespaceURI === NS.word && ['tab', 'br', 'cr'].includes(n.localName)) text += n.localName === 'tab' ? '\t' : '\n'
    else for (const child of Array.from(n.childNodes ?? [])) walk(child)
  }
  walk(node); return text
}
function wordTargets(parts) {
  const targets = new Map(), docs = new Map()
  for (const [part, bytes] of parts) if (wordPart(part)) {
    const doc = xml(bytes, part); docs.set(part, doc)
    elements(doc, 'p', NS.word).forEach((node, index) => {
      const fingerprint = sha256(Buffer.from(serialize(node))).slice(0, 16)
      const id = `${part}#${index}:${fingerprint}`
      const complex = ['fldChar', 'instrText', 'fldSimple', 'ins', 'del', 'moveFrom', 'moveTo', 'drawing', 'pict', 'object', 'tab', 'br', 'cr'].some(type => elements(node, type, NS.word).length) || elements(node, 'p', NS.word).length > 0
      targets.set(id, { id, part, node, text: paragraphText(node), editable: !complex })
    })
  }
  return { targets, docs }
}
export function readWord(bytes, { offset = 0, maxItems = 100 } = {}) {
  if (inspectOffice(bytes, { maxItems: 1 }).kind !== 'word') throw new Error('Expected a DOCX')
  const { targets } = wordTargets(parseZip(bytes).parts)
  let budget = 64000
  const paragraphs = [...targets.values()].slice(offset, offset + maxItems).map(({ id, part, text, editable, node }) => {
    const value = text.slice(0, Math.max(0, budget)); budget -= value.length
    return { id, part, text: value, textTruncated: value.length < text.length, editable, style: elements(node, 'pStyle', NS.word)[0]?.getAttributeNS(NS.word, 'val') || 'Normal' }
  })
  return { paragraphs, total: targets.size, nextOffset: offset + paragraphs.length < targets.size ? offset + paragraphs.length : null }
}

function wordFindings(parts) {
  const docs = [...parts].filter(([name]) => name.endsWith('.xml') && name.startsWith('word/')).map(([name, bytes]) => [name, xml(bytes, name)])
  const results = new Map()
  const issue = id => results.set(id, (results.get(id) ?? 0) + 1)
  for (const [part, doc] of docs) {
    for (const [start, end] of [['bookmarkStart', 'bookmarkEnd'], ['commentRangeStart', 'commentRangeEnd']]) {
      const starts = elements(doc, start, NS.word).map(n => n.getAttributeNS(NS.word, 'id'))
      const ends = elements(doc, end, NS.word).map(n => n.getAttributeNS(NS.word, 'id'))
      for (const id of new Set([...starts, ...ends])) if (starts.filter(x => x === id).length !== 1 || ends.filter(x => x === id).length !== 1) issue(`${part}:${start}:${id}`)
    }
    for (const [ref, targetPart, targetTag] of [['commentReference', 'word/comments.xml', 'comment'], ['footnoteReference', 'word/footnotes.xml', 'footnote'], ['endnoteReference', 'word/endnotes.xml', 'endnote']]) {
      const target = docs.find(([name]) => name === targetPart)?.[1]
      const ids = new Set(target ? elements(target, targetTag, NS.word).map(n => n.getAttributeNS(NS.word, 'id')) : [])
      for (const n of elements(doc, ref, NS.word)) if (!ids.has(n.getAttributeNS(NS.word, 'id'))) issue(`${part}:${ref}:${n.getAttributeNS(NS.word, 'id')}`)
    }
  }
  return results
}

export function editWord(bytes, operations) {
  if (!Array.isArray(operations) || !operations.length || operations.length > 100) throw new Error('Use 1–100 Word operations')
  if (inspectOffice(bytes, { maxItems: 1 }).kind !== 'word') throw new Error('Expected a DOCX')
  const parts = parseZip(bytes).parts, baseline = new Map(parts)
  const { targets, docs } = wordTargets(parts), changes = [], touched = new Set()
  for (const op of operations) {
    const target = targets.get(op.paragraph_id)
    if (!target) throw new Error('Word target changed: read the current file and use its paragraph id')
    if (!target.editable) throw new Error('This paragraph requires a dedicated field/revision/drawing editor; choose an ordinary text paragraph')
    const before = paragraphText(target.node)
    if (op.type === 'replace_text') {
      if (typeof op.find !== 'string' || !op.find || typeof op.replace !== 'string' || /[\r\n\t]/u.test(op.replace)) throw new Error('Text replacements require a nonempty search and single-line replacement')
      const start = before.indexOf(op.find)
      if (start < 0 || before.indexOf(op.find, start + 1) >= 0) throw new Error('Search text must match exactly once inside the selected paragraph')
      let cursor = 0, inserted = false
      for (const node of elements(target.node, 't', NS.word)) {
        const value = node.textContent, end = cursor + value.length
        if (end > start && cursor < start + op.find.length) {
          const prefix = value.slice(0, Math.max(0, start - cursor))
          const suffix = value.slice(Math.max(0, start + op.find.length - cursor))
          node.textContent = prefix + (inserted ? '' : op.replace) + suffix
          node.setAttribute('xml:space', 'preserve'); inserted = true
        }
        cursor = end
      }
    } else if (op.type === 'set_paragraph_style') {
      const styles = parts.get('word/styles.xml')
      if (!styles || !elements(xml(styles, 'word/styles.xml'), 'style', NS.word).some(n => n.getAttributeNS(NS.word, 'styleId') === op.style_id && n.getAttributeNS(NS.word, 'type') === 'paragraph')) throw new Error('Choose an existing paragraph style id')
      const doc = docs.get(target.part), prefix = target.node.prefix || 'w'
      let pPr = direct(target.node, 'pPr', NS.word)
      if (!pPr) { pPr = doc.createElementNS(NS.word, `${prefix}:pPr`); target.node.insertBefore(pPr, target.node.firstChild) }
      let style = direct(pPr, 'pStyle', NS.word)
      if (!style) { style = doc.createElementNS(NS.word, `${prefix}:pStyle`); pPr.insertBefore(style, pPr.firstChild) }
      style.setAttributeNS(NS.word, `${prefix}:val`, op.style_id)
    } else throw new Error('Use replace_text or set_paragraph_style')
    const after = paragraphText(target.node)
    changes.push({ id: target.id, type: op.type, before, after, ...(op.style_id ? { style: op.style_id } : {}) })
    touched.add(target.part)
  }
  for (const part of touched) parts.set(part, Buffer.from(serialize(docs.get(part))))
  const oldFindings = wordFindings(baseline), newFindings = wordFindings(parts)
  for (const [finding, count] of newFindings) if (count > (oldFindings.get(finding) ?? 0)) throw new Error(`Word edit introduced a structural issue: ${finding}`)
  const output = pack(parts)
  inspectOffice(output, { maxItems: 1 })
  return { bytes: output, changes, baselineIssues: [...oldFindings.keys()], preservation: { unchangedParts: [...baseline].filter(([part, data]) => data.equals(parts.get(part))).map(([part]) => part), changedParts: [...touched], newStructuralIssues: 0 } }
}

export function workbookParts(bytes) {
  const inspection = inspectOffice(bytes, { maxItems: 1 })
  if (inspection.kind !== 'excel') throw new Error('Expected an XLSX')
  const parts = parseZip(bytes).parts
  const relNs = 'http://schemas.openxmlformats.org/package/2006/relationships'
  const mainRel = elements(xml(parts.get('_rels/.rels'), '_rels/.rels'), 'Relationship', relNs).find(n => n.getAttribute('Type') === `${NS.rel}/officeDocument`)
  const main = mainRel.getAttribute('Target').replace(/^\//u, '')
  const slash = main.lastIndexOf('/'), folder = main.slice(0, slash + 1)
  const relsPath = `${folder}_rels/${main.slice(slash + 1)}.rels`
  const rels = elements(xml(parts.get(relsPath), relsPath), 'Relationship', relNs)
  const workbook = xml(parts.get(main), main)
  const sheets = elements(workbook, 'sheet', NS.sheet).map(n => {
    const rel = rels.find(r => r.getAttribute('Id') === n.getAttributeNS(NS.rel, 'id'))
    const raw = rel.getAttribute('Target'), part = raw.startsWith('/') ? raw.slice(1) : new URL(raw, `file:///${folder}`).pathname.slice(1)
    return { name: n.getAttribute('name'), part, doc: xml(parts.get(part), part) }
  })
  return { parts, sheets, inspection, main, workbook }
}
// OPC content types identify chart parts independently of generator-specific paths.
export function chartParts(parts) {
  const namespace = 'http://schemas.openxmlformats.org/package/2006/content-types'
  const types = xml(parts.get('[Content_Types].xml'), '[Content_Types].xml')
  const overrides = new Map(elements(types, 'Override', namespace).map(n => [n.getAttribute('PartName').slice(1), n.getAttribute('ContentType')]))
  const defaults = new Map(elements(types, 'Default', namespace).map(n => [n.getAttribute('Extension'), n.getAttribute('ContentType')]))
  return [...parts].filter(([name]) => (overrides.get(name) ?? defaults.get(name.split('.').at(-1))) === 'application/vnd.openxmlformats-officedocument.drawingml.chart+xml')
}
export function invalidateFormulaCaches(parts, sheets) {
  for (const sheet of sheets) {
    let changed = false
    for (const cell of elements(sheet.doc, 'c', NS.sheet)) if (direct(cell, 'f', NS.sheet)) {
      const value = direct(cell, 'v', NS.sheet)
      if (value) { cell.removeChild(value); changed = true }
    }
    if (changed) parts.set(sheet.part, Buffer.from(serialize(sheet.doc)))
  }
}
export function editCells(bytes, operations) {
  if (!Array.isArray(operations) || !operations.length || operations.length > 5000) throw new Error('Use 1–5000 cell edits')
  const { parts, sheets } = workbookParts(bytes), changes = []
  const address = value => {
    const match = /^([A-Z]{1,3})([1-9]\d{0,6})$/u.exec(value ?? '')
    if (!match) throw new Error('Use an A1 cell address')
    const column = [...match[1]].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0), row = Number(match[2])
    if (column > 16384 || row > 1048576) throw new Error('Cell exceeds Excel worksheet limits')
    return [column, row]
  }
  for (const op of operations) {
    const [column, row] = address(op.cell)
    const sheet = sheets.find(s => s.name === op.sheet)
    if (!sheet) throw new Error(`Worksheet missing: ${op.sheet}`)
    for (const merge of elements(sheet.doc, 'mergeCell', NS.sheet)) {
      const [first, last = first] = merge.getAttribute('ref').split(':')
      const [x1, y1] = address(first), [x2, y2] = address(last)
      if (column >= x1 && column <= x2 && row >= y1 && row <= y2 && op.cell !== first) throw new Error(`Edit the merged range anchor ${first}`)
    }
    const cells = elements(sheet.doc, 'c', NS.sheet)
    const cell = cells.find(c => c.getAttribute('r') === op.cell)
    if (!cell) throw new Error(`Read and select an existing cell: ${op.sheet}!${op.cell}; use office_build to create new ranges`)
    if (direct(cell, 'f', NS.sheet)?.hasAttribute('t')) throw new Error('Array and shared formulas require their complete formula-range editor')
    const value = op.value
    if (!(value === null || ['string', 'number', 'boolean'].includes(typeof value) || (value && typeof value.formula === 'string'))) throw new Error('Use text, a finite number, boolean, null or {formula: "=..."}')
    if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('Use finite numbers')
    changes.push({ sheet: op.sheet, cell: op.cell, beforeXml: serialize(cell), value })
    for (const child of [...Array.from(cell.childNodes)]) if (child.namespaceURI === NS.sheet && ['f', 'v', 'is'].includes(child.localName)) cell.removeChild(child)
    cell.removeAttribute('t')
    const add = (name, text, parent = cell) => { const node = sheet.doc.createElementNS(NS.sheet, name); node.textContent = text; parent.insertBefore(node, direct(parent, 'extLst', NS.sheet) ?? null); return node }
    if (value && typeof value === 'object') {
      if (!value.formula.startsWith('=') || value.formula.length < 2) throw new Error('A formula starts with = and contains an expression')
      add('f', value.formula.slice(1))
    } else if (typeof value === 'string') {
      cell.setAttribute('t', 'inlineStr'); const container = add('is', ''); const text = add('t', value, container); text.setAttribute('xml:space', 'preserve')
    } else if (typeof value === 'boolean') { cell.setAttribute('t', 'b'); add('v', value ? '1' : '0') }
    else if (value !== null) add('v', String(value))
    parts.set(sheet.part, Buffer.from(serialize(sheet.doc)))
  }
  invalidateFormulaCaches(parts, sheets)
  const output = pack(parts); inspectOffice(output, { maxItems: 1 })
  return { bytes: output, changes, formulaRecalculation: 'NOT_RUN', preservation: 'Unchanged package parts and existing cell styles are retained; all formula caches are invalidated' }
}
