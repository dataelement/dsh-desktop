/** A deliberately small Markdown subset. Remote HTML and links remain inert text. */
export function renderUpdateNotes(container: HTMLElement, source: string): void {
  const doc = container.ownerDocument
  let list: HTMLUListElement | HTMLOListElement | undefined
  for (const line of source.replace(/\r\n?/g, '\n').split('\n')) {
    const item = /^\s*(?:([-+*])|([0-9]+)[.)])\s+(.+)$/.exec(line)
    if (item) {
      const tag = item[2] ? 'ol' : 'ul'
      if (!list || list.localName !== tag) {
        list = doc.createElement(tag)
        if (item[2]) list.setAttribute('start', item[2])
        container.appendChild(list)
      }
      const node = doc.createElement('li')
      appendInline(node, item[3] ?? '')
      list.appendChild(node)
      continue
    }
    list = undefined
    if (!line.trim()) continue
    const heading = /^#{1,6}\s+(.+)$/.exec(line)
    const node = doc.createElement(heading ? 'h3' : 'p')
    appendInline(node, heading?.[1] ?? line)
    container.appendChild(node)
  }
}

function appendInline(container: HTMLElement, text: string): void {
  // Never use innerHTML: even text inside Markdown delimiters is untrusted.
  const tokens = /(`[^`]+`|\*\*[^*]+\*\*)/g
  let offset = 0
  for (const match of text.matchAll(tokens)) {
    const index = match.index ?? 0
    container.appendChild(container.ownerDocument.createTextNode(text.slice(offset, index)))
    const code = match[0].startsWith('`')
    const node = container.ownerDocument.createElement(code ? 'code' : 'strong')
    node.textContent = match[0].slice(code ? 1 : 2, code ? -1 : -2)
    container.appendChild(node)
    offset = index + match[0].length
  }
  container.appendChild(container.ownerDocument.createTextNode(text.slice(offset)))
}
