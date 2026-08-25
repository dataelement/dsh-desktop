import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import {
  extractPluginName,
  isPluginLoadError,
  pluginErrorMessage
} from '../src/preload/plugin-error-view'
import {
  BOOT_FAILURE_ROOT_SELECTOR,
  findBootFailureText
} from '../src/preload/boot-failure'

const sampleLoaderError =
  'failed to import loader entry 516a3af0 (@linxin666/dsh-client-ui-web-ui-settings): client-modules: bundle script /plugins/@linxin666/dsh-client-ui-web-ui-settings/client.js?rev=54840dfe7860 failed to load'

const sampleScriptError =
  'client-modules: bundle script /plugins/custom-plugin/client.js failed to load'

describe('plugin load error detection and extraction', () => {
  it('detects bundle script and loader entry failure errors', () => {
    expect(isPluginLoadError(new Error(sampleLoaderError))).toBe(true)
    expect(isPluginLoadError(sampleLoaderError)).toBe(true)
    expect(isPluginLoadError({ message: sampleScriptError })).toBe(true)
    expect(isPluginLoadError({ reason: sampleLoaderError })).toBe(true)
    expect(isPluginLoadError(new Error('SyntaxError: Unexpected token'))).toBe(false)
    expect(isPluginLoadError(undefined)).toBe(false)
    expect(isPluginLoadError(null)).toBe(false)
  })

  it('extracts plugin name from error messages', () => {
    expect(extractPluginName(sampleLoaderError)).toBe('@linxin666/dsh-client-ui-web-ui-settings')
    expect(extractPluginName(sampleScriptError)).toBe('custom-plugin')
    expect(extractPluginName('some generic error')).toBeUndefined()
  })

  it('formats localized messages for Chinese and English', () => {
    const zhWithPlugin = pluginErrorMessage('zh', '@linxin666/dsh-client-ui-web-ui-settings')
    expect(zhWithPlugin.title).toBe('插件加载异常')
    expect(zhWithPlugin.message).toContain('@linxin666/dsh-client-ui-web-ui-settings')
    expect(zhWithPlugin.message).toContain('重启 Harness')

    const enWithPlugin = pluginErrorMessage('en', 'custom-plugin')
    expect(enWithPlugin.title).toBe('Plugin Loading Error')
    expect(enWithPlugin.message).toContain('custom-plugin')
    expect(enWithPlugin.message).toContain('Restart Harness')

    const zhDefault = pluginErrorMessage('zh')
    expect(zhDefault.message).toContain('检测到插件已被卸载或加载失败')

    const enDefault = pluginErrorMessage('en')
    expect(enDefault.message).toContain('A plugin was uninstalled or failed to load')
  })
})

describe('preload wiring for plugin error handling', () => {
  it('installs error listeners and connects to unified recovery', async () => {
    const preload = await readFile('src/preload/index.ts', 'utf8')

    expect(preload).toContain("window.addEventListener('error'")
    expect(preload).toContain("window.addEventListener('unhandledrejection'")
    expect(preload).toContain('isPluginLoadError')
    expect(preload).toContain('harness:open-recovery')
    expect(preload).toContain('checkBootFailureInDom')
    expect(preload).toContain('queueBootFailure(errorText)')
    expect(preload).toContain('pendingBootFailureMessages.join')
    expect(preload).toContain('findBootFailureText(document)')
    expect(preload).not.toContain('document.body?.innerText')
  })
})

describe('boot failure page detection', () => {
  it('only accepts the dedicated boot page and preserves its diagnostics', () => {
    let queriedSelector: string | undefined
    const bootFailure = findBootFailureText({
      querySelector: (selector: string) => {
        queriedSelector = selector
        return { innerText: 'Failed to load plugins' }
      }
    } as unknown as Document)

    expect(queriedSelector).toBe(BOOT_FAILURE_ROOT_SELECTOR)
    expect(bootFailure).toBe(
      'Failed to load plugins'
    )
    expect(findBootFailureText({
      querySelector: () => ({
        innerText:
          'Failed to load plugins\n@deepseek-ai/dsh-client-ui-example\nweb boot: 1 entry did not activate'
      })
    } as unknown as Document)).toBe(
      'Failed to load plugins\n@deepseek-ai/dsh-client-ui-example\nweb boot: 1 entry did not activate'
    )
  })

  it('does not inspect ordinary document text such as a conversation', () => {
    const conversationOnlyDocument = {
      body: { innerText: 'The screenshot says “Failed to load plugins”, but the app recovered.' },
      querySelector: () => null
    }

    expect(findBootFailureText(conversationOnlyDocument as unknown as Document)).toBeUndefined()
  })
})
