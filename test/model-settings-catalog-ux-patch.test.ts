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
}

async function loadSearch(): Promise<
  (models: ModelRow[], query: string) => Array<{ model: ModelRow; index: number }>
> {
  const client = await readFile(settingsModelsClient, 'utf8')
  const source = client.match(
    /function searchableModelEntries\(models, query\) \{[\s\S]*?\n\t\t\}/
  )?.[0]

  expect(source).toBeDefined()
  return Function(`${source}; return searchableModelEntries`)() as (
    models: ModelRow[],
    query: string
  ) => Array<{ model: ModelRow; index: number }>
}

function customProviderCardSource(client: string): string {
  const start = client.indexOf('function CustomProviderCard(props) {')
  const end = client.indexOf('\n\t\t//#endregion', start)

  expect(start).toBeGreaterThanOrEqual(0)
  expect(end).toBeGreaterThan(start)
  return client.slice(start, end)
}

describe('settings model catalog search', () => {
  const models: ModelRow[] = [
    { id: 'qwen3.8-max', name: 'Qwen Max' },
    { id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro' },
    { id: 'openai/gpt-5.6-luna', name: 'Luna' }
  ]

  it('matches model ids and display names while preserving source indexes', async () => {
    const search = await loadSearch()

    expect(search(models, 'MAX')).toEqual([{ model: models[0]!, index: 0 }])
    expect(search(models, 'deepseek-v4')).toEqual([
      { model: models[1]!, index: 1 }
    ])
    expect(search(models, 'luna')).toEqual([{ model: models[2]!, index: 2 }])
    expect(search(models, 'missing')).toEqual([])
  })

  it('keeps every row and index when the query is blank', async () => {
    const search = await loadSearch()

    expect(search(models, '  ')).toEqual(
      models.map((model, index) => ({ model, index }))
    )
  })

  it('uses the shared search in both adapter catalog editors', async () => {
    const client = await readFile(settingsModelsClient, 'utf8')

    expect(client.match(/jsx\)\(ModelCatalogSearch/g)).toHaveLength(2)
    expect(client.match(/visibleModels\.map\(\(\{ model, index \}\)/g)).toHaveLength(2)
    expect(client).toContain('modelSearch: "Search models"')
    expect(client).toContain('modelSearch: "搜索模型"')
    expect(client).toContain('modelSearchEmpty: "没有找到匹配的模型。"')
  })

  it('provides search state when the custom-provider form renders its model editor', async () => {
    const client = await readFile(settingsModelsClient, 'utf8')
    const customProviderCard = customProviderCardSource(client)

    expect(customProviderCard).toContain(
      'const [modelQuery, setModelQuery] = (0, react.useState)("")'
    )
    expect(customProviderCard).toMatch(
      /jsx\)\(ModelListEditor, \{[\s\S]*?modelQuery,[\s\S]*?onModelQueryChange: setModelQuery/
    )
  })

  it('keeps an add-model action in the custom-provider creation form', async () => {
    const client = await readFile(settingsModelsClient, 'utf8')
    const customProviderCard = customProviderCardSource(client)

    expect(customProviderCard).toContain(
      'setModels((current) => [...current.map((model) => ({ ...model })), { id: "" }])'
    )
    expect(customProviderCard).toContain('setModelQuery("")')
    expect(customProviderCard).toContain(
      'className: ModelsSection_module_css_default["addModelButton"]'
    )
    expect(customProviderCard).toContain(
      'className: "dshProviderEditorStickyFooter"'
    )
    expect(customProviderCard).toContain('disabled: profileDisabled')
    expect(customProviderCard).toContain('onClick: addModel')
    expect(customProviderCard).toContain('jsx)(EditorFooter, {')
    expect(customProviderCard.match(/onClick: addModel/g)).toHaveLength(1)
  })
})

describe('settings provider editor sticky actions', () => {
  it('only freezes add, cancel, and submit while custom settings are expanded', async () => {
    const client = await readFile(settingsModelsClient, 'utf8')

    expect(client).toContain('.dshProviderEditorStickyFooter{')
    expect(client).toContain('position:sticky;bottom:-24px')
    expect(client).toContain(
      '.dshProviderEditorExpanded .zGbnIq_customizedBody{padding-bottom:72px}'
    )
    expect(client).toContain('" dshProviderEditorExpanded"')
    expect(client).toContain(
      'props.credentialOnly === true || !customizedOpen || layout === "unknown"'
    )
    expect(client).toContain('className: "dshProviderEditorStickyFooter"')
    expect(client).toContain('onClick: addModel')
    expect(client).toContain('jsx)(EditorFooter, { ...footerProps })')
  })

  it('captures search and sticky actions in the reproducible package patch', async () => {
    const patch = await readFile(
      patchPath('@deepseek-ai/dsh-client-ui-settings-models'),
      'utf8'
    )

    expect(patch).toContain('function searchableModelEntries(models, query)')
    expect(patch).toContain('ModelCatalogSearch')
    expect(patch).toContain(
      'const [modelQuery, setModelQuery] = (0, react.useState)("")'
    )
    expect(patch).toContain('onModelQueryChange: setModelQuery')
    expect(patch).toContain('dshProviderEditorStickyFooter')
    expect(patch).toContain('onClick: addModel')
    expect(patch).toContain(
      'setModels((current) => [...current.map((model) => ({ ...model })), { id: "" }])'
    )
    expect(patch).toContain(
      'className: ModelsSection_module_css_default["addModelButton"]'
    )
  })
})
