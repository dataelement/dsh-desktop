import { createRequire } from 'node:module'
import { describe, expect, it, vi } from 'vitest'
import { watchWorkbenchNoticePriority } from '../src/preload/workbench-notice-priority'

type TestDom = { window: Window & typeof globalThis }
const { JSDOM } = createRequire(import.meta.url)('jsdom') as { JSDOM: new (html: string) => TestDom }

describe('workbench notice priority lifecycle', () => {
  it('finds existing notices, tracks marker changes and stops on disposal', async () => {
    const dom = new JSDOM('<aside data-dsh-workbench-notice></aside>')
    try {
      const changed = vi.fn()
      const stop = watchWorkbenchNoticePriority(dom.window.document, changed)
      expect(changed).toHaveBeenLastCalledWith(true)
      const notice = dom.window.document.querySelector('aside')
      notice?.removeAttribute('data-dsh-workbench-notice')
      await Promise.resolve()
      expect(changed).toHaveBeenLastCalledWith(false)
      notice?.setAttribute('data-dsh-workbench-notice', '')
      await Promise.resolve()
      expect(changed).toHaveBeenLastCalledWith(true)
      stop()
      changed.mockClear()
      notice?.remove()
      await Promise.resolve()
      expect(changed).not.toHaveBeenCalled()
    } finally {
      dom.window.close()
    }
  })

  it('detects nested markers but ignores unrelated streaming content', async () => {
    const dom = new JSDOM('<main></main>')
    try {
      const changed = vi.fn()
      const stop = watchWorkbenchNoticePriority(dom.window.document, changed)
      const wrapper = dom.window.document.createElement('div')
      wrapper.innerHTML = '<aside data-dsh-workbench-notice></aside>'
      dom.window.document.body.appendChild(wrapper)
      await Promise.resolve()
      expect(changed.mock.calls).toEqual([[false], [true]])
      dom.window.document.querySelector('main')?.append('streamed token')
      await Promise.resolve()
      expect(changed).toHaveBeenCalledTimes(2)
      wrapper.remove()
      await Promise.resolve()
      expect(changed).toHaveBeenLastCalledWith(false)
      stop()
    } finally {
      dom.window.close()
    }
  })
})
