import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const jsx = (type, props) => ({ type, props })
const React = { useState: value => [value, () => {}], useRef: current => ({ current }), useEffect() {}, useLayoutEffect() {}, useMemo: fn => fn(), useCallback: fn => fn }
const expand = node => Array.isArray(node) ? node.map(expand) : !node || typeof node !== 'object' ? node : typeof node.type === 'function' ? expand(node.type(node.props)) : { ...node, props: { ...node.props, children: expand(node.props?.children) } }
const flatten = node => Array.isArray(node) ? node.flatMap(flatten) : !node || typeof node !== 'object' ? [node] : [node, ...flatten(node.props?.children)]
async function components(packageName, names) {
  const text = await readFile(new URL('../node_modules/@deepseek-ai/' + packageName + '/lib/client.js', import.meta.url), 'utf8')
  const source = ts.createSourceFile('client.js', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS)
  const declarations = []
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name && names.includes(node.name.text)) declarations.push(node.getText(source))
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && ['SIDEBAR_AUTO_COLLAPSE', 'RIGHTBAR_MAX_RATIO'].includes(node.name.text)) declarations.push('const ' + node.getText(source) + ';')
    ts.forEachChild(node, visit)
  }
  visit(source)
  const context = { react: React, react_jsx_runtime: { jsx, jsxs: jsx, Fragment: 'fragment' }, document: { title: 'Fixture', documentElement: { hasAttribute: () => false, dataset: {} } }, AppFrame_module_css_default: new Proxy({}, { get: (_, name) => name }), HeroShell_module_css_default: new Proxy({}, { get: (_, name) => name }), HeroFish: () => jsx('fish', {}) }
  return vm.runInNewContext(declarations.join(String.fromCharCode(10)) + ';({' + names.join(',') + '})', context)
}

describe('optional product content slots', () => {
  it.each([false, true])('renders the native main/rightbar exactly once with wrapper=%s', async contribution => {
    const { AppFrame } = await components('dsh-client-ui-layout', ['AppFrame', 'MainPanel', 'CenterColumn', 'RightbarColumn', 'DragHandle', 'DocumentTitle', 'computeColumns', 'clampWidth'])
    const calls = []
    let wrapperProps
    const frame = AppFrame({ useStore: selector => selector({ layoutInfo: { viewportWidth: 1400, sidebar: 280, rightbar: 400, rightbarTrack: true, rightbarShown: true } }), useFoldedLandscape: selector => selector(false), useSessions: selector => selector({ byId: {} }), usePanelInfo: selector => selector({ activePanelId: null }), actions: {}, t: key => key,
      renderSlot(name, props, options) {
        calls.push(name)
        if (name === 'main') return jsx('main-sentinel', {})
        if (name === 'rightbar') return jsx('rightbar-sentinel', {})
        if (name === 'desktop.mode.content') {
          wrapperProps = props
          return contribution ? jsx('product-wrapper', { columns: props.columns, children: [props.work, props.resizeHandle] }) : options.fallback
        }
        return null
      }
    })
    const nodes = flatten(expand(frame))
    expect(nodes.filter(node => node?.type === 'main-sentinel')).toHaveLength(1)
    expect(nodes.filter(node => node?.type === 'rightbar-sentinel')).toHaveLength(1)
    expect(nodes.filter(node => node?.type === 'product-wrapper')).toHaveLength(contribution ? 1 : 0)
    expect(calls.filter(name => name === 'rightbar')).toHaveLength(1)
    expect(calls.filter(name => name === 'main')).toHaveLength(1)
    expect(wrapperProps.columns).toContain('minmax(0px, 400px)')
    const center = nodes.find(node => node?.props?.className === 'centerCol')
    const rightbar = nodes.find(node => node?.props?.className === 'rightbarCol')
    expect(center.props.style).toEqual(contribution ? { gridColumn: 1 } : undefined)
    expect(rightbar.props.style).toEqual(contribution ? { gridColumn: 2 } : undefined)
    expect(wrapperProps.resizeHandle).toBeTruthy()
  })
  it.each([false, true])('keeps the localized hero headline fallback with contribution=%s', async contribution => {
    const { HeroShell } = await components('dsh-client-ui-conversation', ['HeroShell'])
    const calls = []
    const view = HeroShell({ t: key => ({ 'hero.headline': 'Welcome', 'hero.preview': 'Preview' }[key]), renderSlot: (name, props, options) => { calls.push(name); return name === 'conversation.hero.brand.title' && contribution ? 'Product headline' : options?.fallback }, children: 'Composer' })
    const nodes = flatten(expand(view))
    expect(nodes).toContain(contribution ? 'Product headline' : 'Welcome')
    expect(nodes).toContain('Preview')
    expect(nodes).toContain('Composer')
    expect(calls.filter(name => name === 'conversation.hero.brand.title')).toHaveLength(1)
  })
})
