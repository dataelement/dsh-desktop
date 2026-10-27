import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { parse, stringify } from 'yaml'

export function injectPopupNotes(metadata, approved, expected, date) {
  for (const key of ['RELEASE_TAG', 'GITHUB_SHA', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT']) {
    if (!expected[key] || approved[key] !== expected[key]) throw new Error(`Approval mismatch: ${key}`)
  }
  if (!approved.message_id || !approved.reviewer || !approved.root_id) throw new Error('Missing approval evidence')
  if (metadata.version !== expected.RELEASE_TAG.replace(/^v/, '')) throw new Error('Update version mismatch')
  const notes = approved.notes
  if (!notes || Object.keys(notes).sort().join(',') !== 'en,zh') throw new Error('Missing bilingual notes')
  for (const language of ['zh', 'en']) {
    if (typeof notes[language] !== 'string' || !notes[language].trim() || notes[language].length > 6000) throw new Error('Invalid notes')
  }
  // Match Python's canonical compact JSON and ASCII escaping.
  const canonical = JSON.stringify({ en: notes.en, zh: notes.zh })
    .replace(/[^\x00-\x7f]/g, char => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`)
  const digest = createHash('sha256').update(canonical).digest('hex')
  if (digest !== approved.sha256) throw new Error('Approved notes digest mismatch')
  const localized = { schema: 'dsh-popup-notes-v1',
    zh: `${metadata.version} 版本发布 🚀（${date}）\n\n${notes.zh}`,
    en: `${metadata.version} Release 🚀 (${date})\n\n${notes.en}` }
  return { ...metadata, releaseNotes: `${localized.zh}\n\n---\n\n${localized.en}`, dshPopupNotes: localized }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const approved = JSON.parse(await readFile('.github/release-artifacts/approved-popup.json', 'utf8'))
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  // Validate both documents before modifying either. Archive and latest receive identical metadata.
  const paths = ['release-assets/latest.yml', 'release-assets/latest-mac.yml']
  const results = await Promise.all(paths.map(async path => stringify(injectPopupNotes(parse(await readFile(path, 'utf8')), approved, process.env, date))))
  for (const [index, path] of paths.entries()) await writeFile(path, results[index])
}
