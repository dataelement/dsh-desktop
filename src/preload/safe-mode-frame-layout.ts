interface SidebarBounds {
  getBoundingClientRect(): Pick<DOMRect, 'right'>
}

interface FrameStyle {
  style: Pick<CSSStyleDeclaration, 'left'>
}

/** Keep the Safe Mode manager out of the Harness session sidebar. */
export function applySafeModeFrameLeft(
  frame: FrameStyle,
  sidebar?: SidebarBounds
): void {
  const right = sidebar?.getBoundingClientRect().right
  const left = typeof right === 'number' && Number.isFinite(right)
    ? Math.max(0, Math.round(right))
    : 0
  const value = `${left}px`
  if (frame.style.left !== value) frame.style.left = value
}
