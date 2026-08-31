import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
import { Window } from 'happy-dom'
import { describe, expect, it, vi } from 'vitest'

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
  act(callback: () => void | Promise<void>): Promise<void>
}
const jsxRuntime = requireModule('react/jsx-runtime')
const { createElement } = react
const { act } = react
const { createRoot } = requireModule('react-dom/client') as {
  createRoot(container: unknown): { render(node: unknown): void; unmount(): void }
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

type AboutBridge = {
  getInfo(): Promise<AboutInfo>
  checkForUpdates(): Promise<{
    phase: string
    currentVersion: string
    availableVersion?: string
    manual: boolean
  }>
}

async function loadSettingsBundle(options?: {
  browserWindow?: Window
  aboutBridge?: AboutBridge
}): Promise<ClientBundle> {
  const source = await readFile(
    'node_modules/@deepseek-ai/dsh-client-ui-settings-general/lib/client.js',
    'utf8'
  )
  let descriptor: BundleDescriptor | undefined
  const document = options?.browserWindow?.document ?? {
    querySelector: () => null,
    createElement: () => ({ dataset: {} as Record<string, string>, textContent: '' }),
    head: { appendChild: () => undefined }
  }
  const bundleWindow = options?.browserWindow ?? {}
  Object.assign(bundleWindow, {
    sherlockAbout: options?.aboutBridge ?? {
      getInfo: async (): Promise<AboutInfo> => ({
        productName: 'Sherlock',
        version: '0.6.7',
        releaseNotes: []
      }),
      checkForUpdates: async () => ({
        phase: 'up-to-date',
        currentVersion: '0.6.7',
        manual: true
      })
    },
    __ModuleLoader__: {
      load(value: BundleDescriptor) {
        descriptor = value
      }
    }
  })

  runInNewContext(source, {
    document,
    window: bundleWindow
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

function installBrowserGlobals(browserWindow: Window): () => void {
  const keys = ['window', 'document', 'navigator', 'IS_REACT_ACT_ENVIRONMENT'] as const
  const descriptors = new Map(
    keys.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)])
  )
  Object.defineProperties(globalThis, {
    window: { configurable: true, value: browserWindow },
    document: { configurable: true, value: browserWindow.document },
    navigator: { configurable: true, value: browserWindow.navigator },
    IS_REACT_ACT_ENVIRONMENT: { configurable: true, value: true }
  })
  return () => {
    for (const key of keys) {
      const descriptor = descriptors.get(key)
      if (descriptor === undefined) delete (globalThis as Record<string, unknown>)[key]
      else Object.defineProperty(globalThis, key, descriptor)
    }
  }
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
      version: '0.7.4',
      date: '2026-08-31',
      items: [
        '统一 Sherlock Agent 品牌表述，并修正部分会话中用户消息与助手回复的显示顺序',
        '修复退出客户端时访问已销毁窗口导致的 JavaScript 报错',
        '完善研究画布引用交互：点击文件、PPT 或助手回复组件即可选中并作为输入标签引用，PPT 组件不再显示下载按钮',
        '优化研究输入标签：支持在标签之间准确放置光标，清晰显示输入位置，并消除选中时的抖动和位移',
        '输入框可随内容行数自适应增高，画布中的助手回复内容支持直接编辑',
        '对话和研究模式统一使用文件标签：按类型显示图标，悬停可查看包含后缀的完整文件名，并在发送时保留完整路径',
        '完整汉化权限菜单，并优化研究组件、侧栏和输入框的交互细节'
      ]
    })
    expect(zh.releaseNotes[1]?.version).toBe('0.7.3')
    expect(en.version).toBe('9.8.7')
    expect(en.releaseNotes[0]?.items[0]).toBe(
      'Standardized Sherlock Agent branding and fixed the display order of user messages and assistant replies in affected conversations'
    )

    const manualCheck = vi.fn(async () => ({
      phase: 'up-to-date' as const,
      currentVersion: '7.6.5',
      manual: true
    }))
    const bridge = aboutModule.createSherlockAboutBridge(
      async () => ({ currentVersion: '7.6.5' }),
      manualCheck,
      'zh'
    )
    expect((await bridge.getInfo()).version).toBe('7.6.5')
    await expect(bridge.checkForUpdates()).resolves.toMatchObject({ phase: 'up-to-date' })
    expect(manualCheck).toHaveBeenCalledOnce()
  })

  it('checks for updates from About and reports the result in place', async () => {
    const browserWindow = new Window({ url: 'https://sherlock.local/settings/about' })
    const restoreGlobals = installBrowserGlobals(browserWindow)
    const checkForUpdates = vi.fn(async () => ({
      phase: 'up-to-date',
      currentVersion: '0.7.2',
      manual: true
    }))
    const bundle = await loadSettingsBundle({
      browserWindow,
      aboutBridge: {
        getInfo: async () => ({
          productName: 'Sherlock',
          version: '0.7.2',
          releaseNotes: []
        }),
        checkForUpdates
      }
    })
    const AboutSection = bundle.SherlockAboutSection
    expect(AboutSection).toBeTypeOf('function')
    if (typeof AboutSection !== 'function') {
      restoreGlobals()
      return
    }

    const host = browserWindow.document.createElement('div')
    browserWindow.document.body.appendChild(host)
    const root = createRoot(host)
    const copy: Record<string, string> = {
      'about.version': '当前版本',
      'about.changelog': '更新日志',
      'about.empty': '暂无更新日志',
      'about.loading': '正在读取版本信息…',
      'about.error': '暂时无法读取版本信息',
      'about.check': '检查更新',
      'about.checking': '正在检查更新…',
      'about.upToDate': 'Sherlock 已是最新版本',
      'about.updateAvailable': '发现新版本 {version}',
      'about.checkFailed': '检查更新失败'
    }

    try {
      await act(async () => {
        root.render(
          createElement(AboutSection as ComponentType<{ t(key: string): string }>, {
            t: (key: string) => copy[key] ?? key
          })
        )
      })
      const button = host.querySelector('[data-about-check-update]') as {
        textContent: string | null
        click(): void
      } | null
      expect(button?.textContent).toBe('检查更新')

      await act(async () => {
        button?.click()
      })
      expect(checkForUpdates).toHaveBeenCalledOnce()
      expect(host.textContent).toContain('Sherlock 已是最新版本')
    } finally {
      await act(async () => root.unmount())
      restoreGlobals()
    }
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
