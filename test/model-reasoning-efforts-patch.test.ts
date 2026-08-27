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

interface ModelRow {
  id?: string
  name?: string
  reasoning?: {
    defaultEffort?: string
    efforts?: Array<{ id: string; name: string }>
  }
}

async function loadReasoningHelpers(): Promise<{
  parseEffortList: (text: string) => string[]
  rehydrateLevels: (ids: string[], previous: Array<{ id: string; name: string }>) => Array<{ id: string; name: string }>
  reasoningEfforts: (model: ModelRow) => Array<{ id: string; name: string }>
  nextReasoning: (model: ModelRow, ids: string[]) => { defaultEffort: string; efforts: Array<{ id: string; name: string }> } | undefined
}> {
  const client = await readFile(settingsModelsClient, 'utf8')
  const parseSource = client.match(
    /function parseEffortList\(text\) \{[\s\S]*?\n\t\t\}/
  )?.[0]
  const rehydrateSource = client.match(
    /function rehydrateLevels\(ids, previous\) \{[\s\S]*?\n\t\t\}/
  )?.[0]
  const nextSource = client.match(
    /function nextReasoning\(model, ids\) \{[\s\S]*?\n\t\t\}/
  )?.[0]
  const effortsSource = client.match(
    /function reasoningEfforts\(model\) \{[\s\S]*?\n\t\t\}/
  )?.[0]
  const defaultSource = client.match(
    /function reasoningDefault\(model\) \{[\s\S]*?\n\t\t\}/
  )?.[0]

  expect(parseSource).toBeDefined()
  expect(rehydrateSource).toBeDefined()
  expect(nextSource).toBeDefined()
  expect(effortsSource).toBeDefined()
  expect(defaultSource).toBeDefined()

  const factory = new Function(
    `${parseSource};${effortsSource};${defaultSource};${rehydrateSource};${nextSource};return { parseEffortList, reasoningEfforts, reasoningDefault, rehydrateLevels, nextReasoning }`
  )
  return factory() as ReturnType<typeof loadReasoningHelpers> extends Promise<infer T> ? T : never
}

function customProviderCardSource(client: string): string {
  const start = client.indexOf('function CustomProviderCard(props) {')
  const end = client.indexOf('\n\t\t//#endregion', start)

  expect(start).toBeGreaterThanOrEqual(0)
  expect(end).toBeGreaterThan(start)
  return client.slice(start, end)
}

describe('settings model reasoning effort field', () => {
  it('ships a comma-separated list parser that ignores blank entries', async () => {
    const { parseEffortList } = await loadReasoningHelpers()

    expect(parseEffortList('low, medium, high')).toEqual(['low', 'medium', 'high'])
    expect(parseEffortList(' low ,  ,high ')).toEqual(['low', 'high'])
    expect(parseEffortList('')).toEqual([])
    expect(parseEffortList('   ')).toEqual([])
  })

  it('preserves the user-given display name when an id reappears after edit', async () => {
    const { rehydrateLevels } = await loadReasoningHelpers()

    const previous = [
      { id: 'low', name: 'Low (cheap)' },
      { id: 'medium', name: 'Medium' }
    ]
    const rehydrated = rehydrateLevels(['low', 'high'], previous)
    expect(rehydrated).toEqual([
      { id: 'low', name: 'Low (cheap)' },
      { id: 'high', name: 'high' }
    ])
  })

  it('drops the reasoning capability when the list becomes empty', async () => {
    const { nextReasoning } = await loadReasoningHelpers()

    expect(
      nextReasoning(
        {
          id: 'o1',
          reasoning: { defaultEffort: 'high', efforts: [{ id: 'high', name: 'High' }] }
        },
        []
      )
    ).toBeUndefined()
  })

  it('keeps the default effort if it survives the edit, else falls back to the first id', async () => {
    const { nextReasoning } = await loadReasoningHelpers()

    const preserved = nextReasoning(
      {
        id: 'o1',
        reasoning: { defaultEffort: 'medium', efforts: [{ id: 'medium', name: 'Medium' }] }
      },
      ['low', 'medium', 'high']
    )
    expect(preserved).toEqual({
      defaultEffort: 'medium',
      efforts: [
        { id: 'low', name: 'low' },
        { id: 'medium', name: 'Medium' },
        { id: 'high', name: 'high' }
      ]
    })

    const fallback = nextReasoning(
      {
        id: 'o1',
        reasoning: { defaultEffort: 'extreme', efforts: [{ id: 'extreme', name: 'Extreme' }] }
      },
      ['low', 'high']
    )
    expect(fallback).toEqual({
      defaultEffort: 'low',
      efforts: [
        { id: 'low', name: 'low' },
        { id: 'high', name: 'high' }
      ]
    })
  })

  it('renders the field in the model-list advanced area', async () => {
    const client = await readFile(settingsModelsClient, 'utf8')

    expect(client).toContain('function ModelReasoningEffortsField(props)')
    expect(client).toContain('className: "dshModelReasoningField"')
    expect(client).toContain('className: "dshModelReasoningHint"')
    expect(client).toMatch(
      /props\.onChange\(nextReasoning\(props\.model, parseEffortList\(event\.target\.value\)\)\);/
    )
    expect(client).toContain('patch(index, { reasoning: next });')
  })

  it('provides Chinese and English copy for the reasoning effort field', async () => {
    const client = await readFile(settingsModelsClient, 'utf8')

    expect(client).toContain('modelReasoningLevels: "Reasoning effort levels"')
    expect(client).toContain('modelReasoningDefault: "Default effort"')
    expect(client).toContain('modelReasoningLevelsHint: "Comma-separated')
    expect(client).toContain('modelReasoningLevels: "推理等级"')
    expect(client).toContain('modelReasoningDefault: "默认等级"')
    expect(client).toContain('modelReasoningLevelsHint: "使用英文逗号分隔')
  })

  it('captures the reasoning field in the reproducible dependency patch', async () => {
    const patch = await readFile(
      patchPath('@deepseek-ai/dsh-client-ui-settings-models'),
      'utf8'
    )

    expect(patch).toContain('function ModelReasoningEffortsField(props)')
    expect(patch).toContain('function parseEffortList(text)')
    expect(patch).toContain('function rehydrateLevels(ids, previous)')
    expect(patch).toContain('function nextReasoning(model, ids)')
    expect(patch).toContain('className: "dshModelReasoningField"')
    expect(patch).toContain('modelReasoningLevels: "Reasoning effort levels"')
    expect(patch).toContain('modelReasoningLevels: "推理等级"')
    expect(patch).toContain('patch(index, { reasoning: next });')
  })
})
