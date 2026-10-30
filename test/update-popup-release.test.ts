import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { encodePopupNotesMetadata, popupReleaseNotes } from '../src/shared/update-release-notes'

const root = process.cwd()

describe('localized update popup', () => {
  it('selects both languages, rejects malformed metadata and preserves legacy notes', () => {
    const value = encodePopupNotesMetadata({ dshPopupNotes: { schema: 'dsh-popup-notes-v1', zh: '修复保存', en: 'Fix saving' } })
    expect(popupReleaseNotes(value, 'zh')).toBe('修复保存')
    expect(popupReleaseNotes(value, 'en')).toBe('Fix saving')
    expect(popupReleaseNotes('Old plain text', 'en')).toBe('Old plain text')
    expect(encodePopupNotesMetadata({ dshPopupNotes: { schema: 'dsh-popup-notes-v1', zh: 'only Chinese' } })).toBeUndefined()
    expect(encodePopupNotesMetadata({ dshPopupNotes: { schema: 'dsh-popup-notes-v1', zh: 'a'.repeat(7001), en: 'English' } })).toBeUndefined()
  })
})

describe('release approval gate', () => {
  it('prioritizes evidenced Harness changes in the confirmation draft', () => {
    const output = execFileSync('python3', ['-c', `
import sys
from types import SimpleNamespace
from unittest.mock import patch
sys.path.insert(0, '.github/scripts')
import update_popup_notes
with patch.object(update_popup_notes, 'collect_release_evidence', return_value=SimpleNamespace(
    release_range='v1.0..v1.1', commit_details='upgrade Harness',
    diff_summary='package.json', code_diff='- rc.2\\n+ rc.3')):
    print(update_popup_notes.prompt('v1.1'))
`], { cwd: root, encoding: 'utf8' })
    expect(output).toContain('必须在靠前位置单独列出')
    expect(output).toContain('中英文均保留 Harness 名称及相同版本')
    expect(output).toContain('没有证据时不添加此项')
    expect(output).toContain('<diff>- rc.2\n+ rc.3</diff>')
  })
  it('checks card states, Chinese-only edits, translation, duplicate actions and fail-closed errors', () => {
    expect(() => execFileSync('python3', ['test/popup-release-gate.py'], { cwd: root, timeout: 10_000, stdio: 'pipe' })).not.toThrow()
  })
  it('writes approved notes only to matching versions and preserves installer hashes', () => {
    // Exercise the actual publishing script under Node (JS scripts are outside tsc's scope).
    const result = execFileSync('node', ['--input-type=module', '-e', `
import assert from 'node:assert/strict'
import { injectPopupNotes } from './scripts/inject-popup-notes.mjs'
import { createRequire } from 'node:module'
import { stringify } from 'yaml'
const require = createRequire(import.meta.url)
const { parseUpdateInfo } = require('electron-updater/out/providers/Provider.js')
const expected = { RELEASE_TAG: 'v1.2.3', GITHUB_SHA: 'abc', GITHUB_RUN_ID: '42', GITHUB_RUN_ATTEMPT: '1' }
const notes = { zh: '- 修复保存 🚀', en: '- Fix A' }
const approval = { ...expected, notes, reviewer: 'user', message_id: 'message', root_id: 'root', sha256: '${execFileSync('python3', ['-c', "import hashlib,json; print(hashlib.sha256(json.dumps({'en':'- Fix A','zh':'- 修复保存 🚀'},sort_keys=True,separators=(',',':')).encode()).hexdigest())"], { encoding: 'utf8' }).trim()}' }
const input = { version: '1.2.3', files: [{ url: 'app.zip', sha512: 'unchanged' }] }
const output = injectPopupNotes(input, approval, expected, '2026-10-26')
assert.deepEqual(output.files, input.files)
assert.deepEqual(parseUpdateInfo(stringify(output), 'latest.yml', new URL('https://example.invalid/latest.yml')).dshPopupNotes, output.dshPopupNotes)
assert.equal(output.dshPopupNotes.en, '1.2.3 Release 🚀 (2026-10-26)\\n\\n- Fix A')
assert.ok(output.releaseNotes.includes('版本发布'))
assert.throws(() => injectPopupNotes(input, approval, { ...expected, GITHUB_RUN_ATTEMPT: '2' }, '2026-10-26'))
assert.throws(() => injectPopupNotes({ ...input, version: '1.2.4' }, approval, expected, '2026-10-26'))
assert.throws(() => injectPopupNotes(input, { ...approval, notes: { ...notes, en: '- changed' } }, expected, '2026-10-26'))
console.log('ok')
`], { cwd: root, encoding: 'utf8' })
    expect(result.trim()).toBe('ok')
  })

  it('places confirmation and metadata injection before public release and mirroring', () => {
    const workflow = readFileSync('.github/workflows/release.yml', 'utf8')
    const gate = workflow.indexOf('- name: Wait for Feishu release confirmation')
    const inject = workflow.indexOf('- name: Inject approved popup notes')
    const publish = workflow.indexOf('- name: Create or update release')
    const mirror = workflow.indexOf('- name: Mirror release assets to ModelScope', publish)
    expect(gate).toBeGreaterThan(0)
    expect(inject).toBeGreaterThan(gate)
    expect(publish).toBeGreaterThan(inject)
    expect(mirror).toBeGreaterThan(publish)
  })
})
