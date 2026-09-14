import path from 'node:path'
import { SaxesParser } from 'saxes'
import { parseZip } from './zip.js'
import { NS } from './compile.js'

const CONTENT_TYPES = 'http://schemas.openxmlformats.org/package/2006/content-types'
export function parseXml(bytes, part) {
  const parser = new SaxesParser({ xmlns: true })
  const stack = []
  let root, count = 0
  parser.on('doctype', () => { throw new Error(`${part}: DTDs are outside the Office input contract`) })
  parser.on('error', (error) => { throw new Error(`${part}: ${error.message}`) })
  parser.on('opentag', (node) => {
    if (++count > 200000 || stack.length > 128) throw new Error(`${part}: XML structure exceeds inspection limits`)
    const item = { name: node.local, uri: node.uri, attrs: node.attributes, children: [], text: '' }
    if (stack.length) stack.at(-1).children.push(item)
    else root = item
    stack.push(item)
  })
  parser.on('text', (value) => { if (stack.length) stack.at(-1).text += value })
  parser.on('cdata', (value) => { if (stack.length) stack.at(-1).text += value })
  parser.on('closetag', () => stack.pop())
  const buffer = Buffer.from(bytes)
  let value
  if (buffer[0] === 0xff && buffer[1] === 0xfe) value = buffer.subarray(2).toString('utf16le')
  else if (buffer[0] === 0xfe && buffer[1] === 0xff) value = Buffer.from(buffer.subarray(2)).swap16().toString('utf16le')
  else value = new TextDecoder('utf-8', { fatal: true }).decode(buffer)
  parser.write(value).close()
  if (!root) throw new Error(`${part}: missing XML root`)
  return root
}
const attr = (node, local, uri) => Object.values(node?.attrs ?? {}).find((a) => a.local === local && (uri === undefined || a.uri === uri))?.value
const descendants = (node, name, uri) => {
  const result = []
  const walk = (current) => {
    if (current.name === name && (uri === undefined || current.uri === uri)) result.push(current)
    for (const child of current.children) walk(child)
  }
  if (node) walk(node)
  return result
}
const child = (node, name, uri) => node?.children.find((item) => item.name === name && (uri === undefined || item.uri === uri))
const textNodes = (node, uri) => {
  if (uri !== NS.word) return descendants(node, 't', uri).map((t) => t.text).join('')
  const walk = (item) => {
    if (item.uri === uri && item.name === 't') return item.text
    if (item.uri === uri && ['br', 'cr'].includes(item.name)) return '\n'
    if (item.uri === uri && item.name === 'tab') return '\t'
    const content = item.children.map(walk).join('')
    return item !== node && item.uri === uri && item.name === 'p' ? `${content}\n` : content
  }
  const content = walk(node)
  return node.name === 'p' ? content : content.replace(/\n$/u, '')
}

export function inspectOffice(bytes, { maxItems = 1000, offset = 0 } = {}) {
  let remainingText = 128000, contentTruncated = false
  const boundedText = (value) => {
    const text = String(value)
    const length = Math.min(text.length, remainingText, 32000)
    if (length < text.length) contentTruncated = true
    remainingText -= length
    return text.slice(0, length)
  }
  const { parts, totalBytes } = parseZip(Buffer.from(bytes))
  const trees = new Map()
  for (const [name, content] of parts) if (name.endsWith('.xml') || name.endsWith('.rels')) trees.set(name, parseXml(content, name))
  const types = trees.get('[Content_Types].xml')
  if (types?.name !== 'Types' || types.uri !== CONTENT_TYPES) throw new Error('Office package requires valid content types')
  const overrides = new Map(descendants(types, 'Override', CONTENT_TYPES).map((entry) => [attr(entry, 'PartName')?.slice(1), attr(entry, 'ContentType')]))
  const defaults = new Map(descendants(types, 'Default', CONTENT_TYPES).map((entry) => [attr(entry, 'Extension'), attr(entry, 'ContentType')]))
  for (const name of parts.keys()) if (name !== '[Content_Types].xml' && !overrides.has(name) && !defaults.has(name.split('.').at(-1))) throw new Error(`Content type missing: ${name}`)
  const warnings = []
  const relationships = new Map()
  for (const [name, tree] of trees) if (name.endsWith('.rels')) {
    if (tree.name !== 'Relationships' || tree.uri !== NS.package) throw new Error(`Invalid relationships: ${name}`)
    const source = name === '_rels/.rels' ? '' : name.replace(/(^|\/)_rels\//u, '$1').slice(0, -5)
    const rels = new Map()
    for (const rel of tree.children) {
      const id = attr(rel, 'Id'), type = attr(rel, 'Type'), raw = attr(rel, 'Target')
      if (!id || !type || !raw || rels.has(id)) throw new Error(`Invalid relationship: ${name}`)
      if (attr(rel, 'TargetMode') === 'External') {
        warnings.push({ code: 'external_relationship', part: name, target: raw })
        rels.set(id, { type, external: true })
        continue
      }
      const decoded = decodeURIComponent(raw.split('#')[0])
      if (decoded.includes('\\') || decoded.includes('\0')) throw new Error(`Unsafe relationship target: ${name}`)
      const target = decoded.startsWith('/') ? decoded.slice(1) : path.posix.join(path.posix.dirname(source), decoded)
      if (target.startsWith('../') || !parts.has(target)) throw new Error(`Missing relationship target: ${target}`)
      rels.set(id, { type, target })
    }
    relationships.set(source, rels)
  }
  for (const name of parts.keys()) if (/vbaProject\.bin$|\/embeddings\//iu.test(name)) warnings.push({ code: 'active_or_embedded_content', part: name })
  const main = [...(relationships.get('')?.values() ?? [])].filter((rel) => rel.type === `${NS.rel}/officeDocument` && !rel.external)
  if (main.length !== 1) throw new Error('Office package requires one supported main document relationship')
  const mainPart = main[0].target
  const tree = trees.get(mainPart)
  const base = { packageValidation: 'PASS', sizeBytes: bytes.length, expandedBytes: totalBytes, warnings }
  if (tree?.name === 'document' && tree.uri === NS.word) {
    if ((overrides.get(mainPart) ?? defaults.get(mainPart.split('.').at(-1))) !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml') throw new Error('Expected a DOCX main part')
    const body = child(tree, 'body', NS.word)
    if (!body) throw new Error('Word body is missing')
    let count = 0
    const blocks = []
    for (const item of body.children) {
      if (item.name === 'sectPr') continue
      count++
      if (count <= offset) continue
      if (blocks.length >= maxItems) continue
      if (item.name === 'p') {
        blocks.push({ type: 'paragraph', text: boundedText(textNodes(item, NS.word)), style: attr(descendants(item, 'pStyle', NS.word)[0], 'val', NS.word) ?? 'Normal' })
      } else if (item.name === 'tbl') {
        const rows = item.children.filter((row) => row.name === 'tr')
        const tableTruncated = rows.length > 200 || rows.some((row) => row.children.filter((cell) => cell.name === 'tc').length > 50)
        contentTruncated ||= tableTruncated
        blocks.push({ type: 'table', rowCount: rows.length, tableTruncated, rows: rows.slice(0, 200).map((row) => row.children.filter((cell) => cell.name === 'tc').slice(0, 50).map((cell) => boundedText(textNodes(cell, NS.word)))) })
      } else blocks.push({ type: item.name, text: boundedText(textNodes(item, NS.word)) })
    }
    const nextOffset = offset + blocks.length < count ? offset + blocks.length : null
    return { ...base, kind: 'word', blockCount: count, blocks, offset, nextOffset, contentTruncated, truncated: offset > 0 || nextOffset !== null || contentTruncated, visualReview: 'NOT_RUN', nativeAcceptance: 'NOT_RUN' }
  }
  if (tree?.name === 'workbook' && tree.uri === NS.sheet) {
    if ((overrides.get(mainPart) ?? defaults.get(mainPart.split('.').at(-1))) !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml') throw new Error('Expected an XLSX main part')
    const workbookRels = relationships.get(mainPart)
    const sharedPart = [...(workbookRels?.values() ?? [])].find((rel) => rel.type === `${NS.rel}/sharedStrings`)?.target
    const shared = descendants(trees.get(sharedPart), 'si', NS.sheet).map((item) => textNodes(item, NS.sheet))
    let formulaCount = 0, missingCache = 0, totalCells = 0, shown = 0
    const errors = [], sheets = []
    for (const sheet of descendants(tree, 'sheet', NS.sheet)) {
      const rel = workbookRels?.get(attr(sheet, 'id', NS.rel))
      if (!rel || rel.external || rel.type !== `${NS.rel}/worksheet`) throw new Error('Workbook sheet relationship is missing or unsupported')
      const root = trees.get(rel.target)
      if (root?.name !== 'worksheet' || root.uri !== NS.sheet) throw new Error(`Invalid worksheet: ${rel.target}`)
      const cells = []
      for (const cell of descendants(root, 'c', NS.sheet)) {
        totalCells++
        const ref = attr(cell, 'r'), type = attr(cell, 't'), raw = child(cell, 'v', NS.sheet)?.text
        const formula = child(cell, 'f', NS.sheet)
        const hasCache = raw !== undefined && (raw !== '' || type === 'str')
        if (formula) { formulaCount++; if (!hasCache) missingCache++ }
        if (type === 'e') errors.push({ sheet: attr(sheet, 'name'), cell: ref, error: raw ?? '' })
        if (totalCells <= offset || shown >= maxItems) continue
        let value = raw ?? null
        if (type === 'inlineStr') value = textNodes(cell, NS.sheet)
        else if (type === 's') {
          if (!/^\d+$/u.test(raw ?? '') || Number(raw) >= shared.length) throw new Error(`Invalid shared string index: ${rel.target}:${ref}`)
          value = shared[Number(raw)]
        } else if (type === 'b') value = raw === '1'
        else if ((type === undefined || type === 'n') && raw !== undefined && raw !== '') {
          value = Number(raw)
          if (!Number.isFinite(value)) throw new Error(`Invalid numeric value: ${rel.target}:${ref}`)
        }
        if (typeof value === 'string') value = boundedText(value)
        cells.push({ ref, value, ...(formula ? { formula: boundedText(formula.text), formulaType: attr(formula, 't') ?? 'normal', cached: hasCache } : {}) })
        shown++
      }
      sheets.push({ name: attr(sheet, 'name'), range: attr(child(root, 'dimension', NS.sheet), 'ref') ?? null, cells })
    }
    const nextOffset = offset + shown < totalCells ? offset + shown : null
    return { ...base, kind: 'excel', sheets, totalCells, offset, nextOffset, contentTruncated, truncated: offset > 0 || nextOffset !== null || contentTruncated, formulas: { count: formulaCount, missingCache, errors, recalculation: formulaCount ? 'NOT_RUN' : 'NOT_APPLICABLE' }, visualReview: 'NOT_RUN', nativeAcceptance: 'NOT_RUN' }
  }
  throw new Error('Supported Office inputs are transitional DOCX and XLSX packages')
}
