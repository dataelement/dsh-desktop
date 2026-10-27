const clamp = (value, min, max) =>
  Math.max(min, Math.min(Math.max(min, max), value))

// Screenshot coordinates must use the actual `object-fit: contain` image area,
// including its letterbox offsets after a sidebar resize.
export function annotationPlacement({ viewport, capture, popup, point }) {
  const pad = 12,
    gap = 10,
    vw = viewport.width,
    vh = viewport.height
  const scale = Math.min(vw / capture.width, vh / capture.height)
  const ox = (vw - capture.width * scale) / 2,
    oy = (vh - capture.height * scale) / 2
  const r = capture.rect
  let target = {
    left: clamp(ox + r.x * scale, 0, vw),
    top: clamp(oy + r.y * scale, 0, vh),
    right: clamp(ox + (r.x + r.width) * scale, 0, vw),
    bottom: clamp(oy + (r.y + r.height) * scale, 0, vh),
  }
  // A root/container can fill the viewport; in that case stay by the point
  // actually picked instead of jumping to the opposite edge of the page.
  if (
    point &&
    target.right - target.left > vw * 0.7 &&
    target.bottom - target.top > vh * 0.6
  ) {
    const x = clamp(ox + point.x * scale, pad, vw - pad),
      y = clamp(oy + point.y * scale, pad, vh - pad)
    target = { left: x, top: y, right: x, bottom: y }
  }
  const width = Math.min(popup.width, vw - pad * 2),
    height = Math.min(popup.height, vh - pad * 2)
  const cx = (target.left + target.right) / 2,
    cy = (target.top + target.bottom) / 2
  let side,
    left = clamp(target.left, pad, vw - width - pad),
    top
  if (target.bottom + gap + height <= vh - pad) {
    side = 'bottom'
    top = target.bottom + gap
  } else if (target.top - gap - height >= pad) {
    side = 'top'
    top = target.top - gap - height
  } else if (target.right + gap + width <= vw - pad) {
    side = 'right'
    left = target.right + gap
    top = clamp(cy - height / 2, pad, vh - height - pad)
  } else if (target.left - gap - width >= pad) {
    side = 'left'
    left = target.left - gap - width
    top = clamp(cy - height / 2, pad, vh - height - pad)
  } else {
    side = cy > vh / 2 ? 'top' : 'bottom'
    top = clamp(
      side === 'top' ? target.top - gap - height : target.bottom + gap,
      pad,
      vh - height - pad,
    )
  }
  const arrow =
    side === 'top' || side === 'bottom'
      ? {
          left: clamp(cx - left, 18, width - 18),
          [side === 'bottom' ? 'top' : 'bottom']: -5,
        }
      : {
          top: clamp(cy - top, 18, height - 18),
          [side === 'right' ? 'left' : 'right']: -5,
        }
  return {
    left,
    top,
    width,
    maxHeight: Math.max(0, vh - pad * 2),
    side,
    arrow,
  }
}
