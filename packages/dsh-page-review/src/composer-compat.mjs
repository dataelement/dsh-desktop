/**
 * Versioned adapter for the Desktop composer marker added by this contribution.
 * It never looks up translated labels or generated class names. The native Stop
 * action remains visible; annotations use an inline action while it is primary.
 * Remove this adapter when Harness exposes a native submission-extension API.
 */
export function observeComposer(seat, onChange) {
  const card = seat?.closest('[data-composer-card]')
  if (!card) return () => {}
  const update = () => {
    const primary = card.querySelector('[data-dsh-composer-primary]')
    const editor = card.querySelector('[contenteditable]')
    onChange({
      inline: primary?.getAttribute('data-dsh-composer-primary') === 'stop',
      disabled: !primary || editor?.getAttribute('contenteditable') !== 'true',
    })
  }
  update()
  const observer = new seat.ownerDocument.defaultView.MutationObserver(update)
  observer.observe(card, {
    subtree: true,
    attributes: true,
    attributeFilter: ['contenteditable', 'data-dsh-composer-primary'],
  })
  return () => observer.disconnect()
}
