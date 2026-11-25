import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { expect, it } from 'vitest'

// Execute the shipped client bundle and rank implementation, not a duplicate mapper.
const client = readFileSync('node_modules/@deepseek-ai/dsh-client-ui-skill/lib/client.js', 'utf8')
const primitives = readFileSync('node_modules/@deepseek-ai/dsh-client-ui-primitives/lib/index.js', 'utf8')
const rankStart = primitives.indexOf('function boundaryBonus(')
const rankEnd = primitives.indexOf('//#endregion', primitives.indexOf('function rankByName('))
if (rankStart < 0 || rankEnd < 0) throw new Error('Missing shipped rankByName implementation')
const { rankByName } = vm.runInNewContext(primitives.slice(rankStart, rankEnd) + '; ({ rankByName })')

let definition
vm.runInNewContext(client, {
  AbortController,
  window: { __ModuleLoader__: { load: (value) => { definition = value } } }
})
if (!definition) throw new Error('Missing shipped skill UI module definition')

const noop = () => () => {}
const createSkillSource = (catalog) => {
  let registered
  const plugin = definition.factory((id) => {
    if (id === '@deepseek-ai/dsh-client-ui-primitives') return { rankByName }
    if (id === 'react' || id === 'react/jsx-runtime') return {}
    throw new Error(`Unexpected dependency: ${id}`)
  })
  plugin.apply({
    effect: (setup) => setup?.(),
    locale: { register: noop, bind: () => (key) => key },
    uiConversation: { userText: { register: noop } },
    slots: { inject: noop, register: noop },
    remote: {
      $on: noop,
      skills: { list: async () => ({ ok: true, value: { skills: catalog } }) }
    },
    sessions: {
      subagentAddress: () => undefined,
      binding: () => ({}),
      using: async (_id, _opts, fn) => fn({ binding: { session: { getSnapshot: () => ({ openState: 'open' }) } } }),
      scope: () => undefined,
      list: { getSnapshot: () => ({ byId: {} }) }
    },
    sidebarRight: { openResource: noop },
    on: noop,
    get: (name) => {
      if (name === 'inputTriggers') return { registerSource: (source) => { registered = source; return () => {} } }
      return undefined
    }
  })
  if (!registered) throw new Error('Skill source was not registered')
  return registered
}

const project = (skills, query) =>
  createSkillSource(skills).candidates({ sessionId: 's1' }, { query, signal: new AbortController().signal })

it('searches provider display labels and preserves descriptions independently of invocation keys', async () => {
  const internal = 'provider-123456789012345678901234-22'
  const items = [
    { name: internal, displayName: '合同审核', description: '审核合同条款', modelInvocable: false },
    { name: 'local-skill', description: 'local description', modelInvocable: true }
  ]
  const byLabel = await project(items, '合同')
  expect(byLabel).toHaveLength(1)
  expect(byLabel[0]).toEqual({ name: internal, label: '合同审核', hideAlias: true, description: '审核合同条款' })
  const byName = await project(items, 'provider-')
  expect(byName).toHaveLength(1)
  expect(byName[0]).toEqual({ name: internal, label: '合同审核', hideAlias: true, description: '审核合同条款' })
})

it('preserves user-only captions when no display label is supplied', async () => {
  expect((await project([{ name: 'local-only', description: 'Local description', modelInvocable: false }], ''))[0])
    .toEqual({ name: 'local-only', description: 'menu.userOnly · Local description' })
})

it('preserves local skill descriptions and existing invocation keys', async () => {
  expect((await project([{ name: 'local-skill', description: 'local description', modelInvocable: true }], ''))[0])
    .toEqual({ name: 'local-skill', description: 'local description' })
})
