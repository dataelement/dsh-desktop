// Renders a workbench document into a standalone reading page for the website.
//
// Only the Markdown the two workbench documents use is supported: headings,
// paragraphs, blockquotes, ordered/unordered/task lists, tables, fenced code,
// **bold**, `code`, [links](url) and bare https URLs. Everything is escaped
// first, so document text can never inject markup into the page.

const escapeHtml = text => text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]))

function inline(text) {
  const codes = []
  let html = escapeHtml(text).replace(/`([^`]+)`/g, (_, code) => `\u0000${codes.push(code) - 1}\u0000`)
  html = html
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\((https:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>')
    .replace(/(^|[\s：（(])(https:\/\/[A-Za-z0-9._~:/?#@!$&*+,;=%-]+)/g, (_, lead, url) => {
      const clean = url.replace(/[.,;:]+$/, '')
      return `${lead}<a href="${clean}">${clean}</a>${url.slice(clean.length)}`
    })
  return html.replace(/\u0000(\d+)\u0000/g, (_, index) => `<code>${codes[Number(index)]}</code>`)
}

function renderTable(rows) {
  const cells = row => row.trim().replace(/^\||\|$/g, '').split('|').map(cell => cell.trim())
  const [head, , ...body] = rows
  return `<div class="table"><table><thead><tr>${cells(head).map(cell => `<th>${inline(cell)}</th>`).join('')}</tr></thead>`
    + `<tbody>${body.map(row => `<tr>${cells(row).map(cell => `<td>${inline(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`
}

function renderList(items) {
  // items: [{ depth, ordered, text }]; nests by indentation depth.
  let html = ''
  const stack = []
  const open = (ordered) => { stack.push(ordered ? 'ol' : 'ul'); html += `<${ordered ? 'ol' : 'ul'}>` }
  const close = () => { html += `</li></${stack.pop()}>` }
  for (const [index, item] of items.entries()) {
    if (index === 0) open(item.ordered)
    else if (item.depth > items[index - 1].depth) open(item.ordered)
    else {
      for (let depth = items[index - 1].depth; depth > item.depth; depth--) close()
      html += '</li>'
    }
    const task = /^\[( |x)\]\s+(.*)$/.exec(item.text)
    html += task ? `<li class="task"><input type="checkbox" disabled${task[1] === 'x' ? ' checked' : ''}> ${inline(task[2])}` : `<li>${inline(item.text)}`
  }
  while (stack.length) close()
  return html
}

export function renderMarkdownBody(markdown) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const out = []
  for (let i = 0; i < lines.length;) {
    const line = lines[i]
    if (!line.trim()) { i++; continue }
    const fence = /^```(\w*)/.exec(line)
    if (fence) {
      const code = []
      for (i++; i < lines.length && !lines[i].startsWith('```'); i++) code.push(lines[i])
      i++
      out.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`)
      continue
    }
    const heading = /^(#{1,4})\s+(.*)$/.exec(line)
    if (heading) {
      const level = heading[1].length
      const id = level > 1 ? ` id="${escapeHtml(heading[2].replace(/\s+/g, '-'))}"` : ''
      out.push(`<h${level}${id}>${inline(heading[2])}</h${level}>`)
      i++
      continue
    }
    if (line.startsWith('|')) {
      const rows = []
      for (; i < lines.length && lines[i].startsWith('|'); i++) rows.push(lines[i])
      out.push(renderTable(rows))
      continue
    }
    if (line.startsWith('>')) {
      const quote = []
      for (; i < lines.length && lines[i].startsWith('>'); i++) quote.push(lines[i].replace(/^>\s?/, ''))
      out.push(`<blockquote>${renderMarkdownBody(quote.join('\n'))}</blockquote>`)
      continue
    }
    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const items = []
      for (; i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i]); i++) {
        const match = /^(\s*)([-*]|\d+\.)\s+(.*)$/.exec(lines[i])
        items.push({ depth: Math.floor(match[1].length / 2), ordered: /\d/.test(match[2]), text: match[3] })
      }
      out.push(renderList(items))
      continue
    }
    const paragraph = []
    for (; i < lines.length && lines[i].trim() && !/^(#{1,4}\s|```|\||>|\s*([-*]|\d+\.)\s)/.test(lines[i]); i++) paragraph.push(lines[i].trim())
    out.push(`<p>${inline(paragraph.join(' '))}</p>`)
  }
  return out.join('\n')
}

export function renderDocumentPage(markdown, { markdownUrl }) {
  const title = /^#\s+(.*)$/m.exec(markdown)?.[1] ?? 'DSH 工作台文档'
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)} — DSH Desktop</title>
<link rel="alternate" type="text/markdown" href="${escapeHtml(markdownUrl)}">
<style>
:root{color-scheme:light dark;--bg:#fbfbf9;--fg:#1b1b1a;--muted:#6b6b66;--line:#e2e2dc;--code:#f0f0eb;--link:#2457c5}
@media(prefers-color-scheme:dark){:root{--bg:#161615;--fg:#ececea;--muted:#a3a39d;--line:#34342f;--code:#23231f;--link:#8ab0ff}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.75 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}
main{width:min(860px,100% - 32px);margin:48px auto 96px}a{color:var(--link)}
h1{font-size:32px;line-height:1.25;margin:0 0 16px}h2{font-size:23px;margin:44px 0 12px;padding-top:12px;border-top:1px solid var(--line)}h3{font-size:18px;margin:28px 0 8px}
code{font:0.88em/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;background:var(--code);padding:1px 5px;border-radius:4px;word-break:break-word}
pre{background:var(--code);padding:14px 16px;border-radius:8px;overflow:auto}pre code{padding:0;background:none;word-break:normal}
blockquote{margin:16px 0;padding:4px 16px;border-left:3px solid var(--line);color:var(--muted)}
.table{overflow-x:auto;margin:16px 0}table{border-collapse:collapse;width:100%;font-size:14px;line-height:1.6}th,td{border:1px solid var(--line);padding:7px 10px;text-align:left;vertical-align:top}th{background:var(--code)}
li{margin:4px 0}li.task{list-style:none;margin-left:-1.2em}
</style>
</head>
<body>
<main>
${renderMarkdownBody(markdown)}
</main>
</body>
</html>
`
}
