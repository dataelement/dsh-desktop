import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

const html = readFileSync(new URL('../build/plugin-recovery.html', import.meta.url), 'utf8')
const start = html.indexOf('      // Keep the human-readable plan')
const end = html.indexOf("      primary.addEventListener('click'", start)
if (start < 0 || end < 0) throw new Error('Recovery plan rendering is missing')
const renderScript = html.slice(start, end)

function renderPlan(available: boolean) {
  const elements = new Map<string, ReturnType<typeof element>>()
  function element() {
    const handlers = new Map<string, () => void>()
    return { hidden: false, disabled: false, textContent: '', children: [] as unknown[],
      appendChild(child: unknown) { this.children.push(child) },
      setAttribute: vi.fn(), addEventListener: (name: string, handler: () => void) => handlers.set(name, handler),
      click: () => handlers.get('click')?.() }
  }
  const get = (id: string) => {
    let node = elements.get(id)
    if (!node) { node = element(); elements.set(id, node) }
    return node
  }
  const action = vi.fn()
  runInNewContext(renderScript, {
    model: { locale: 'zh', canRepair: true, repairDetailsLabel: '查看修复方案',
      repairDetails: ['升级插件 calendar 至 2.0'], rollbackVisible: true,
      rollbackLabel: available ? '回退应用至 0.12.0' : undefined,
      rollbackUnavailableReason: available ? undefined : '当前没有可回退的应用版本。' },
    document: { getElementById: get, createElement: element, querySelectorAll: () => [...elements.values()] },
    setText: (id: string, text: string) => { get(id).textContent = text },
    window: { dshRecovery: { action } }
  })
  return { get, action }
}

describe('recovery plan and rollback controls', () => {
  it('places an accessible error info icon beside the heading and keeps logs in its popover', () => {
    const heading = html.indexOf('<h1 id="heading">')
    const info = html.indexOf('id="error-info-button"', heading)
    const plan = html.indexOf('<details class="repair-plan"')
    expect(info).toBeGreaterThan(heading)
    expect(info).toBeLessThan(plan)
    expect(html).toContain('aria-controls="error-details" aria-expanded="false"')
    expect(html).toContain('id="error-details" role="region"')
    expect(html).not.toContain('<details class="error-details"')
    expect(html).not.toContain('details-drawer')
    expect(html).toContain('id="show-log"')
  })

  it('renders an expandable plan with no action until the user chooses', () => {
    const page = renderPlan(true)
    expect(page.get('repair-plan').hidden).toBe(false)
    expect(page.get('repair-plan-steps').children).toMatchObject([{ textContent: '升级插件 calendar 至 2.0' }])
    expect(html).toContain('<details class="repair-plan" id="repair-plan" hidden>')
    expect(page.action).not.toHaveBeenCalled()
    page.get('secondary').click()
    expect(page.action).toHaveBeenCalledWith('rollback')
  })
  it('shows disabled rollback and its reason without dispatching a downgrade', () => {
    const page = renderPlan(false)
    expect(page.get('secondary').hidden).toBe(false)
    expect(page.get('secondary').disabled).toBe(true)
    expect(page.get('rollback-note').hidden).toBe(false)
    expect(page.get('rollback-note').textContent).toContain('没有可回退')
    page.get('secondary').click()
    expect(page.action).not.toHaveBeenCalled()
  })
})
