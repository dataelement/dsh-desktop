import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { JSDOM } from 'jsdom'
import { describe, expect, it, vi } from 'vitest'

const source = await readFile(new URL('../packages/dsh-desktop-workbenches/client.js', import.meta.url), 'utf8')

describe('global Harness restart notice', () => {
  it('renders outside conversations, expands actual causes, prevents duplicate restart and retains failed changes', async () => {
    const dom = new JSDOM('<div id="root"></div>')
    const previous = { window: globalThis.window, document: globalThis.document, act: globalThis.IS_REACT_ACT_ENVIRONMENT }
    globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true
    let resolveRestart
    const restartHarness = vi.fn(() => new Promise(resolve => { resolveRestart = resolve }))
    let Notice
    vm.runInNewContext(source, { document: dom.window.document, dshDesktop: { restartHarness }, window: { localStorage: { getItem: () => null }, __ModuleLoader__: { load({ factory }) {
      Notice = factory(name => name === 'react' ? React : name === '@deepseek-ai/cordis' ? { Service: { tracker: Symbol() } } : {}).RestartNotice
    } } } })
    let snapshot = { restartNeeded: true, restartReasons: ['@team/plugin', 'market'] }
    const listeners = new Set()
    const publish = next => {
      snapshot = next
      for (const listener of listeners) listener()
    }
    const service = {
      subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener) },
      getSnapshot: () => snapshot,
      refreshRestartStatus: vi.fn(async () => {}),
      load: vi.fn(async () => publish({ ...snapshot, error: '' })),
      run: promise => void promise,
      dismissError: () => publish({ ...snapshot, errorDismissed: true })
    }
    const copy = { title: '有更改需重启 Harness 后生效', description: '会话记录和数据将保留', restart: '重启 Harness', restarting: '正在重启…', details: '查看详情', hide: '收起详情', failed: '无法重启 Harness，请重试。', market: '插件市场安装变更', interrupted: '重启将中断正在执行的任务。' }
    const root = createRoot(dom.window.document.getElementById('root'))
    try {
      await React.act(async () => root.render(React.createElement(Notice, { service, t: key => copy[key] })))
      const doc = dom.window.document
      expect(doc.querySelector('.dshRestartTitle').textContent).toBe(copy.title)
      expect(doc.querySelector('.dshRestartNotice').getAttribute('aria-live')).toBe('polite')
      const computed = dom.window.getComputedStyle(doc.querySelector('.dshRestartNotice'))
      expect(computed.position).toBe('fixed')
      expect(computed.right).toBe('20px')
      expect(computed.bottom).toBe('20px')
      expect(computed.pointerEvents).toBe('auto')
      const updateHost = doc.createElement('div')
      doc.documentElement.append(updateHost)
      updateHost.setAttribute('data-dsh-update-corner-visible', '')
      const notice = doc.querySelector('.dshRestartNotice')
      expect(dom.window.getComputedStyle(notice).display).not.toBe('none')
      expect(dom.window.getComputedStyle(notice).bottom).toBe('180px')
      updateHost.removeAttribute('data-dsh-update-corner-visible')
      expect(dom.window.getComputedStyle(notice).display).not.toBe('none')
      // An operation failure must never hide the restart action.
      await React.act(async () => publish({ ...snapshot, error: '工作台当前不可用。', pending: 1 }))
      expect(doc.querySelector('.dshRestartTitle').textContent).toBe(copy.title)
      expect(doc.querySelector('.dshRestartPrimary').textContent).toBe(copy.restart)
      expect(doc.querySelector('.dshRestartPrimary').disabled).toBe(true)
      await React.act(async () => doc.querySelector('[aria-expanded]').click())
      expect(doc.querySelector('.dshRestartDetails').textContent).toContain('工作台当前不可用。')
      await React.act(async () => publish({ ...snapshot, restartNeeded: false }))
      const operationNotice = doc.querySelector('.dshWbOperationNotice')
      expect(operationNotice.getAttribute('role')).toBe('alert')
      expect(operationNotice.textContent).toContain('工作台当前不可用。')
      expect(doc.querySelector('.dshRestartTitle').textContent).not.toBe(copy.title)
      expect(dom.window.getComputedStyle(operationNotice).right).toBe('20px')
      expect(dom.window.getComputedStyle(operationNotice).bottom).toBe('20px')
      expect(operationNotice.querySelector('.dshRestartPrimary').disabled).toBe(true)
      await React.act(async () => operationNotice.querySelector('.dshRestartToggle').click())
      expect(doc.querySelector('.dshWbOperationNotice')).toBeNull()
      expect(doc.querySelector('.dshRestartNotice')).toBeNull()
      await React.act(async () => publish({ ...snapshot, error: '工作台当前不可用。', errorDismissed: false, pending: 0 }))
      await React.act(async () => doc.querySelector('.dshWbOperationNotice .dshRestartPrimary').click())
      expect(service.load).toHaveBeenCalledOnce()
      expect(doc.querySelector('.dshWbOperationNotice')).toBeNull()
      await React.act(async () => publish({ ...snapshot, restartNeeded: true }))
      if (doc.querySelector('[aria-expanded]').getAttribute('aria-expanded') !== 'true') await React.act(async () => doc.querySelector('[aria-expanded]').click())
      expect(doc.querySelector('.dshRestartDetails').textContent).toContain('@team/plugin')
      expect(doc.querySelector('.dshRestartDetails').textContent).toContain(copy.market)
      const action = doc.querySelector('.dshRestartPrimary')
      await React.act(async () => { action.click(); action.click() })
      expect(restartHarness).toHaveBeenCalledTimes(1)
      expect(action.disabled).toBe(true)
      await React.act(async () => resolveRestart({ ok: false }))
      expect(doc.querySelector('[role="alert"]').textContent).toBe(copy.failed)
      expect(doc.querySelector('.dshRestartNotice')).not.toBeNull()
      expect(doc.querySelector('.dshRestartPrimary').disabled).toBe(false)
      await React.act(async () => { doc.querySelector('.dshRestartPrimary').click() })
      await React.act(async () => resolveRestart({ ok: true }))
      expect(service.refreshRestartStatus).toHaveBeenCalledTimes(1)
      expect(doc.querySelector('.dshRestartNotice')).not.toBeNull() // IPC acknowledgement is not runtime replacement.
      await React.act(async () => root.render(React.createElement(Notice, { service, t: key => key === 'title' ? 'Restart Harness to apply changes' : copy[key] })))
      expect(doc.querySelector('.dshRestartTitle').textContent).toBe('Restart Harness to apply changes')
      await React.act(async () => { snapshot = { restartNeeded: false, restartReasons: [] }; for (const listener of listeners) listener() })
      expect(doc.querySelector('.dshRestartNotice')).toBeNull()
      const diagnostic = 'Client package fixture matches multiple workbenches: ' + 'very-long-package/'.repeat(80)
      service.ctx = { locale: { bind: () => key => key } }
      await React.act(async () => publish({ ...snapshot, registrationFailures: [{ sourcePackage: 'fixture', stage: 'identity', message: diagnostic }] }))
      expect(doc.querySelector('.dshWbOperationNotice')).not.toBeNull()
      expect(doc.querySelector('.dshWbFailureHint')).toBeNull()
      if (doc.querySelector('[aria-expanded]').getAttribute('aria-expanded') !== 'true') await React.act(async () => doc.querySelector('[aria-expanded]').click())
      expect(doc.querySelector('.dshRestartDetails').textContent).toContain(diagnostic)
      expect(dom.window.getComputedStyle(doc.querySelector('.dshRestartDiagnostic p')).overflowWrap).toBe('anywhere')
      await React.act(async () => doc.querySelector('.dshRestartToggle').click())
      expect(doc.querySelector('.dshRestartNotice')).toBeNull()
      await React.act(async () => publish({ ...snapshot, registrationFailures: [{ sourcePackage: 'new-fixture', stage: 'register', message: 'new failure' }] }))
      expect(doc.querySelector('.dshRestartNotice')).not.toBeNull()
      await React.act(async () => root.unmount())
      expect(listeners.size).toBe(0)
    } finally {
      dom.window.close()
      globalThis.window = previous.window; globalThis.document = previous.document; globalThis.IS_REACT_ACT_ENVIRONMENT = previous.act
    }
  })
})
