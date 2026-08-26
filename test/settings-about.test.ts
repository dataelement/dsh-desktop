import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'

type ClientBundle = Record<string, unknown>
type ComponentType<Props> = (props: Props) => unknown

type AboutInfo = {
  productName: string
  version: string
  releaseNotes: Array<{
    version: string
    date: string
    items: string[]
  }>
}

type BundleDescriptor = {
  factory(require: (id: string) => unknown): ClientBundle
}

const requireModule = createRequire(import.meta.url)
const react = requireModule('react') as {
  createElement(type: unknown, props?: unknown, ...children: unknown[]): unknown
}
const jsxRuntime = requireModule('react/jsx-runtime')
const { createElement } = react
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

async function loadSettingsBundle(): Promise<ClientBundle> {
  const source = await readFile(
    'node_modules/@deepseek-ai/dsh-client-ui-settings-general/lib/client.js',
    'utf8'
  )
  let descriptor: BundleDescriptor | undefined
  const document = {
    querySelector: () => null,
    createElement: () => ({ dataset: {} as Record<string, string>, textContent: '' }),
    head: { appendChild: () => undefined }
  }

  runInNewContext(source, {
    document,
    window: {
      sherlockAbout: {
        getInfo: async (): Promise<AboutInfo> => ({
          productName: 'Sherlock',
          version: '0.6.7',
          releaseNotes: []
        })
      },
      __ModuleLoader__: {
        load(value: BundleDescriptor) {
          descriptor = value
        }
      }
    }
  })
  if (descriptor === undefined) throw new Error('settings bundle did not register')

  const primitives = new Proxy(
    {
      IconQuestionOutline14: (props: Record<string, unknown>) =>
        createElement('svg', { ...props, 'data-icon': 'about' })
    },
    {
      get(target, property) {
        return Reflect.get(target, property) ?? (() => null)
      }
    }
  )

  return descriptor.factory((id) => {
    if (id === 'react') return react
    if (id === 'react/jsx-runtime') return jsxRuntime
    if (id === '@deepseek-ai/dsh-client-ui-primitives') return primitives
    return fakeModule()
  })
}

describe('Sherlock About settings', () => {
  it('builds localized release notes around the real runtime version', async () => {
    const aboutModule = await import('../src/preload/about-info').catch(() => null)

    expect(aboutModule).not.toBeNull()
    if (aboutModule === null) return

    const zh = aboutModule.buildSherlockAboutInfo('9.8.7', 'zh')
    const en = aboutModule.buildSherlockAboutInfo('9.8.7', 'en')

    expect(zh.productName).toBe('Sherlock')
    expect(zh.version).toBe('9.8.7')
    expect(zh.releaseNotes[0]).toEqual({
      version: '0.7.0',
      date: '2026-08-25',
      items: [
        '新增研究画布，与对话和轨迹并列切换',
        '新增关于页面，可查看当前版本和更新日志',
        '正式安装包内置 Memory、附件上传与工作区插件',
        '记忆、技能、待办与 Memory Evolve 设置仅在开发者模式显示'
      ]
    })
    expect(en.version).toBe('9.8.7')
    expect(en.releaseNotes[0]?.items[0]).toBe(
      'Added a Research canvas alongside Chat and Trajectory'
    )

    const bridge = aboutModule.createSherlockAboutBridge(
      async () => ({ currentVersion: '7.6.5' }),
      'zh'
    )
    expect((await bridge.getInfo()).version).toBe('7.6.5')
  })

  it('registers About immediately after Models in the settings navigation', async () => {
    const bundle = await loadSettingsBundle()
    const registrations: Array<{ options: Record<string, unknown>; component: unknown }> = []
    const translate = (key: string) =>
      ({ 'about.nav': '关于', 'general.nav': '通用设置' })[key] ?? key
    const ctx = {
      effect: (factory: () => unknown) => factory(),
      on: () => () => undefined,
      get: () => ({ isLoopback: false }),
      locale: {
        register: () => () => undefined,
        bind: () => translate,
        getSnapshot: () => ({ revision: 0 }),
        subscribe: () => () => undefined
      },
      slots: {
        inject: (_name: string, factory: () => unknown) => factory(),
        register: (options: Record<string, unknown>, component: unknown) => {
          registrations.push({ options, component })
          return () => undefined
        },
        getVersion: () => 0,
        entries: () => [],
        subscribe: () => () => undefined
      }
    }

    const apply = bundle.apply
    expect(apply).toBeTypeOf('function')
    if (typeof apply !== 'function') return
    apply(ctx)

    const about = registrations.find(({ options }) => options.id === 'about')
    expect(about?.options).toMatchObject({
      name: 'settings.section',
      id: 'about',
      order: 11,
      label: expect.any(Function)
    })
    expect((about?.options.label as (() => string) | undefined)?.()).toBe('关于')
  })

  it('renders the current version and every supplied release-note item', async () => {
    const bundle = await loadSettingsBundle()
    const AboutContent = bundle.SherlockAboutContent
    expect(AboutContent).toBeTypeOf('function')
    if (typeof AboutContent !== 'function') return

    const info: AboutInfo = {
      productName: 'Sherlock',
      version: '0.7.0',
      releaseNotes: [
        {
      version: '0.7.0',
          date: '2026-08-25',
          items: ['新增研究画布', '隐藏开发者标签页']
        }
      ]
    }
    const html = renderToStaticMarkup(
      createElement(AboutContent as ComponentType<{ info: AboutInfo; t(key: string): string }>, {
        info,
        t: (key: string) =>
          ({
            'about.version': '当前版本',
            'about.changelog': '更新日志'
          })[key] ?? key
      })
    )

    expect(html).toContain('Sherlock')
    expect(html).toContain('当前版本 0.7.0')
    expect(html).toContain('更新日志')
    expect(html).toContain('新增研究画布')
    expect(html).toContain('隐藏开发者标签页')
  })
})
