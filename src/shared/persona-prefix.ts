import {
  isAlias,
  isMap,
  isScalar,
  isSeq,
  parseDocument,
  type Document,
  type Node,
  type Scalar,
  type YAMLMap
} from 'yaml'

/**
 * Rewrite a legacy persona `config.text` key to the required `config.prefix`.
 *
 * Harness 0.1.5 made `prefix` required. Older preset copies still say `text`
 * and fail when a session mounts them. This edits only that key token. The
 * rest of the file — `!!js` expressions, comments, block scalars — stays as
 * written. A leading UTF-8 BOM is kept. Anchors shared with a non-persona
 * row are left unchanged.
 */
export interface PersonaPrefixRewrite {
  text: string
  changed: boolean
  /**
   * At least one persona row that may still mount has no usable string prompt.
   * Safe renames in the same file are still applied; the caller decides
   * whether that remaining row may be installed.
   */
  missingPrompt: boolean
}

const PERSONA_PACKAGE = '@deepseek-ai/dsh-persona'
const BOM = '\uFEFF'
/** Tag Harness uses for `!!js` scalars. The source is kept, never evaluated. */
const JS_TAG_NAME = 'tag:yaml.org,2002:js'

/** Keep `!!js` rows parseable without evaluating them. */
const JS_TAG = {
  tag: JS_TAG_NAME,
  resolve: (value: string): string => value
}

interface KeyReplacement {
  start: number
  end: number
  next: string
}

interface ConfigUse {
  persona: boolean
  other: boolean
}

function asNode(value: unknown): Node | null {
  if (isAlias(value) || isMap(value) || isSeq(value) || isScalar(value)) return value
  return null
}

function asScalar(value: unknown): Scalar | undefined {
  if (!isScalar(value)) return undefined
  return value
}

function scalarString(value: unknown): string | undefined {
  const scalar = asScalar(value)
  if (scalar === undefined || typeof scalar.value !== 'string') return undefined
  return scalar.value
}

/**
 * Follow aliases until a concrete node. A cycle, or a node already on the
 * walk stack, stops the walk instead of recursing forever.
 */
function resolveNode(value: unknown, doc: Document, stack: Set<Node>): Node | null {
  let current = asNode(value)
  const aliases = new Set<Node>()
  while (current !== null && isAlias(current)) {
    if (aliases.has(current)) return null
    aliases.add(current)
    const next = current.resolve(doc)
    current = asNode(next)
    if (current !== null && stack.has(current)) return null
  }
  return current
}

function jsonLiteralIsTruthy(value: unknown): boolean {
  if (typeof value !== 'string') return false
  try {
    return Boolean(JSON.parse(value))
  } catch {
    return false
  }
}

/**
 * Whether Harness will skip this row without checking its schema.
 * Non-`!!js` values use `Boolean(value)`. A `!!js` scalar counts only when
 * it is a JSON literal; other expressions are not executed here.
 */
function staticallyDisabled(value: unknown, doc: Document, stack: Set<Node>): boolean {
  const resolved = resolveNode(value, doc, stack)
  if (resolved === null) return false
  if (isScalar(resolved)) {
    if (resolved.tag === JS_TAG_NAME) return jsonLiteralIsTruthy(resolved.value)
    return Boolean(resolved.value)
  }
  return true
}

function renameTextKey(body: string, key: Scalar): string | undefined {
  const range = key.range
  if (range === null || range === undefined) return undefined
  const token = body.slice(range[0], range[1])
  if (token === 'text') return 'prefix'
  if (token === '"text"') return '"prefix"'
  if (token === "'text'") return "'prefix'"
  return undefined
}

function rowName(row: YAMLMap, doc: Document, stack: Set<Node>): string | undefined {
  return scalarString(resolveNode(row.get('name', true), doc, stack))
}

function isGroupRow(row: YAMLMap, doc: Document, stack: Set<Node>): boolean {
  return resolveNode(row.get('group', true), doc, stack)?.toJSON() === true
}

function namedPair(config: YAMLMap, keyName: string, doc: Document, stack: Set<Node>): Scalar | undefined {
  for (const pair of config.items) {
    const key = asScalar(resolveNode(pair.key, doc, stack))
    if (key !== undefined && scalarString(key) === keyName) return key
  }
  return undefined
}

function pairValueIsString(config: YAMLMap, keyName: string, doc: Document, stack: Set<Node>): boolean {
  for (const pair of config.items) {
    const key = asScalar(resolveNode(pair.key, doc, stack))
    if (key === undefined || scalarString(key) !== keyName) continue
    return typeof scalarString(resolveNode(pair.value, doc, stack)) === 'string'
  }
  return false
}

/**
 * @param source - one `agent.cordis.yml` as stored.
 * @returns the same text when nothing can be renamed safely.
 */
export function migratePersonaPrefix(source: string): PersonaPrefixRewrite {
  const offset = source.startsWith(BOM) ? 1 : 0
  const body = offset === 0 ? source : source.slice(offset)
  const document = parseDocument(body, { customTags: [JS_TAG] })
  if (document.errors.length > 0) {
    return { text: source, changed: false, missingPrompt: false }
  }

  const replacements: KeyReplacement[] = []
  const placed = new Set<number>()
  const uses = new Map<Node, ConfigUse>()
  let missingPrompt = false
  const stack = new Set<Node>()

  const recordUse = (config: Node, persona: boolean): void => {
    const current = uses.get(config) ?? { persona: false, other: false }
    if (persona) current.persona = true
    else current.other = true
    uses.set(config, current)
  }

  const pushReplacement = (key: Scalar): boolean => {
    const next = renameTextKey(body, key)
    const range = key.range
    if (next === undefined || range === null || range === undefined) return false
    const start = range[0] + offset
    if (placed.has(start)) return true
    placed.add(start)
    replacements.push({ start, end: range[1] + offset, next })
    return true
  }

  const walk = (node: Node | null, ancestorDisabled: boolean, apply: boolean): void => {
    const seq = resolveNode(node, document, stack)
    if (!isSeq(seq) || stack.has(seq)) return
    stack.add(seq)
    for (const item of seq.items) {
      const row = resolveNode(item, document, stack)
      if (!isMap(row) || stack.has(row)) continue
      stack.add(row)
      const persona = rowName(row, document, stack) === PERSONA_PACKAGE
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

  const considerPersona = (config: YAMLMap, disabled: boolean): void => {
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
