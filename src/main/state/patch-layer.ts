import { isMap, isSeq, parse, parseDocument } from 'yaml'

/**
 * The profile's user patch layer, and what uninstalling a plugin has to do to
 * it.
 *
 * Removing a plugin takes its dependency, its bundle row and its files. What
 * it has never taken is the rows the user layer aims at that plugin — an
 * id-targeted config override, or an `insert` naming the package. Those rows
 * survive the uninstall and go on pointing at something that no longer
 * composes. Nothing rejects them: a row aimed at a missing id is inert, and a
 * config value routing a service at a backend the plugin used to provide just
 * leaves that service waiting, so the profile reads as a slow start rather
 * than a broken one.
 *
 * The layer is user-authored, comments included, so it is edited as a document
 * rather than reparsed and rewritten — and only the rows that name the plugin
 * are touched. Wiping the layer would take the user's own overrides with it.
 */

/** Loader entry ids a bundle declares in its own patch — what its rows target. */
export function bundleEntryIds(patchText: string): string[] {
  let value: unknown
  try {
    value = parse(patchText)
  } catch {
    return []
  }
  if (!Array.isArray(value)) return []

  const ids: string[] = []
  for (const row of value) {
    const insert = (row as { insert?: unknown } | null)?.insert
    if (!Array.isArray(insert)) continue
    for (const entry of insert) {
      const id = (entry as { id?: unknown } | null)?.id
      if (typeof id === 'string') ids.push(id)
    }
  }
  return ids
}

export interface PatchLayerPrune {
  text: string
  removed: string[]
}

function belongsToPlugin(name: unknown, plugin: string): boolean {
  return typeof name === 'string' && (name === plugin || name.startsWith(`${plugin}/`))
}

/**
 * Drop the rows a patch layer aims at one plugin.
 * @param text - the layer as written, comments included.
 * @param plugin - the package being removed.
 * @param entryIds - loader entry ids that package declared.
 * @returns the rewritten layer, and a description of each row dropped. The
 * text is returned untouched when nothing matched, so an unrelated uninstall
 * never rewrites the file.
 */
export function prunePatchLayer(text: string, plugin: string, entryIds: readonly string[]): PatchLayerPrune {
  let document
  try {
    document = parseDocument(text)
  } catch {
    return { text, removed: [] }
  }
  const contents = document.contents
  if (!isSeq(contents)) return { text, removed: [] }

  const removed: string[] = []
  const kept = []
  // A comment above the first row is the file's header, which the profile
  // ships with and the user reads. A comment above any later row is about that
  // row, so it leaves with it.
  let header: unknown

  for (const [index, row] of contents.items.entries()) {
    if (!isMap(row)) {
      kept.push(row)
      continue
    }

    const id = row.get('id')
    if (typeof id === 'string' && entryIds.includes(id)) {
      removed.push(`id: ${id}`)
      if (index === 0) header = row.commentBefore
      continue
    }

    const insert = row.get('insert')
    if (isSeq(insert)) {
      const survivors = insert.items.filter((entry) => {
        const name = isMap(entry) ? entry.get('name') : undefined
        if (!belongsToPlugin(name, plugin)) return true
        removed.push(`insert: ${String(name)}`)
        return false
      })
      // A row whose whole insert list belonged to the plugin has nothing left
      // to say; one that still inserts something keeps the rest.
      if (survivors.length === 0 && insert.items.length > 0) {
        if (index === 0) header = row.commentBefore
        continue
      }
      insert.items = survivors
    }

    kept.push(row)
  }

  if (removed.length === 0) return { text, removed }
  if (typeof header === 'string') {
    const first = kept[0]
    if (isMap(first)) first.commentBefore = [header, first.commentBefore].filter(Boolean).join('\n')
    else document.commentBefore = header
  }
  contents.items = kept
  return { text: String(document), removed }
}
