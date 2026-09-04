import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { patchPath, projectRoot } from './patch-path'

const settingsModelsClient = path.join(
  projectRoot,
  'node_modules',
  '@deepseek-ai',
  'dsh-client-ui-settings-models',
  'lib',
  'client.js'
)

const piAiCatalogTypes = path.join(
  projectRoot,
  'node_modules',
  '@deepseek-ai',
  'dsh-llm-pi-ai',
  'lib',
  'types',
  'catalog.d.ts'
)

const piAiConfigTypes = path.join(
  projectRoot,
  'node_modules',
  '@deepseek-ai',
  'dsh-llm-pi-ai',
  'lib',
  'types',
  'config.d.ts'
)

interface ModelRow {
  id?: string
  name?: string
  reasoningEfforts?: false | Record<string, string | null>
  // #215 legacy shape, read only for migration-on-edit compatibility.
  reasoning?: {
    defaultEffort?: string
    efforts?: Array<{ id?: string; name?: string }>
  }
}

type ReasoningHelpers = {
  parseEffortList: (text: string) => string[]
  configuredReasoningEfforts: (model: ModelRow) => Record<string, string | null>
  reasoningEffortIds: (model: ModelRow) => string[]
  nextReasoningEfforts: (
    model: ModelRow,
    ids: string[]
  ) => Record<string, string | null> | undefined
}

async function loadReasoningHelpers(): Promise<ReasoningHelpers> {
  const client = await readFile(settingsModelsClient, 'utf8')
  const parseSource = client.match(
    /function parseEffortList\(text\) \{[\s\S]*?\n\t\t\}/
  )?.[0]
  const configuredSource = client.match(
    /function configuredReasoningEfforts\(model\) \{[\s\S]*?\n\t\t\}/
  )?.[0]
  const idsSource = client.match(
    /function reasoningEffortIds\(model\) \{[\s\S]*?\n\t\t\}/
  )?.[0]
  const nextSource = client.match(
    /function nextReasoningEfforts\(model, ids\) \{[\s\S]*?\n\t\t\}/
  )?.[0]

  expect(parseSource).toBeDefined()
  expect(configuredSource).toBeDefined()
  expect(idsSource).toBeDefined()
  expect(nextSource).toBeDefined()

  const factory = new Function(
    `${parseSource};${configuredSource};${idsSource};${nextSource};return { parseEffortList, configuredReasoningEfforts, reasoningEffortIds, nextReasoningEfforts }`
  )
  return factory() as ReasoningHelpers
}

function customProviderCardSource(client: string): string {
  const start = client.indexOf('function CustomProviderCard(props) {')
  const end = client.indexOf('\n\t\t//#endregion', start)

  expect(start).toBeGreaterThanOrEqual(0)
  expect(end).toBeGreaterThan(start)
  return client.slice(start, end)
}

function reasoningFieldSource(client: string): string {
  const start = client.indexOf('function ModelReasoningEffortsField(props) {')
  const end = client.indexOf('\n\t\t//#endregion', start)

  expect(start).toBeGreaterThanOrEqual(0)
  expect(end).toBeGreaterThan(start)
  return client.slice(start, end)
}

const staleReasoningWrite = ['patch(index, { ', 'reasoning: next'].join('')
const staleReasoningDefaultHelper = ['reasoning', 'Default('].join('')
const staleRehydrateLevelsHelper = ['rehydrate', 'Levels('].join('')
const staleDefaultLocaleKey = ['modelReasoning', 'Default'].join('')

describe('settings model reasoning effort field', () => {
  it('parses comma-separated IDs, ignores blanks, and preserves case', async () => {
    const { parseEffortList } = await loadReasoningHelpers()

    expect(parseEffortList('low, medium, high')).toEqual([
      'low',
      'medium',
      'high'
    ])
    expect(parseEffortList(' low ,  ,High ')).toEqual(['low', 'High'])
    expect(parseEffortList('')).toEqual([])
    expect(parseEffortList('   ')).toEqual([])
  })

  it('reads canonical mappings in order and treats false or missing as empty', async () => {
    const { configuredReasoningEfforts, reasoningEffortIds } =
      await loadReasoningHelpers()
    const model: ModelRow = {
      reasoningEfforts: { high: 'default', off: null, max: 'ultra' }
    }

    expect(configuredReasoningEfforts(model)).toEqual({
      high: 'default',
      off: null,
      max: 'ultra'
    })
    expect(reasoningEffortIds(model)).toEqual(['high', 'off', 'max'])
    expect(configuredReasoningEfforts({ reasoningEfforts: false })).toEqual({})
    expect(configuredReasoningEfforts({})).toEqual({})
  })

  it('reads valid legacy #215 IDs only when canonical IDs are absent', async () => {
    const { reasoningEffortIds } = await loadReasoningHelpers()
    const legacy: ModelRow = {
      reasoning: {
        defaultEffort: 'high',
        efforts: [
          { id: 'low', name: 'low' },
          { id: '  ', name: 'blank' },
          {},
          { id: 'High', name: 'High' }
        ]
      }
    }

    expect(reasoningEffortIds(legacy)).toEqual(['low', 'High'])
    expect(
      reasoningEffortIds({
        reasoningEfforts: { high: 'high' },
        reasoning: { efforts: [{ id: 'legacy', name: 'legacy' }] }
      })
    ).toEqual(['high'])
  })

  it('creates identity mappings for new IDs without normalizing them', async () => {
    const { nextReasoningEfforts } = await loadReasoningHelpers()

    expect(nextReasoningEfforts({}, ['low', 'medium', 'High'])).toEqual({
      low: 'low',
      medium: 'medium',
      High: 'High'
    })
  })

  it('preserves existing wire aliases and edited ID order', async () => {
    const { nextReasoningEfforts } = await loadReasoningHelpers()

    expect(
      nextReasoningEfforts(
        {
          reasoningEfforts: {
            off: null,
            high: 'default',
            max: 'ultra'
          }
        },
        ['off', 'high', 'max', 'xhigh']
      )
    ).toEqual({
      off: null,
      high: 'default',
      max: 'ultra',
      xhigh: 'xhigh'
    })
  })

  it('returns undefined when the declaration is cleared', async () => {
    const { nextReasoningEfforts } = await loadReasoningHelpers()

    expect(
      nextReasoningEfforts(
        {
          reasoning: {
            defaultEffort: 'high',
            efforts: [{ id: 'high', name: 'High' }]
          }
        },
        []
      )
    ).toBeUndefined()
  })

  it('writes the canonical field, removes legacy state, and preserves complete model rows', async () => {
    const client = await readFile(settingsModelsClient, 'utf8')
    const customProviderCard = customProviderCardSource(client)

    expect(client).toContain('function configuredReasoningEfforts(model)')
    expect(client).toContain('function reasoningEffortIds(model)')
    expect(client).toContain('function nextReasoningEfforts(model, ids)')
    expect(client).toMatch(
      /props\.onChange\(nextReasoningEfforts\(props\.model, parseEffortList\(event\.target\.value\)\)\);/
    )
    expect(client).toContain(
      'patch(index, { reasoningEfforts: next, reasoning: void 0 });'
    )
    expect(customProviderCard).toContain(
      'models: models.map((model) => ({ ...model }))'
    )
  })

  it('removes stale default UI and keeps the levels copy', async () => {
    const client = await readFile(settingsModelsClient, 'utf8')
    const field = reasoningFieldSource(client)

    expect(client).not.toContain(staleReasoningWrite)
    expect(client).not.toContain(staleReasoningDefaultHelper)
    expect(client).not.toContain(staleRehydrateLevelsHelper)
    expect(client).not.toContain(staleDefaultLocaleKey)
    expect(field).not.toContain('select')
    expect(field).not.toContain('defaultEffort')
    expect(client).toContain('modelReasoningLevels: "Reasoning effort levels"')
    expect(client).toContain(
      'modelReasoningLevelsPlaceholder: "e.g. low, medium, high"'
    )
    expect(client).toContain(
      'modelReasoningLevelsHint: "Comma-separated effort ids. These levels become selectable in chat; leave blank to remove the per-model declaration."'
    )
    expect(client).toContain('modelReasoningLevels: "推理等级"')
    expect(client).toContain(
      'modelReasoningLevelsHint: "使用英文逗号分隔推理等级；这些等级将在会话中可选择，留空则移除此模型的推理等级声明。"'
    )
  })

  it('guards the bundled adapter contract and the regenerated patch', async () => {
    const [catalogTypes, configTypes, patch] = await Promise.all([
      readFile(piAiCatalogTypes, 'utf8'),
      readFile(piAiConfigTypes, 'utf8'),
      readFile(patchPath('@deepseek-ai/dsh-client-ui-settings-models'), 'utf8')
    ])

    expect(catalogTypes).toMatch(
      /reasoningEfforts\?:\s*false\s*\|\s*PiAiReasoningEfforts/
    )
    expect(configTypes).toMatch(
      /PiAiReasoningEfforts[\s\S]*from '\.\/catalog\.ts'/
    )
    expect(patch).toContain('function configuredReasoningEfforts(model)')
    expect(patch).toContain('function reasoningEffortIds(model)')
    expect(patch).toContain('function nextReasoningEfforts(model, ids)')
    expect(patch).toContain('reasoningEfforts: next')
    expect(patch).toContain('reasoning: void 0')
    expect(patch).not.toContain(staleReasoningWrite)
    expect(patch).not.toContain(staleDefaultLocaleKey)
  })
})
