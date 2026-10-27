// Executed inside the browser document; returns data only, never instructions.
export function inspectPoint(x, y, region) {
  const esc = CSS.escape
  let node = document.elementFromPoint(x, y)
  if (!node) throw Error('没有找到可选取的元素')
  const clickable = node.closest('button,a,input,textarea,select,[role=button]')
  if (clickable && clickable.getBoundingClientRect().width < innerWidth * 0.95)
    node = clickable
  const matchCount = (s) => {
    try {
      return document.querySelectorAll(s).length
    } catch {
      return 0
    }
  }
  const selectorFor = (el) => {
    if (el.id && matchCount('#' + esc(el.id)) === 1) return '#' + esc(el.id)
    for (const attr of ['data-testid', 'data-test', 'name']) {
      const val = el.getAttribute(attr)
      if (val) {
        const s =
          el.tagName.toLowerCase() +
          '[' +
          attr +
          '=' +
          JSON.stringify(val) +
          ']'
        if (matchCount(s) === 1) return s
      }
    }
    const chain = []
    let p = el
    while (p && p.nodeType === 1 && chain.length < 8) {
      let s = p.tagName.toLowerCase()
      if (p.id) {
        chain.unshift('#' + esc(p.id))
        break
      }
      const classes = [...p.classList]
        .filter((c) => !/[0-9]{5}|active|hover|focus/.test(c))
        .slice(0, 2)
      if (classes.length) s += '.' + classes.map(esc).join('.')
      const parent = p.parentElement
      if (
        parent &&
        [...parent.children].filter((n) => n.tagName === p.tagName).length > 1
      )
        s += `:nth-of-type(${[...parent.children].filter((n) => n.tagName === p.tagName).indexOf(p) + 1})`
      chain.unshift(s)
      if (matchCount(chain.join(' > ')) === 1) break
      p = parent
    }
    return chain.join(' > ')
  }
  const selector = selectorFor(node),
    r = node.getBoundingClientRect(),
    style = getComputedStyle(node)
  const clone = node.cloneNode(true)
  for (const el of [clone, ...clone.querySelectorAll('*')]) {
    if (el.tagName === 'SCRIPT') {
      el.remove()
      continue
    }
    for (const a of [...el.attributes])
      if (a.name.startsWith('on') || ['value', 'srcdoc'].includes(a.name))
        el.removeAttribute(a.name)
    if (el.tagName === 'TEXTAREA') el.textContent = ''
  }
  const rect = region || { x: r.x, y: r.y, width: r.width, height: r.height }
  return {
    element: {
      tag: region ? 'region' : node.tagName.toLowerCase(),
      selector: region ? '' : selector,
      matches: region ? 0 : matchCount(selector),
      name:
        node.getAttribute('aria-label') ||
        node.getAttribute('placeholder') ||
        '',
      role: node.getAttribute('role') || '',
      text: (node.innerText || node.textContent || '').trim().slice(0, 400),
      html: clone.outerHTML.slice(0, 2400),
      source:
        node.getAttribute('data-web-annotator-source') ||
        node.getAttribute('data-dsh-source-file') ||
        '',
      styles: Object.fromEntries(
        [
          'font',
          'color',
          'backgroundColor',
          'padding',
          'margin',
          'display',
          'gap',
          'borderRadius',
        ].map((k) => [k, style[k]]),
      ),
    },
    rect,
    scroll: { x: scrollX, y: scrollY },
    url: location.href,
    title: document.title,
  }
}
