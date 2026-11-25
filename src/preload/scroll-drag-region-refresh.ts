const RECALL_ATTRIBUTE = 'data-window-drag-recall'

type FrameHandle = number

interface FrameTarget {
  hasAttribute(name: string): boolean
  setAttribute(name: string, value: string): void
  removeAttribute(name: string): void
  querySelectorAll(selector: string): Iterable<FrameTarget>
  isConnected?: boolean
}

interface RefreshDocument {
  addEventListener(type: 'scroll', listener: (event: Event) => void, capture: true): void
  removeEventListener(type: 'scroll', listener: (event: Event) => void, capture: true): void
}

/**
 * Chromium keeps a sticky `-webkit-app-region` box in scroll coordinates.
 * After the row sticks, its viewport box no longer changes, so the harness
 * recall (ResizeObserver plus a bounding-rect compare) does not run, and the
 * native region scrolls away from the painted header. A window resize rebuilds
 * every region. Toggling the official recall attribute on the drag row itself
 * does the same rebuild once scrolling settles.
 */
export function installScrollDragRegionRefresh(
  document: RefreshDocument,
  scheduleFrame: (callback: () => void) => FrameHandle = requestAnimationFrame,
  cancelFrame: (handle: FrameHandle) => void = cancelAnimationFrame
): () => void {
  let outerFrame: FrameHandle | undefined
  let innerFrame: FrameHandle | undefined
  const pending = new Set<FrameTarget>()

  const recall = (): void => {
    innerFrame = undefined
    const batch = [...pending].filter(element => element.isConnected !== false)
    pending.clear()
    for (const element of batch) element.setAttribute(RECALL_ATTRIBUTE, '')
    scheduleFrame(() => {
      for (const element of batch) element.removeAttribute(RECALL_ATTRIBUTE)
    })
  }

  const onScroll = (event: Event): void => {
    const scroller = asFrameTarget(event.target)
    if (scroller === undefined) return
    const hosts = dragHosts(scroller)
    if (hosts.length === 0) return
    for (const host of hosts) pending.add(host)
    if (outerFrame !== undefined) cancelFrame(outerFrame)
    if (innerFrame !== undefined) cancelFrame(innerFrame)
    innerFrame = undefined
    outerFrame = scheduleFrame(() => {
      outerFrame = undefined
      innerFrame = scheduleFrame(recall)
    })
  }

  document.addEventListener('scroll', onScroll, true)
  return () => {
    document.removeEventListener('scroll', onScroll, true)
    if (outerFrame !== undefined) cancelFrame(outerFrame)
    if (innerFrame !== undefined) cancelFrame(innerFrame)
    for (const element of pending) element.removeAttribute(RECALL_ATTRIBUTE)
    pending.clear()
  }
}

function dragHosts(scroller: FrameTarget): FrameTarget[] {
  const hosts: FrameTarget[] = []
  if (scroller.hasAttribute('data-window-drag')) hosts.push(scroller)
  for (const node of scroller.querySelectorAll('[data-window-drag]')) hosts.push(node)
  return hosts
}

function asFrameTarget(value: EventTarget | null): FrameTarget | undefined {
  if (value === null || typeof value !== 'object') return undefined
  const target = value as Partial<FrameTarget>
  if (typeof target.hasAttribute !== 'function' || typeof target.querySelectorAll !== 'function') return undefined
  return target as FrameTarget
}
