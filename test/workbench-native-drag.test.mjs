import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { describe, expect, it } from 'vitest'
const source = readFileSync(new URL('../packages/dsh-desktop-workbenches/client.js', import.meta.url), 'utf8')
const helper = source.slice(source.indexOf('    function mountNativeDragRegions('), source.indexOf('    function Frame(', source.indexOf('    function mountNativeDragRegions(')))
function harness(platform = 'darwin') {
  const listeners = new Map(), observers = [], queue = new Map()
  const rect = (left, top, right, bottom) => ({ left, top, right, bottom })
  const bounds = rect(100, 0, 700, 400)
  const frame = { parentElement: null, collapsed: false, row: false, targets: [], scrollables: [], children: [], getBoundingClientRect: () => bounds, querySelector: () => frame.row ? {} : null, closest: () => frame.collapsed ? {} : null, querySelectorAll: selector => selector === '*' ? [...frame.targets, ...frame.scrollables] : frame.targets, appendChild: e => frame.children.push(e) }
  const document = { documentElement: { dataset: { platform } }, createElement: () => ({ style: {}, children: [], setAttribute() {}, contains: e => e === frame.children[0] || frame.children[0]?.children.includes(e), replaceChildren(...children) { this.children = children }, remove() { frame.children = [] } }), addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name) }
  class Observer { constructor(callback) { this.callback = callback; observers.push(this) } observe() {} unobserve() {} disconnect() { this.disconnected = true } }
  const context = { document, window: { innerWidth: 800, innerHeight: 500, addEventListener: document.addEventListener, removeEventListener: document.removeEventListener }, ResizeObserver: Observer, MutationObserver: Observer, getComputedStyle: e => ({ display: frame.row ? 'block' : 'none', overflowX: e.overflowX || 'visible', overflowY: e.overflowY || 'visible', direction: e.direction || 'ltr', getPropertyValue: () => '' }), requestAnimationFrame: fn => { queue.set(1, fn); return 1 }, cancelAnimationFrame: id => queue.delete(id) }
  frame.addEventListener = document.addEventListener; frame.removeEventListener = document.removeEventListener
  const mount = vm.runInNewContext(helper + '\nmountNativeDragRegions', context)
  const flush = () => { const callbacks = [...queue.values()]; queue.clear(); callbacks.forEach(fn => fn()) }
  const hits = (x,y) => frame.children[0]?.children.some(e => x >= bounds.left + parseFloat(e.style.left) && x < bounds.left + parseFloat(e.style.left) + parseFloat(e.style.width) && y >= parseFloat(e.style.top) && y < parseFloat(e.style.top) + parseFloat(e.style.height)) || false
  return { frame, document, observers, listeners, queue, flush, hits, mount, bounds, control: r => ({ parentElement: frame, getBoundingClientRect: () => r, getClientRects: () => [r] }), rect }
}
describe('native caption geometry without layout reservation', () => {
  it('preserves frame geometry and excludes real control rectangles across both panels', () => {
    const h = harness(); h.frame.targets.push(h.control(h.rect(180, 8, 340, 40)), h.control(h.rect(600, 0, 660, 60)))
    const before = { ...h.bounds }; h.mount(h.frame)
    expect(h.bounds).toEqual(before)
    expect(h.hits(120,20)).toBe(true); expect(h.hits(220,20)).toBe(false); expect(h.hits(620,20)).toBe(false); expect(h.hits(680,20)).toBe(true); expect(h.hits(400,80)).toBe(false)
  })
  it('recomputes changed controls on scroll and resize, and cleans up observers/listeners', () => {
    const h = harness(); const cleanup = h.mount(h.frame)
    h.frame.targets.push(h.control(h.rect(400,0,500,48))); h.listeners.get('scroll')(); h.flush(); expect(h.hits(450,20)).toBe(false)
    h.frame.targets = []; h.listeners.get('resize')(); h.flush(); expect(h.hits(450,20)).toBe(true)
    cleanup(); expect(h.frame.children).toEqual([]); expect(h.listeners.size).toBe(0); expect(h.observers.every(o => o.disconnected)).toBe(true); expect(h.queue.size).toBe(0)
  })
  it('clears fullscreen segments and retains collapsed default safety row', () => {
    const h = harness(); h.mount(h.frame); h.document.documentElement.dataset.fullscreen = 'true'; h.observers.at(-1).callback(); h.flush(); expect(h.hits(400,20)).toBe(false)
    delete h.document.documentElement.dataset.fullscreen; h.frame.row = true; h.frame.collapsed = true; h.observers.at(-1).callback(); h.flush(); expect(h.hits(400,20)).toBe(false)
    h.frame.row = false; h.observers.at(-1).callback(); h.flush(); expect(h.hits(120,20)).toBe(false); expect(h.hits(400,20)).toBe(true)
  })
  it.each(['ltr', 'rtl'])('excludes native scroll gutters while retaining container blanks (%s)', direction => {
    const h = harness()
    h.frame.scrollables.push({ parentElement: h.frame, direction, overflowY: 'auto', offsetWidth: 200, clientWidth: 184, offsetHeight: 100, clientHeight: 100, getBoundingClientRect: () => h.rect(300, 0, 500, 100) })
    h.mount(h.frame)
    expect(h.hits(direction === 'rtl' ? 305 : 495, 20)).toBe(false)
    expect(h.hits(400, 20)).toBe(true)
  })
  it('does not mount macOS drag regions on Windows', () => { const h = harness('win32'); h.mount(h.frame)(); expect(h.frame.children).toEqual([]); expect(h.observers).toEqual([]) })
})
