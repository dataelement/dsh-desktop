import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import { expect, it } from 'vitest'

it.each(['DeepSeekModelsEditor', 'ModelListEditor'])('%s expands options and edits capacity without losing other capabilities', async (editorName) => {
  const require = createRequire(import.meta.url)
  const path = require.resolve('@deepseek-ai/dsh-client-ui-settings-models/package.json').replace('package.json', 'lib/client.js')
  const source = (await readFile(path, 'utf8')).replace('exports.apply = apply;', `exports.editor = ${editorName}; exports.apply = apply;`)
  const states = []
  let cursor = 0
  let editor
  const jsx = (type, props) => {
    if (type === undefined) throw new Error('Undefined rendered component')
    return typeof type === 'function' ? type(props) : { type, props }
  }
  const react = {
    useState(initial) {
      const index = cursor++
      if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial
      return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value }]
    },
    useMemo: fn => fn(), useEffect() {}, useRef(value) {
      const index = cursor++
      if (!(index in states)) states[index] = { current: value }
      return states[index]
    }
  }
  const primitivesSource = await readFile(require.resolve('@deepseek-ai/dsh-client-ui-primitives'), 'utf8')
  const primitives = Object.fromEntries([...primitivesSource.matchAll(/const (Icon\w+) =/g)].map(match => [match[1], () => ({ type: 'svg', props: {} })]))
  primitives.useRowDragPreview = () => ({ start() {}, clear: () => false })
  primitives.AnimatedRows = props => ({ type: 'div', props })
  primitives.Tooltip = props => props.children
  primitives.Button = props => ({ type: 'button', props })
  primitives.Modal = props => props.open ? ({ type: 'dialog', props }) : null
  vm.runInNewContext(source, { window: { __ModuleLoader__: { load({ factory }) {
    editor = factory(id => ({ react, 'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'fragment' }, '@deepseek-ai/dsh-client-ui-primitives': primitives, '@deepseek-ai/dsh-client-store': {} })[id]).editor
  } } } })
  let models = [{ id: 'model', inputModalities: ['text', 'image'], input: ['text', 'image'], imagePixelBudget: 'low', imageMaxBytes: 12345, contextWindow: 128000, maxTokens: 8000, reasoningEfforts: { high: 'default' }, reasoning: { efforts: [{ id: 'legacy' }] } }, { id: 'other', contextWindow: 64000, maxTokens: 4000, input: ['text'], inputModalities: ['text'] }]
  const props = { probe: { settingsNs: 'llm-pi-ai' }, operations: {}, onBusyChange() {}, models, modelQuery: '', t: key => key, onChange: value => { models = value }, onReset() {}, defaultContextWindow: 256000, defaultMaxTokens: 32000 }
  const render = () => { cursor = 0; return editor({ ...props, models }) }
  const flatten = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(flatten) : [node, ...flatten(node.props?.children)]
  const find = (tree, label) => flatten(tree).find(node => node.props?.['aria-label'] === label)
  const contextLabel = 'contextWindow 1'
  const tokensLabel = 'maxTokens 1'
  let tree = render()
  expect(find(tree, contextLabel)).toBeUndefined()
  find(tree, 'modelAdvanced 1').props.onClick()
  tree = render()
  expect(find(tree, contextLabel).props.value).toBe('128K')
  expect(find(tree, tokensLabel).props.value).toBe('8K')
  find(tree, contextLabel).props.onChange({ target: { value: '256K' } })
  expect(models[0].contextWindow).toBe(256000)
  expect(models[0].inputModalities).toEqual(['text', 'image'])
  tree = render()
  find(tree, contextLabel).props.onBlur?.()
  expect(find(render(), contextLabel).props.value).toBe('256K')
  find(render(), 'modelImageInput 1').props.onChange({ target: { checked: false } })
  const inputField = editorName === 'DeepSeekModelsEditor' ? 'inputModalities' : 'input'
  expect(models[0][inputField]).toEqual(['text'])
  if (editorName === 'DeepSeekModelsEditor') {
    expect(models[0]).not.toHaveProperty('imagePixelBudget')
    expect(models[0]).not.toHaveProperty('imageMaxBytes')
  } else {
    expect(models[0].imageMaxBytes).toBe(12345)
  }
  expect(models[0].contextWindow).toBe(256000)
  find(render(), 'modelImageInput 1').props.onChange({ target: { checked: true } })
  expect(models[0][inputField]).toEqual(['text', 'image'])
  // 0.2.2 keeps row identity, disclosure, and typed capacities when reordered.
  find(render(), 'reorderModel 1').props.onKeyDown({ key: 'ArrowDown', preventDefault() {}, stopPropagation() {} })
  expect(models.map(model => model.id)).toEqual(['other', 'model'])
  tree = render()
  expect(find(tree, 'contextWindow 1')).toBeUndefined()
  expect(find(tree, 'contextWindow 2').props.value).toBe('256K')
  props.modelQuery = 'model'
  tree = render()
  expect(find(tree, 'modelId 1')).toBeUndefined()
  expect(find(tree, 'modelId 2').props.value).toBe('model')
  find(tree, 'contextWindow 2').props.onChange({ target: { value: '512K' } })
  expect(models[0].contextWindow).toBe(64000)
  expect(models[1].contextWindow).toBe(512000)
  expect(models[1][inputField]).toEqual(['text', 'image'])
  if (editorName === 'ModelListEditor') {
    find(render(), 'modelReasoningLevels 2').props.onChange({ target: { value: 'high, low' } })
    expect(models[1].reasoningEfforts).toEqual({ high: 'default', low: 'low' })
    expect(models[1]).not.toHaveProperty('reasoning')
    expect(models[1].contextWindow).toBe(512000)
    find(render(), 'modelReasoningLevels 2').props.onChange({ target: { value: '' } })
    expect(models[1]).not.toHaveProperty('reasoningEfforts')
  }
})

it.each(['loading', 'missing-key', 'ready', 'error'])('onboarding handles %s without an undefined readiness state', async status => {
  const require = createRequire(import.meta.url)
  const path = require.resolve('@deepseek-ai/dsh-client-ui-settings-models/package.json').replace('package.json', 'lib/client.js')
  const source = (await readFile(path, 'utf8')).replace('exports.apply = apply;', 'exports.dialog = DeepSeekOnboardingDialog; exports.apply = apply;')
  let dialog
  const effects = []
  const react = { useState: initial => [initial, () => {}], useEffect: fn => effects.push(fn) }
  const jsx = (type, props) => ({ type, props })
  vm.runInNewContext(source, { window: { __ModuleLoader__: { load({ factory }) {
    dialog = factory(id => ({ react, 'react/jsx-runtime': { jsx, jsxs: jsx }, '@deepseek-ai/dsh-client-ui-primitives': {}, '@deepseek-ai/dsh-client-store': {} })[id]).dialog
  } } } })
  const row = { entry: { provider: 'deepseek-official', settingsNs: 'llm-deepseek', settingsPath: [], active: true }, apiKeyEnv: 'TEST_ONLY', credential: { configured: status === 'ready', writable: true } }
  const state = { status: status === 'error' ? 'error' : status === 'loading' ? 'loading' : 'ready', rows: status === 'loading' ? [] : [row], namespaces: new Map([['llm-deepseek', {}]]), credentialError: null, writable: true }
  let completed = 0
  const result = dialog({ automatic: true, explicit: false, useModels: fn => fn(state), complete: () => completed++, controller: { load() {} }, t: key => key, renderSlot: (_name, _props, options) => options.fallback })
  effects.forEach(fn => fn())
  expect(result === null).toBe(status !== 'missing-key')
  expect(completed).toBe(['ready', 'error'].includes(status) ? 1 : 0)
})
