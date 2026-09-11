// A bounded data contract shared by the checker, exporter, and model tools.
export const MAX_PROJECT_BYTES = 2 * 1024 * 1024
const XML_TEXT = /^[\u0009\u000a\u000d\u0020-\ud7ff\ue000-\ufffd\u{10000}-\u{10ffff}]*$/u

export function checkProject(project) {
  const issues = []
  const error = (path, message) => issues.push({ severity: 'error', path, message })
  const object = (value, path, keys) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) { error(path, 'Expected an object'); return false }
    for (const key of Object.keys(value)) if (!keys.includes(key)) error(`${path}.${key}`, 'Unsupported field; use the documented structure')
    return true
  }
  const text = (value, path, max = 32000) => {
    if (typeof value !== 'string' || value.length > max || !XML_TEXT.test(value)) error(path, `Expected XML-safe text of at most ${max} characters`)
  }
  const integer = (value, path, min, max) => {
    if (!Number.isInteger(value) || value < min || value > max) error(path, `Expected an integer from ${min} to ${max}`)
  }
  const array = (value, path, max, min = 1) => {
    if (!Array.isArray(value) || value.length < min || value.length > max) { error(path, `Expected ${min}–${max} items`); return false }
    return true
  }
  if (!object(project, '$', ['version', 'kind', 'title', 'blocks', 'sheets'])) return report(issues)
  if (project.version !== 1) error('$.version', 'Use version 1')
  text(project.title, '$.title', 200)
  if (project.kind === 'word') {
    if (project.sheets !== undefined) error('$.sheets', 'Word content belongs in blocks')
    if (array(project.blocks, '$.blocks', 1000)) project.blocks.forEach((block, i) => {
      const p = `$.blocks[${i}]`
      if (!object(block, p, ['type', 'text', 'level', 'items', 'rows', 'header'])) return
      const fields = { paragraph: ['text'], heading: ['text', 'level'], list: ['items'], table: ['rows', 'header'], pageBreak: [] }[block.type]
      if (!fields) { error(`${p}.type`, 'Use paragraph, heading, list, table, or pageBreak'); return }
      for (const key of Object.keys(block)) if (key !== 'type' && !fields.includes(key)) error(`${p}.${key}`, `Field does not belong to ${block.type}`)
      if (block.type === 'paragraph' || block.type === 'heading') text(block.text, `${p}.text`)
      if (block.type === 'heading') integer(block.level, `${p}.level`, 1, 3)
      if (block.type === 'list' && array(block.items, `${p}.items`, 300)) block.items.forEach((item, j) => text(item, `${p}.items[${j}]`))
      if (block.type === 'table' && array(block.rows, `${p}.rows`, 500)) {
        let width
        block.rows.forEach((row, j) => {
          if (!array(row, `${p}.rows[${j}]`, 12)) return
          width ??= row.length
          if (width !== row.length) error(`${p}.rows[${j}]`, 'Every table row must have the same number of cells')
          row.forEach((cell, k) => text(cell, `${p}.rows[${j}][${k}]`))
        })
        if (block.header !== undefined && typeof block.header !== 'boolean') error(`${p}.header`, 'Expected a boolean')
      }
    })
  } else if (project.kind === 'excel') {
    if (project.blocks !== undefined) error('$.blocks', 'Excel content belongs in sheets')
    const names = new Set()
    let count = 0
    if (array(project.sheets, '$.sheets', 32)) project.sheets.forEach((sheet, i) => {
      const p = `$.sheets[${i}]`
      if (!object(sheet, p, ['name', 'rows', 'columnWidths', 'freezeRows', 'filter'])) return
      text(sheet.name, `${p}.name`, 31)
      if (typeof sheet.name === 'string') {
        if (!sheet.name.trim() || /[\[\]:*?/\\]/u.test(sheet.name) || /^'|'$/u.test(sheet.name)) error(`${p}.name`, 'Use a valid Excel sheet name')
        if (names.has(sheet.name.toLowerCase())) error(`${p}.name`, 'Sheet names must be unique, ignoring case')
        names.add(sheet.name.toLowerCase())
      }
      if (sheet.freezeRows !== undefined) integer(sheet.freezeRows, `${p}.freezeRows`, 0, 1000)
      if (sheet.filter !== undefined && typeof sheet.filter !== 'boolean') error(`${p}.filter`, 'Expected a boolean')
      if (sheet.columnWidths !== undefined && array(sheet.columnWidths, `${p}.columnWidths`, 256)) sheet.columnWidths.forEach((width, j) => integer(width, `${p}.columnWidths[${j}]`, 4, 100))
      if (array(sheet.rows, `${p}.rows`, 10000)) sheet.rows.forEach((row, j) => {
        if (!array(row, `${p}.rows[${j}]`, 256, 0)) return
        count += row.length
        row.forEach((cell, k) => {
          const cp = `${p}.rows[${j}][${k}]`
          if (cell === null || typeof cell === 'boolean') return
          if (typeof cell === 'string') { text(cell, cp); return }
          if (typeof cell === 'number') { if (!Number.isFinite(cell)) error(cp, 'Use a finite number'); return }
          if (!object(cell, cp, ['formula', 'format'])) return
          text(cell.formula, `${cp}.formula`, 8192)
          if (typeof cell.formula === 'string') {
            if (!cell.formula.startsWith('=') || cell.formula.length === 1) error(`${cp}.formula`, 'A formula starts with = and contains an expression')
            if (/#(?:REF!|DIV\/0!|VALUE!|NAME\?|NUM!|N\/A|SPILL!)/iu.test(cell.formula)) error(`${cp}.formula`, 'Repair the formula error reference')
            if (/[\[\]|]/u.test(cell.formula) || /\b(?:WEBSERVICE|RTD|HYPERLINK|IMAGE)\s*\(/iu.test(cell.formula)) error(`${cp}.formula`, 'Use workbook-local formulas')
          }
          if (cell.format !== undefined && !['number', 'percent', 'currency'].includes(cell.format)) error(`${cp}.format`, 'Use number, percent, or currency')
        })
      })
    })
    if (count > 50000) error('$.sheets', 'Use at most 50000 cells per project')
  } else error('$.kind', 'Use word or excel')
  return report(issues)
}

function report(issues) { return { status: issues.length ? 'needs_revision' : 'valid', issues } }

export function parseProject(content) {
  if (typeof content !== 'string' || Buffer.byteLength(content) > MAX_PROJECT_BYTES) throw new Error('Office project must be JSON text up to 2 MiB')
  return JSON.parse(content)
}
