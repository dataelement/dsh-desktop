import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { expect, it, vi } from 'vitest'

const source = readFileSync('node_modules/@deepseek-ai/dsh-client-ui-agent-preset/lib/client.js', 'utf8')
const ast = ts.createSourceFile('client.js', source, ts.ScriptTarget.Latest, true)
let section
function visit(node) {
  if (ts.isFunctionDeclaration(node) && node.name?.text === 'AgentPresetSection') section = node.getText(ast)
  ts.forEachChild(node, visit)
}
visit(ast)

it.each(['en', 'zh'])('keeps preset actions beside the heading with working search/import/browse (%s)', lang => {
  const Button = () => {}
  const open = vi.fn()
  const setSearch = vi.fn()
  let stateIndex = 0
  const jsx = (type, props) => ({ type, props })
  const render = new Function('react', 'react_jsx_runtime', '_deepseek_ai_dsh_client_ui_primitives', 'AgentPresetSection_module_css_default', 'document', 'window', `${section}; return AgentPresetSection`)(
    { useState: initial => [initial, stateIndex++ === 0 ? setSearch : () => {}], useRef: current => ({ current }), useEffect() {}, useLayoutEffect() {} },
    { jsx, jsxs: jsx }, { Button, Modal: () => {} }, {}, { documentElement: { lang } }, { open }
  )
  const tree = render({ useAgentPresetSection: fn => fn({ rows: [], view: null, error: null }), useDeveloperTools: fn => fn(false), t: key => key })
  const nodes = []
  function walk(node) {
    if (Array.isArray(node)) return node.forEach(walk)
    if (!node || typeof node !== 'object') return
    nodes.push(node); walk(node.props?.children)
  }
  walk(tree)
  const heading = nodes.find(n => n.props?.['data-dsh-preset-heading'] === '')
  const actions = heading.props.children[1].props.children
  expect(actions.every(n => n.type === Button && n.props.variant === 'outline')).toBe(true)
  const input = nodes.find(n => n.props?.type === 'file')
  const click = vi.fn(); input.props.ref.current = { click }
  actions[0].props.onClick(); expect(click).toHaveBeenCalledOnce()
  actions[1].props.onClick(); expect(open).toHaveBeenCalledWith('https://www.dshdesktop.com/preset/', '_blank', 'noopener,noreferrer')
  nodes.find(n => n.props?.type === 'search').props.onChange({ target: { value: 'test' } })
  expect(setSearch).toHaveBeenCalledWith('test')
})
