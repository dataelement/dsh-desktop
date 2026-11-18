import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import React from 'react'
import { createRoot } from 'react-dom/client'
import * as ReactDOM from 'react-dom'
import { JSDOM } from 'jsdom'
import { describe, expect, it, vi } from 'vitest'

const source = await readFile(new URL('../packages/dsh-desktop-workbenches/client.js', import.meta.url), 'utf8')

describe('global Harness restart notice', () => {
  it('renders outside conversations, expands actual causes, prevents duplicate restart and retains failed changes', async () => {
    const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' })
    const previous = { window: globalThis.window, document: globalThis.document, act: globalThis.IS_REACT_ACT_ENVIRONMENT }
    globalThis.window = dom.window; globalThis.document = dom.window.document; globalThis.IS_REACT_ACT_ENVIRONMENT = true
    let resolveRestart
    const restartHarness = vi.fn(() => new Promise(resolve => { resolveRestart = resolve }))
    let Notice
    vm.runInNewContext(source, { document: dom.window.document, dshDesktop: { restartHarness }, window: { localStorage: { getItem: () => null }, __ModuleLoader__: { load({ factory }) {
      Notice = factory(name => name === 'react' ? React : name === 'react-dom' ? ReactDOM : name === '@deepseek-ai/cordis' ? { Service: { tracker: Symbol() } } : {}).RestartNotice
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
      reloadPage: vi.fn(),
      run: promise => void promise,
      dismissError: () => publish({ ...snapshot, errorDismissed: true })
    }
    const copy = { installationDrift: '安装状态异常', installationDriftDescription: '停止外部更新并通过插件管理器修复。重启无法修复。', close: '关闭', operationFailed: '工作台操作未完成', registrationFailed: '有工作台加载失败', registrationRecovery: '请查看详情。修复后，保存未提交的内容，再重新加载页面。', reloadPage: '重新加载页面', diagnostics: '查看详情以获取完整原因；修复后重新加载工作台。', title: '有更改需重启 Harness 后生效', description: '会话记录和数据将保留', restart: '重启 Harness', restarting: '正在重启…', details: '查看详情', hide: '收起详情', failed: '无法重启 Harness，请重试。', market: '插件市场安装变更', interrupted: '重启将中断正在执行的任务。' }
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
      expect(notice.hasAttribute('data-dsh-workbench-notice')).toBe(true)
      for (const phase of ['downloading', 'downloaded']) {
        updateHost.setAttribute('data-update-phase', phase)
        expect(dom.window.getComputedStyle(notice).display).toBe('none')
      }
      updateHost.setAttribute('data-update-phase', 'available')
      expect(dom.window.getComputedStyle(notice).display).not.toBe('none')
      updateHost.removeAttribute('data-dsh-update-corner-visible')
      expect(dom.window.getComputedStyle(notice).display).not.toBe('none')
      await React.act(async () => publish({ ...snapshot, restartNeeded: false, error: '工作台当前不可用。', pending: 1 }))
      const operationNotice = doc.querySelector('.dshWbOperationNotice')
      expect(operationNotice.getAttribute('role')).toBe('alert')
      expect(operationNotice.textContent).toContain(copy.operationFailed)
      expect(operationNotice.textContent).not.toContain('工作台当前不可用。')
      const detailsButton = operationNotice.querySelector('[aria-haspopup="dialog"]')
      detailsButton.focus()
      await React.act(async () => detailsButton.click())
      const dialog = doc.querySelector('[role="dialog"]')
      expect(dialog.textContent).toContain('工作台当前不可用。')
      expect(operationNotice.querySelector('.dshRestartDetails')).toBeNull()
      expect(dialog.hasAttribute('data-dsh-workbench-notice')).toBe(true)
      expect(dialog.getAttribute('aria-modal')).toBe('true')
      expect(doc.activeElement).toBe(dialog.querySelector('button'))
      await React.act(async () => doc.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
      expect(doc.querySelector('[role="dialog"]')).toBeNull()
      expect(doc.activeElement).toBe(detailsButton)
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
      service.ctx = { locale: { bind: () => key => key === 'diagnostic' ? '错误代码' : key } }
      const timeoutMessage = '安装包下载连接超时，请重试；若多次失败，请检查网络或代理设置。'
      await React.act(async () => publish({ ...snapshot, error: timeoutMessage, errorDiagnostic: 'UND_ERR_CONNECT_TIMEOUT', errorDismissed: false }))
      expect(doc.querySelector('.dshWbOperationNotice').textContent).toContain(timeoutMessage)
      expect(doc.querySelector('.dshWbOperationNotice').textContent).not.toContain('UND_ERR_CONNECT_TIMEOUT')
      await React.act(async () => doc.querySelector('[aria-haspopup="dialog"]').click())
      expect(doc.querySelector('[role="dialog"]').textContent).toContain('错误代码: UND_ERR_CONNECT_TIMEOUT')
      await React.act(async () => doc.querySelector('[role="dialog"] button').click())
      await React.act(async () => publish({ ...snapshot, restartNeeded: true, error: '重启后可恢复。', errorDiagnostic: '', errorDismissed: false }))
      expect(doc.querySelector('.dshWbOperationNotice')).toBeNull()
      expect(doc.querySelector('.dshRestartTitle').textContent).toBe(copy.title)
      await React.act(async () => doc.querySelector('[aria-haspopup="dialog"]').click())
      expect(doc.querySelector('[role="dialog"]').textContent).toContain('重启后可恢复。')
      expect(doc.querySelector('.dshRestartDetails').textContent).toContain('@team/plugin')
      expect(doc.querySelector('.dshRestartDetails').textContent).toContain(copy.market)
      await React.act(async () => doc.querySelector('[role="dialog"] button').click())
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
      expect(doc.querySelector('[data-dsh-workbench-notice]')).toBeNull()
      const registration = { sourcePackage: '@team/broken', stage: 'register', message: 'missing API ' + 'long diagnostic '.repeat(120) }
      service.ctx = {}
      await React.act(async () => publish({ restartNeeded: false, registrationFailures: [registration] }))
      expect(doc.querySelector('.dshRestartTitle').textContent).toBe(copy.registrationFailed)
      expect(doc.querySelector('.dshRestartDescription').textContent).toBe(copy.registrationRecovery)
      expect(doc.querySelector('.dshRestartPrimary').textContent).toBe(copy.reloadPage)
      expect(service.reloadPage).not.toHaveBeenCalled()
      await React.act(async () => doc.querySelector('.dshWbOperationNotice .dshRestartPrimary').click())
      expect(service.reloadPage).toHaveBeenCalledOnce()
      expect(service.load).toHaveBeenCalledOnce() // Only the earlier operation-error recovery rereads state.
      expect(doc.querySelector('.dshRestartNotice').textContent).not.toContain('@team/broken')
      await React.act(async () => doc.querySelector('[aria-haspopup="dialog"]').click())
      const registrationDialog = doc.querySelector('[role="dialog"]')
      expect(registrationDialog.textContent).toContain(registration.message)
      expect(registrationDialog.textContent).toContain('@team/broken')
      const close = registrationDialog.querySelector('button')
      const scroll = registrationDialog.querySelector('[tabindex="0"]')
      scroll.focus()
      await React.act(async () => doc.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true })))
      expect(doc.activeElement).toBe(close)
      await React.act(async () => doc.querySelector('.dshWbModalBackdrop').click())
      expect(doc.querySelector('[role="dialog"]')).toBeNull()
      await React.act(async () => doc.querySelector('.dshRestartToggle').click())
      expect(doc.querySelector('[data-dsh-workbench-notice]')).toBeNull()
      await React.act(async () => publish({ ...snapshot }))
      expect(doc.querySelector('[data-dsh-workbench-notice]')).toBeNull()
      await React.act(async () => publish({ ...snapshot, registrationFailures: [{ ...registration, message: 'new diagnostic' }] }))
      expect(doc.querySelector('[data-dsh-workbench-notice]')).not.toBeNull()
      await React.act(async () => publish({ restartNeeded: false, installationDrift: [{ name: 'fixture-plugin', code: 'external-modification', path: '/temporary/plugin' }] }))
      expect(doc.querySelector('.dshRestartTitle').textContent).toBe(copy.installationDrift)
      expect(doc.querySelector('.dshRestartNotice').textContent).not.toContain(copy.restart)
      await React.act(async () => doc.querySelector('[aria-haspopup="dialog"]').click())
      expect(doc.querySelector('[role="dialog"]').textContent).toContain('fixture-plugin')
      expect(doc.querySelector('[role="dialog"]').textContent).toContain('/temporary/plugin')
      await React.act(async () => root.unmount())
      expect(listeners.size).toBe(0)
    } finally {
      dom.window.close()
      globalThis.window = previous.window; globalThis.document = previous.document; globalThis.IS_REACT_ACT_ENVIRONMENT = previous.act
    }
  })
})
