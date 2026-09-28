import { isAlias, isMap, isScalar, isSeq, parseDocument } from 'yaml'

/**
 * Rewrite a legacy persona `config.text` key to the required `config.prefix`.
 *
 * Same rules as `src/shared/persona-prefix.ts`. This copy lives in the
 * Harness runtime plugin so the Electron main process does not import it.
 * Keep the two implementations on the same cases.
 *
 * @param {string} source
 * @returns {{ text: string, changed: boolean, missingPrompt: boolean }}
 */
export function migratePersonaPrefix(source) {
  const offset = source.startsWith('\uFEFF') ? 1 : 0
  const body = offset === 0 ? source : source.slice(offset)
  const document = parseDocument(body, {
    customTags: [{
      tag: 'tag:yaml.org,2002:js',
      resolve: (value) => value
    }]
  })
  if (document.errors.length > 0) {
    return { text: source, changed: false, missingPrompt: false }
  }

  const replacements = []
  const placed = new Set()
  const uses = new Map()
  let missingPrompt = false
  const stack = new Set()

  const walk = (node, ancestorDisabled, apply) => {
    const seq = resolveNode(node, document, stack)
    if (!isSeq(seq) || stack.has(seq)) return
    stack.add(seq)
    for (const item of seq.items) {
      const row = resolveNode(item, document, stack)
      if (!isMap(row) || stack.has(row)) continue
      stack.add(row)
      const persona = rowName(row, document, stack) === '@deepseek-ai/dsh-persona'
      const ownDisabled = staticallyDisabled(row.get('disabled', true), document, stack)
      const rowDisabled = ancestorDisabled || ownDisabled
      const config = resolveNode(row.get('config', true), document, stack)
      if (isMap(config)) {
        if (!apply) recordUse(config, persona)
        else if (persona) considerPersona(config, rowDisabled)
      } else if (apply && persona && !rowDisabled) {
        missingPrompt = true
      }
      if (isSeq(config)) {
        const nestedDisabled = isGroupRow(row, document, stack)
          ? ancestorDisabled || ownDisabled
          : ancestorDisabled
        walk(config, nestedDisabled, apply)
      }
      stack.delete(row)
    }
    stack.delete(seq)
  }

  const considerPersona = (config, disabled) => {
    const use = uses.get(config)
    const exclusive = use !== undefined && use.persona && !use.other
    const prefixKey = namedPair(config, 'prefix', document, stack)
    const textKey = namedPair(config, 'text', document, stack)
    const prefixIsString = prefixKey !== undefined && pairValueIsString(config, 'prefix', document, stack)
    const textIsString = textKey !== undefined && pairValueIsString(config, 'text', document, stack)
    if (!exclusive) {
      if (!disabled && !prefixIsString) missingPrompt = true
      return
    }
    if (prefixKey !== undefined && !prefixIsString) {
      if (!disabled) missingPrompt = true
      return
    }
    if (!prefixIsString && !textIsString) {
      if (!disabled) missingPrompt = true
      return
    }
    if (!prefixIsString && textIsString && textKey !== undefined && !pushReplacement(textKey)) {
      if (!disabled) missingPrompt = true
    }
  }

  function recordUse(config, persona) {
    const current = uses.get(config) ?? { persona: false, other: false }
    if (persona) current.persona = true
    else current.other = true
    uses.set(config, current)
  }

  function pushReplacement(key) {
    const next = renameTextKey(body, key)
    const range = key.range
    if (next === undefined || range === null || range === undefined) return false
    const start = range[0] + offset
    if (placed.has(start)) return true
    placed.add(start)
    replacements.push({ start, end: range[1] + offset, next })
    return true
  }

  walk(document.contents, false, false)
  walk(document.contents, false, true)
  if (replacements.length === 0) {
    return { text: source, changed: false, missingPrompt }
  }

  const ordered = [...replacements].sort((left, right) => right.start - left.start)
  let text = source
  for (const replacement of ordered) {
    text = text.slice(0, replacement.start) + replacement.next + text.slice(replacement.end)
  }
  return { text, changed: text !== source, missingPrompt }
}

function asNode(value) {
  if (isAlias(value) || isMap(value) || isSeq(value) || isScalar(value)) return value
  return null
}

function resolveNode(value, doc, stack) {
  let current = asNode(value)
  const aliases = new Set()
  while (current !== null && isAlias(current)) {
    if (aliases.has(current)) return null
    aliases.add(current)
    current = asNode(current.resolve(doc))
    if (current !== null && stack.has(current)) return null
  }
  return current
}

function jsonLiteralIsTruthy(value) {
  if (typeof value !== 'string') return false
  try {
    return Boolean(JSON.parse(value))
  } catch {
    return false
  }
}

function staticallyDisabled(value, doc, stack) {
  const resolved = resolveNode(value, doc, stack)
  if (resolved === null) return false
  if (isScalar(resolved)) {
    if (resolved.tag === 'tag:yaml.org,2002:js') return jsonLiteralIsTruthy(resolved.value)
    return Boolean(resolved.value)
  }
  return true
}

function scalarString(value) {
  if (!isScalar(value) || typeof value.value !== 'string') return undefined
  return value.value
}

function rowName(row, doc, stack) {
  return scalarString(resolveNode(row.get('name', true), doc, stack))
}

function isGroupRow(row, doc, stack) {
  const group = resolveNode(row.get('group', true), doc, stack)
  return group !== null && group.toJSON() === true
}

function namedPair(config, keyName, doc, stack) {
  for (const pair of config.items) {
    const key = resolveNode(pair.key, doc, stack)
    if (isScalar(key) && scalarString(key) === keyName) return key
  }
  return undefined
}

function pairValueIsString(config, keyName, doc, stack) {
  for (const pair of config.items) {
    const key = resolveNode(pair.key, doc, stack)
    if (!isScalar(key) || scalarString(key) !== keyName) continue
    return typeof scalarString(resolveNode(pair.value, doc, stack)) === 'string'
  }
  return false
}

function renameTextKey(body, key) {
  const range = key.range
  if (range === null || range === undefined) return undefined
  const token = body.slice(range[0], range[1])
  if (token === 'text') return 'prefix'
  if (token === '"text"') return '"prefix"'
  if (token === "'text'") return "'prefix'"
  return undefined
}
