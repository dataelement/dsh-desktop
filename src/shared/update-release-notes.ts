/** Select the approved popup translation without interpreting remote text as HTML. */
export function popupReleaseNotes(value: string | undefined, locale: 'zh' | 'en'): string | undefined {
  if (!value) return undefined
  try {
    const parsed: unknown = JSON.parse(value)
    if (parsed && typeof parsed === 'object' && 'schema' in parsed && parsed.schema === 'dsh-popup-notes-v1') {
      if (!('zh' in parsed) || !('en' in parsed) || typeof parsed.zh !== 'string' || typeof parsed.en !== 'string') return undefined
      const selected = locale === 'zh' ? parsed.zh : parsed.en
      return selected.trim().slice(0, 7000) || undefined
    }
  } catch {
    // Older update feeds contain plain text, not the bilingual envelope.
  }
  return value
}

/** Preserve both languages across IPC so rendering follows the current UI locale. */
export function encodePopupNotesMetadata(metadata: unknown): string | undefined {
  if (!metadata || typeof metadata !== 'object' || !('dshPopupNotes' in metadata)) return undefined
  const notes = metadata.dshPopupNotes
  if (!notes || typeof notes !== 'object' || !('schema' in notes) || notes.schema !== 'dsh-popup-notes-v1') return undefined
  if (!('zh' in notes) || !('en' in notes) || typeof notes.zh !== 'string' || typeof notes.en !== 'string') return undefined
  if (!notes.zh.trim() || !notes.en.trim() || notes.zh.length > 7000 || notes.en.length > 7000) return undefined
  return JSON.stringify({ schema: notes.schema, zh: notes.zh, en: notes.en })
}
