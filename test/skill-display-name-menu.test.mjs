import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { expect, it } from 'vitest'

// Execute the shipped candidate projection and ranking, not a duplicate mapper.
const client = readFileSync('node_modules/@deepseek-ai/dsh-client-ui-skill/lib/client.js', 'utf8')
const primitives = readFileSync('node_modules/@deepseek-ai/dsh-client-ui-primitives/lib/index.js', 'utf8')
const start = client.indexOf('return (0, _deepseek_ai_dsh_client_ui_primitives.rankByName)(skills')
const end = client.indexOf('}));', start) + 5
const rankStart = primitives.indexOf('function boundaryBonus(')
const rankEnd = primitives.indexOf('//#endregion', primitives.indexOf('function rankByName('))
if (start < 0 || rankStart < 0) throw new Error('Missing shipped candidate/rank implementation')
const project = vm.runInNewContext(
  '(function(skills, query) {' + primitives.slice(rankStart, rankEnd) +
  'const _deepseek_ai_dsh_client_ui_primitives = { rankByName }; const t = key => key;' +
  client.slice(start, end) + '})'
)

it('searches provider display labels and preserves descriptions independently of invocation keys', () => {
  const internal = 'provider-123456789012345678901234-22'
  const result = project([
    { name: internal, displayName: '合同审核', description: '审核合同条款', modelInvocable: false },
    { name: 'local-skill', description: 'local description', modelInvocable: true }
  ], '合同')
  expect(result).toHaveLength(1)
  expect(result[0]).toEqual({ name: internal, label: '合同审核', hideAlias: true, description: '审核合同条款' })
})

it('preserves user-only captions when no display label is supplied', () => {
  expect(project([{ name: 'local-only', description: 'Local description', modelInvocable: false }], '')[0])
    .toEqual({ name: 'local-only', description: 'menu.userOnly · Local description' })
})

it('preserves local skill descriptions and existing invocation keys', () => {
  expect(project([{ name: 'local-skill', description: 'local description', modelInvocable: true }], '')[0])
    .toEqual({ name: 'local-skill', description: 'local description' })
})
