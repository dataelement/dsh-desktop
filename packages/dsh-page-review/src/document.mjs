const supported = /\.(pdf|docx?|md|markdown)$/i
export const documentKind = (path) =>
  /\.pdf$/i.test(path)
    ? 'pdf'
    : /\.docx?$/i.test(path)
      ? 'word'
      : /\.(md|markdown)$/i.test(path)
        ? 'markdown'
        : null
export const supportsDocument = (path) => supported.test(path || '')
export function fileResourceSession(address) {
  try {
    const u = new URL(address),
      parts = u.pathname.split('/')
    return u.protocol === 'dsh-resource:' &&
      u.hostname === 'file' &&
      parts[1] === 'session'
      ? decodeURIComponent(parts[2])
      : null
  } catch {
    return null
  }
}
const intersect = (a, b) => {
  const x = Math.max(a.x, b.x),
    y = Math.max(a.y, b.y),
    right = Math.min(a.x + a.width, b.x + b.width),
    bottom = Math.min(a.y + a.height, b.y + b.height)
  return right > x && bottom > y
    ? { x, y, width: right - x, height: bottom - y }
    : null
}
export function documentRegions(rect, pages) {
  return pages.flatMap((page) => {
    const hit = intersect(rect, page.rect)
    return hit
      ? [
          {
            page: page.page,
            rect: {
              x: (hit.x - page.rect.x) / page.rect.width,
              y: (hit.y - page.rect.y) / page.rect.height,
              width: hit.width / page.rect.width,
              height: hit.height / page.rect.height,
            },
          },
        ]
      : []
  })
}
export function documentSelection(body, point, region, target, document) {
  const viewport = body.getBoundingClientRect(),
    relative = (r) => ({
      x: r.left - viewport.left,
      y: r.top - viewport.top,
      width: r.width,
      height: r.height,
    })
  const pages = [...body.querySelectorAll('[data-pdf-page]')]
    .map((el) => ({
      page: Number(el.dataset.pdfPage),
      rect: relative(
        el.querySelector('canvas')?.getBoundingClientRect() ||
          el.getBoundingClientRect(),
      ),
    }))
    .filter((p) => p.rect.width > 0 && p.rect.height > 0)
  if (document.kind !== 'markdown' && !pages.length)
    throw Error('文件页面尚未加载完成，请稍后再选取')
  const visible = {
    x: 0,
    y: 0,
    width: viewport.width,
    height: viewport.height,
  }
  const targetRect = target ? relative(target.getBoundingClientRect()) : null
  const rect = intersect(
    region ||
      targetRect || { x: point.x - 40, y: point.y - 25, width: 80, height: 50 },
    visible,
  )
  if (!rect || rect.width < 2 || rect.height < 2)
    throw Error('请选择可见的文字或区域')
  const regions = documentRegions(rect, pages)
  let text = target?.textContent || ''
  if (region || target?.tagName === 'CANVAS') {
    const nodes = body.querySelectorAll(
      '[data-pdf-text] span,[data-textpreview-line],h1,h2,h3,p,li,td,th',
    )
    text = [...nodes]
      .filter((el) => intersect(relative(el.getBoundingClientRect()), rect))
      .map((el) => el.textContent.trim())
      .filter(Boolean)
      .join(' ')
      .slice(0, 3000)
  }
  const line = target
    ?.closest('[data-textpreview-line]')
    ?.getAttribute('data-textpreview-line')
  return {
    rect,
    document: {
      ...document,
      regions,
      ...(line ? { line: Number(line) } : {}),
      scroll: { x: body.scrollLeft, y: body.scrollTop },
    },
    element: {
      tag: region ? '区域' : target?.tagName?.toLowerCase() || '区域',
      text: text.trim().slice(0, 3000),
      name: regions.length
        ? `第 ${regions.map((p) => p.page).join('、')} 页`
        : '文件选区',
      selector: line ? `[data-textpreview-line="${line}"]` : null,
      html: region ? '' : target?.outerHTML?.slice(0, 3200) || '',
      styles: {},
    },
    width: Math.round(viewport.width),
    height: Math.round(viewport.height),
    scroll: { x: body.scrollLeft, y: body.scrollTop },
  }
}
