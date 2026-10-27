export function isTextEntry(target, remoteInput) {
  if (target === remoteInput) return false
  return Boolean(
    target?.closest?.(
      'input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"]',
    ),
  )
}

// Inspecting follows pointer intent, not stale keyboard focus. Scripted focus in
// the comment editor must not trap Space; actually typing/clicking in an editor
// restores text intent until the pointer returns to the page.
export function holdToBrowse({
  root,
  surface = () => root,
  window,
  document,
  enabled,
  remoteInput,
  onChange,
  onInterrupt,
}) {
  let held = false,
    pageIntent = false
  const set = (value) => {
    if (held === value) return
    held = value
    onInterrupt(value)
    onChange(value)
  }
  const space = (e) =>
    e.code === 'Space' ||
    e.key === ' ' ||
    e.key === 'Spacebar' ||
    e.keyCode === 32
  const pointer = (e) => {
    const page = surface()
    pageIntent =
      Boolean(
        page?.contains(e.target) ||
          (e.type === 'wheel' && e.target === page?.parentElement),
      ) && !isTextEntry(e.target, remoteInput())
  }
  const input = (e) => {
    if (isTextEntry(e.target, remoteInput())) pageIntent = false
  }
  const down = (e) => {
    if (!space(e)) {
      input(e)
      return
    }
    if (held) {
      e.preventDefault()
      e.stopImmediatePropagation()
      return
    }
    if (
      e.repeat ||
      e.isComposing ||
      e.keyCode === 229 ||
      e.metaKey ||
      e.ctrlKey ||
      e.altKey ||
      e.shiftKey ||
      !enabled()
    )
      return
    if (isTextEntry(e.target, remoteInput()) && !pageIntent) return
    if (!root.contains(e.target) && !pageIntent) return
    e.preventDefault()
    e.stopImmediatePropagation()
    set(true)
  }
  const up = (e) => {
    if (!space(e) || !held) return
    e.preventDefault()
    e.stopImmediatePropagation()
    set(false)
  }
  const release = () => set(false)
  const blur = () => {
    pageIntent = false
    release()
  }
  const visibility = () => {
    if (document.visibilityState === 'hidden') blur()
  }
  document.addEventListener('pointermove', pointer, true)
  document.addEventListener('pointerover', pointer, true)
  document.addEventListener('pointerdown', pointer, true)
  document.addEventListener('wheel', pointer, { capture: true, passive: true })
  document.addEventListener('input', input, true)
  window.addEventListener('keydown', down, true)
  window.addEventListener('keyup', up, true)
  window.addEventListener('blur', blur)
  document.addEventListener('visibilitychange', visibility)
  return {
    release,
    dispose() {
      document.removeEventListener('pointermove', pointer, true)
      document.removeEventListener('pointerover', pointer, true)
      document.removeEventListener('pointerdown', pointer, true)
      document.removeEventListener('wheel', pointer, true)
      document.removeEventListener('input', input, true)
      window.removeEventListener('keydown', down, true)
      window.removeEventListener('keyup', up, true)
      window.removeEventListener('blur', blur)
      document.removeEventListener('visibilitychange', visibility)
      release()
    },
  }
}

// This attribute is owned by the gesture listener. CSS reacts during the same
// key event, before React reconciliation, image decoding or network work.
export function presentTemporaryBrowsing(root, paused) {
  if (!root) return
  if (paused) root.setAttribute('data-temp-browsing', 'true')
  else root.removeAttribute('data-temp-browsing')
}
