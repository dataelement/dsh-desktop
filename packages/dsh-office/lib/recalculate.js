import { NS } from './compile.js'
import { inspectOffice } from './inspect.js'
import { chartParts, direct, elements, invalidateFormulaCaches, pack, serialize, workbookParts, xml } from './edit.js'
import { convertWithLibreOffice } from './runtime.js'

const CHART = 'http://schemas.openxmlformats.org/drawingml/2006/chart'
function formulaKey(value) {
  return value.replace(/'((?:[^']|'')+)'!/gu, (_s, name) => `${name.replace(/''/gu, "'")}!`).split(/("(?:[^"]|"")*")/u).map((segment, i) => i % 2 ? segment : segment.replace(/\b_xlfn\.|\b_xlws\./giu, '').replace(/\s+/gu, '').toUpperCase()).join('')
}
function values(book) {
  const sharedPart = [...book.parts.keys()].find(p => /(?:^|\/)sharedStrings\.xml$/u.test(p))
  const shared = sharedPart ? elements(xml(book.parts.get(sharedPart), sharedPart), 'si', NS.sheet).map(n => elements(n, 't', NS.sheet).map(t => t.textContent).join('')) : []
  const cells = new Map()
  for (const sheet of book.sheets) for (const node of elements(sheet.doc, 'c', NS.sheet)) {
    const type = node.getAttribute('t'), v = direct(node, 'v', NS.sheet), raw = v?.textContent
    let value = raw ?? null
    if (type === 's') value = shared[Number(raw)]
    else if (type === 'inlineStr') value = elements(node, 't', NS.sheet).map(t => t.textContent).join('')
    else if (type === 'b') value = raw === '1'
    else if ((!type || type === 'n') && raw !== undefined && raw !== '') value = Number(raw)
    cells.set(`${sheet.name}!${node.getAttribute('r')}`, { value, type, node, formula: direct(node, 'f', NS.sheet)?.textContent, hasCache: Boolean(v) && (raw !== '' || type === 'str') })
  }
  return cells
}
export function assertEngineInput(bytes) {
  const report = inspectOffice(bytes, { maxItems: 1 })
  if (report.warnings.some(w => w.code === 'active_or_embedded_content')) throw new Error('Office engine inputs require passive DOCX/XLSX content')
  const book = report.kind === 'excel' ? workbookParts(bytes) : null
  if (book) {
    for (const { node, formula } of values(book).values()) {
      if (formula !== undefined && (direct(node, 'f', NS.sheet).hasAttribute('t') || /\b(?:WEBSERVICE|RTD|DDE|HYPERLINK|IMAGE)\s*\(|\[[^\]]+\][^!]*!|\|/iu.test(formula))) throw new Error('Calculation supports workbook-local scalar formulas; this file requires another engine contract')
    }
    if ([...book.parts.keys()].some(p => /externalLinks|connections\.xml|queryTables/iu.test(p))) throw new Error('External workbook data must be resolved before isolated recalculation')
  }
  return report
}

export function prepareCalculation(bytes) {
  assertEngineInput(bytes)
  const book = workbookParts(bytes)
  invalidateFormulaCaches(book.parts, book.sheets)
  let calc = direct(book.workbook.documentElement, 'calcPr', NS.sheet)
  if (!calc) { calc = book.workbook.createElementNS(NS.sheet, 'calcPr'); book.workbook.documentElement.appendChild(calc) }
  for (const [key, value] of Object.entries({ calcMode: 'auto', fullCalcOnLoad: '1', forceFullCalc: '1' })) calc.setAttribute(key, value)
  book.parts.set(book.main, Buffer.from(serialize(book.workbook)))
  return pack(book.parts)
}

// Import calculated values into the original package, keeping its formulas,
// styles, drawings, conditions, relationships and named ranges authoritative.
export function mergeCalculatedValues(original, calculated, checks = []) {
  const source = workbookParts(original), engine = workbookParts(calculated)
  const sourceCells = values(source), engineCells = values(engine)
  if (source.sheets.map(s => s.name).join('\0') !== engine.sheets.map(s => s.name).join('\0')) throw new Error('Calculation changed worksheet identity')
  const computed = [], changedParts = []
  for (const [key, cell] of sourceCells) {
    const result = engineCells.get(key)
    if (cell.formula === undefined) {
      if (cell.value !== null && cell.value !== '' && (!result || result.formula !== undefined || !Object.is(cell.value, result.value))) throw new Error(`Calculation changed input value: ${key}`)
      continue
    }
    if (!result || result.formula === undefined || formulaKey(cell.formula) !== formulaKey(result.formula)) throw new Error(`Calculation changed formula: ${key}`)
    if (!result.hasCache) throw new Error(`Calculation produced no result: ${key}`)
    if (result.type === 'e' || typeof result.value === 'number' && !Number.isFinite(result.value)) throw new Error(`Calculation failed at ${key}: ${result.value}`)
    const old = direct(cell.node, 'v', NS.sheet)
    if (old) cell.node.removeChild(old)
    cell.node.removeAttribute('t')
    const value = cell.node.ownerDocument.createElementNS(NS.sheet, 'v')
    if (typeof result.value === 'string') { cell.node.setAttribute('t', 'str'); value.textContent = result.value }
    else if (typeof result.value === 'boolean') { cell.node.setAttribute('t', 'b'); value.textContent = result.value ? '1' : '0' }
    else value.textContent = String(result.value)
    cell.node.insertBefore(value, direct(cell.node, 'extLst', NS.sheet) ?? null)
    computed.push({ cell: key, value: result.value })
  }
  for (const [key, cell] of engineCells) if (cell.type === 'e') throw new Error(`Workbook contains an error at ${key}: ${cell.value}`)
  if (!Array.isArray(checks) || checks.length > 100) throw new Error('Use at most 100 independent result checks')
  for (const check of checks) {
    const key = `${check.sheet}!${check.cell}`, value = engineCells.get(key)?.value
    const tolerance = check.tolerance ?? 0
    if (typeof tolerance !== 'number' || !Number.isFinite(tolerance) || tolerance < 0) throw new Error('Check tolerance must be a finite nonnegative number')
    const match = typeof check.expected === 'number' && typeof value === 'number' ? Math.abs(value - check.expected) <= tolerance : Object.is(value, check.expected)
    if (!match) throw new Error(`Independent check failed: ${key}; expected ${JSON.stringify(check.expected)}, received ${JSON.stringify(value)}`)
  }
  for (const sheet of source.sheets) if (elements(sheet.doc, 'f', NS.sheet).length) { source.parts.set(sheet.part, Buffer.from(serialize(sheet.doc))); changedParts.push(sheet.part) }
  const chartWarnings = [], caches = new Map()
  for (const [part, content] of chartParts(engine.parts)) {
    const doc = xml(content, part)
    for (const type of ['numRef', 'strRef']) for (const ref of elements(doc, type, CHART)) {
      const formula = direct(ref, 'f', CHART), cache = direct(ref, type === 'numRef' ? 'numCache' : 'strCache', CHART)
      if (formula && cache) caches.set(`${type}:${formulaKey(formula.textContent)}`, cache)
    }
  }
  for (const [part, content] of chartParts(source.parts)) {
    const doc = xml(content, part); let changed = false
    for (const type of ['numRef', 'strRef']) for (const ref of elements(doc, type, CHART)) {
      const formula = direct(ref, 'f', CHART), cacheName = type === 'numRef' ? 'numCache' : 'strCache'
      const fresh = formula && caches.get(`${type}:${formulaKey(formula.textContent)}`)
      const category = !fresh && type === 'numRef' && ref.parentNode.localName === 'cat' && formula && caches.get(`strRef:${formulaKey(formula.textContent)}`)
      const old = direct(ref, cacheName, CHART)
      if (old) { ref.removeChild(old); changed = true }
      if (fresh) { ref.appendChild(doc.importNode(fresh, true)); changed = true }
      else if (category) {
        const prefix = ref.prefix ? `${ref.prefix}:` : '', replacement = doc.createElementNS(CHART, `${prefix}strRef`)
        replacement.appendChild(formula.cloneNode(true)); replacement.appendChild(doc.importNode(category, true))
        ref.parentNode.replaceChild(replacement, ref); changed = true
      }
      else chartWarnings.push({ part, formula: formula?.textContent, message: 'Chart cache requires refresh on open or preview; stale cache removed' })
    }
    if (changed) { source.parts.set(part, Buffer.from(serialize(doc))); changedParts.push(part) }
  }
  const bytes = pack(source.parts), inspection = inspectOffice(bytes, { maxItems: 50 })
  if (inspection.formulas.missingCache || inspection.formulas.errors.length) throw new Error('Final workbook calculation gate failed')
  return { bytes, computed: computed.slice(0, 100), computedCount: computed.length, checksPassed: checks.length, independentChecks: checks.length ? 'PASS' : 'NOT_RUN', chartWarnings, changedParts, inspection }
}

export async function recalculate(bytes, checks, config, signal) {
  const prepared = prepareCalculation(bytes)
  const converted = await convertWithLibreOffice({ bytes: prepared, extension: 'xlsx', format: 'xlsx', config, signal })
  return { ...mergeCalculatedValues(bytes, converted.bytes, checks), execution: converted.execution }
}
