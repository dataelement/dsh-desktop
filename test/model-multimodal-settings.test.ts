import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'

type ClientBundle = Record<string, unknown>
type BundleDescriptor = {
  factory(require: (id: string) => unknown): ClientBundle
}

const requireModule = createRequire(import.meta.url)
const react = requireModule('react') as {
  createElement(type: unknown, props?: unknown, ...children: unknown[]): unknown
}
const { renderToStaticMarkup } = requireModule('react-dom/server') as {
  renderToStaticMarkup(node: unknown): string
}

function fakeModule(): unknown {
  let fake: unknown
  const target = function () {}
  fake = new Proxy(target, {
    get: () => fake,
    apply: () => fake,
    construct: () => ({})
  })
  return fake
}

async function loadModelsBundle(): Promise<ClientBundle> {
  const source = await readFile(
    'node_modules/@deepseek-ai/dsh-client-ui-settings-models/lib/client.js',
    'utf8'
  )
  let descriptor: BundleDescriptor | undefined
  runInNewContext(source, {
    window: {
      __ModuleLoader__: {
        load(value: BundleDescriptor) {
          descriptor = value
        }
      }
    }
  })
  if (descriptor === undefined) throw new Error('models bundle did not register')

  const primitives = new Proxy(
    {},
    { get: () => () => null }
  )
  return descriptor.factory((id) => {
    if (id === 'react') return react
    if (id === 'react/jsx-runtime') return requireModule('react/jsx-runtime')
    if (id === '@deepseek-ai/dsh-client-ui-primitives') return primitives
    return fakeModule()
  })
}

describe('multimodal model settings', () => {
  it('persists the image modality and renders a checked Vision control', async () => {
    const bundle = await loadModelsBundle()
    const modelInputForVision = bundle.modelInputForVision
    const ModelListEditor = bundle.ModelListEditor
    expect(modelInputForVision).toBeTypeOf('function')
    expect(ModelListEditor).toBeTypeOf('function')
    if (typeof modelInputForVision !== 'function' || typeof ModelListEditor !== 'function') return

    const enabled = modelInputForVision({ id: 'vision-test' }, true) as string[]
    const disabled = modelInputForVision(
      { id: 'vision-test', input: ['text', 'image'] },
      false
    ) as string[]
    expect(Array.from(enabled)).toEqual(['text', 'image'])
    expect(Array.from(disabled)).toEqual(['text'])

    const { Config } = requireModule('@deepseek-ai/dsh-llm-pi-ai') as {
      Config(value: unknown): {
        providers: Record<string, { models: Array<{ input: string[] }> }>
      }
    }
    const harnessConfig = Config({
      providers: {
        custom: {
          api: 'openai-responses',
          baseURL: 'https://example.test/v1',
          models: [{ id: 'vision-test', input: enabled }]
        }
      }
    })
    expect(harnessConfig.providers.custom?.models[0]?.input).toEqual(['text', 'image'])

    const copy: Record<string, string> = {
      models: '模型目录',
      modelsCustomized: '已自定义模型目录',
      modelId: '模型 ID',
      modelName: '显示名称',
      modelVision: '视觉',
      modelAdvanced: '容量',
      removeModel: '删除模型',
      addModel: '添加模型',
      fetchModels: '获取可用模型'
    }
    const html = renderToStaticMarkup(
      react.createElement(ModelListEditor, {
        models: [{ id: 'vision-test', name: 'Vision Test', input: enabled }],
        onChange: () => undefined,
        probe: { provider: 'custom' },
        api: { llm: { discoverModels: async () => undefined } },
        t: (key: string) => copy[key] ?? key,
        disabled: false,
        overridden: true
      })
    )
    expect(html).toContain('data-model-vision="true"')
    expect(html).toContain('checked=""')
    expect(html).toContain('视觉')
  })
})
