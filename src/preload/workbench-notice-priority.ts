const NOTICE_SELECTOR = '[data-dsh-workbench-notice]'

/** Observe only marker membership, never rescan the conversation on mutations. */
export function watchWorkbenchNoticePriority(document: Document, onChange: (active: boolean) => void): () => void {
  const root = document.body
  const Observer = document.defaultView?.MutationObserver
  if (!root || !Observer) return () => {}
  const notices = new Set<Element>(root.querySelectorAll(NOTICE_SELECTOR))
  let active = notices.size > 0
  onChange(active)
  const observer = new Observer(records => {
    for (const record of records) {
      if (record.type === 'attributes') {
        const element = record.target as Element
        if (element.matches(NOTICE_SELECTOR)) notices.add(element)
        else notices.delete(element)
        continue
      }
      for (const node of record.addedNodes) {
        if (node.nodeType !== 1) continue
        const element = node as Element
        if (element.matches(NOTICE_SELECTOR)) notices.add(element)
        for (const notice of element.querySelectorAll(NOTICE_SELECTOR)) notices.add(notice)
      }
    }
    for (const notice of notices) if (!root.contains(notice)) notices.delete(notice)
    const next = notices.size > 0
    if (next === active) return
    active = next
    onChange(next)
  })
  observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-dsh-workbench-notice'] })
  return () => observer.disconnect()
}
