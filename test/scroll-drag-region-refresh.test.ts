import { describe, expect, it } from 'vitest'
import { installScrollDragRegionRefresh } from '../src/preload/scroll-drag-region-refresh'

class FakeElement {
  readonly attributes = new Map<string, string>()
  readonly children: FakeElement[] = []
  isConnected = true

  constructor(readonly id: string) {}

  hasAttribute(name: string): boolean {
    return this.attributes.has(name)
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value)
  }

  removeAttribute(name: string): void {
    this.attributes.delete(name)
  }

  querySelectorAll(selector: string): FakeElement[] {
    if (selector !== '[data-window-drag]') return []
    const found: FakeElement[] = []
    const walk = (element: FakeElement): void => {
      if (element.hasAttribute('data-window-drag')) found.push(element)
      for (const child of element.children) walk(child)
    }
    for (const child of this.children) walk(child)
    return found
  }

  append(child: FakeElement): void {
    this.children.push(child)
  }
}

function frameQueue(): { schedule: (callback: () => void) => number; cancel: (handle: number) => void; flush: () => void } {
  let next = 1
  const queue: Array<{ id: number; callback: () => void }> = []
  return {
    schedule: (callback) => {
      const id = next
      next += 1
      queue.push({ id, callback })
      return id
    },
    cancel: (handle) => {
      const index = queue.findIndex(frame => frame.id === handle)
      if (index >= 0) queue.splice(index, 1)
    },
    flush: () => {
      queue.shift()?.callback()
    }
  }
}

function scrollableDocument(): { document: { addEventListener: (type: 'scroll', listener: (event: Event) => void, capture: true) => void; removeEventListener: (type: 'scroll', listener: (event: Event) => void, capture: true) => void }; emit: (target: FakeElement) => void } {
  let listener: ((event: Event) => void) | undefined
  return {
    document: {
      addEventListener: (_type, next) => {
        listener = next
      },
      removeEventListener: () => {
        listener = undefined
      }
    },
    emit: (target) => {
      listener?.({ target } as unknown as Event)
    }
  }
}

describe('installScrollDragRegionRefresh', () => {
  it('toggles the drag row recall attribute after a scroller containing it settles', () => {
    const frames = frameQueue()
    const page = scrollableDocument()
    const scroller = new FakeElement('scroller')
    const header = new FakeElement('header')
    header.setAttribute('data-window-drag', '')
    scroller.append(header)
    installScrollDragRegionRefresh(page.document, frames.schedule, frames.cancel)

    page.emit(scroller)
    expect(header.hasAttribute('data-window-drag-recall')).toBe(false)
    frames.flush()
    frames.flush()
    expect(header.hasAttribute('data-window-drag-recall')).toBe(true)
    frames.flush()
    expect(header.hasAttribute('data-window-drag-recall')).toBe(false)
    expect(header.hasAttribute('data-window-drag')).toBe(true)
  })

  it('ignores a scroller that does not contain a drag row', () => {
    const frames = frameQueue()
    const page = scrollableDocument()
    const scroller = new FakeElement('scroller')
    installScrollDragRegionRefresh(page.document, frames.schedule, frames.cancel)

    page.emit(scroller)
    frames.flush()
    frames.flush()
    expect(scroller.hasAttribute('data-window-drag-recall')).toBe(false)
  })

  it('coalesces scroll events into one recall', () => {
    const frames = frameQueue()
    const page = scrollableDocument()
    const scroller = new FakeElement('scroller')
    const header = new FakeElement('header')
    header.setAttribute('data-window-drag', '')
    scroller.append(header)
    installScrollDragRegionRefresh(page.document, frames.schedule, frames.cancel)

    page.emit(scroller)
    page.emit(scroller)
    frames.flush()
    frames.flush()
    expect(header.hasAttribute('data-window-drag-recall')).toBe(true)
    frames.flush()
    expect(header.hasAttribute('data-window-drag-recall')).toBe(false)
    frames.flush()
    expect(header.hasAttribute('data-window-drag-recall')).toBe(false)
  })
})
