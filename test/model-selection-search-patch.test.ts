import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { patchPath, projectRoot } from './patch-path'

const modelSelectionClient = path.join(
  projectRoot,
  'node_modules',
  '@deepseek-ai',
  'dsh-client-ui-model-selection',
  'lib',
  'client.js'
)

interface ModelRow {
  id: string
  name: string
  description?: string
}

interface ModelGroup {
  id: string
  name: string
  models: ModelRow[]
}

async function loadFilter(): Promise<
  (groups: ModelGroup[], query: string) => ModelGroup[]
> {
  const client = await readFile(modelSelectionClient, 'utf8')
  const source = client.match(
    /function filterModelGroups\(groups, query\) \{[\s\S]*?\n\t\t\}/
  )?.[0]

  expect(source).toBeDefined()
  return Function(`${source}; return filterModelGroups`)() as (
    groups: ModelGroup[],
    query: string
  ) => ModelGroup[]
}

describe('composer model search', () => {
  const groups: ModelGroup[] = [
    {
      id: 'tokenrouter',
      name: 'Token Router',
      models: [
        { id: 'openai/gpt-5.6-luna', name: 'GPT-5.6 Luna' },
        { id: 'qwen/qwen3.7-max', name: 'Qwen 3.7 Max' }
      ]
    },
    {
      id: 'deepseek',
      name: 'DeepSeek',
      models: [{ id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro' }]
    }
  ]

  it('filters model names and ids without losing provider grouping', async () => {
    const filter = await loadFilter()

    expect(filter(groups, 'luna')).toEqual([
      { ...groups[0]!, models: [groups[0]!.models[0]!] }
    ])
    expect(filter(groups, 'deepseek-v4')).toEqual([groups[1]!])
    expect(filter(groups, 'missing')).toEqual([])
  })

  it('matches a provider by display name or id and keeps all its models', async () => {
    const filter = await loadFilter()

    expect(filter(groups, 'token router')).toEqual([groups[0]!])
    expect(filter(groups, 'DEEPSEEK')).toEqual([groups[1]!])
  })

  it('renders an accessible localized search field and empty state', async () => {
    const client = await readFile(modelSelectionClient, 'utf8')

    expect(client).toContain('type: "search"')
    expect(client).toContain('role: "searchbox"')
    expect(client).toContain('search.placeholder": "搜索模型或服务商"')
    expect(client).toContain('empty.search": "没有找到匹配的模型。"')
    expect(client).toContain('search.placeholder": "Search models or providers"')
    expect(client).toContain('empty.search": "No matching models."')
  })

  it('captures the search behavior in the reproducible dependency patch', async () => {
    const patch = await readFile(
      patchPath('@deepseek-ai/dsh-client-ui-model-selection'),
      'utf8'
    )

    expect(patch).toContain('function filterModelGroups(groups, query)')
    expect(patch).toContain('IconSearchOutlineRegular')
    expect(patch).toContain('children: filteredGroups.map((group)')
  })
})
