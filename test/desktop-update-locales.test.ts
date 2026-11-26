import { describe, expect, it } from 'vitest'
import type { DesktopLocale } from '../src/shared/desktop-locale'
import { updateText } from '../src/shared/desktop-update-messages'
import { preloadProductName } from '../src/preload/product-name'
import { updateHeadline, updateMessage, presentedUpdateMessage } from '../src/preload/update-view'
import { aboutDetail } from '../src/main/version-info'
import { popupReleaseNotes } from '../src/shared/update-release-notes'

const locales: DesktopLocale[] = ['zh', 'en', 'ja', 'es', 'fr', 'de', 'ru', 'pt']
describe('daily update and About translations', () => {
  it('decodes window identity and falls back for missing or malformed arguments', () => {
    expect(preloadProductName(['--dsh-product-name=Product%20%24%26'])).toBe('Product $&')
    expect(preloadProductName([])).toBe('DSH Desktop')
    expect(preloadProductName(['--dsh-product-name=%'])).toBe('DSH Desktop')
  })
  it.each(locales)('renders all update states and About in %s without unresolved placeholders', locale => {
    for (const phase of ['checking', 'available', 'downloading', 'downloaded', 'up-to-date', 'unsupported', 'error'] as const) {
      const status = { phase, currentVersion: '1.0.0', availableVersion: '1.2.0', percent: 42, manual: true }
      for (const text of [updateHeadline(status, locale).title, updateHeadline(status, locale).description, updateMessage(status, locale)]) {
        expect(text).toBeTruthy()
        expect(text).not.toMatch(/\{\w+\}/)
      }
    }
    expect(aboutDetail('1.0.0', '0.2.2', locale)).toContain('0.2.2')
    expect(aboutDetail('1.0.0', undefined, locale)).toContain(updateText(locale, 'unknown'))
    expect(presentedUpdateMessage('Desktop update service is unavailable', locale)).toBe(updateText(locale, 'serviceUnavailable'))
    expect(updateText(locale, 'downgradeConfirm', { version: '1', current: '2' })).not.toMatch(/\{\w+\}/)
  })
  it.each(locales)('uses the supplied product identity while retaining Harness in %s', locale => {
    const name = 'Product $& <Dev>'
    for (const key of ['about', 'updateLabel', 'desktopVersion', 'harnessUpdated', 'downloaded', 'appLatest', 'starting'] as const) {
      const text = updateText(locale, key, { app: name, version: '1' })
      expect(text).toContain(name)
      expect(text).not.toContain('DSH Desktop')
    }
    expect(aboutDetail('1', '2', locale, name)).toContain('Harness')
    expect(aboutDetail('1', '2', locale, name)).toContain(name)
    expect(updateMessage({ phase: 'downloaded', currentVersion: '1', manual: true }, locale, name)).toContain(name)
    expect(updateText(locale, 'about')).toContain('DSH Desktop')
  })

  it('uses the approved English release prose for all non-Chinese UI locales', () => {
    const notes = JSON.stringify({ schema: 'dsh-popup-notes-v1', zh: '中文说明', en: 'English notes' })
    for (const locale of locales) expect(popupReleaseNotes(notes, locale)).toBe(locale === 'zh' ? '中文说明' : 'English notes')
  })
  it('provides distinct translated daily UI copy rather than silently falling back to English', () => {
    for (const locale of locales.filter(locale => locale !== 'en')) {
      expect(updateText(locale, 'checking')).not.toBe(updateText('en', 'checking'))
      expect(updateText(locale, 'about')).not.toBe(updateText('en', 'about'))
    }
  })
})
