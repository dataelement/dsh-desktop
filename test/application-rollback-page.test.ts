import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

const html = readFileSync(new URL('../build/application-rollback.html', import.meta.url), 'utf8')
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1]
if (!script) throw new Error('Rollback page script missing')
const scriptText = script
function render(stage: string, action = vi.fn().mockResolvedValue({ ok: true }), locale = 'zh', theme = 'system') {
  const elements = new Map<string, { hidden: boolean; disabled: boolean; textContent: string; listeners: Map<string, () => Promise<void>>; addEventListener: (name: string, fn: () => Promise<void>) => void }>()
  function element(id: string) {
    if (!elements.has(id)) {
      const listeners = new Map<string, () => Promise<void>>()
      elements.set(id, { hidden: true, disabled: false, textContent: '', listeners, addEventListener: (name, fn) => { listeners.set(name, fn) } })
    }
    const found = elements.get(id)
    if (!found) throw new Error('Element missing')
    return found
  }
  const root = { lang: '', dataset: { theme: '' } }
  runInNewContext(scriptText, {
    location: { search: '?state=' + encodeURIComponent(JSON.stringify({ stage, locale, simulation: true, currentVersion: '0.13.0', targetVersion: '<0.12.1>' })) + '&theme=' + encodeURIComponent(theme) },
    URLSearchParams, document: { documentElement: root, getElementById: element }, window: { dshRollback: { action } }
  })
  return { root, element, action, click: (id: string) => element(id).listeners.get('click')?.() }
}
describe('application rollback standalone page', () => {
  it('honors explicit light and dark themes and falls back to system', () => {
    for (const theme of ['light', 'dark', 'system']) expect(render('confirm', undefined, 'zh', theme).root.dataset.theme).toBe(theme)
    expect(render('confirm', undefined, 'zh', 'invalid').root.dataset.theme).toBe('system')
  })
  it('waits for confirmation, displays literal versions, and prevents repeated actions', async () => {
    const page = render('confirm')
    expect(page.action).not.toHaveBeenCalled()
    expect(page.element('target').textContent).toBe('<0.12.1>')
    expect(page.element('simulation').hidden).toBe(false)
    await page.click('primary')
    await page.click('primary')
    expect(page.action).toHaveBeenCalledTimes(1)
    expect(page.action).toHaveBeenCalledWith('confirm')
  })
  it('allows cancellation only before execution', async () => {
    const page = render('confirm')
    await page.click('cancel')
    expect(page.action).toHaveBeenCalledWith('cancel')
    const progress = render('progress')
    expect(progress.element('cancel').hidden).toBe(true)
    expect(progress.element('primary').hidden).toBe(true)
    expect(progress.action).not.toHaveBeenCalled()
  })
  it('labels simulated success clearly and waits for continue', async () => {
    const page = render('success', undefined, 'en')
    expect(page.element('heading').textContent).toContain('Simulated')
    expect(page.element('description').textContent).toContain('has not changed')
    await page.click('primary')
    expect(page.action).toHaveBeenCalledWith('continue')
  })
  it('reenables actions after rejected IPC and keeps invalid states inert', async () => {
    const page = render('confirm', vi.fn().mockResolvedValue({ ok: false }))
    await page.click('primary')
    expect(page.element('error').textContent).toContain('重试')
    expect(page.element('primary').disabled).toBe(false)
    const invalid = render('arbitrary')
    await invalid.click('primary')
    expect(invalid.action).not.toHaveBeenCalled()
  })
})
