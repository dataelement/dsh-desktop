import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import { expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const clientPath = require.resolve('@deepseek-ai/dsh-client-ui-model-selection/package.json').replace('package.json', 'lib/client.js')

const MODELS = [
  { id: 'alpha', name: 'Alpha' },
  { id: 'beta', name: 'Beta' },
  { id: 'gamma', name: 'Gamma' },
  { id: 'delta', name: 'Delta' },
  { id: 'epsilon', name: 'Epsilon' }
]

class HTMLInputElement {}

function rankByName(models, query) {
  const needle = String(query ?? '').trim().toLowerCase()
  if (!needle) return models.slice()
  return models.filter(model => String(model.name ?? '').toLowerCase().includes(needle))
}

function flatten(node) {
  if (!node || typeof node !== 'object') return []
  if (Array.isArray(node)) return node.flatMap(flatten)
  return [node, ...flatten(node.props?.children)]
}

function highlightedRows(tree) {
  return flatten(tree).filter(node => node.props?.['data-highlighted'] === '')
}

function modelRows(tree) {
  return flatten(tree).filter(node => node.props?.role === 'menuitemradio')
}

function menuRoot(tree) {
  const root = flatten(tree).find(node => typeof node.props?.onKeyDown === 'function' && typeof node.props?.onMouseDown === 'function')
  expect(root, 'model menu root').toBeDefined()
  return root
}

function keyEvent(name, target) {
  return {
    key: name,
    shiftKey: false,
    preventDefault() {},
    nativeEvent: { isComposing: false },
    target
  }
}

function loadModelSelect() {
  const source = readFileSync(clientPath, 'utf8').replace(
    'exports.apply=apply;',
    'exports.ModelSelect=ModelSelect;exports.apply=apply;'
  )
  const states = []
  let cursor = 0
  const react = {
    useState(initial) {
      const index = cursor++
      if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial
      return [states[index], next => {
        states[index] = typeof next === 'function' ? next(states[index]) : next
      }]
    },
    useMemo: fn => fn(),
    useEffect() {},
    useLayoutEffect() {},
    useId: () => 'model-select',
    useSyncExternalStore(_subscribe, getSnapshot) {
      return getSnapshot()
    },
    useRef(value) {
      const index = cursor++
      if (!(index in states)) states[index] = { current: value }
      return states[index]
    }
  }
  const resetCursor = () => { cursor = 0 }
  const jsx = (type, props) => {
    if (type === undefined) throw new Error('Undefined rendered component')
    return typeof type === 'function' ? type(props) : { type, props }
  }
  const primitives = {
    rankByName,
    isMobileDevice: () => false,
    observeStickyMenuGroups: () => () => {},
    Input: props => ({ type: 'input', props }),
    MenuSurface: props => ({ type: 'div', props }),
    MenuGroup: props => ({ type: 'div', props }),
    Tag: props => props.children ?? null,
    StateDot: () => null,
    Toast: () => null
  }
  for (const name of ['IconCheckOutlineRegular', 'IconChevronDownOutlineRegular', 'IconChevronRightOutlineRegular', 'IconCloseFillRegular', 'IconDataOutlineRegular', 'IconWarningOutlineRegular']) {
    primitives[name] = () => ({ type: 'svg', props: {} })
  }
  let modelSelect
  vm.runInNewContext(source, {
    HTMLInputElement,
    document: {
      body: {},
      querySelector() { return {} }
    },
    window: {
      __ModuleLoader__: {
        load({ factory }) {
          const exported = factory(id => ({
            react,
            'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'fragment' },
            'react-dom': { createPortal: node => node },
            '@deepseek-ai/dsh-client-ui-primitives': primitives,
            '@deepseek-ai/cordis': {
              Service: class Service {
                constructor(ctx, name) {
                  this.ctx = ctx
                  this.name = name
                }
              }
            },
            '@deepseek-ai/dsh-client-store': {}
          })[id])
          modelSelect = exported.ModelSelect
        }
      }
    }
  })
  if (typeof modelSelect !== 'function') throw new Error('ModelSelect was not exported from the installed bundle')
  return { ModelSelect: modelSelect, resetCursor }
}

function createView(current) {
  const { ModelSelect, resetCursor } = loadModelSelect()
  const selected = []
  const snapshot = {
    current,
    routable: null,
    groups: [{ id: 'acme', name: 'Acme', models: MODELS }],
    failures: [],
    status: 'ready',
    pending: null,
    error: null
  }
  const props = {
    available: true,
    directory: {
      subscribe() { return () => {} },
      getSnapshot: () => snapshot
    },
    load() {},
    select(selection) {
      selected.push(selection)
      return Promise.resolve({ ok: true })
    },
    resolveText: text => text,
    t: key => key,
    renderSlot(_name, _slotProps, options) { return options?.fallback ?? null }
  }
  const render = () => {
    resetCursor()
    return ModelSelect(props)
  }
  return { render, selected }
}

function openModelPane(view) {
  let tree = view.render()
  const trigger = flatten(tree).find(node => node.props?.['aria-haspopup'] === 'menu')
  expect(trigger, 'model trigger').toBeDefined()
  trigger.props.onClick()
  tree = view.render()
  if (modelRows(tree).length === 0) {
    const drill = flatten(tree).find(node => node.props?.role === 'menuitem')
    expect(drill, 'model drill item').toBeDefined()
    drill.props.onClick()
    tree = view.render()
  }
  return tree
}

it('does not highlight a model row when nothing is selected', () => {
  const view = createView(null)
  const tree = openModelPane(view)
  expect(modelRows(tree)).toHaveLength(MODELS.length)
  expect(highlightedRows(tree)).toEqual([])
  const search = flatten(tree).find(node => node.props?.role === 'searchbox')
  expect(search, 'model search box').toBeDefined()
  expect(search.props['aria-activedescendant']).toBeUndefined()
})

it('highlights only the selected model when the menu opens', () => {
  const view = createView({ provider: 'acme', model: 'beta' })
  const tree = openModelPane(view)
  const highlighted = highlightedRows(tree)
  expect(highlighted).toHaveLength(1)
  expect(highlighted[0].props['aria-checked']).toBe(true)
  expect(highlighted[0].props.id).toBe('model-select-model-1')
})

it('moves the highlight with arrow keys and does not select on enter before that', () => {
  const view = createView(null)
  let tree = openModelPane(view)
  menuRoot(tree).props.onKeyDown(keyEvent('Enter', new HTMLInputElement()))
  expect(view.selected).toEqual([])

  menuRoot(tree).props.onKeyDown(keyEvent('ArrowDown'))
  tree = view.render()
  expect(highlightedRows(tree).map(node => node.props.id)).toEqual(['model-select-model-0'])

  const up = createView(null)
  let upTree = openModelPane(up)
  menuRoot(upTree).props.onKeyDown(keyEvent('ArrowUp'))
  upTree = up.render()
  expect(highlightedRows(upTree).map(node => node.props.id)).toEqual(['model-select-model-4'])
})

it('highlights the row under the pointer and selects the first search match', () => {
  const view = createView(null)
  let tree = openModelPane(view)
  const first = modelRows(tree)[0]
  expect(typeof first.props.onMouseMove).toBe('function')
  first.props.onMouseMove()
  tree = view.render()
  expect(highlightedRows(tree).map(node => node.props.id)).toEqual(['model-select-model-0'])

  const search = flatten(tree).find(node => node.props?.role === 'searchbox')
  search.props.onChange({ target: { value: 'eps' } })
  tree = view.render()
  expect(modelRows(tree).map(node => node.props.id)).toEqual(['model-select-model-0'])
  expect(highlightedRows(tree).map(node => node.props.id)).toEqual(['model-select-model-0'])
  menuRoot(tree).props.onKeyDown(keyEvent('Enter', new HTMLInputElement()))
  expect(view.selected).toEqual([{ provider: 'acme', model: 'epsilon' }])
})

it('keeps the installed bundle from treating the first model as active', () => {
  const client = readFileSync(clientPath, 'utf8')
  expect(client).not.toContain('highlightedIndex??Math.max(0,currentVisibleIndex)')
  expect(client).toContain('const index=highlightedIndex??currentVisibleIndex;return index<0||visibleModels.length===0?-1')
  expect(client).toContain('activeModelIndex<0?event.key===`ArrowDown`?0:visibleModels.length-1:')
  expect(client).toContain('onMouseMove:busy||index===activeModelIndex?void 0:()=>{if(showSearch)setHighlightedIndex(index)')
})
