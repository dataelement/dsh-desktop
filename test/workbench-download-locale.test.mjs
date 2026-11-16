import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import { describe, expect, it } from 'vitest'

const code = await readFile(new URL('../packages/dsh-desktop-workbenches/client.js', import.meta.url), 'utf8')
function setup(language, payload) {
  let client
  let service
  const dictionaries = new Map()
  const window = { localStorage: { getItem: () => null }, __ModuleLoader__: { load({ factory }) {
    client = factory(name => name === 'react' ? { Component: class {} } : name === '@deepseek-ai/cordis' ? { Service: { tracker: Symbol('tracker') } } : {})
  } } }
  vm.runInNewContext(code, { window, setTimeout, clearTimeout, AbortController })
  const ctx = {
    locale: { register: (ns, copy) => { dictionaries.set(ns, copy); return () => dictionaries.delete(ns) }, bind: ns => key => dictionaries.get(ns)[language][key] },
    effect: (callback, label) => { if (['workbenches: download dictionaries', 'workbenches: service'].includes(label)) callback() },
    reflect: { provide: (_name, value) => { service = value } },
    slots: { inject() {} }
  }
  client.apply(ctx)
  service.request = async () => ({ ok: false, status: 502, json: async () => payload })
  return service
}

describe('market download error locale contract', () => {
  it.each([
    ['zh', 'download_failed', '安装包下载失败，请重试；若多次失败，请检查网络或代理设置。'],
    ['en', 'download_failed', 'Package download failed. Retry; if it keeps failing, check your network or proxy settings.'],
    ['zh', 'download_interrupted', '安装包下载中断，请重新下载；若多次失败，请检查网络或代理设置。'],
    ['en', 'download_interrupted', 'Package download interrupted. Download again; if it keeps failing, check your network or proxy settings.']
  ])('localizes %s %s and preserves the safe diagnostic', async (language, code, label) => {
    const service = setup(language, { code, params: { diagnostic: 'ERR_PROXY_CONNECTION_FAILED' }, error: 'legacy error' })
    try {
      await expect(service.marketPackage('/update', 'owner/tool')).rejects.toMatchObject({ message: label, diagnostic: 'ERR_PROXY_CONNECTION_FAILED' })
      expect(service.installing).toBeNull()
    } finally { service.dispose() }
  })
  it.each([
    ['zh', 'UND_ERR_CONNECT_TIMEOUT', '安装包下载连接超时，请重试；若多次失败，请检查网络或代理设置。'],
    ['zh', 'ECONNRESET, ETIMEDOUT', '安装包下载连接超时，请重试；若多次失败，请检查网络或代理设置。'],
    ['en', 'TIMEOUT', 'The package download connection timed out. Retry; if it keeps failing, check your network or proxy settings.']
  ])('explains %s timeout %s while retaining details separately', async (language, diagnostic, message) => {
    const service = setup(language, { code: 'download_failed', params: { diagnostic } })
    try {
      await service.marketPackage('/update', 'owner/tool').catch(error => service.report(error))
      expect(service.snapshot.error).toBe(message)
      expect(service.snapshot.error).not.toContain(diagnostic)
      expect(service.snapshot.errorDiagnostic).toBe(diagnostic)
      service.report(new Error('another failure'))
      expect(service.snapshot.errorDiagnostic).toBe('')
    } finally { service.dispose() }
  })
  it.each([
    ['zh', 'invalid_download_url', '工作台下载地址无效。'],
    ['en', 'invalid_download_url', 'The workbench download URL is invalid.'],
    ['zh', 'unsafe_download_url', '工作台下载地址必须使用 HTTPS，且不能包含凭据或自定义端口。'],
    ['en', 'unsafe_download_url', 'The workbench download URL must use HTTPS without credentials or a custom port.']
  ])('localizes %s %s without diagnostic parameters', async (language, code, label) => {
    const service = setup(language, { code, error: 'legacy error' })
    try { await expect(service.marketPackage('/update', 'owner/tool')).rejects.toThrow(label) }
    finally { service.dispose() }
  })
  it.each([
    { code: 'future_error', error: 'original failure' },
    { code: 'download_failed', params: { diagnostic: 'https://private/' }, error: 'original failure' },
    { error: 'original failure' }
  ])('keeps unknown or invalid errors on the existing fallback path', async payload => {
    const service = setup('zh', payload)
    try { await expect(service.marketPackage('/update', 'owner/tool')).rejects.toThrow('original failure') }
    finally { service.dispose() }
  })
})
