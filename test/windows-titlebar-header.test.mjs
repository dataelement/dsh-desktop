import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { expect, it } from 'vitest'

const source = readFileSync('node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js', 'utf8')
const ast = ts.createSourceFile('client.js', source, ts.ScriptTarget.Latest, true)
let headerSource
function visit(node) {
  if (ts.isFunctionDeclaration(node) && node.name?.text === 'ConversationHeader') headerSource = node.getText(ast)
  ts.forEachChild(node, visit)
}
visit(ast)
const jsx = (type, props) => ({ type, props })
const Header = new Function('react_jsx_runtime', 'clsx', 'ConversationRoot_module_css_default', 'conversationPhase', `${headerSource}; return ConversationHeader`)(
  { jsx, jsxs: jsx }, (...names) => names.filter(Boolean).join(' '),
  { header: 'header', headerBlank: 'blank', headerSessionless: 'sessionless', headerLeading: 'leading', titleRow: 'title' }, () => 'active'
)

it.each([undefined, 'session-1'])('marks the resident header without moving or duplicating slot contributions (%s)', sessionId => {
  const calls = []
  const tree = Header({ sessionId, useSession: select => select(sessionId ? { blank: false } : undefined),
    useConversation: select => select(sessionId ? {} : undefined),
    renderSlot(name, props) { calls.push(name); return jsx('slot', { name, ...props }) }
  })
  expect(tree.type).toBe('header')
  expect(tree.props['data-dsh-conversation-header']).toBe('')
  expect(tree.props['data-window-drag']).toBe(true)
  expect(calls).toEqual(sessionId ? ['conversation.header.leading', 'conversation.session.header'] : ['conversation.header.leading'])
  // rc.2 renders the session slot INSIDE the header. Styling a header inside
  // that slot silently stopped working after the upgrade.
  if (sessionId) expect(tree.props.children[1].props.name).toBe('conversation.session.header')
})
