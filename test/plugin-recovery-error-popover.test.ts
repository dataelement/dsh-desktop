import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

const html = readFileSync(new URL('../build/plugin-recovery.html', import.meta.url), 'utf8')
const source = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]).find(script => script?.includes('const errorAnchor'))
if (!source) throw new Error('Error popover script is missing')
const script = source
function page() {
  const handlers = new Map<string, (event?: unknown) => void>()
  const attributes = new Map<string, string>()
  const anchor = { setAttribute: (key: string, value: string) => attributes.set(key, value),
    getBoundingClientRect: () => ({ left: 780, bottom: 300 }), focus: vi.fn(),
    addEventListener: (name: string, callback: (event?: unknown) => void) => handlers.set(`anchor:${name}`, callback) }
  const popup = { hidden: true, style: { left: '', top: '' }, getBoundingClientRect: () => ({ width: 440, height: 200 }) }
  const info = { contains: (target: unknown) => target === anchor || target === popup,
    addEventListener: (name: string, callback: (event?: unknown) => void) => handlers.set(`info:${name}`, callback) }
  let timer: (() => void) | undefined
  runInNewContext(script, { model: { advancedLabel: '查看报错详情' },
    document: { getElementById: (id: string) => id === 'error-info-button' ? anchor : id === 'error-details' ? popup : info,
      addEventListener: (name: string, callback: (event?: unknown) => void) => handlers.set(`document:${name}`, callback) },
    window: { innerWidth: 900, innerHeight: 600, addEventListener: vi.fn() },
    setTimeout: (callback: () => void) => { timer = callback; return 1 }, clearTimeout: () => { timer = undefined } })
  return { anchor, popup, attributes, fire: (name: string, event?: unknown) => handlers.get(name)?.(event), tick: () => timer?.() }
}
describe('startup error info popover', () => {
  it('opens on hover, clamps to the viewport, and permits moving into the diagnostic content', () => {
    const p = page()
    p.fire('info:mouseenter')
    expect(p.popup.hidden).toBe(false)
    expect(p.popup.style.left).toBe('444px')
    p.fire('info:mouseleave')
    expect(p.popup.hidden).toBe(false)
    p.fire('info:mouseenter')
    p.tick()
    expect(p.popup.hidden).toBe(false)
    p.fire('info:mouseleave')
    p.tick()
    expect(p.popup.hidden).toBe(true)
  })
  it('supports focus and touch click; Escape closes and restores focus; outside click closes', () => {
    const p = page()
    p.fire('info:focusin')
    expect(p.attributes.get('aria-expanded')).toBe('true')
    p.fire('document:keydown', { key: 'Escape' })
    expect(p.anchor.focus).toHaveBeenCalledOnce()
    expect(p.popup.hidden).toBe(true)
    p.fire('anchor:click')
    p.fire('document:pointerdown', { target: p.popup })
    expect(p.popup.hidden).toBe(false)
    p.fire('document:pointerdown', { target: {} })
    expect(p.popup.hidden).toBe(true)
  })
})
